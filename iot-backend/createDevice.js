const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const Device = require('./models/device.model');
const User = require('./models/user.model');

dotenv.config();
connectDB();

const createDevice = async () => {
  try {
    // Find the user you created earlier
    const user = await User.findById("68aae82105b443584cee1871");

    if (!user) {
      console.error('Error: User not found. Please check the user ID.');
      process.exit(1);
    }

    // Create the device using the Mongoose model
    // This will trigger the pre-save hook to hash the secret
    await Device.create({
      deviceId: 'device001',
      secret: 'device_secret_password',
      user: user._id,
    });

    console.log('✅ Device Created & Secret Hashed Successfully!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

createDevice();