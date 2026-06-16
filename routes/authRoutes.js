// ============================================================
// routes/authRoutes.js — маршрути автентифікації
// Prefix: /api/auth
// ============================================================

const express = require('express');
const router = express.Router();
const { register, login, getProfile } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/auth/register — реєстрація нового користувача
router.post('/register', register);

// POST /api/auth/login — вхід (отримання JWT-токена)
router.post('/login', login);

// GET /api/auth/me — профіль поточного користувача (потрібен токен)
router.get('/me', authMiddleware, getProfile);

module.exports = router;
