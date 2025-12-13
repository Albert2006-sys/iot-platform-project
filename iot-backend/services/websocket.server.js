const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Device = require('../models/device.model');
const eventEmitter = require('../utils/eventEmitter');
const { publishCommand } = require('./command.publisher');

let io;

const initializeWebSocket = (server) => {
  io = new Server(server, { cors: { origin: '*' } });

  // Middleware to authenticate new WebSocket connections
  io.use(async (socket, next) => {
    // DEBUG: Log the authentication payload from the client
    console.log("Auth payload from client:", socket.handshake.auth); 
    
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = await User.findById(decoded.id);
      if (!socket.user) {
        return next(new Error('Authentication error: User not found'));
      }
      next(); // Success
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Handle new connections
  io.on('connection', (socket) => {
    // DEBUG: Confirm the user was decoded correctly
    console.log(`✅ WebSocket client connected: ${socket.id}, User: ${socket.user?.username}`);
    
    // Join a private room named after the user's ID
    socket.join(socket.user.id.toString());

    // Listen for commands from this specific client
    socket.on('device-command', async (command) => {
      try {
        const { deviceId, payload } = command;
        if (!deviceId || !payload) return;
        const device = await Device.findOne({ deviceId, user: socket.user.id });
        if (device) {
          publishCommand(device.commandTopic, payload);
        }
      } catch (error) {
        console.error('Error processing device-command:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`WebSocket client disconnected: ${socket.id}`);
    });
  });

  // Listen for internal events to broadcast data
  eventEmitter.on('new-data', async ({ deviceId, data }) => {
    try {
      const device = await Device.findOne({ deviceId }).select('user');
      if (device && device.user) {
        io.to(device.user.toString()).emit('live-telemetry', { deviceId, data });
      }
    } catch (error) {
      console.error('Error broadcasting new data:', error);
    }
  });

  return io;
};

const getIoInstance = () => io;

module.exports = { initializeWebSocket, getIoInstance };