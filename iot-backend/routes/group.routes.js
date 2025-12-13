const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

// This file now correctly imports the functions it needs
// from the two files we have confirmed are correct.

const { createGroup, getGroups } = require('../controllers/group.controller');
const { protect } = require('../middleware/auth.middleware');

// @route   GET /api/groups
// @desc    Get all groups for the logged-in user
// @access  Private
router.get('/', protect, getGroups);

// @route   POST /api/groups
// @desc    Create a new group
// @access  Private
router.post(
    '/',
    [
        protect,
        body('name', 'Group name is required').not().isEmpty().trim(),
    ],
    createGroup
);

module.exports = router;

