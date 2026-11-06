# LumenLink

> **Illuminate the invisible. Link the impossible.**

[![Node.js](https://img.shields.io/badge/Node.js-runtime-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-database-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-AI-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![MQTT](https://img.shields.io/badge/MQTT-MQTTS%20TLS-660066)](https://mqtt.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#licence)

LumenLink is a full-stack, real-time IoT management platform built for a hackathon. It monitors device telemetry, detects anomalies with a rolling baseline, proposes remediation with Google Gemini or a rules-based fallback, and requires human approval before sending a command back to the device.

## Architecture

```text
Python simulator (mock_pi.py)
        |
        v
MQTTS (HiveMQ Cloud, TLS port 8883)
        |
        v
Node.js backend
(anomaly detector, Gemini, Socket.IO)
        |
        v
Next.js frontend
(live dashboard, AI Action Center)
```

## Features

| Feature | Status | Details |
|---|---|---|
| Real-time telemetry pipeline | Working | MQTT → backend → Socket.IO → browser |
| Dynamic widgets | Working | Schema-agnostic widgets through `DynamicWidget.js` |
| Device control | Working | Bidirectional MQTT commands |
| Rolling-baseline anomaly detection | Working | Z-score detection with a 20-reading warm-up, three consecutive readings, and warning/critical severity |
| AI anomaly proposals | Working | Gemini proposals with a rules-based fallback; the source is reported as `gemini` or `rules` |
| Human approval workflow | Working | Users approve or reject proposals in the UI; approval publishes the command over MQTT |
| AI Insights | Working | The **Generate Report** button calls Gemini |
| Device and group management | Working | Manage devices and groups through the platform |
| Telemetry export | Working | CSV and PDF export |
| Device alerts | Working | Live alert banner on the device page |
| UI animations | Working | Framer Motion animations for proposal cards, modal entrance, dashboard card stagger, and device page fade-ins |
| JWT authentication | Working | JWT-based authentication |
| End-to-end proposal status | Partial | Proposal → executed → verified works in unit tests, but was not reliably reproduced in the full live pipeline during development |
| Deployment | Partial | Runs locally only; MongoDB is local and there is no cloud deployment |

## Tech Stack

| Area | Technologies |
|---|---|
| Backend | Node.js, Express, Mongoose, Socket.IO, `paho-mqtt` |
| MQTT | HiveMQ Cloud over MQTTS TLS port 8883 |
| Frontend | Next.js 15, React, Tailwind CSS, Recharts, Framer Motion, Lucide React |
| Database | MongoDB |
| AI | Google Gemini API (`gemini-2.5-flash`) with a rules-based fallback |
| Device simulator | Python 3, `paho-mqtt` (`mock_pi.py`) |
| Reporting | jsPDF, `jspdf-autotable`, CSV export |

## Prerequisites

- Node.js and npm
- Python 3
- A local MongoDB instance
- HiveMQ Cloud MQTT credentials
- A Google Gemini API key
- Git

## Setup and Running

1. Clone the repository:

   ```bash
   git clone https://github.com/Albert2006-sys/iot-platform-project.git
   cd iot-platform-project
   ```

2. Copy `iot-backend/.env.example` to `iot-backend/.env` and fill in:

   ```text
   MONGO_URI
   PORT
   JWT_SECRET
   JWT_EXPIRES_IN
   GEMINI_API_KEY
   GEMINI_MODEL
   MQTT_HOST
   MQTT_PORT
   MQTT_USERNAME
   MQTT_PASSWORD
   DEVICE_ID
   SIM_FAULT_HEAT
   SIM_COOL_RATE
   FRONTEND_ORIGIN
   ```

3. Install backend dependencies:

   ```bash
   cd iot-backend
   npm install
   ```

4. Install frontend dependencies:

   ```bash
   cd ../iot-frontend
   npm install
   ```

   Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` in `iot-frontend/.env.local`.

5. Start MongoDB locally.

6. Start the backend:

   ```bash
   cd ../iot-backend
   npm start
   ```

7. In another terminal, start the frontend:

   ```bash
   cd iot-frontend
   npm run dev
   ```

8. In another terminal, from the project root, start the device simulator. Its required environment variables must be set:

   ```bash
   python mock_pi.py
   ```

## Testing the AI Pipeline

1. Start the backend, frontend, and simulator.
2. Wait for at least 20 normal telemetry readings. The detector needs this warm-up period after each backend restart.
3. From the project root, inject an overheat fault:

   ```bash
   python send_fault.py overheat
   ```

4. Review the anomaly proposal in the AI Action Center.
5. Select **Approve** to publish the proposed command to the device over MQTT, or **Reject** to decline it.

The proposal source is either `gemini` or `rules`, depending on which path produced it. The complete proposal → executed → verified status flow is covered by unit tests, but was not reliably reproduced in the full live pipeline during development.

## Project Structure

```text
iot-platform-project/
├── iot-backend/        # Node.js backend
├── iot-frontend/       # Next.js frontend
├── mock_pi.py          # Python device simulator
├── send_fault.py       # Fault injection helper
├── test_proposals.js   # Proposal unit tests
├── TESTING.md          # Manual test steps
├── DEMO.md             # Demo script
└── .env.example        # Environment variable template
```

## Known Limitations

- The full end-to-end proposal status flow is not reliably verified in the live pipeline.
- The anomaly detector requires a 20-reading warm-up after each backend restart.
- The detector keeps its rolling baseline in memory, so that baseline resets when the backend restarts.
- The platform currently runs locally only, with a local MongoDB instance and no cloud deployment.

## Built With and Acknowledgements

LumenLink was built for the **INFINEX 2K26 Global AI Hackathon (PropCare NW, November 2026)** by **Albert John** ([Albert2006-sys](https://github.com/Albert2006-sys)).

The project uses Node.js, Express, Mongoose, Socket.IO, paho-mqtt, HiveMQ Cloud, Next.js, React, Tailwind CSS, Recharts, Framer Motion, Lucide React, MongoDB, Google Gemini, Python, jsPDF, and `jspdf-autotable`.

## Licence

This project is released under the [MIT Licence](https://opensource.org/license/mit/).
