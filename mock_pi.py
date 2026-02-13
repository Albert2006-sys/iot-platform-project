import time
import json
import random
import sys

try:
    import paho.mqtt.client as mqtt
except ImportError:
    print("Error: paho-mqtt library is required. Run: pip install paho-mqtt")
    sys.exit(1)

# --- CONFIGURATION ---
DEVICE_ID = "55899029-5b66-41ea-97b4-aaefbe55e9c7"
BROKER_ADDRESS = "8efd95372b1e4eb58c0e7a0eef38c918.s1.eu.hivemq.cloud"
PORT = 8883 
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

# --- CALLBACKS ---

def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print(f"✅ Connected to HiveMQ Cloud")
        client.subscribe(COMMAND_TOPIC)
        print(f"📥 Listening for Toggles on: {COMMAND_TOPIC}")
    else:
        print(f"❌ Connection failed, code: {reason_code}")

def on_message(client, userdata, msg):
    global device_state
    try:
        command = json.loads(msg.payload.decode())
        print(f"\n🎮 TOGGLE COMMAND RECEIVED!")
        
        # Logic: If the command contains a key present in our state, update it
        # Format expected: {"target": "temperature", "value": 32.5}
        target = command.get("target")
        new_value = command.get("value")
        
        if target in device_state:
            device_state[target] = float(new_value)
            print(f"   >>> UPDATED {target} to {new_value}")
        else:
            print(f"   >>> IGNORED: Key '{target}' not found in device state.")
            
    except Exception as e:
        print(f"❌ Error parsing toggle: {e}")

# --- SETUP ---
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, "MockPi_Simulator")
client.username_pw_set('Iotdevice', 'Jeremy@2016')
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
    client.publish(STATUS_TOPIC, json.dumps({"status": "online"}), retain=True, qos=1)
    
except Exception as e:
    print(f"❌ Connection failed: {e}")
    sys.exit(1)

# --- MAIN LOOP ---
print(f"🚀 Mock Pi Online. You can now toggle values from the Dashboard.")

try:
    while True:
        # We add a small random "jitter" (+/- 0.5) to the state so the graphs look alive
        payload = {
            "temperature": round(device_state["temperature"] + random.uniform(-0.5, 0.5), 2),
            "humidity": round(device_state["humidity"] + random.uniform(-1, 1), 1),
            "cpuUsage": round(device_state["cpuUsage"] + random.uniform(-2, 2), 1),
            "batteryLevel": round(device_state["batteryLevel"], 1), # Battery usually stays flat
            "power": round(device_state["power"] + random.uniform(-0.2, 0.2), 2),
            "voltage": round(device_state["voltage"] + random.uniform(-1, 1), 1),
            "timestamp": int(time.time() * 1000)
        }

        client.publish(TELEMETRY_TOPIC, json.dumps(payload))
        print(f"📤 Current State: Temp={payload['temperature']} | Pwr={payload['power']}", end='\r')
        
        time.sleep(2)

except KeyboardInterrupt:
    print("\n🛑 Disconnecting...")
    # Explicitly mark offline on graceful shutdown
    client.publish(STATUS_TOPIC, json.dumps({"status": "offline"}), retain=True, qos=1)
    client.disconnect()
    client.loop_stop()