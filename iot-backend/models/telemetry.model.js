const mongoose = require('mongoose');

const telemetrySchema = mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for fast time-series queries, sorted by most recent
telemetrySchema.index({ deviceId: 1, timestamp: -1 });

const Telemetry = mongoose.model('Telemetry', telemetrySchema);
module.exports = Telemetry;
