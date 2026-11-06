const eventEmitter = require('../utils/eventEmitter');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Telemetry = require('../models/telemetry.model');
const Anomaly = require('../models/anomaly.model');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const WINDOW_SIZE = 50;
const WARMUP_SIZE = 20;
const RESOLUTION_COUNT = 5;

const calculateStats = values => {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
};

class AnomalyDetector {
  constructor() {
    this.series = new Map();
  }

  evaluate(deviceId, record) {
    const results = [];
    for (const [key, rawValue] of Object.entries(record)) {
      if (key === 'timestamp' || typeof rawValue !== 'number' || !Number.isFinite(rawValue)) continue;

      const stateKey = `${deviceId}:${key}`;
      const state = this.series.get(stateKey) || {
        baseline: [],
        anomalyStreak: 0,
        normalStreak: 0,
        open: false,
      };
      const stats = state.baseline.length >= WARMUP_SIZE ? calculateStats(state.baseline) : null;
      const zScore = stats?.std > 0 ? Math.abs((rawValue - stats.mean) / stats.std) : 0;
      const anomalous = Boolean(stats && zScore > 3);

      if (anomalous) {
        state.anomalyStreak += 1;
        state.normalStreak = 0;
        if (state.anomalyStreak >= 3 && !state.open) {
          state.open = true;
          results.push({
            type: 'detected',
            deviceId,
            key,
            value: rawValue,
            zScore,
            mean: stats.mean,
            std: stats.std,
            severity: zScore > 4 ? 'critical' : 'warning',
          });
        }
      } else {
        state.anomalyStreak = 0;
        if (state.open) {
          state.normalStreak += 1;
          if (state.normalStreak >= RESOLUTION_COUNT) {
            state.open = false;
            state.normalStreak = 0;
            results.push({ type: 'resolved', deviceId, key, value: rawValue });
          }
        } else {
          state.normalStreak = 0;
        }
        state.baseline.push(rawValue);
        state.baseline = state.baseline.slice(-WINDOW_SIZE);
      }

      this.series.set(stateKey, state);
    }
    return results;
  }
}

const getAIRecommendations = async (deviceId) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });
    const telemetryData = await Telemetry.find({ deviceId })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    if (telemetryData.length === 0) {
      return { critical: [], optimization: ['No data available for analysis yet.'], maintenance: [] };
    }

    const dataSummary = JSON.stringify(telemetryData.slice(0, 20).map(d => ({ t: d.timestamp, v: d.values })));
    const prompt = `
        Analyze the following IoT device telemetry data (last 20 points):
        ${dataSummary}

        You MUST respond with ONLY valid JSON in this exact format (no markdown, no code blocks, just raw JSON):
        {
          "critical": ["list of anomalies or critical alerts detected"],
          "optimization": ["list of optimization tips and performance insights"],
          "maintenance": ["list of maintenance predictions and recommendations"]
        }

        Rules:
        - Each array should have 1-3 concise items (max 50 words each)
        - critical: anomalies, spikes, dangerous values, immediate attention needed
        - optimization: efficiency tips, performance suggestions, positive observations
        - maintenance: predictive maintenance, scheduled checks, component wear alerts
        - If no items for a category, use an empty array []
        - Be professional and technical
        `;

    const result = await model.generateContent(prompt);
    const text = (await result.response).text();
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    try {
      const parsed = JSON.parse(cleanedText);
      return {
        critical: parsed.critical || [],
        optimization: parsed.optimization || [],
        maintenance: parsed.maintenance || [],
      };
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      return { critical: [], optimization: [text.substring(0, 200)], maintenance: [] };
    }
  } catch (error) {
    console.error('AI Recommendation Error:', error.message);
    return { critical: [], optimization: [`AI service error: ${error.message || 'Unknown error'}`], maintenance: [] };
  }
};

const initializeAIService = () => {
  const detector = new AnomalyDetector();
  let processingQueue = Promise.resolve();

  const processData = async ({ deviceId, data }) => {
    const records = Array.isArray(data) ? data : [data];
    for (const record of records) {
      for (const result of detector.evaluate(deviceId, record)) {
        if (result.type === 'detected') {
          const existing = await Anomaly.findOne({ deviceId, key: result.key, status: 'open' });
          const anomaly = existing
            ? await Anomaly.findByIdAndUpdate(existing._id, result, { new: true })
            : await Anomaly.create(result);
          eventEmitter.emit('anomaly-detected', {
            deviceId,
            anomalyDetails: `${result.key} exceeded the ${result.severity} anomaly threshold.`,
            anomaly,
            timestamp: anomaly.createdAt,
          });
        } else {
          const anomaly = await Anomaly.findOneAndUpdate(
            { deviceId, key: result.key, status: 'open' },
            { status: 'resolved', value: result.value },
            { new: true }
          );
          if (anomaly) eventEmitter.emit('anomaly-updated', { anomaly, status: 'resolved' });
        }
      }
    }
  };

  eventEmitter.on('new-data', payload => {
    processingQueue = processingQueue
      .then(() => processData(payload))
      .catch(error => {
        console.error(`Anomaly detection failed for ${payload.deviceId}:`, error);
      });
  });
  console.log('🤖 AI Service is listening for local anomaly events');
};

module.exports = { AnomalyDetector, calculateStats, initializeAIService, getAIRecommendations };
