const { createMqttClient } = require('./mqtt.client');

let commandClient;

const initializeCommandPublisher = () => {
  commandClient = createMqttClient();
  commandClient.on('connect', () => console.log('📢 Command Publisher connected to MQTT broker'));
  commandClient.on('error', (err) => console.error('Command Publisher MQTT error:', err));
};

const publishCommand = (topic, payload) => {
  if (commandClient && commandClient.connected) {
    commandClient.publish(topic, JSON.stringify(payload), (err) => {
      if (err) console.error('Failed to publish command:', err);
      else console.log(`Published command to ${topic}`);
    });
  } else {
    console.error('Command Publisher is not connected.');
  }
};

module.exports = { initializeCommandPublisher, publishCommand };
