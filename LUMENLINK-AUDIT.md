# LumenLink (iot-platform-project) Audit

Read-only factual audit of the repository. Secret values are intentionally redacted.

### 1. File tree

**iot-backend/**

```text
.env
.gitignore
cert.pem
createDevice.js
key.pem
package.json
reset_device.js
server.js
config/
  db.js
controllers/
  auth.controller.js
  device.controller.js
  group.controller.js
  telemetry.controller.js
  user.controller.js
middleware/
  auth.middleware.js
  error.middleware.js
  validate.middleware.js
models/
  device.model.js
  group.model.js
  telemetry.model.js
  user.model.js
routes/
  auth.routes.js
  device.routes.js
  group.routes.js
  telemetry.routes.js
  user.routes.js
services/
  ai.service.js
  alert.service.js
  command.publisher.js
  data.processor.js
  mqtt.server.js
  schema.discover.js
  websocket.server.js
utils/
  eventEmitter.js
```

**iot-frontend/**

```text
eslint.config.mjs
jsconfig.json
next.config.js
package.json
postcss.config.js
tailwind.config.js
components/
  AddDeviceForm.js
  AddGroupForm.js
  ComparativeChart.js
  ConnectionWizard.js
  ControlsPanel.js
  DeviceCard.js
  DynamicWidget.js
  IoTIllustration.js
  Layout.js
  Modal.js
  ProtectedRoute.js
  SliderControl.js
  TelemetryChart.js
pages/
  _app.js
  _document.js
  api/hello.js
  dashboard.js
  device/[id].js
  index.js
  login.js
  register.js
services/
  api.js
  context/AuthContext.js
```

Additional simulator: [mock_pi.py](mock_pi.py).

### 2. Feature status table

| Feature | File(s) | Status (Working / Partial / Stub / Missing) | Notes |
|---|---|---|---|
| MQTT ingestion | `iot-backend/services/data.processor.js`, `iot-backend/services/mqtt.server.js` | Partial | Cloud MQTT ingestion saves telemetry and updates status. The embedded broker is separate from the cloud subscriber. |
| Schema discovery | `iot-backend/services/schema.discover.js`, `iot-backend/models/device.model.js` | Partial / broken | Code accesses `device.schema`, but the Device schema defines `data_map`, not `schema`. |
| Socket.io push | `iot-backend/services/websocket.server.js`, `iot-frontend/pages/dashboard.js`, `iot-frontend/pages/device/[id].js` | Working | Authenticated Socket.io connections receive status and telemetry events. |
| Device CRUD | `iot-backend/controllers/device.controller.js`, `iot-backend/routes/device.routes.js` | Partial | Create, read, delete, PATCH settings, schema update, and controls exist. No general PUT endpoint exists. |
| Groups | `iot-backend/controllers/group.controller.js`, `iot-backend/routes/group.routes.js` | Partial | Create and list only. No update or delete endpoint. |
| Auth | `iot-backend/controllers/auth.controller.js`, `iot-backend/middleware/auth.middleware.js` | Working / Partial | Registration, login, bcrypt hashing, and JWT protection exist. No server-side logout or refresh-token flow. |
| Bidirectional commands | `iot-backend/services/websocket.server.js`, `iot-backend/services/command.publisher.js`, `mock_pi.py` | Partial | Dashboard commands reach MQTT and the simulator consumes them. No command acknowledgement or delivery result is returned. |
| CSV export | `iot-frontend/pages/device/[id].js` | Working | Client-side CSV generation from loaded telemetry. |
| PDF export | `iot-frontend/pages/device/[id].js` | Working | Client-side jsPDF/autotable export. |
| Alerts | `iot-backend/services/alert.service.js` | Partial | Emits Socket.io `new-alert`; no persistence and no frontend listener was found. |
| Anomaly detection | `iot-backend/services/ai.service.js` | Stub / Partial | Depends on `AI_ANOMALY_DETECTION_URL`; the configured endpoint is a placeholder. No local threshold logic exists. |
| Gemini integration | `iot-backend/services/ai.service.js`, `iot-backend/controllers/telemetry.controller.js` | Partial | Gemini recommendations are wired to the insights endpoint and manual report button. |
| AIInsights UI | `iot-frontend/pages/device/[id].js` | Working | No separate `AIInsights.js` exists; the UI is inline in the device page. |

### 3. AI code, in detail

`iot-backend/services/ai.service.js` contains:

- `getAIRecommendations(deviceId)`
  - Input: device ID string.
  - Reads up to 50 telemetry documents, sorted newest first.
  - Sends only the newest 20 records in the prompt.
  - Output: `{ critical: [], optimization: [], maintenance: [] }`.
  - Uses Gemini response text and parses it with `JSON.parse`.
  - If parsing fails, raw response text is placed into `optimization`.
  - If the API call fails, the error message is placed into `optimization`.

- `callAIModel(data)`
  - Input: one telemetry record.
  - Sends `{ data }` by POST to `AI_ANOMALY_DETECTION_URL`.
  - Output: `response.data`, or `null` on error.
  - Returns `null` when the endpoint is missing or contains the placeholder endpoint name.

- `initializeAIService()`
  - Registers a `new-data` event listener.
  - Calls `callAIModel` once per received record.
  - Emits `anomaly-detected` only when the external response has truthy `is_anomaly`.

Exact Gemini prompt:

```text
        Analyze the following IoT device telemetry data (last 20 points):
        ${dataSummary}

        You MUST respond with ONLY valid JSON in this exact format (no markdown, no code blocks, just raw JSON):
        {
          "critical": ["list of anomalies or critical alerts detected"],
          "optimization": ["list of optimization tips and performance insights"],
          "maintenance": ["list of maintenance predictions and recommendations"]
        }

        Rules:
        - Each array should have 1-3 concise items (max 50 words each)
        - critical: anomalies, spikes, dangerous values, immediate attention needed
        - optimization: efficiency tips, performance suggestions, positive observations
        - maintenance: predictive maintenance, scheduled checks, component wear alerts
        - If no items for a category, use an empty array []
        - Be professional and technical
```

- Gemini model: `gemini-1.5-flash`.
- SDK: `@google/generative-ai`.
- Call style: `genAI.getGenerativeModel(...).generateContent(prompt)`.
- Response format: plain text from `response.text()`, then manually parsed as JSON.
- No Gemini call occurs for every reading. Gemini is called only when the user clicks **Generate Report**, which calls `GET /api/telemetry/:deviceId/insights` in `iot-frontend/pages/device/[id].js`.
- The separate anomaly service is triggered on every `new-data` record, but is disabled when the configured anomaly endpoint is absent or still a placeholder.

**Anomaly detection**

No local rules, thresholds, or rolling-window calculations exist. The external service receives one record at a time through `callAIModel(data)`. The only required result field is `is_anomaly`; details are copied into the alert payload.

**Models/Schemas**

No `Anomaly` Mongoose model exists. No AI-specific Mongoose schema exists. The only related runtime payload is the in-memory `anomaly-detected` event in `iot-backend/services/ai.service.js`.

**AIInsights UI**

There is no `AIInsights.js` file. The UI is inline in `iot-frontend/pages/device/[id].js`:

- `handleGenerateReport()` requests `/telemetry/:deviceId/insights`.
- The response is stored in `aiInsights`.
- Three panels display `critical`, `optimization`, and `maintenance`.
- Initial state says “Click Generate Report”.
- Backend `new-alert` events are not listened to by the frontend.

### 4. Data models

No TTL indexes are defined. Telemetry has one compound index.

**Device — `iot-backend/models/device.model.js`**

```text
deviceId: String, required, unique
deviceType: String, required
group: ObjectId, ref Group
user: ObjectId, ref User, required
status: String, enum online/offline, default offline
broker_url: String
broker_port: Number
client_id: String
telemetryTopic: String, required, unique
commandTopic: String, required, unique
credentials.username: String, required, unique
credentials.secret: String, required
data_map: array of:
  raw_key: String, required
  alias: String, required
  type: String, default number
  unit: String, default empty
  widget: String, default text
controls: array of:
  type: String, enum slider/button/switch, required
  label: String, required
  command_key: String, required
  payload: Mixed
  min: Number
  max: Number
createdAt / updatedAt: timestamps
```

**Telemetry — `iot-backend/models/telemetry.model.js`**

```text
deviceId: String, required
values: Map<String, Mixed>, required
timestamp: Date, default Date.now
index: { deviceId: 1, timestamp: -1 }
```

**Group — `iot-backend/models/group.model.js`**

```text
name: String, required, trimmed
user: ObjectId, ref User, required
createdAt / updatedAt: timestamps
```

**User — `iot-backend/models/user.model.js`**

```text
username: String, required, unique, trimmed
email: String, required, unique, lowercase
password: String, required
createdAt: timestamp
```

Passwords are hashed with bcrypt in the User pre-save hook.

**Anomaly**

No Anomaly schema or model exists.

### 5. Real-time and command flow

**Socket.io events**

| Event | Direction | Payload | File |
|---|---|---|---|
| `device-command` | Frontend → backend | `{ deviceId, payload }` | `iot-backend/services/websocket.server.js` |
| `device-status` | Backend → frontend | `{ deviceId, status }` | `iot-backend/services/websocket.server.js` |
| `live-telemetry` | Backend → frontend | `{ deviceId, payload, timestamp, status }` | `iot-backend/services/websocket.server.js` |
| `new-alert` | Backend → frontend | `{ id, type, title, message, timestamp }` | `iot-backend/services/alert.service.js` |
| `new-data` | Internal event emitter | `{ deviceId, data }` | `iot-backend/services/data.processor.js` |
| `status-update` | Internal event emitter | `{ deviceId, status }` | `iot-backend/services/mqtt.server.js` |
| `anomaly-detected` | Internal event emitter | `{ deviceId, anomalyDetails, timestamp }` | `iot-backend/services/ai.service.js` |

**Command flow**

1. The frontend emits `device-command` with `deviceId` and `payload` from `iot-frontend/pages/device/[id].js`.
2. The backend verifies the Socket.io JWT during connection in `iot-backend/services/websocket.server.js`.
3. It queries the device using both `deviceId` and `user: socket.user.id`.
4. If found, it calls `publishCommand(device.commandTopic, payload)`.
5. `iot-backend/services/command.publisher.js` publishes the JSON payload to MQTT.
6. `mock_pi.py` subscribes to its command topic and handles `{ "target": "...", "value": ... }`.

Validation is minimal:

- `deviceId` and `payload` must be truthy.
- Device ownership is checked.
- Payload keys and value types are not validated server-side.
- MQTT command delivery is not acknowledged.
- Controls describe intended command keys, but arbitrary payloads can be sent by any authenticated owner.

The device schema identifies configured controls through `controls[].command_key`, but telemetry keys are also rendered as sliders in `iot-frontend/pages/device/[id].js`. Therefore, read-only versus controllable fields is not strictly enforced.

`mock_pi.py` updates only the matching key in `device_state`. Changing `power` changes later `power` telemetry only; it does not change temperature, humidity, voltage, CPU usage, or battery level. Telemetry adds random jitter to most values.

### 6. API endpoints

| Method | Path | Auth required | Controller file |
|---|---|---:|---|
| POST | `/api/auth/register` | No | `iot-backend/controllers/auth.controller.js` |
| POST | `/api/auth/login` | No | `iot-backend/controllers/auth.controller.js` |
| GET | `/api/users/me` | Yes | `iot-backend/controllers/user.controller.js` |
| GET | `/api/groups` | Yes | `iot-backend/controllers/group.controller.js` |
| POST | `/api/groups` | Yes | `iot-backend/controllers/group.controller.js` |
| POST | `/api/devices` | Yes | `iot-backend/controllers/device.controller.js` |
| GET | `/api/devices` | Yes | `iot-backend/controllers/device.controller.js` |
| GET | `/api/devices/:id` | Yes | `iot-backend/controllers/device.controller.js` |
| DELETE | `/api/devices/:id` | Yes | `iot-backend/controllers/device.controller.js` |
| PATCH | `/api/devices/:id` | Yes | `iot-backend/controllers/device.controller.js` |
| PATCH | `/api/devices/:id/schema` | Yes | `iot-backend/controllers/device.controller.js` |
| POST | `/api/devices/:id/controls` | Yes | `iot-backend/controllers/device.controller.js` |
| PUT | `/api/devices/:id/controls/:controlId` | Yes | `iot-backend/controllers/device.controller.js` |
| POST | `/api/telemetry/:deviceId` | **No** | `iot-backend/controllers/telemetry.controller.js` |
| GET | `/api/telemetry/:deviceId` | Yes | `iot-backend/controllers/telemetry.controller.js` |
| GET | `/api/telemetry/:deviceId/summary` | Yes | `iot-backend/controllers/telemetry.controller.js` |
| GET | `/api/telemetry/:deviceId/insights` | Yes | `iot-backend/controllers/telemetry.controller.js` |

### 7. Config and deployment readiness

Secret values are intentionally redacted.

**Environment variable names**

- `iot-backend/.env`: `PORT=<redacted>`, `MONGO_URI=<redacted>`, `JWT_SECRET=<redacted>`, `JWT_EXPIRES_IN=<redacted>`, `AI_ANOMALY_DETECTION_URL=<redacted>`, `GEMINI_API_KEY=<redacted>`.
- `MONGO_URI` is read by `iot-backend/config/db.js`.
- `JWT_SECRET` and `JWT_EXPIRES_IN` are read by `auth.controller.js`, `auth.middleware.js`, and `websocket.server.js`.
- `PORT` is read by `server.js`.
- `AI_ANOMALY_DETECTION_URL` and `GEMINI_API_KEY` are read by `ai.service.js`.

`.env` is ignored by `iot-backend/.gitignore` and is not tracked.

**Hardcoded URLs and ports**

- Frontend API base URL: `http://localhost:5000/api` in `iot-frontend/services/api.js`.
- Frontend Socket.io URL: `http://localhost:5000` in `iot-frontend/pages/dashboard.js` and `iot-frontend/pages/device/[id].js`.
- Backend HTTP default port: `5000` in `iot-backend/server.js`.
- Embedded MQTT ports: `1883` and `8883` in `iot-backend/services/mqtt.server.js`.
- Cloud MQTT connection details are hardcoded in `iot-backend/services/data.processor.js`, `iot-backend/services/command.publisher.js`, `iot-backend/reset_device.js`, and `mock_pi.py`. Values are redacted.

**CORS and Socket.io**

- Express uses unrestricted `cors()` in `iot-backend/server.js`.
- Socket.io uses `origin: '*'` in `iot-backend/services/websocket.server.js`.

**Deployment blockers**

- Frontend URLs point to localhost and are not environment-configurable.
- Socket.io origin is unrestricted.
- MQTT credentials are hardcoded in tracked files.
- `cert.pem` and `key.pem` are present in the backend root and loaded by `mqtt.server.js`.
- The backend requires MongoDB connectivity during startup.
- The configured anomaly endpoint is a placeholder.
- The frontend build may require a configured public API URL for Vercel.
- The embedded MQTT broker and TLS certificate setup may not be suitable for Render without persistent certificate/port configuration.
- `createDevice.js` does not match the current Device schema: it supplies `secret` instead of `credentials`, and omits required fields such as `deviceType`, `telemetryTopic`, and `commandTopic`.

**Committed or hardcoded credentials**

The following tracked files contain hardcoded MQTT credentials; values are not reproduced here:

- `mock_pi.py`
- `iot-backend/services/command.publisher.js`
- `iot-backend/services/data.processor.js`
- `iot-backend/reset_device.js`

`iot-backend/.env` is not tracked, but it contains configured secret values locally.

### 8. Problems found

| Severity | Problem | File(s) |
|---|---|---|
| Critical | Real MQTT credentials are hardcoded in tracked files. Values redacted. | `mock_pi.py`, `iot-backend/services/command.publisher.js`, `iot-backend/services/data.processor.js`, `iot-backend/reset_device.js` |
| High | Unauthenticated `POST /api/telemetry/:deviceId` allows anyone who knows a device ID to inject telemetry and mark the device online. | `iot-backend/routes/telemetry.routes.js`, `iot-backend/controllers/telemetry.controller.js` |
| High | Device creation returns the plaintext device secret in the API response. | `iot-backend/controllers/device.controller.js` |
| High | Schema discovery uses nonexistent `device.schema` instead of `data_map`. | `iot-backend/services/schema.discover.js`, `iot-backend/models/device.model.js` |
| High | Telemetry and command traffic use separate hardcoded cloud MQTT connections while the application also starts a separate local broker. | `iot-backend/services/data.processor.js`, `iot-backend/services/command.publisher.js`, `iot-backend/services/mqtt.server.js` |
| Medium | CORS and Socket.io allow all origins. | `iot-backend/server.js`, `iot-backend/services/websocket.server.js` |
| Medium | Error responses expose stack traces outside production mode. | `iot-backend/middleware/error.middleware.js` |
| Medium | No payload validation exists for device commands; arbitrary keys and values are forwarded to MQTT. | `iot-backend/services/websocket.server.js` |
| Medium | Alerts are emitted but not stored, and the frontend does not listen for `new-alert`. | `iot-backend/services/alert.service.js`, `iot-frontend/` |
| Medium | Anomaly detection has no local rules or thresholds and depends on a placeholder external endpoint. | `iot-backend/services/ai.service.js`, `iot-backend/.env` |
| Medium | `updateDevice` writes `name`, but `name` is not defined in the Device schema. | `iot-backend/controllers/device.controller.js`, `iot-backend/models/device.model.js` |
| Medium | `ControlsPanel` reads `control.commandKey`, but the schema and main page use `command_key`. | `iot-frontend/components/ControlsPanel.js`, `iot-backend/models/device.model.js` |
| Low | Debug logs expose authentication payloads, user identifiers, command payloads, and connection details. | `iot-backend/services/websocket.server.js`, `iot-backend/services/mqtt.server.js`, `iot-backend/controllers/group.controller.js` |
| Low | `handlePowerToggle`, `handleBrightnessChange`, and `handleReboot` are UI-only simulations; they do not send commands. | `iot-frontend/pages/device/[id].js` |
| Low | `createDevice.js` appears obsolete and cannot create a valid current Device document. | `iot-backend/createDevice.js` |

### 9. Extension points

The easiest place for a **proposal → approve → execute → verify** flow is the existing command path:

1. **Proposal**
   - Add a proposal service or controller beside `iot-backend/controllers/device.controller.js`.
   - Store proposal metadata in a new Mongoose model.
   - Use the existing `deviceId`, `payload`, and `command_key` concepts.

2. **Approval**
   - Add a protected route beside `iot-backend/routes/device.routes.js`.
   - Approval should verify that the authenticated user owns the device.

3. **Execute**
   - Reuse the Socket.io handler in `iot-backend/services/websocket.server.js`.
   - Reuse `publishCommand()` in `iot-backend/services/command.publisher.js`.

4. **Verify**
   - Observe telemetry through the `new-data` event in `iot-backend/services/data.processor.js`.
   - Observe frontend confirmation through `live-telemetry` in `iot-frontend/pages/device/[id].js`.
   - For connectivity verification, use `status-update` and `device-status` from `iot-backend/services/websocket.server.js`.

The current code has no command acknowledgement protocol, so verification would need to be added explicitly rather than inferred from successful MQTT publication.
