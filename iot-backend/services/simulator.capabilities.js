const commandKeysByDevice = new Map();

const setCommandKeys = (deviceId, commandKeys) => {
  if (!Array.isArray(commandKeys)) return;
  commandKeysByDevice.set(
    deviceId,
    new Set(commandKeys.filter(key => typeof key === 'string')),
  );
};

const getCommandKeys = deviceId => commandKeysByDevice.get(deviceId) || new Set();

module.exports = { setCommandKeys, getCommandKeys };
