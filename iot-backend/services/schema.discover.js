const eventEmitter = require('../utils/eventEmitter');
const Device = require('../models/device.model');

const initializeSchemaDiscoverer = () => {
  eventEmitter.on('new-data', async ({ deviceId, data }) => {
    try {
      const device = await Device.findOne({ deviceId });
      if (device) {
        const firstRecord = Array.isArray(data) ? data[0] : data;
        if (typeof firstRecord !== 'object' || firstRecord === null) return;
        
        const existingKeys = new Set((device.data_map || []).map(mapping => mapping.raw_key));
        const newMappings = Object.entries(firstRecord)
          .filter(([key, value]) => key !== 'timestamp' && typeof value === 'number' && Number.isFinite(value))
          .filter(([key]) => !existingKeys.has(key))
          .map(([key]) => ({
            raw_key: key,
            alias: key,
            type: 'number',
            unit: '',
            widget: 'text',
          }));

        if (newMappings.length > 0) {
          device.data_map.push(...newMappings);
          await device.save();
          console.log(`📝 Discovered and saved schema for device ${deviceId}`);
        }
      }
    } catch (error) {
      console.error(`Error discovering schema for ${deviceId}:`, error);
    }
  });
  console.log('🧐 Schema Discoverer is listening for new data events');
};

module.exports = initializeSchemaDiscoverer;
