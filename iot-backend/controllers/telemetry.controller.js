const asyncHandler = require('express-async-handler');
const Device = require('../models/device.model');
const Telemetry = require('../models/telemetry.model');
const { getIoInstance } = require('../services/websocket.server');
const { getAIRecommendations } = require('../services/ai.service');

const createTelemetry = asyncHandler(async (req, res) => {
  const { deviceId } = req.params;
  const rawPayload = req.body;

  const device = await Device.findOne({ deviceId });

  if (!device) {
    res.status(404);
    throw new Error('Device not found');
  }

  // Validate against user's data_map (schema)
  const values = new Map();
  if (device.data_map && device.data_map.length > 0) {
    device.data_map.forEach(mapping => {
      if (rawPayload.hasOwnProperty(mapping.raw_key)) {
        // Here we could add type coercion based on mapping.type
        values.set(mapping.raw_key, rawPayload[mapping.raw_key]);
      }
    });
  } else {
    // Fallback: If no schema is defined, store everything (optional, but good for robust systems)
    // Or strictly follow requirements: "validate incoming JSON against the user's data_map"
    // I will store everything if map is empty, otherwise filter.
    // Actually, for strict 'schema-driven', let's iterate keys if map is missing.
    Object.keys(rawPayload).forEach(key => values.set(key, rawPayload[key]));
  }

  const telemetry = await Telemetry.create({
    deviceId,
    values,
    timestamp: new Date(),
  });

  device.status = 'online';
  await device.save();

  const io = getIoInstance();
  if (io && device.user) {
    // Convert Map to Object for JSON transmission
    const payloadObj = Object.fromEntries(values);
    const updateData = {
      deviceId,
      payload: payloadObj,
      timestamp: telemetry.timestamp,
      status: 'online',
    };
    io.to(device.user.toString()).emit('live-telemetry', updateData);
    io.to(device.user.toString()).emit('device-status', { deviceId, status: 'online' });
  }

  res.status(201).json(telemetry);
});

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

  const dataKeys = device.data_map && device.data_map.length > 0 
    ? device.data_map.map(s => s.raw_key) 
    : [];

  if (dataKeys.length === 0) {
    return res.json({ message: "No schema defined for this device yet." });
  }

  const groupStage = { _id: null };
  dataKeys.forEach(key => {
    // Accessing map values in aggregation requires object notation if stored as subdocs, 
    // but Mongoose Map stores as BSON. Access might need specific syntax or just dot notation if converted.
    // However, assuming standard Mongoose Map storage:
    // It's safer to rely on "values.key" if the driver flattens it or $objectToArray if strictly BSON Map.
    // For simplicity with Mongoose Maps in aggregations, simpler dot notation `values.<key>` usually works 
    // if keys are simple strings.
    groupStage[`avg_${key}`] = { $avg: { $toDouble: `$values.${key}` } };
    groupStage[`min_${key}`] = { $min: `$values.${key}` };
    groupStage[`max_${key}`] = { $max: `$values.${key}` };
  });
  groupStage['count'] = { $sum: 1 };

  const summary = await Telemetry.aggregate([
    { $match: { deviceId: req.params.deviceId, timestamp: { $gte: new Date(new Date() - 24 * 60 * 60 * 1000) } } },
    { $group: groupStage },
    { $project: { _id: 0 } }
  ]);
  
  res.json(summary[0] || {});
});

const getDeviceInsights = asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
     const device = await Device.findOne({ deviceId, user: req.user.id });
     if (!device) {
        res.status(404);
        throw new Error('Device not found');
    }

    const insights = await getAIRecommendations(deviceId);
    res.json({ insights });
});

module.exports = { createTelemetry, getTelemetry, getTelemetrySummary, getDeviceInsights };
