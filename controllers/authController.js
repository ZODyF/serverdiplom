// ============================================================
// controllers/authController.js — логіка реєстрації та входу
// Хешування паролів (bcrypt) і генерація JWT-токенів
// ============================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

/**
 * Генерує JWT-токен для користувача.
 * Payload містить id та username — мінімум даних для ідентифікації.
 * @param {Object} user — об'єкт із полями id та username
 * @returns {string} підписаний JWT-токен
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/**
 * POST /api/auth/register
 * Реєстрація нового користувача.
 * Тіло запиту: { username, email, password }
 */
async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    // --- Валідація вхідних даних ---
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Всі поля (username, email, password) є обов\'язковими'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Пароль має містити щонайменше 6 символів'
      });
    }

    // Перевірка формату email (базова регулярка)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Невірний формат email' });
    }

    // --- Перевірка унікальності ---
    const [existing] = await db.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'Користувач із таким username або email вже існує'
      });
    }

    // --- Хешування пароля ---
    // 10 раундів солі — баланс між безпекою та швидкістю
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // --- Створення запису в БД ---
    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    const newUser = { id: result.insertId, username };
    const token = generateToken(newUser);

    // Повертаємо токен одразу — користувач автоматично авторизований після реєстрації
    res.status(201).json({
      message: 'Реєстрація успішна',
      token,
      user: {
        id: newUser.id,
        username,
        email
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Помилка сервера при реєстрації' });
  }
}

/**
 * POST /api/auth/login
 * Вхід існуючого користувача.
 * Тіло запиту: { email, password }
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // --- Валідація ---
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email та пароль є обов\'язковими'
      });
    }

    // --- Пошук користувача ---
    const [rows] = await db.query(
      'SELECT id, username, email, password_hash FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      // Не розкриваємо, чи існує email — запобігання перебору
      return res.status(401).json({ error: 'Невірний email або пароль' });
    }

    const user = rows[0];

    // --- Порівняння паролів ---
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Невірний email або пароль' });
    }

    // --- Генерація токена ---
    const token = generateToken(user);

    res.json({
      message: 'Вхід успішний',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Помилка сервера при вході' });
  }
}

/**
 * GET /api/auth/me
 * Отримання профілю поточного авторизованого користувача.
 * Потребує JWT-токен у заголовку Authorization.
 */
async function getProfile(req, res) {
  try {
    const [rows] = await db.query(
      'SELECT id, username, email, avatar_url, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Користувача не знайдено' });
    }

    res.json({ user: rows[0] });
  } catch (error) {
    console.error('GetProfile error:', error);
    res.status(500).json({ error: 'Помилка сервера' });
  }
}

module.exports = { register, login, getProfile };
