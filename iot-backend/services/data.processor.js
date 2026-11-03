const Telemetry = require('../models/telemetry.model');
const Device = require('../models/device.model');
const eventEmitter = require('../utils/eventEmitter');
const { createMqttClient } = require('./mqtt.client');

const initializeDataProcessor = () => {
    const client = createMqttClient();

    client.on('connect', () => {
        console.log('📊 Data Processor connected to MQTT broker');
        client.subscribe(['devices/+/data', 'devices/+/status'], (err) => {
            if (err) {
                console.error('Subscription error:', err);
            }
        });
    });

    client.on('message', async (topic, message) => {
        try {
            const deviceId = topic.split('/')[1];
            const type = topic.split('/')[2]; // 'data' or 'status'
            const payloadString = message.toString();
            
            // STATUS UPDATE HANDLING
            if (type === 'status') {
                let status = 'offline';
                try {
                    const json = JSON.parse(payloadString);
                    status = json.status || json; // Handle {"status":"online"} or just "online" (if valid json string)
                } catch (e) {
                    // Handle raw string "online" / "offline"
                    status = payloadString;
                }

                // Normalize
                status = String(status).toLowerCase() === 'online' ? 'online' : 'offline';
                
                await Device.findOneAndUpdate({ deviceId }, { status });
                eventEmitter.emit('status-update', { deviceId, status });
                console.log(`📡 STATUS UPDATE: Device ${deviceId} is now ${status}`);
                return;
            }

            // TELEMETRY DATA HANDLING
            const payloadData = JSON.parse(payloadString);
            const dataToSave = [];
            const records = Array.isArray(payloadData) ? payloadData : [payloadData];
            
            records.forEach(record => {
                dataToSave.push({
                    deviceId: deviceId,
                    values: record, // Use 'values' instead of 'payload' to match schema
                    timestamp: record.timestamp ? new Date(record.timestamp) : new Date(),
                });
            });

            if (dataToSave.length > 0) {
                await Telemetry.insertMany(dataToSave);
                console.log(`Saved ${dataToSave.length} record(s) for device ${deviceId}`);
                eventEmitter.emit('new-data', { deviceId, data: records });
                
                // Explicitly update device status to 'online' when data is received
                // This ensures the device is marked online even if no specific "status" message was sent
                await Device.findOneAndUpdate({ deviceId }, { status: 'online' });
                eventEmitter.emit('status-update', { deviceId, status: 'online' });
            }
        } catch (error) {
            console.error('Error processing MQTT message:', error);
        }
    });

    eventEmitter.on('status-update', async ({ deviceId, status }) => {
        try {
            await Device.findOneAndUpdate({ deviceId }, { status });
            console.log(`Device ${deviceId} status updated to ${status}`);
        } catch (error) {
            console.error(`Failed to update status for ${deviceId}:`, error);
        }
    });

    client.on('error', (err) => {
        console.error('MQTT client error:', err);
    });
};

module.exports = initializeDataProcessor;
