const mongoose = require('mongoose');

const anomalySchema = mongoose.Schema({
  deviceId: { type: String, required: true },
  key: { type: String, required: true },
  value: { type: Number, required: true },
  zScore: { type: Number, required: true },
  mean: { type: Number, required: true },
  std: { type: Number, required: true },
  severity: { type: String, enum: ['warning', 'critical'], required: true },
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  createdAt: { type: Date, default: Date.now },
});

anomalySchema.index({ deviceId: 1, createdAt: -1 });
anomalySchema.index(
  { deviceId: 1, key: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'open' } }
);

module.exports = mongoose.model('Anomaly', anomalySchema);
