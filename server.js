// ============================================================
// server.js — головний файл серверного додатку
// Ініціалізує Express, підключає middleware та маршрути
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');

// Імпорт маршрутів
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const eventRoutes = require('./routes/eventRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ----- Middleware -----

// Дозволяємо крос-доменні запити з фронтенду (Vite — порт 5173)
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

// Парсинг JSON-тіла запитів (для POST/PUT)
app.use(express.json());

// Логування кожного вхідного запиту (метод + URL)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ----- Маршрути API -----

// Авторизація: /api/auth/register, /api/auth/login
app.use('/api/auth', authRoutes);

// Завдання: /api/tasks (CRUD)
app.use('/api/tasks', taskRoutes);

// Категорії: /api/categories (CRUD)
app.use('/api/categories', categoryRoutes);

// Події календаря: /api/events (CRUD)
app.use('/api/events', eventRoutes);

// Перевірочний ендпоінт — чи працює сервер
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ----- Обробка помилок -----

// 404 — маршрут не знайдено
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не знайдено' });
});

// Глобальний обробник помилок
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Внутрішня помилка сервера'
  });
});

// ----- Запуск сервера -----

async function startServer() {
  try {
    // Перевірка з'єднання з базою даних перед стартом
    const connection = await db.getConnection();
    console.log('✅ Підключення до MySQL встановлено');
    connection.release();

    app.listen(PORT, () => {
      console.log(`🚀 Сервер запущено на порті ${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Не вдалося підключитися до бази даних:', error.message);
    process.exit(1);
  }
}

startServer();
