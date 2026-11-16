const express = require('express');
const { protect } = require('../middleware/auth');
const { registerCustomer, registerProvider, login, logout, getMe } = require('../controllers/auth');

const router = express.Router();

router.route('/register').post(registerCustomer);
router.route('/register-provider').post(registerProvider);
router.route('/login').post(login);
router.route('/logout').post(protect({ allowSuspended: true }), logout);
router.route('/me').get(protect(), getMe);

module.exports = router;
