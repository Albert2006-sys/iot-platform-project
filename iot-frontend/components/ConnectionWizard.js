
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function ConnectionWizard({ device }) {
  const [language, setLanguage] = useState('python');
  const [copied, setCopied] = useState(false);

  const pythonSnippet = `
import time
import json
import paho.mqtt.client as mqtt

# Device Configuration
BROKER = "${device.broker_url || ''}"
PORT = ${device.broker_port || 0}
DEVICE_ID = "${device.deviceId}"
TELEMETRY_TOPIC = "${device.telemetryTopic}"
# Note: In production, use username/password
# USERNAME = "${device.credentials?.username}"
# PASSWORD = "${device.credentials?.secret}" # WARNING: Keep secret safe!

def on_connect(client, userdata, flags, rc):
    print(f"Connected with result code {rc}")

client = mqtt.Client(client_id=DEVICE_ID)
client.on_connect = on_connect
# client.username_pw_set(USERNAME, PASSWORD)

print(f"Connecting to {BROKER}...")
client.connect(BROKER, PORT, 60)
client.loop_start()

while True:
    # Example Payload based on your Data Map
    payload = {
${device.data_map?.map(m => `        "${m.raw_key}": 25.5, # Type: ${m.type}`).join('\n') || '        "temperature": 25.5'}
    }
    
    print(f"Publishing: {payload}")
    client.publish(TELEMETRY_TOPIC, json.dumps(payload))
    time.sleep(5)
`;

  const arduinoSnippet = `
#include <PubSubClient.h>
#include <WiFi.h> # or <ESP8266WiFi.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "${device.broker_url || ''}";

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.println("Connecting to WiFi..");
  }
  client.setServer(mqtt_server, ${device.broker_port || 0});
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Create JSON payload
  String payload = "{";
${device.data_map?.map((m, i) => `  payload += "\\"${m.raw_key}\\": 25.5${i < device.data_map.length - 1 ? ',' : ''}";`).join('\n') || '  payload += "\\"temperature\\": 25.5";'}
  payload += "}";

  client.publish("${device.telemetryTopic}", payload.c_str());
  delay(5000);
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect("${device.deviceId}" /*, user, pass */)) {
      Serial.println("Connected");
    } else {
      delay(5000);
    }
  }
}
`;

  const code = language === 'python' ? pythonSnippet : arduinoSnippet;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
       <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Connection Wizard</h3>
          <div className="flex gap-2">
             <button 
               onClick={() => setLanguage('python')}
               className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${language === 'python' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'}`}
             >
                Python
             </button>
             <button 
               onClick={() => setLanguage('cpp')}
               className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${language === 'cpp' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'}`}
             >
                C++ (Arduino)
             </button>
          </div>
       </div>
       <div className="relative">
          <pre className="bg-slate-950 p-4 rounded-lg overflow-x-auto text-sm text-slate-300 font-mono max-h-[400px]">
              {code}
          </pre>
          <button 
            onClick={handleCopy}
            className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
          >
             {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
       </div>
    </div>
  );
}
