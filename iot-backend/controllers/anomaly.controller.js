const asyncHandler = require('express-async-handler');
const Device = require('../models/device.model');
const Anomaly = require('../models/anomaly.model');

const getDeviceAnomalies = asyncHandler(async (req, res) => {
  const device = await Device.findOne({
    deviceId: req.params.deviceId,
    user: req.user.id,
  }).select('_id');

  if (!device) {
    res.status(404);
    throw new Error('Device not found');
  }

  const status = req.query.status || 'open';
  if (!['open', 'resolved'].includes(status)) {
    res.status(400);
    throw new Error('Invalid anomaly status');
  }

  const anomalies = await Anomaly.find({
    deviceId: req.params.deviceId,
    status,
  }).sort({ createdAt: -1 }).limit(50);

  res.json(anomalies);
});

module.exports = { getDeviceAnomalies };
