// ============================================================
// controllers/eventController.js — CRUD-операції з подіями календаря
// Збереження, отримання, оновлення та видалення подій
// ============================================================

const db = require('../config/db');

/**
 * GET /api/events
 * Отримання подій поточного користувача.
 * Підтримує фільтри:
 *   ?month=2026-06       — усі події за місяць
 *   ?date=2026-06-08     — усі події за конкретний день
 *   ?type=event|task|reminder
 */
async function getEvents(req, res) {
  try {
    const userId = req.user.id;
    const { month, date, type } = req.query;

    let sql = `
      SELECT e.*, t.title AS task_title, t.status AS task_status
      FROM events e
      LEFT JOIN tasks t ON e.task_id = t.id
      WHERE e.user_id = ?
    `;
    const params = [userId];

    // Фільтр за конкретною датою
    if (date) {
      sql += ' AND e.event_date = ?';
      params.push(date);
    }
    // Фільтр за місяцем (формат: "2026-06")
    else if (month) {
      sql += ' AND DATE_FORMAT(e.event_date, "%Y-%m") = ?';
      params.push(month);
    }

    // Фільтр за типом
    if (type) {
      sql += ' AND e.type = ?';
      params.push(type);
    }

    sql += ' ORDER BY e.event_date ASC, e.start_time ASC, e.created_at ASC';

    const [events] = await db.query(sql, params);
    res.json({ events });
  } catch (error) {
    console.error('GetEvents error:', error);
    res.status(500).json({ error: 'Помилка отримання подій' });
  }
}

/**
 * GET /api/events/:id
 * Отримання однієї події за ID.
 */
async function getEventById(req, res) {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;

    const [rows] = await db.query(
      `SELECT e.*, t.title AS task_title, t.status AS task_status
       FROM events e
       LEFT JOIN tasks t ON e.task_id = t.id
       WHERE e.id = ? AND e.user_id = ?`,
      [eventId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Подію не знайдено' });
    }

    res.json({ event: rows[0] });
  } catch (error) {
    console.error('GetEventById error:', error);
    res.status(500).json({ error: 'Помилка отримання події' });
  }
}

/**
 * POST /api/events
 * Створення нової події в календарі.
 * Тіло запиту: { title, description?, event_date, start_time?, end_time?, color?, type?, task_id? }
 */
async function createEvent(req, res) {
  try {
    const userId = req.user.id;
    const { title, description, event_date, start_time, end_time, color, type, task_id } = req.body;

    // --- Валідація ---
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Назва події є обов\'язковою' });
    }

    if (!event_date) {
      return res.status(400).json({ error: 'Дата події є обов\'язковою' });
    }

    // Валідація типу
    const validTypes = ['event', 'task', 'reminder'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        error: `Невірний тип. Допустимі: ${validTypes.join(', ')}`
      });
    }

    // Якщо вказано task_id — перевіряємо належність
    if (task_id) {
      const [taskCheck] = await db.query(
        'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
        [task_id, userId]
      );
      if (taskCheck.length === 0) {
        return res.status(400).json({ error: 'Завдання не знайдено' });
      }
    }

    // --- Створення запису ---
    const [result] = await db.query(
      `INSERT INTO events (user_id, task_id, title, description, event_date, start_time, end_time, color, type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        task_id || null,
        title.trim(),
        description || null,
        event_date,
        start_time || null,
        end_time || null,
        color || '#4A90D9',
        type || 'event'
      ]
    );

    // Повертаємо створену подію
    const [newEvent] = await db.query(
      `SELECT e.*, t.title AS task_title, t.status AS task_status
       FROM events e
       LEFT JOIN tasks t ON e.task_id = t.id
       WHERE e.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Подію створено',
      event: newEvent[0]
    });
  } catch (error) {
    console.error('CreateEvent error:', error);
    res.status(500).json({ error: 'Помилка створення події' });
  }
}

/**
 * PUT /api/events/:id
 * Оновлення існуючої події (будь-яке поле).
 * Тіло запиту: { title?, description?, event_date?, start_time?, end_time?, color?, type?, task_id? }
 */
async function updateEvent(req, res) {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;
    const { title, description, event_date, start_time, end_time, color, type, task_id } = req.body;

    // Перевірка існування та належності
    const [existing] = await db.query(
      'SELECT id FROM events WHERE id = ? AND user_id = ?',
      [eventId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Подію не знайдено' });
    }

    // Валідація типу
    const validTypes = ['event', 'task', 'reminder'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        error: `Невірний тип. Допустимі: ${validTypes.join(', ')}`
      });
    }

    // Динамічне формування SET-частини запиту
    const updates = [];
    const params = [];

    if (title !== undefined) { updates.push('title = ?'); params.push(title.trim()); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (event_date !== undefined) { updates.push('event_date = ?'); params.push(event_date); }
    if (start_time !== undefined) { updates.push('start_time = ?'); params.push(start_time); }
    if (end_time !== undefined) { updates.push('end_time = ?'); params.push(end_time); }
    if (color !== undefined) { updates.push('color = ?'); params.push(color); }
    if (type !== undefined) { updates.push('type = ?'); params.push(type); }
    if (task_id !== undefined) { updates.push('task_id = ?'); params.push(task_id); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Не передано жодного поля для оновлення' });
    }

    params.push(eventId, userId);

    await db.query(
      `UPDATE events SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    // Повертаємо оновлену подію
    const [updated] = await db.query(
      `SELECT e.*, t.title AS task_title, t.status AS task_status
       FROM events e
       LEFT JOIN tasks t ON e.task_id = t.id
       WHERE e.id = ?`,
      [eventId]
    );

    res.json({
      message: 'Подію оновлено',
      event: updated[0]
    });
  } catch (error) {
    console.error('UpdateEvent error:', error);
    res.status(500).json({ error: 'Помилка оновлення події' });
  }
}

/**
 * DELETE /api/events/:id
 * Видалення події за ID.
 */
async function deleteEvent(req, res) {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;

    const [result] = await db.query(
      'DELETE FROM events WHERE id = ? AND user_id = ?',
      [eventId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Подію не знайдено' });
    }

    res.json({ message: 'Подію видалено' });
  } catch (error) {
    console.error('DeleteEvent error:', error);
    res.status(500).json({ error: 'Помилка видалення події' });
  }
}

module.exports = { getEvents, getEventById, createEvent, updateEvent, deleteEvent };
