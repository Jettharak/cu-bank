const express = require('express');
const { getAccount, updateAccount, getMyAccount } = require('../controllers/transactions');
const validateBalance = require('../middleware/validateBalance.js'); 
const { protect } = require('../middleware/auth'); // Removed unused `authorize`

const router = express.Router({ mergeParams: true });

// Get a single account by ID
router.get('/:id', protect, getAccount);

// Update account with balance validation & get logged-in user's account
router.route('/')
  .put(protect, validateBalance, updateAccount)  // Balance validation before updating the account
  .get(protect, getMyAccount);  // Get the current user's account

module.exports = router;