const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Sub-schema for data key aliases
const schemaEntrySchema = mongoose.Schema({
  key: { type: String, required: true },
  displayName: { type: String, required: true },
}, { _id: false });

// Sub-schema for control widgets
const controlSchema = mongoose.Schema({
  type: { type: String, required: true, enum: ['slider', 'button', 'switch'] },
  label: { type: String, required: true },
  commandKey: { type: String, required: true },
  min: { type: Number },
  max: { type: Number },
});

const deviceSchema = mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  deviceType: { type: String, required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['online', 'offline'], default: 'offline' },
  telemetryTopic: { type: String, required: true, unique: true },
  commandTopic: { type: String, required: true, unique: true },
  credentials: {
    username: { type: String, required: true, unique: true },
    secret: { type: String, required: true },
  },
  schema: [schemaEntrySchema],
  controls: [controlSchema],
}, { timestamps: true });

// Using a regular 'function' correctly sets the 'this' keyword

const Device = mongoose.model('Device', deviceSchema);
module.exports = Device;
