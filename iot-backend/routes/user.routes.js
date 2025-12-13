const express = require('express');
const { getMyProfile } = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/me', protect, getMyProfile);

module.exports = router;
