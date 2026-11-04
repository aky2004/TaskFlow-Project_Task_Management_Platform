const express = require('express');
const {
  register,
  login,
  logout,
  refreshToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  changePassword,
  firebaseGoogleLogin,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { userValidation, validate } = require('../middleware/validation');

const router = express.Router();

// Local authentication routes
router.post('/register', userValidation.register, validate, register);
router.post('/login', userValidation.login, validate, login);
router.post('/logout', protect, logout);
router.post('/refresh-token', refreshToken);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

// Firebase Google authentication
router.post('/firebase-google', firebaseGoogleLogin);

// Protected user routes
router.get('/me', protect, getMe);
router.put('/profile', protect, userValidation.updateProfile, validate, updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;
