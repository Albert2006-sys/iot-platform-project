const asyncHandler = require('express-async-handler');
const { v4: uuidv4 } = require('uuid');
const Device = require('../models/device.model');
const bcrypt = require('bcryptjs');

// @desc    Register a new device
// @route   POST /api/devices
const registerDevice = asyncHandler(async (req, res) => {
    // --- FIX: Changed 'group' to 'groupId' to match the frontend form ---
    const { deviceType, groupId, customDeviceId, customTelemetryTopic } = req.body; 
    if (!deviceType) {
        res.status(400);
        throw new Error('Device type is required');
    }

    const deviceId = customDeviceId || uuidv4();
    const plainSecret = uuidv4();

    const salt = await bcrypt.genSalt(10);
    const hashedSecret = await bcrypt.hash(plainSecret, salt);
    
    // Check if custom ID or Topic already exists
    if (customDeviceId) {
        const exists = await Device.findOne({ deviceId: customDeviceId });
        if (exists) {
            res.status(400);
            throw new Error(`Device ID '${customDeviceId}' is already taken.`);
        }
    }

    const telemetryTopic = customTelemetryTopic || `devices/${deviceId}/data`;
    if (customTelemetryTopic) {
        const exists = await Device.findOne({ telemetryTopic: customTelemetryTopic });
        if (exists) {
             res.status(400);
            throw new Error(`Topic '${customTelemetryTopic}' is already in use.`);
        }
    }

    const device = await Device.create({
        deviceId,
        deviceType,
        // --- FIX: Use the 'groupId' variable to associate the group ---
        group: groupId || null, 
        user: req.user.id,
        broker_url: process.env.MQTT_HOST,
        broker_port: Number(process.env.MQTT_PORT),
        telemetryTopic: telemetryTopic,
        commandTopic: `devices/${deviceId}/commands`,
        credentials: {
            username: deviceId,
            secret: hashedSecret,
        },
    });

    const responseDevice = device.toObject();
    responseDevice.credentials.secret = plainSecret;

    res.status(201).json(responseDevice);
});

// @desc    Get all devices for a user
// @route   GET /api/devices
const getDevices = asyncHandler(async (req, res) => {
    const devices = await Device.find({ user: req.user.id })
        .populate('group', 'name')
        .select('-credentials.secret');
    res.json(devices);
});

// @desc    Get a single device by ID
// @route   GET /api/devices/:id
const getDeviceById = asyncHandler(async (req, res) => {
    const device = await Device.findOne({ deviceId: req.params.id, user: req.user.id })
        .populate('group', 'name')
        .select('-credentials.secret');

    if (device) {
        res.json(device);
    } else {
        res.status(404);
        throw new Error('Device not found');
    }
});

// @desc    Delete a device
// @route   DELETE /api/devices/:id
const deleteDevice = asyncHandler(async (req, res) => {
    const device = await Device.findOne({ deviceId: req.params.id, user: req.user.id });

    if (!device) {
        res.status(404);
        throw new Error('Device not found or you do not have permission');
    }

    await device.deleteOne();

    res.status(200).json({ id: req.params.id, message: 'Device removed' });
});

// Other functions remain the same...
// @desc    Update a device's data map (schema)
// @route   PATCH /api/devices/:id/schema
const updateDeviceSchema = asyncHandler(async (req, res) => {
    // Expect 'data_map' in body, fall back to 'schema' for compatibility if needed, 
    // or just switch to 'data_map'.
    const { data_map, schema } = req.body;
    const device = await Device.findOneAndUpdate(
        { deviceId: req.params.id, user: req.user.id },
        { data_map: data_map || schema }, 
        { new: true, runValidators: true }
    );

    if (!device) {
        res.status(404);
        throw new Error('Device not found');
    }
    res.json(device.data_map);
});

// @desc    Add a new control to a device
// @route   POST /api/devices/:id/controls
// Replace it with this block
const addDeviceControl = asyncHandler(async (req, res) => {
  // First, find the device by its ID
  const device = await Device.findOne({ deviceId: req.params.id });

  // THEN, check if the device exists and if the user owns it
  if (!device || device.user.toString() !== req.user.id) {
    res.status(404);
    throw new Error('Device not found');
  }

  // If checks pass, add the new control and save
  device.controls.push(req.body);
  await device.save();

  res.status(201).json(device);
});

// @desc    Update an existing device control
// @route   PUT /api/devices/:id/controls/:controlId
const updateDeviceControl = asyncHandler(async (req, res) => {
    const device = await Device.findOne({ deviceId: req.params.id, user: req.user.id });
    if (!device) {
        res.status(404);
        throw new Error('Device not found');
    }
    const control = device.controls.id(req.params.controlId);
    if (!control) {
        res.status(404);
        throw new Error('Control not found');
    }
    Object.assign(control, req.body);
    await device.save();
    res.json(device.controls);
});

// @desc    Update device settings (broker, etc)
// @route   PATCH /api/devices/:id
const updateDevice = asyncHandler(async (req, res) => {
    const device = await Device.findOne({ deviceId: req.params.id, user: req.user.id });
    if (!device) {
        res.status(404);
        throw new Error('Device not found');
    }

    const { broker_url, broker_port, client_id, name } = req.body;
    
    if (broker_url !== undefined) device.broker_url = broker_url;
    if (broker_port !== undefined) device.broker_port = broker_port;
    if (client_id !== undefined) device.client_id = client_id;
    if (name !== undefined) device.name = name;

    await device.save();
    res.json(device);
});

module.exports = {
    registerDevice,
    getDevices,
    getDeviceById,
    deleteDevice,
    updateDeviceSchema,
    addDeviceControl,
    updateDeviceControl,
    updateDevice,
};
