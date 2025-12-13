const express = require('express');
const { body } = require('express-validator');
const { registerUser, loginUser } = require('../controllers/auth.controller');
const { validateRequest } = require('../middleware/validate.middleware');

const router = express.Router();

router.post(
  '/register',
  [
    body('username', 'Username is required').not().isEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body(
      'password',
      'Please enter a password with 8 or more characters'
    ).isLength({ min: 8 }),
  ],
  validateRequest,
  registerUser
);

router.post(
  '/login',
  [
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password is required').exists(),
  ],
  validateRequest,
  loginUser
);

module.exports = router;
