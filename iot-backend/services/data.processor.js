const mqtt = require('mqtt');
const Telemetry = require('../models/telemetry.model');
const Device = require('../models/device.model');
const eventEmitter = require('../utils/eventEmitter');

const initializeDataProcessor = () => {
    const client = mqtt.connect('mqtt://localhost:1883');

    client.on('connect', () => {
        console.log('📊 Data Processor connected to MQTT broker');
        client.subscribe('devices/+/data', (err) => {
            if (err) {
                console.error('Subscription error:', err);
            }
        });
    });

    client.on('message', async (topic, message) => {
        try {
            const deviceId = topic.split('/')[1];
            const payloadData = JSON.parse(message.toString());
            const dataToSave = [];
            const records = Array.isArray(payloadData) ? payloadData : [payloadData];
            
            records.forEach(record => {
                dataToSave.push({
                    deviceId: deviceId,
                    payload: record,
                    timestamp: record.timestamp ? new Date(record.timestamp) : new Date(),
                });
            });

            if (dataToSave.length > 0) {
                await Telemetry.insertMany(dataToSave);
                console.log(`Saved ${dataToSave.length} record(s) for device ${deviceId}`);
                eventEmitter.emit('new-data', { deviceId, data: records });
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
