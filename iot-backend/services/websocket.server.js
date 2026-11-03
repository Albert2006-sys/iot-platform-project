const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Device = require('../models/device.model');
const eventEmitter = require('../utils/eventEmitter');
const { publishCommand } = require('./command.publisher');

let io;

const validateCommand = (device, payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'Command payload must be an object';
  }

  const { target, value } = payload;
  if (typeof target !== 'string' || target.length === 0) {
    return 'Command target is required';
  }
  if (!['number', 'boolean'].includes(typeof value) || (typeof value === 'number' && !Number.isFinite(value))) {
    return 'Command value must be a finite number or boolean';
  }

  const mapping = (device.data_map || []).find(item => item.raw_key === target);
  const control = (device.controls || []).find(item => item.command_key === target);
  if (!mapping && !control) {
    return 'Command target is not configured for this device';
  }
  if (control && typeof value === 'number') {
    if (control.min !== undefined && value < control.min) return 'Command value is below the configured minimum';
    if (control.max !== undefined && value > control.max) return 'Command value is above the configured maximum';
  }
  return null;
};

const initializeWebSocket = (server) => {
  const origin = process.env.FRONTEND_ORIGIN;
  if (!origin) {
    throw new Error('FRONTEND_ORIGIN must be configured');
  }
  io = new Server(server, { cors: { origin } });

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
        if (!deviceId) {
          socket.emit('command-error', { message: 'Device ID is required' });
          return;
        }
        const device = await Device.findOne({ deviceId, user: socket.user.id });
        if (device) {
          const validationError = validateCommand(device, payload);
          if (validationError) {
            socket.emit('command-error', { message: validationError });
            return;
          }
          publishCommand(device.commandTopic, payload);
        } else {
          socket.emit('command-error', { message: 'Device not found' });
        }
      } catch (error) {
        console.error('Error processing device-command:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`WebSocket client disconnected: ${socket.id}`);
    });
  });

  // Listen for device status updates (Online/Offline)
  eventEmitter.on('status-update', async ({ deviceId, status }) => {
    try {
      const device = await Device.findOne({ deviceId }).select('user');
      if (device && device.user) {
        io.to(device.user.toString()).emit('device-status', { deviceId, status });
        console.log(`📡 Broadcasted status update for ${deviceId}: ${status}`);
      }
    } catch (error) {
      console.error('Error broadcasting status update:', error);
    }
  });

  // Listen for new telemetry data (from MQTT)
  eventEmitter.on('new-data', async ({ deviceId, data }) => {
    try {
      const device = await Device.findOne({ deviceId }).select('user');
      if (device && device.user) {
        const records = Array.isArray(data) ? data : [data];
        records.forEach(record => {
           const updateData = {
             deviceId,
             payload: record,
             timestamp: record.timestamp || new Date(),
             status: 'online'
           };
           io.to(device.user.toString()).emit('live-telemetry', updateData);
        });
        
        // Ensure status is synced as online
        io.to(device.user.toString()).emit('device-status', { deviceId, status: 'online' });
      }
    } catch (error) {
      console.error('Error broadcasting new data:', error);
    }
  });

  return io;
};

const getIoInstance = () => io;

module.exports = { initializeWebSocket, getIoInstance };