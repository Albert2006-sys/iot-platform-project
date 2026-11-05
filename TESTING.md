# Phase 1 Testing

Use the existing local environment variables. Do not place credentials in this file or in source files.

## 1. Start the backend

```powershell
cd C:\Projects\IOT-PROJECT\iot-backend
npm start
```

Expected: the backend starts on the configured `PORT`, connects to MongoDB and MQTT, and logs that local anomaly detection is listening.

## 2. Start the simulator

From a second terminal:

```powershell
python C:\Projects\IOT-PROJECT\mock_pi.py
```

Expected: the simulator connects to MQTT and publishes telemetry every two seconds.

## 3. Open the device page

Open the frontend and navigate to the device detail page for the device identified by `DEVICE_ID`.

Expected: live telemetry is visible and the Socket.io connection is established.

## 4. Inject the overheat fault

From the project root:

```powershell
python send_fault.py overheat
```

Expected: temperature rises. After at least 20 baseline readings and three consecutive anomalous readings, a warning or critical alert appears in the device page within approximately 10 seconds.

## 5. Verify the Anomaly document

Run `mongosh` with the same MongoDB connection configured by `MONGO_URI`:

```javascript
use iot_platform
db.anomalies.find({ deviceId: "<DEVICE_ID>" }).sort({ createdAt: -1 }).limit(5)
```

Replace `<DEVICE_ID>` with the value of the local `DEVICE_ID` environment variable. The newest document should contain `key: "temperature"`, a numeric `zScore`, `severity`, and `status: "open"`.

## 6. Stop the fault and cool the device

```powershell
python send_fault.py normal
```

Then send a normal numeric power command through the dashboard or an MQTT client, using the configured command topic:

```json
{"target":"power","value":0}
```

Expected: temperature cools gradually but does not fall below the simulator's realistic floor. After five consecutive normal readings, the anomaly is updated to `status: "resolved"` and a resolution alert is emitted.

Verify resolution:

```javascript
db.anomalies.find({ deviceId: "<DEVICE_ID>", key: "temperature" }).sort({ createdAt: -1 }).limit(5)
```
