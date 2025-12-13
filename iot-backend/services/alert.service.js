const eventEmitter = require('../utils/eventEmitter');
const Device = require('../models/device.model');
const { getIoInstance } = require('./websocket.server');

const initializeAlertService = () => {
  eventEmitter.on('anomaly-detected', async ({ deviceId, anomalyDetails, timestamp }) => {
    try {
      const io = getIoInstance();
      if (!io) return console.error('Socket.IO instance not available for alerting.');

      const device = await Device.findOne({ deviceId }).select('user');
      if (device && device.user) {
        const userId = device.user.toString();
        const notification = {
          id: new Date().getTime(),
          type: 'danger',
          title: `Anomaly Detected on ${deviceId}`,
          message: anomalyDetails || 'An unusual reading was detected.',
          timestamp,
        };
        io.to(userId).emit('new-alert', notification);
        console.log(`🔔 Pushed alert for device ${deviceId} to user ${userId}`);
      }
    } catch (error) {
      console.error('Error processing anomaly alert:', error);
    }
  });
  console.log('🔔 Alert Service is listening for anomalies');
};

module.exports = initializeAlertService;
