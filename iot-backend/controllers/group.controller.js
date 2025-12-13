console.log('--- Loading controllers/group.controller.js ---'); // For debugging

const Group = require('../models/group.model');
const asyncHandler = require('express-async-handler');

const createGroup = asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name) {
        res.status(400);
        throw new Error('Group name is required');
    }
    const group = await Group.create({ name, user: req.user.id });
    res.status(201).json(group);
});

const getGroups = asyncHandler(async (req, res) => {
    const groups = await Group.find({ user: req.user.id }).sort({ name: 'asc' });
    res.json(groups);
});

module.exports = {
    createGroup,
    getGroups,
};

// This log will show us what is being exported.
console.log('--- Exporting from group.controller.js:', module.exports);

