const express = require('express');
const { getTelemetry, getTelemetrySummary } = require('../controllers/telemetry.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.route('/:deviceId')
  .get(getTelemetry);

router.route('/:deviceId/summary')
  .get(getTelemetrySummary);

module.exports = router;
