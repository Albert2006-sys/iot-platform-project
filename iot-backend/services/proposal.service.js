const { GoogleGenerativeAI } = require('@google/generative-ai');
const eventEmitter = require('../utils/eventEmitter');
const Device = require('../models/device.model');
const Anomaly = require('../models/anomaly.model');
const Proposal = require('../models/proposal.model');
const Telemetry = require('../models/telemetry.model');
const { publishCommand } = require('./command.publisher');
const { getIoInstance } = require('./websocket.server');
const { getCommandKeys } = require('./simulator.capabilities');

const GEMINI_TIMEOUT_MS = 8000;
const MAX_ACTIONS = 2;
const ACTIVE_STATUSES = ['pending', 'approved', 'executed'];

const asPlainValues = values => {
  if (values instanceof Map) return Object.fromEntries(values);
  return values && typeof values === 'object' ? values : {};
};

const emitProposal = async (deviceId, event, proposal) => {
  const device = await Device.findOne({ deviceId }).select('user');
  const io = getIoInstance();
  if (io && device?.user) io.to(device.user.toString()).emit(event, proposal);
};

const getControlValueType = control => control.type === 'switch' ? 'boolean' : 'number';

const validateActions = (actions, device, telemetryKeys) => {
  if (!Array.isArray(actions) || actions.length > MAX_ACTIONS) {
    return { valid: false, errors: [`A proposal may contain at most ${MAX_ACTIONS} actions`] };
  }

  const errors = [];
  const validated = [];
  for (const action of actions) {
    const control = (device.controls || []).find(item => item.command_key === action?.target);
    if (!control) {
      errors.push(`Unknown control target: ${action?.target || 'missing'}`);
      continue;
    }

    const expectedType = getControlValueType(control);
    if (typeof action.value !== expectedType
      || (expectedType === 'number' && !Number.isFinite(action.value))) {
      errors.push(`Invalid value type for control ${control.command_key}`);
      continue;
    }
    if (expectedType === 'number'
      && ((control.min !== undefined && action.value < control.min)
        || (control.max !== undefined && action.value > control.max))) {
      errors.push(`Value is outside the configured range for ${control.command_key}`);
      continue;
    }
    if (!telemetryKeys.includes(action.verifyKey)) {
      errors.push(`Unknown verification key: ${action.verifyKey || 'missing'}`);
      continue;
    }
    if (!['down', 'up'].includes(action.verifyDirection)
      || typeof action.reason !== 'string' || action.reason.trim().length === 0) {
      errors.push(`Invalid verification or reason data for ${control.command_key}`);
      continue;
    }
    validated.push({
      target: control.command_key,
      value: action.value,
      reason: action.reason.trim(),
      verifyKey: action.verifyKey,
      verifyDirection: action.verifyDirection,
    });
  }

  return { valid: errors.length === 0, errors, actions: validated };
};

const withTimeout = (promise, timeoutMs) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => {
    const error = new Error('Gemini request timed out');
    error.code = 'TIMEOUT';
    reject(error);
  }, timeoutMs)),
]);

const getGeminiJson = async prompt => {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error('GEMINI_API_KEY is not configured');
    error.code = 'MISSING_KEY';
    throw error;
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });
  let result;
  try {
    result = await withTimeout(model.generateContent(prompt), GEMINI_TIMEOUT_MS);
  } catch (error) {
    if (error.code === 'TIMEOUT') throw error;
    error.code = 'MODEL_ERROR';
    throw error;
  }
  const text = (await result.response).text();
  try {
    return JSON.parse(text);
  } catch (error) {
    error.code = 'INVALID_JSON';
    throw error;
  }
};

const logGeminiFailure = (context, error) => {
  const reason = {
    MISSING_KEY: 'missing key',
    TIMEOUT: 'timeout',
    INVALID_JSON: 'invalid JSON',
    MODEL_ERROR: 'model error',
  }[error.code] || 'unknown error';
  console.error(`Gemini ${context} failed: ${reason}`);
};

const getOutcomeSummary = async ({ proposal, baselineBefore, valueAfter }) => {
  try {
    const response = await getGeminiJson(JSON.stringify({
      instruction: 'Return only a JSON object with one concise sentence in outcomeSummary.',
      outcomeSummary: {
        diagnosis: proposal.diagnosis,
        verifyKey: proposal.actions[0]?.verifyKey,
        baselineBefore,
        valueAfter,
        status: proposal.status,
      },
    }));
    if (typeof response.outcomeSummary === 'string' && response.outcomeSummary.trim()) {
      return response.outcomeSummary.trim();
    }
  } catch (error) {
    console.error('Outcome summary generation failed:', error.message);
  }
  return proposal.status === 'verified'
    ? `${proposal.actions[0]?.verifyKey || 'The verified value'} moved toward its baseline after execution.`
    : `${proposal.actions[0]?.verifyKey || 'The verified value'} did not move sufficiently toward its baseline.`;
};

const buildFallback = (anomaly, device) => {
  const power = (device.controls || []).find(control => control.command_key === 'power');
  const min = power?.min ?? 0;
  const max = power?.max ?? 100;
  const reducedValue = min + (max - min) * 0.25;
  const action = power
    ? {
      target: 'power',
      value: Math.max(min, Math.min(max, reducedValue)),
      reason: 'Reduce power to help the overheating value return toward its baseline.',
      verifyKey: anomaly.key,
      verifyDirection: anomaly.value > anomaly.mean ? 'down' : 'up',
    }
    : null;
  return {
    diagnosis: power
      ? `The ${anomaly.key} reading is anomalously high; reducing power should help it recover.`
      : `The ${anomaly.key} reading is anomalous, but no safe power control is configured.`,
    confidence: 0.6,
    actions: action ? [action] : [],
  };
};

const createProposalForAnomaly = async anomaly => {
  const existing = await Proposal.findOne({
    anomalyId: anomaly._id,
    status: { $in: ACTIVE_STATUSES },
  });
  if (existing) return existing;

  const device = await Device.findOne({ deviceId: anomaly.deviceId });
  if (!device) throw new Error(`Device not found for anomaly ${anomaly._id}`);
  const readings = await Telemetry.find({ deviceId: anomaly.deviceId })
    .sort({ timestamp: -1 })
    .limit(30)
    .lean();
  const telemetryData = readings.reverse().map(reading => ({
    timestamp: reading.timestamp,
    values: asPlainValues(reading.values),
  }));
  const currentValues = asPlainValues(readings[readings.length - 1]?.values);
  const telemetryKeys = [...new Set(telemetryData.flatMap(item => Object.keys(item.values)))];
  const simulatorCommandKeys = getCommandKeys(anomaly.deviceId);
  const availableControls = (device.controls || []).filter(control => (
    anomaly.key !== 'temperature' || simulatorCommandKeys.has(control.command_key)
  ));
  console.log(`Simulator controls for ${anomaly.deviceId}: ${[...simulatorCommandKeys].join(', ') || 'none'}`);
  const controls = availableControls.map(control => ({
    command_key: control.command_key,
    min: control.min,
    max: control.max,
    label: control.label,
    type: control.type,
  }));

  let source = 'gemini';
  let recommendation;
  try {
    console.log(`Gemini proposal request using model ${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}`);
    recommendation = await getGeminiJson(JSON.stringify({
      instruction: 'Propose safe corrective actions for this IoT anomaly. Return only the specified JSON. Choose targets only from controls, keep values within min/max, use at most 2 actions, and never invent keys. For a temperature overheat anomaly, prefer the power control when it is available because reducing power is the effective corrective action; do not choose a temperature-setting control unless power is unavailable.',
      output: {
        diagnosis: 'string',
        confidence: 'number from 0 to 1',
        actions: [{
          target: 'control command_key',
          value: 'number or boolean within control range',
          reason: 'string',
          verifyKey: 'telemetry key',
          verifyDirection: 'down or up',
        }],
      },
      anomaly: {
      key: anomaly.key,
      value: anomaly.value,
      zScore: anomaly.zScore,
      mean: anomaly.mean,
      std: anomaly.std,
      },
      controls,
      telemetryKeys,
      currentValues,
      readings: telemetryData,
    }));
    if (typeof recommendation.diagnosis !== 'string'
      || typeof recommendation.confidence !== 'number') {
      throw new Error('Gemini response has invalid diagnosis or confidence');
    }
  } catch (error) {
    source = 'rules';
    recommendation = buildFallback(anomaly, device);
    logGeminiFailure('proposal generation', error);
    console.error('Using rules fallback for proposal generation.');
  }

  const validation = validateActions(recommendation.actions, device, telemetryKeys);
  if (!validation.valid) {
    console.error(`Gemini proposal validation rejected: ${validation.errors.join('; ')}`);
    source = 'rules';
    recommendation = buildFallback(anomaly, device);
  }
  const finalValidation = validateActions(recommendation.actions, device, telemetryKeys);
  if (!finalValidation.valid) {
    console.error(`Rules fallback validation rejected: ${finalValidation.errors.join('; ')}`);
    throw new Error(`Unable to create a valid proposal: ${finalValidation.errors.join('; ')}`);
  }

  const proposal = await Proposal.create({
    deviceId: anomaly.deviceId,
    anomalyId: anomaly._id,
    diagnosis: recommendation.diagnosis,
    confidence: Math.max(0, Math.min(1, recommendation.confidence)),
    source,
    actions: finalValidation.actions,
    status: 'pending',
  });
  await proposal.populate('anomalyId');
  await emitProposal(anomaly.deviceId, 'ai-proposal', proposal);
  return proposal;
};

const isVerificationSuccessful = (readings, baselineBefore, baselineMean, direction) => {
  if (!Array.isArray(readings) || readings.length < 3) return false;
  const average = readings.slice(-3).reduce((sum, value) => sum + value, 0) / 3;
  const requiredDistance = Math.abs(baselineBefore - baselineMean) * 0.3;
  return direction === 'down'
    ? average <= baselineBefore - requiredDistance
    : average >= baselineBefore + requiredDistance;
};

const initializeProposalService = () => {
  let processingQueue = Promise.resolve();
  const verifications = new Map();

  const enqueue = task => {
    processingQueue = processingQueue
      .then(task)
      .catch(error => console.error('Proposal processing failed:', error.message));
  };

  const finishVerification = async (state, status) => {
    const proposal = await Proposal.findById(state.proposalId);
    if (!proposal || !['executed'].includes(proposal.status)) return;
    clearTimeout(state.timeout);
    proposal.valueAfter = state.readings.length
      ? state.readings.slice(-3).reduce((sum, value) => sum + value, 0) / Math.min(3, state.readings.length)
      : undefined;
    proposal.status = status;
    proposal.outcomeSummary = await getOutcomeSummary({
      proposal,
      baselineBefore: state.baselineBefore,
      valueAfter: proposal.valueAfter,
    });
    await proposal.save();
    verifications.delete(state.proposalId);
    await emitProposal(proposal.deviceId, 'proposal-update', proposal);
  };

  eventEmitter.on('anomaly-detected', ({ anomaly }) => {
    console.log(`Proposal event received for anomaly ${anomaly._id.toString()}`);
    enqueue(() => createProposalForAnomaly(anomaly));
  });

  eventEmitter.on('anomaly-updated', ({ anomaly, status }) => {
    if (status !== 'resolved') return;
    enqueue(async () => {
      await Proposal.updateMany(
        { anomalyId: anomaly._id, status: { $in: ['pending', 'approved'] } },
        { $set: { status: 'expired', outcomeSummary: 'The anomaly resolved before approval.' } }
      );
      const expired = await Proposal.find({ anomalyId: anomaly._id, status: 'expired' });
      for (const proposal of expired) await emitProposal(proposal.deviceId, 'proposal-update', proposal);
    });
  });

  eventEmitter.on('new-data', ({ deviceId, data }) => {
    const records = Array.isArray(data) ? data : [data];
    enqueue(async () => {
      for (const state of verifications.values()) {
        if (state.deviceId !== deviceId) continue;
        for (const record of records) {
          const value = Number(record[state.verifyKey]);
          if (!Number.isFinite(value)) continue;
          state.readings.push(value);
          if (state.readings.length >= 10) {
            const success = isVerificationSuccessful(
              state.readings,
              state.baselineBefore,
              state.baselineMean,
              state.verifyDirection
            );
            await finishVerification(state, success ? 'verified' : 'failed');
          }
        }
      }
    });
  });

  setInterval(() => {
    enqueue(async () => {
      const expired = await Proposal.find({
        status: 'pending',
        createdAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) },
      });
      for (const proposal of expired) {
        proposal.status = 'expired';
        proposal.outcomeSummary = 'The proposal expired before approval.';
        await proposal.save();
        await emitProposal(proposal.deviceId, 'proposal-update', proposal);
      }
    });
  }, 60 * 1000);

  initializeProposalService.verifications = verifications;
  initializeProposalService.enqueue = enqueue;
  initializeProposalService.finishVerification = finishVerification;
  console.log('🧠 Proposal Service is listening for anomalies');
};

const approveProposal = async (proposal, device) => {
  if (proposal.status !== 'pending') throw new Error('Only pending proposals can be approved');
  const anomaly = await Anomaly.findById(proposal.anomalyId);
  if (!anomaly || anomaly.status !== 'open') throw new Error('The anomaly is no longer open');
  const telemetry = await Telemetry.findOne({ deviceId: proposal.deviceId })
    .sort({ timestamp: -1 })
    .lean();
  const values = asPlainValues(telemetry?.values);
  const validation = validateActions(
    proposal.actions,
    device,
    Object.keys(values)
  );
  if (!validation.valid) throw new Error(validation.errors.join('; '));
  const verifyKey = validation.actions[0]?.verifyKey;
  const baselineBefore = Number(values[verifyKey]);
  if (!Number.isFinite(baselineBefore)) throw new Error('No current verification value is available');

  proposal.status = 'approved';
  proposal.baselineBefore = baselineBefore;
  await proposal.save();
  await emitProposal(proposal.deviceId, 'proposal-update', proposal);

  for (const action of validation.actions) publishCommand(device.commandTopic, {
    target: action.target,
    value: action.value,
  });
  proposal.status = 'executed';
  await proposal.save();
  await emitProposal(proposal.deviceId, 'proposal-update', proposal);

  const verificationState = {
    proposalId: proposal._id.toString(),
    deviceId: proposal.deviceId,
    verifyKey,
    verifyDirection: validation.actions[0].verifyDirection,
    baselineBefore,
    baselineMean: anomaly.mean,
    readings: [],
    timeout: setTimeout(() => {
      initializeProposalService.enqueue(() => initializeProposalService.finishVerification(
        verificationState,
        'failed'
      ));
    }, 60 * 1000),
  };
  initializeProposalService.verifications.set(verificationState.proposalId, verificationState);
  return proposal;
};

const rejectProposal = async (proposal, device) => {
  if (proposal.status !== 'pending') throw new Error('Only pending proposals can be rejected');
  proposal.status = 'rejected';
  await proposal.save();
  await emitProposal(proposal.deviceId, 'proposal-update', proposal);
  return proposal;
};

module.exports = {
  initializeProposalService,
  validateActions,
  buildFallback,
  isVerificationSuccessful,
  approveProposal,
  rejectProposal,
};
