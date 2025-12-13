const asyncHandler = require('express-async-handler');
const User = require('../models/user.model');

const getMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  
  if(user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

module.exports = { getMyProfile };
