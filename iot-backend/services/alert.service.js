const eventEmitter = require('../utils/eventEmitter');
const Device = require('../models/device.model');
const { getIoInstance } = require('./websocket.server');

const initializeAlertService = () => {
  const emitAnomalyAlert = async ({ deviceId, anomalyDetails, anomaly, timestamp, status = 'open' }) => {
    try {
      const io = getIoInstance();
      if (!io) return console.error('Socket.IO instance not available for alerting.');

      const device = await Device.findOne({ deviceId }).select('user');
      if (device && device.user) {
        const userId = device.user.toString();
        const notification = {
          id: anomaly?._id?.toString() || new Date().getTime(),
          anomalyId: anomaly?._id?.toString(),
          type: status === 'resolved' ? 'info' : anomaly?.severity === 'critical' ? 'danger' : 'warning',
          title: status === 'resolved' ? `Anomaly resolved on ${deviceId}` : `Anomaly Detected on ${deviceId}`,
          message: anomalyDetails || 'An unusual reading was detected.',
          timestamp,
          status,
          severity: anomaly?.severity,
          key: anomaly?.key,
          value: anomaly?.value,
        };
        io.to(userId).emit('new-alert', notification);
        console.log(`🔔 Pushed alert for device ${deviceId} to user ${userId}`);
      }
    } catch (error) {
      console.error('Error processing anomaly alert:', error);
    }
  };
  eventEmitter.on('anomaly-detected', emitAnomalyAlert);
  eventEmitter.on('anomaly-updated', ({ anomaly, status }) => emitAnomalyAlert({
    deviceId: anomaly.deviceId,
    anomaly,
    status,
    timestamp: anomaly.updatedAt || new Date(),
    anomalyDetails: `${anomaly.key} returned to normal.`,
  }));
  console.log('🔔 Alert Service is listening for anomalies');
};

module.exports = initializeAlertService;
