const express = require('express');
const { createTelemetry, getTelemetry, getTelemetrySummary, getDeviceInsights } = require('../controllers/telemetry.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.post('/:deviceId', createTelemetry);
router.route('/:deviceId')
  .get(getTelemetry);

router.route('/:deviceId/summary')
  .get(getTelemetrySummary);

router.route('/:deviceId/insights')
    .get(getDeviceInsights);

module.exports = router;
