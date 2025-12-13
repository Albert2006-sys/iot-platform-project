const express = require('express');
const {
  registerDevice,
  getDevices,
  getDeviceById,
  deleteDevice,
  updateDeviceSchema,
  addDeviceControl,
  updateDeviceControl
} = require('../controllers/device.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .post(registerDevice)
  .get(getDevices);

router.route('/:id')
  .get(getDeviceById)
  .delete(deleteDevice);

router.route('/:id/schema')
  .patch(updateDeviceSchema);

router.route('/:id/controls')
  .post(addDeviceControl);

router.route('/:id/controls/:controlId')
  .put(updateDeviceControl);

module.exports = router;
