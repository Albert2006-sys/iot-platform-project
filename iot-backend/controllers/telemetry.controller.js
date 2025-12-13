const asyncHandler = require('express-async-handler');
const Device = require('../models/device.model');
const Telemetry = require('../models/telemetry.model');

const getTelemetry = asyncHandler(async (req, res) => {
  const device = await Device.findOne({ deviceId: req.params.deviceId, user: req.user.id });
  if (!device) {
    res.status(404);
    throw new Error('Device not found or not authorized');
  }

  const { start, end, range = '24h' } = req.query;
  const query = { deviceId: req.params.deviceId };

  if (start && end) {
    query.timestamp = { $gte: new Date(start), $lte: new Date(end) };
  } else {
    const now = new Date();
    let startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    if (range.endsWith('h')) {
      startTime = new Date(now.getTime() - parseInt(range) * 60 * 60 * 1000);
    } else if (range.endsWith('d')) {
      startTime = new Date(now.getTime() - parseInt(range) * 24 * 60 * 60 * 1000);
    }
    query.timestamp = { $gte: startTime };
  }

  const telemetryData = await Telemetry.find(query).sort({ timestamp: -1 }).limit(5000);
  res.json(telemetryData);
});

const getTelemetrySummary = asyncHandler(async (req, res) => {
  const device = await Device.findOne({ deviceId: req.params.deviceId, user: req.user.id });
  if (!device) {
    res.status(404);
    throw new Error('Device not found or not authorized');
  }

  const dataKeys = device.schema.map(s => s.key);
  if (dataKeys.length === 0) {
    return res.json({ message: "No schema defined for this device yet." });
  }

  const groupStage = { _id: null };
  dataKeys.forEach(key => {
    groupStage[`avg_${key}`] = { $avg: { $toDouble: `$payload.${key}` } };
    groupStage[`min_${key}`] = { $min: `$payload.${key}` };
    groupStage[`max_${key}`] = { $max: `$payload.${key}` };
  });
  groupStage['count'] = { $sum: 1 };

  const summary = await Telemetry.aggregate([
    { $match: { deviceId: req.params.deviceId, timestamp: { $gte: new Date(new Date() - 24 * 60 * 60 * 1000) } } },
    { $group: groupStage },
    { $project: { _id: 0 } }
  ]);
  
  res.json(summary[0] || {});
});

module.exports = { getTelemetry, getTelemetrySummary };
