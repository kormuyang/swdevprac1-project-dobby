const express = require('express');
const {
  validateRegisterCustomer,
  validateRegisterProvider,
  validateLogin,
  validateLogout,
  validateGetMe,
} = require('../middleware/authValidation');
const { protect } = require('../middleware/auth');
const { registerCustomer, registerProvider, login, logout, getMe } = require('../controllers/auth');

const router = express.Router();

router.route('/register').post(validateRegisterCustomer, registerCustomer);
router.route('/register-provider').post(validateRegisterProvider, registerProvider);
router.route('/login').post(validateLogin, login);
router.route('/logout').post(protect({ allowSuspended: true }), validateLogout, logout);
router.route('/me').get(protect(), validateGetMe, getMe);

module.exports = router;
