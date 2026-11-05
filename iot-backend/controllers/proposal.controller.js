const asyncHandler = require('express-async-handler');
const Device = require('../models/device.model');
const Proposal = require('../models/proposal.model');
const { approveProposal, rejectProposal } = require('../services/proposal.service');

const getDeviceProposals = asyncHandler(async (req, res) => {
  const device = await Device.findOne({
    deviceId: req.params.id,
    user: req.user.id,
  }).select('deviceId');

  if (!device) {
    res.status(404);
    throw new Error('Device not found');
  }

  const proposals = await Proposal.find({ deviceId: req.params.id })
    .populate('anomalyId')
    .sort({ createdAt: -1 })
    .limit(50);
  res.json(proposals);
});

const approve = asyncHandler(async (req, res) => {
  const proposal = await Proposal.findById(req.params.id);
  if (!proposal) {
    res.status(404);
    throw new Error('Proposal not found');
  }

  const device = await Device.findOne({
    deviceId: proposal.deviceId,
    user: req.user.id,
  });
  if (!device) {
    res.status(404);
    throw new Error('Device not found');
  }

  res.json(await approveProposal(proposal, device));
});

const reject = asyncHandler(async (req, res) => {
  const proposal = await Proposal.findById(req.params.id);
  if (!proposal) {
    res.status(404);
    throw new Error('Proposal not found');
  }

  const device = await Device.findOne({
    deviceId: proposal.deviceId,
    user: req.user.id,
  });
  if (!device) {
    res.status(404);
    throw new Error('Device not found');
  }

  res.json(await rejectProposal(proposal, device));
});

module.exports = { getDeviceProposals, approve, reject };
