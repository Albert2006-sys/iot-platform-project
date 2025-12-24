# IoT Platform Project

A full-stack IoT platform for managing and monitoring IoT devices with real-time data visualization, MQTT communication, and AI-powered analytics.

## 🚀 Features

- **Real-time Device Monitoring** - Live telemetry data visualization with WebSocket updates
- **MQTT Broker** - Built-in secure MQTT broker for device communication (ports 1883/8883)
- **Device Management** - Add, configure, and control IoT devices
- **Group Management** - Organize devices into logical groups
- **AI-Powered Analytics** - Automatic anomaly detection and insights
- **Alert System** - Real-time notifications for device anomalies
- **Schema Discovery** - Automatic detection of device data structures
- **Authentication & Authorization** - Secure JWT-based user management
- **Interactive Dashboard** - Real-time charts and device controls

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **MQTT** (Aedes broker)
- **Socket.IO** for WebSocket communication
- **JWT** for authentication
- **bcrypt** for password hashing

### Frontend
- **Next.js 15.5.2** (React 19)
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Axios** for API requests
- **Socket.IO Client** for real-time updates

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- Git

## 🔧 Installation

1. **Clone the repository**
```bash
git clone https://github.com/Albert2006-sys/iot-platform-project.git
cd iot-platform-project
```

2. **Install backend dependencies**
```bash
cd iot-backend
npm install
```

3. **Install frontend dependencies**
```bash
cd ../iot-frontend
npm install
```

4. **Configure environment variables**

Create `.env` file in `iot-backend/`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/iot-platform
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
```

## 🚀 Running the Application

### Start Backend Server
```bash
cd iot-backend
npm start
```
Backend runs on `http://localhost:5000`
- MQTT broker: `mqtt://localhost:1883` (unsecure)
- MQTTS broker: `mqtts://localhost:8883` (secure)

### Start Frontend Server
```bash
cd iot-frontend
npm run dev
```
Frontend runs on `http://localhost:3000`

## 📁 Project Structure

```
iot-platform-project/
├── iot-backend/
│   ├── config/          # Database configuration
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Auth, validation, error handling
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   │   ├── mqtt.server.js       # MQTT broker
│   │   ├── websocket.server.js  # WebSocket server
│   │   ├── ai.service.js        # AI analytics
│   │   ├── alert.service.js     # Alert system
│   │   ├── data.processor.js    # Data processing
│   │   └── schema.discover.js   # Schema discovery
│   └── utils/           # Utility functions
│
└── iot-frontend/
    ├── components/      # React components
    ├── pages/          # Next.js pages
    ├── services/       # API & context
    └── styles/         # Global styles
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Devices
- `GET /api/devices` - Get all devices
- `POST /api/devices` - Create device
- `GET /api/devices/:id` - Get device by ID
- `PUT /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Delete device

### Groups
- `GET /api/groups` - Get all groups
- `POST /api/groups` - Create group

### Telemetry
- `GET /api/telemetry/device/:deviceId` - Get device telemetry data
- `GET /api/telemetry/device/:deviceId/latest` - Get latest readings

### Users
- `GET /api/users/profile` - Get user profile

## 📡 MQTT Topics

- `devices/{deviceId}/data` - Device telemetry data
- `devices/{deviceId}/command` - Device commands

## 🔐 Authentication

The platform uses JWT tokens for authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## 🤖 AI Features

- **Anomaly Detection** - Automatically detects unusual device behavior
- **Predictive Analytics** - Forecasts potential issues
- **Pattern Recognition** - Identifies trends in device data

## 📊 Data Processing

The platform includes:
- Real-time data ingestion via MQTT
- Automatic schema discovery for new device types
- Data validation and normalization
- Time-series data storage

## 🛡️ Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation and sanitization
- Secure MQTT with TLS support

## 📝 License

This project is open source and available under the MIT License.

## 👨‍💻 Author

**Albert2006-sys**
- GitHub: [@Albert2006-sys](https://github.com/Albert2006-sys)

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📧 Support

For support, email albertjohn1639@gmail.com or open an issue in the repository.
