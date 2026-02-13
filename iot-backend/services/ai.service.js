const axios = require('axios');
const eventEmitter = require('../utils/eventEmitter');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Telemetry = require('../models/telemetry.model');

const ANOMALY_DETECTION_URL = process.env.AI_ANOMALY_DETECTION_URL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "YOUR_API_KEY");

const getAIRecommendations = async (deviceId) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Fetch last 50 telemetry points
    const telemetryData = await Telemetry.find({ deviceId })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    if (telemetryData.length === 0) {
      return {
        critical: [],
        optimization: ["No data available for analysis yet."],
        maintenance: []
      };
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
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    try {
      // Clean up any markdown code blocks if present
      let cleanedText = text.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleanedText);
      return {
        critical: parsed.critical || [],
        optimization: parsed.optimization || [],
        maintenance: parsed.maintenance || []
      };
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Fallback: return raw text as optimization insight
      return {
        critical: [],
        optimization: [text.substring(0, 200)],
        maintenance: []
      };
    }
  } catch (error) {
    console.error("AI Recommendation Error:", error.message);
    console.error("Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return {
      critical: [],
      optimization: [`AI service error: ${error.message || 'Unknown error'}`],
      maintenance: []
    };
  }
};


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

module.exports = { initializeAIService, callAIModel, getAIRecommendations };
