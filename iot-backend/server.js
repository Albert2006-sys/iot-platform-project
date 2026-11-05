const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const cors = require('cors');
const http = require('http');
const { rateLimit } = require('express-rate-limit');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/error.middleware');

// Initializers
const initializeDataProcessor = require('./services/data.processor');
const { initializeWebSocket } = require('./services/websocket.server');
const { initializeCommandPublisher } = require('./services/command.publisher');
const initializeSchemaDiscoverer = require('./services/schema.discover');
const { initializeAIService } = require('./services/ai.service');
const initializeAlertService = require('./services/alert.service');
const { initializeProposalService } = require('./services/proposal.service');

// Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const groupRoutes = require('./routes/group.routes');
const deviceRoutes = require('./routes/device.routes');
const telemetryRoutes = require('./routes/telemetry.routes');
const proposalRoutes = require('./routes/proposal.routes');

connectDB();
const app = express();

const frontendOrigin = process.env.FRONTEND_ORIGIN;
if (!frontendOrigin) {
  throw new Error('FRONTEND_ORIGIN must be configured');
}
app.use(cors({ origin: frontendOrigin }));
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/proposals', proposalRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize all services
initializeWebSocket(server);
initializeDataProcessor();
initializeCommandPublisher();
initializeSchemaDiscoverer();
initializeAIService();
initializeAlertService();
initializeProposalService();

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
