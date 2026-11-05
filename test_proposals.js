const assert = require('node:assert/strict');
const {
  validateActions,
  buildFallback,
  isVerificationSuccessful,
} = require('./iot-backend/services/proposal.service');

const device = {
  controls: [
    { type: 'slider', command_key: 'power', min: 0, max: 100, label: 'Power' },
    { type: 'switch', command_key: 'enabled', label: 'Enabled' },
  ],
};
const keys = ['temperature', 'power'];

{
  const result = validateActions([{
    target: 'unknown',
    value: 40,
    reason: 'bad target',
    verifyKey: 'temperature',
    verifyDirection: 'down',
  }], device, keys);
  assert.equal(result.valid, false);
}

{
  const result = validateActions([{
    target: 'power',
    value: 101,
    reason: 'out of range',
    verifyKey: 'temperature',
    verifyDirection: 'down',
  }], device, keys);
  assert.equal(result.valid, false);
}

{
  const actions = Array.from({ length: 3 }, (_, index) => ({
    target: 'power',
    value: index,
    reason: 'too many',
    verifyKey: 'temperature',
    verifyDirection: 'down',
  }));
  assert.equal(validateActions(actions, device, keys).valid, false);
}

{
  const fallback = buildFallback(
    { key: 'temperature', value: 80, mean: 25 },
    device
  );
  assert.equal(fallback.actions[0].target, 'power');
  assert.equal(fallback.actions[0].value, 25);
}

assert.equal(isVerificationSuccessful([60, 55, 50], 70, 30, 'down'), true);
assert.equal(isVerificationSuccessful([68, 69, 70], 70, 30, 'down'), false);
assert.equal(isVerificationSuccessful([40, 45, 50], 30, 70, 'up'), true);
assert.equal(isVerificationSuccessful([31, 32, 33], 30, 70, 'up'), false);

console.log('Proposal tests passed.');
