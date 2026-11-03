const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Sub-schema for flexible data mapping
const dataMapSchema = mongoose.Schema({
  raw_key: { type: String, required: true },
  alias: { type: String, required: true },
  type: { type: String, default: 'number' }, // number, boolean, string
  unit: { type: String, default: '' },
  widget: { type: String, default: 'text' } // gauge, line, text
}, { _id: false });

// Sub-schema for control widgets
const controlSchema = mongoose.Schema({
  type: { type: String, required: true, enum: ['slider', 'button', 'switch'] },
  label: { type: String, required: true },
  command_key: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed }, // Payload to send (e.g., 'ON')
  min: { type: Number },
  max: { type: Number },
});

const deviceSchema = mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  deviceType: { type: String, required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['online', 'offline'], default: 'offline' },
  
  // Customizable MQTT settings
  broker_url: { type: String },
  broker_port: { type: Number },
  client_id: { type: String },

  telemetryTopic: { type: String, required: true, unique: true },
  commandTopic: { type: String, required: true, unique: true },
  credentials: {
    username: { type: String, required: true, unique: true },
    secret: { type: String, required: true },
  },
  data_map: [dataMapSchema],
  controls: [controlSchema],
}, { timestamps: true });

// Using a regular 'function' correctly sets the 'this' keyword

const Device = mongoose.model('Device', deviceSchema);
module.exports = Device;
