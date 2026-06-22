// ============================================================
// config/db.js — конфігурація підключення до MySQL
// Використовує пул з'єднань для ефективної роботи з БД
// ============================================================

const mysql = require('mysql2/promise');

// Створення пулу з'єднань (connection pool)
// Пул дозволяє повторно використовувати з'єднання замість
// створення нового для кожного запиту — це зменшує навантаження
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'time_management',

  // Максимальна кількість одночасних з'єднань
  connectionLimit: 10,

  // Час очікування з'єднання з пулу (мс)
  waitForConnections: true,
  queueLimit: 0,

  // Часовий пояс для коректної роботи з TIMESTAMP
  timezone: '+00:00',

  // SSL для хмарних провайдерів (DigitalOcean, PlanetScale тощо)
  // Активується через змінну оточення DB_SSL=true
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

module.exports = pool;
