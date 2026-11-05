const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { approve, reject } = require('../controllers/proposal.controller');

const router = express.Router();

router.use(protect);
router.post('/:id/approve', approve);
router.post('/:id/reject', reject);

module.exports = router;
