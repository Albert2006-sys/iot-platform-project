const mqtt = require('mqtt');
const fs = require('fs');
const tls = require('tls');

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

  const tlsOptions = {
    rejectUnauthorized: true,
  };

  if (process.env.MQTT_CA_CERT) {
    tlsOptions.ca = fs.readFileSync(process.env.MQTT_CA_CERT);
  } else if (typeof tls.getCACertificates === 'function'
    && typeof tls.setDefaultCACertificates === 'function') {
    tls.setDefaultCACertificates(tls.getCACertificates('system'));
  }

  return mqtt.connect(getMqttUrl(), {
    username,
    password,
    ...tlsOptions,
  });
};

module.exports = { createMqttClient };
