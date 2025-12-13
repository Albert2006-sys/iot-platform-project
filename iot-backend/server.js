const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { rateLimit } = require('express-rate-limit');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/error.middleware');

// Initializers
const initializeMqttBroker = require('./services/mqtt.server');
const initializeDataProcessor = require('./services/data.processor');
const { initializeWebSocket } = require('./services/websocket.server');
const { initializeCommandPublisher } = require('./services/command.publisher');
const initializeSchemaDiscoverer = require('./services/schema.discover');
const { initializeAIService } = require('./services/ai.service');
const initializeAlertService = require('./services/alert.service');

// Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const groupRoutes = require('./routes/group.routes');
const deviceRoutes = require('./routes/device.routes');
const telemetryRoutes = require('./routes/telemetry.routes');

dotenv.config();
connectDB();
const app = express();

app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/telemetry', telemetryRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize all services
initializeWebSocket(server);
initializeMqttBroker();
initializeDataProcessor();
initializeCommandPublisher();
initializeSchemaDiscoverer();
initializeAIService();
initializeAlertService();

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
