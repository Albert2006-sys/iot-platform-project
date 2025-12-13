const eventEmitter = require('../utils/eventEmitter');
const Device = require('../models/device.model');

const initializeSchemaDiscoverer = () => {
  eventEmitter.on('new-data', async ({ deviceId, data }) => {
    try {
      const device = await Device.findOne({ deviceId });
      if (device && device.schema.length === 0) {
        const firstRecord = Array.isArray(data) ? data[0] : data;
        if (typeof firstRecord !== 'object' || firstRecord === null) return;
        
        const keys = Object.keys(firstRecord);
        device.schema = keys.map(key => ({ key, displayName: key }));
        await device.save();
        console.log(`📝 Discovered and saved schema for device ${deviceId}`);
      }
    } catch (error) {
      console.error(`Error discovering schema for ${deviceId}:`, error);
    }
  });
  console.log('🧐 Schema Discoverer is listening for new data events');
};

module.exports = initializeSchemaDiscoverer;
