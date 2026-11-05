const dotenv = require('./iot-backend/node_modules/dotenv');
const mongoose = require('./iot-backend/node_modules/mongoose');
const Device = require('./iot-backend/models/device.model');

dotenv.config({ path: './iot-backend/.env' });

const ensurePowerControl = async () => {
  if (!process.env.MONGO_URI || !process.env.DEVICE_ID) {
    throw new Error('MONGO_URI and DEVICE_ID must be configured');
  }
  await mongoose.connect(process.env.MONGO_URI);
  const device = await Device.findOne({ deviceId: process.env.DEVICE_ID });
  if (!device) throw new Error('Configured device was not found');
  if (!device.controls.some(control => control.command_key === 'power')) {
    device.controls.push({
      type: 'slider',
      label: 'Power',
      command_key: 'power',
      min: 0,
      max: 100,
    });
    await device.save();
    console.log('Power control added.');
  } else {
    console.log('Power control already exists.');
  }
  await mongoose.disconnect();
};

ensurePowerControl().catch(async error => {
  console.error(`Unable to ensure power control: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
