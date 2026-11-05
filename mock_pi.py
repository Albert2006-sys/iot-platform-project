import time
import json
import random
import sys
import os

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    import paho.mqtt.client as mqtt
except ImportError:
    print("Error: paho-mqtt library is required. Run: pip install paho-mqtt")
    sys.exit(1)

# --- CONFIGURATION ---
DEVICE_ID = os.environ["DEVICE_ID"]
BROKER_ADDRESS = os.environ["MQTT_HOST"]
PORT = int(os.environ["MQTT_PORT"])
MQTT_USERNAME = os.environ["MQTT_USERNAME"]
MQTT_PASSWORD = os.environ["MQTT_PASSWORD"]
SIM_COOL_RATE = float(os.environ.get("SIM_COOL_RATE", "0.25"))
SIM_FAULT_HEAT = float(os.environ.get("SIM_FAULT_HEAT", "40.0"))
AMBIENT_TEMPERATURE = 25.0
TELEMETRY_TOPIC = f"devices/{DEVICE_ID}/data"
COMMAND_TOPIC = f"devices/{DEVICE_ID}/commands"
STATUS_TOPIC = f"devices/{DEVICE_ID}/status"

# --- DEVICE STATE (Now Toggleable) ---
# These are the default values that will be sent if no command is received
device_state = {
    "temperature": 25.0,
    "humidity": 50.0,
    "cpuUsage": 30.0,
    "batteryLevel": 85.0,
    "power": 10.0,
    "voltage": 230.0
}
fault_mode = None
current_temperature = device_state["temperature"]

# --- CALLBACKS ---

def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print(f"✅ Connected to HiveMQ Cloud")
        client.subscribe(COMMAND_TOPIC)
        print(f"📥 Listening for Toggles on: {COMMAND_TOPIC}")
    else:
        print(f"❌ Connection failed, code: {reason_code}")

def on_message(client, userdata, msg):
    global device_state, fault_mode
    if msg.topic != COMMAND_TOPIC:
        return
    try:
        command = json.loads(msg.payload.decode())
        print(f"🎮 COMMAND RECEIVED on {msg.topic}: target={command.get('target')}")
        
        # Logic: If the command contains a key present in our state, update it
        # Format expected: {"target": "temperature", "value": 32.5}
        target = command.get("target")
        new_value = command.get("value")
        
        if target == "__fault":
            if new_value in ("overheat", "normal"):
                fault_mode = None if new_value == "normal" else new_value
                print(f"   >>> FAULT MODE: {fault_mode or 'normal'}")
            else:
                print(f"   >>> IGNORED: Unsupported fault '{new_value}'")
            return

        if target in device_state:
            device_state[target] = float(new_value)
            print(f"   >>> UPDATED {target} to {device_state[target]}")
        else:
            print(f"   >>> IGNORED: Key '{target}' not found in device state.")
            
    except Exception as e:
        print(f"❌ Error parsing toggle: {e}")

# --- SETUP ---
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, "MockPi_Simulator")
client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
client.tls_set()

# LWT: Last Will and Testament
# If this client disconnects unexpectedly, the broker will publish this message
client.will_set(STATUS_TOPIC, json.dumps({"status": "offline"}), retain=True, qos=1)

client.on_connect = on_connect
client.on_message = on_message

try:
    client.connect(BROKER_ADDRESS, PORT)
    client.loop_start()
    
    # Announce we are online
    client.publish(
        STATUS_TOPIC,
        json.dumps({"status": "online", "commandKeys": list(device_state.keys())}),
        retain=True,
        qos=1,
    )
    
except Exception as e:
    print(f"❌ Connection failed: {e}")
    sys.exit(1)

# --- MAIN LOOP ---
print(f"🚀 Mock Pi Online. You can now toggle values from the Dashboard.")

try:
    while True:
        power = max(0.0, min(100.0, device_state["power"]))
        heat_input = SIM_FAULT_HEAT * (power / 100.0) if fault_mode == "overheat" else 0.0
        cooling = SIM_COOL_RATE * (current_temperature - AMBIENT_TEMPERATURE)
        current_temperature += heat_input - cooling + random.uniform(-0.15, 0.15)
        current_temperature = max(18.0, min(100.0, current_temperature))

        # We add a small random "jitter" (+/- 0.5) to the state so the graphs look alive
        payload = {
            "temperature": round(current_temperature, 2),
            "humidity": round(device_state["humidity"] + random.uniform(-1, 1), 1),
            "cpuUsage": round(device_state["cpuUsage"] + random.uniform(-2, 2), 1),
            "batteryLevel": round(device_state["batteryLevel"], 1), # Battery usually stays flat
            "power": round(device_state["power"] + random.uniform(-0.2, 0.2), 2),
            "voltage": round(device_state["voltage"] + random.uniform(-1, 1), 1),
            "timestamp": int(time.time() * 1000)
        }

        client.publish(TELEMETRY_TOPIC, json.dumps(payload))
        print(
            f"📤 Temp={payload['temperature']} | Power={payload['power']} | "
            f"Fault={fault_mode or 'normal'}",
            flush=True,
        )
        
        time.sleep(2)

except KeyboardInterrupt:
    print("\n🛑 Disconnecting...")
    # Explicitly mark offline on graceful shutdown
    client.publish(STATUS_TOPIC, json.dumps({"status": "offline"}), retain=True, qos=1)
    client.disconnect()
    client.loop_stop()