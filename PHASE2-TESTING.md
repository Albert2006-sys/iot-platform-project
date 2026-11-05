# Phase 2 backend testing

## Automated checks

From the repository root:

```powershell
node test_proposals.js
node --check iot-backend/services/proposal.service.js
node --check iot-backend/models/proposal.model.js
```

## Prepare the demo device

Ensure the backend `.env` contains the existing `MONGO_URI` and `DEVICE_ID`, then run:

```powershell
node ensure_power_control.js
```

This adds a `power` slider with a `0` to `100` range only when the configured device does not already have one.

## Manual approval flow

1. Start the backend and simulator.
2. Authenticate through the frontend or call the login endpoint. Keep the returned JWT local; do not paste it into source files or logs.
3. Inject a fault:

```powershell
python send_fault.py overheat
```

4. Query proposals with the JWT:

```powershell
curl.exe -H "Authorization: Bearer <JWT>" http://localhost:5000/api/devices/<DEVICE_ID>/proposals
```

5. Approve the pending proposal:

```powershell
curl.exe -X POST -H "Authorization: Bearer <JWT>" http://localhost:5000/api/proposals/<PROPOSAL_ID>/approve
```

6. Watch the device telemetry. The approved power action is published to MQTT, and the proposal should progress to `executed`, then `verified` after the next readings move toward the anomaly baseline.
7. Rejecting a pending proposal uses:

```powershell
curl.exe -X POST -H "Authorization: Bearer <JWT>" http://localhost:5000/api/proposals/<PROPOSAL_ID>/reject
```

## MongoDB checks

```javascript
db.proposals.find(
  { deviceId: "<DEVICE_ID>" },
  { diagnosis: 1, source: 1, actions: 1, status: 1, baselineBefore: 1, valueAfter: 1, outcomeSummary: 1 }
).sort({ createdAt: -1 })
```
