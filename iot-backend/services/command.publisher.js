const mqtt = require('mqtt');

let commandClient;

const initializeCommandPublisher = () => {
    // HiveMQ Cloud Connection
  commandClient = mqtt.connect('mqtts://8efd95372b1e4eb58c0e7a0eef38c918.s1.eu.hivemq.cloud:8883', {
        username: 'Iotdevice',
        password: 'Jeremy@2016',
        rejectUnauthorized: true,
    });
  commandClient.on('connect', () => console.log('📢 Command Publisher connected to MQTT broker'));
  commandClient.on('error', (err) => console.error('Command Publisher MQTT error:', err));
};

const publishCommand = (topic, payload) => {
  if (commandClient && commandClient.connected) {
    commandClient.publish(topic, JSON.stringify(payload), (err) => {
      if (err) console.error('Failed to publish command:', err);
      else console.log(`Published command to ${topic}:`, payload);
    });
  } else {
    console.error('Command Publisher is not connected.');
  }
};

module.exports = { initializeCommandPublisher, publishCommand };
