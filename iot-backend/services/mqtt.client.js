const mqtt = require('mqtt');

const getMqttUrl = () => {
  const host = process.env.MQTT_HOST;
  const port = process.env.MQTT_PORT;
  if (!host || !port) {
    throw new Error('MQTT_HOST and MQTT_PORT must be configured');
  }
  return `mqtts://${host}:${port}`;
};

const createMqttClient = () => {
  const username = process.env.MQTT_USERNAME;
  const password = process.env.MQTT_PASSWORD;
  if (!username || !password) {
    throw new Error('MQTT_USERNAME and MQTT_PASSWORD must be configured');
  }

  return mqtt.connect(getMqttUrl(), {
    username,
    password,
    rejectUnauthorized: true,
  });
};

module.exports = { createMqttClient };
