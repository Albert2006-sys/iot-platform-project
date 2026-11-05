const mongoose = require('mongoose');

const actionSchema = mongoose.Schema({
  target: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  reason: { type: String, required: true },
  verifyKey: { type: String, required: true },
  verifyDirection: { type: String, enum: ['down', 'up'], required: true },
}, { _id: false });

const proposalSchema = mongoose.Schema({
  deviceId: { type: String, required: true },
  anomalyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Anomaly', required: true },
  diagnosis: { type: String, required: true },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  source: { type: String, enum: ['gemini', 'rules'], required: true },
  actions: { type: [actionSchema], default: [] },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'executed', 'verified', 'failed', 'expired'],
    default: 'pending',
  },
  baselineBefore: { type: Number },
  valueAfter: { type: Number },
  outcomeSummary: { type: String },
}, { timestamps: true });

proposalSchema.index(
  { anomalyId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['pending', 'approved', 'executed'] },
    },
  }
);

module.exports = mongoose.model('Proposal', proposalSchema);
