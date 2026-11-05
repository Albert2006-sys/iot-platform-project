import json
import os
import sys

import paho.mqtt.client as mqtt


def create_client():
    try:
        return mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="LumenLinkFaultSender")
    except (AttributeError, TypeError):
        return mqtt.Client(client_id="LumenLinkFaultSender")


if len(sys.argv) != 2 or sys.argv[1] not in ("overheat", "normal"):
    raise SystemExit("Usage: python send_fault.py overheat|normal")

required = ("MQTT_HOST", "MQTT_PORT", "MQTT_USERNAME", "MQTT_PASSWORD", "DEVICE_ID")
missing = [name for name in required if not os.environ.get(name)]
if missing:
    raise SystemExit(f"Missing environment variables: {', '.join(missing)}")

client = create_client()
client.username_pw_set(os.environ["MQTT_USERNAME"], os.environ["MQTT_PASSWORD"])
client.tls_set()
client.connect(os.environ["MQTT_HOST"], int(os.environ["MQTT_PORT"]))
client.loop_start()

topic = f"devices/{os.environ['DEVICE_ID']}/commands"
payload = json.dumps({"target": "__fault", "value": sys.argv[1]})
info = client.publish(topic, payload, qos=1)
info.wait_for_publish()
client.loop_stop()
client.disconnect()
print(f"Published {sys.argv[1]} fault command.")
