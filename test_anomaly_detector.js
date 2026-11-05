const assert = require('node:assert/strict');
const { AnomalyDetector } = require('./iot-backend/services/ai.service');

const feed = (detector, values) => values.flatMap(value => detector.evaluate('test-device', { temperature: value }));
const warmup = detector => feed(detector, Array.from({ length: 20 }, (_, index) => index % 2 ? 11 : 9));

{
  const detector = new AnomalyDetector();
  warmup(detector);
  assert.equal(feed(detector, [10, 10.5, 9.5, 10.2]).length, 0);
}

{
  const detector = new AnomalyDetector();
  warmup(detector);
  assert.equal(feed(detector, [30]).length, 0);
  assert.equal(feed(detector, [10, 10, 10]).length, 0);
}

{
  const detector = new AnomalyDetector();
  warmup(detector);
  const results = feed(detector, [13.5, 13.5, 13.5, 13.5]);
  assert.equal(results.filter(result => result.type === 'detected').length, 1);
  assert.equal(results[0].severity, 'warning');
  assert.equal(feed(detector, [13.5, 13.5]).length, 0);
}

{
  const detector = new AnomalyDetector();
  warmup(detector);
  const results = feed(detector, [15, 15, 15]);
  assert.equal(results.length, 1);
  assert.equal(results[0].severity, 'critical');
}

{
  const detector = new AnomalyDetector();
  warmup(detector);
  const results = feed(detector, [50, 60, 70, 80, 90]);
  assert.equal(results.filter(result => result.type === 'detected').length, 1);
  assert.equal(feed(detector, [90, 90, 90, 90, 90]).length, 0);
  const resolved = feed(detector, [10, 10, 10, 10, 10]);
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].type, 'resolved');
}

console.log('Anomaly detector tests passed.');
