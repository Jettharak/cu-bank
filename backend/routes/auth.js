const express = require('express');
const { register, login, getMe, logout } = require('../controllers/auth');
const { protect } = require('../middleware/auth');

const router = express.Router();

// User registration
router.post('/register', register);

// User login
router.post('/login', login);

// Get logged-in user's information
router.get('/me', protect, getMe);

// User logout
router.get('/logout', logout);

module.exports = router;
