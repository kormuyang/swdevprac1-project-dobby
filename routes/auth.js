const express = require('express');
const { protect } = require('../middleware/auth');
const { registerCustomer, registerProvider, login, logout, getMe } = require('../controllers/auth');

const router = express.Router();
router.post('/register', registerCustomer);
router.post('/register-provider', registerProvider);
router.post('/login', login);
router.post('/logout', protect({ allowSuspended: true }), logout);
router.get('/me', protect(), getMe);

module.exports = router;
