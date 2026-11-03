require('dotenv').config();
const mongoose = require('mongoose');
const Device = require('./models/device.model');
const { createMqttClient } = require('./services/mqtt.client');

// Configuration
const DEVICE_ID = "55899029-5b66-41ea-97b4-aaefbe55e9c7";
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/iot-platform"; // Update if using Atlas

// 1. MQTT Cleanup (Publish Retained "offline")
const client = createMqttClient();

client.on('connect', () => {
    console.log("✅ Connected to MQTT Broker");
    const topic = `devices/${DEVICE_ID}/status`;
    
    // Publish RETAINED offline message
    client.publish(topic, JSON.stringify({ status: "offline" }), { retain: true, qos: 1 }, (err) => {
        if (err) console.error("❌ Failed to publish MQTT status:", err);
        else console.log("✅ Published retained 'offline' status to MQTT");
        client.end();
    });
});

// 2. Database Cleanup (Force status to 'offline')
const resetDb = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB");
        
        const res = await Device.findOneAndUpdate(
            { deviceId: DEVICE_ID },
            { status: 'offline' },
            { new: true }
        );
        
        if (res) console.log("✅ Database status updated to: offline");
        else console.log("❌ Device not found in Database");
        
    } catch (err) {
        console.error("❌ DB Error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("👋 Done.");
    }
};

resetDb();
