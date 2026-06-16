// ============================================================
// middleware/authMiddleware.js — перевірка JWT-токена
// Захищає маршрути, що вимагають автентифікації
// ============================================================

const jwt = require('jsonwebtoken');

/**
 * Middleware для перевірки автентифікації.
 * Витягує токен із заголовка Authorization (формат: "Bearer <token>"),
 * верифікує його та додає дані користувача до об'єкта req.
 */
function authMiddleware(req, res, next) {
  // Отримуємо заголовок Authorization
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Токен автентифікації не надано'
    });
  }

  // Витягуємо сам токен (без префікса "Bearer ")
  const token = authHeader.split(' ')[1];

  try {
    // Верифікація токена — повертає payload із id та username
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Додаємо дані користувача до запиту для використання в контролерах
    req.user = {
      id: decoded.id,
      username: decoded.username
    };

    next();
  } catch (error) {
    // Токен недійсний або прострочений
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Токен прострочено' });
    }
    return res.status(401).json({ error: 'Недійсний токен' });
  }
}

module.exports = authMiddleware;
