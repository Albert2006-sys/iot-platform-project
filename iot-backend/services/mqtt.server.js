const aedes = require('aedes');
const tls = require('tls');
const fs = require('fs');
const path = require('path');
const net = require('net');
const bcrypt = require('bcryptjs');
const Device = require('../models/device.model');
const eventEmitter = require('../utils/eventEmitter');

const options = {
  key: fs.readFileSync(path.join(__dirname, '..', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '..', 'cert.pem')),
};

const initializeMqttBroker = () => {
  const broker = aedes();
  
  const secureServer = tls.createServer(options, broker.handle);
  const MQTTS_PORT = 8883;

  const unsecureServer = net.createServer(broker.handle);
  const MQTT_PORT = 1883;
  
  broker.authenticate = async (client, username, password, callback) => {
    if (!username) {
      return callback(null, true);
    }

    try {
      const device = await Device.findOne({ "credentials.username": username }).lean();
      
      if (!device) {
        return callback(new Error('Authentication error: Device not found'), false);
      }
      
      const isMatch = await bcrypt.compare(password.toString(), device.credentials.secret);
      
      if (!isMatch) {
        return callback(new Error('Authentication error: Invalid credentials'), false);
      }
      
      client.device = device;
      callback(null, true);

    } catch (error) {
      console.error('MQTT Authentication Error:', error);
      callback(error, false);
    }
  };

  broker.authorizePublish = (client, packet, callback) => {
    console.log(`[AUTH PUBLISH] Client: ${client.id}, Topic: ${packet.topic}`); // Debug Log
    if (!client.device) {
       return callback(null);
    }
    const topic = client.device.telemetryTopic;
    if (packet.topic === topic) {
      return callback(null);
    }
    console.log(`[AUTH PUBLISH] DENIED for Client: ${client.id}`); // Debug Log
    callback(new Error('Authorization error: You can only publish to your own topic'));
  };

  broker.authorizeSubscribe = (client, sub, callback) => {
    console.log(`[AUTH SUBSCRIBE] Client: ${client.id}, Topic: ${sub.topic}`); // Debug Log
    if (!client.device) {
       return callback(null, sub);
    }
    const topic = client.device.commandTopic;
    if (sub.topic === topic) {
        return callback(null, sub);
    }
    console.log(`[AUTH SUBSCRIBE] DENIED for Client: ${client.id}`); // Debug Log
    callback(new Error('Authorization error: Subscription not allowed'));
  };

  broker.on('client', (client) => {
    if (client.device) {
      console.log(`MQTT client connected: ${client.id}, Device: ${client.device.deviceId}`);
      eventEmitter.emit('status-update', { deviceId: client.device.deviceId, status: 'online' });
    }
  });
  
  broker.on('clientDisconnect', (client) => {
    if (client.device) {
      console.log(`MQTT client disconnected: ${client.id}, Device: ${client.device.deviceId}`);
      eventEmitter.emit('status-update', { deviceId: client.device.deviceId, status: 'offline' });
    }
  });

  secureServer.listen(MQTTS_PORT, function () {
    console.log(`🔒 MQTTS (secure) broker listening on port ${MQTTS_PORT}`);
  });

  unsecureServer.listen(MQTT_PORT, function () {
    console.log(`📡 MQTT (unsecure) broker listening on port ${MQTT_PORT}`);
  });
};

module.exports = initializeMqttBroker;