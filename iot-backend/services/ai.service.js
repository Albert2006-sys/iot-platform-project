const axios = require('axios');
const eventEmitter = require('../utils/eventEmitter');

const ANOMALY_DETECTION_URL = process.env.AI_ANOMALY_DETECTION_URL;

const callAIModel = async (data) => {
  if (!ANOMALY_DETECTION_URL || ANOMALY_DETECTION_URL.includes('your-ai-model-endpoint')) {
    return null;
  }
  try {
    const response = await axios.post(ANOMALY_DETECTION_URL, { data });
    return response.data;
  } catch (error) {
    console.error('Error calling AI model:', error.message);
    return null;
  }
};

const initializeAIService = () => {
  eventEmitter.on('new-data', async ({ deviceId, data }) => {
    const records = Array.isArray(data) ? data : [data];
    for (const record of records) {
      const result = await callAIModel(record);
      if (result && result.is_anomaly) {
        console.log(`🚨 Anomaly detected for device ${deviceId}!`);
        eventEmitter.emit('anomaly-detected', {
          deviceId,
          anomalyDetails: result.details,
          timestamp: new Date(),
        });
      }
    }
  });
  console.log('🤖 AI Service is listening for new data events');
};

module.exports = { initializeAIService, callAIModel };
