// ============================================================
// controllers/taskController.js — CRUD-операції із завданнями
// Усі операції фільтруються за user_id з JWT-токена
// ============================================================

const db = require('../config/db');

/**
 * GET /api/tasks
 * Отримання списку завдань поточного користувача.
 * Підтримує фільтрацію через query-параметри:
 *   ?status=todo|in_progress|done
 *   ?priority=low|medium|high
 *   ?category_id=<число>
 */
async function getAllTasks(req, res) {
  try {
    const userId = req.user.id;
    const { status, priority, category_id } = req.query;

    // Динамічна побудова SQL-запиту з урахуванням фільтрів
    let sql = `
      SELECT t.*, c.name AS category_name, c.color AS category_color
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
    `;
    const params = [userId];

    if (status) {
      sql += ' AND t.status = ?';
      params.push(status);
    }

    if (priority) {
      sql += ' AND t.priority = ?';
      params.push(priority);
    }

    if (category_id) {
      sql += ' AND t.category_id = ?';
      params.push(parseInt(category_id));
    }

    // Сортування: спочатку за пріоритетом (high → low), потім за датою створення
    sql += ' ORDER BY FIELD(t.priority, "high", "medium", "low"), t.created_at DESC';

    const [tasks] = await db.query(sql, params);
    res.json({ tasks });
  } catch (error) {
    console.error('GetAllTasks error:', error);
    res.status(500).json({ error: 'Помилка отримання завдань' });
  }
}

/**
 * GET /api/tasks/:id
 * Отримання одного завдання за його ID.
 * Перевіряє, що завдання належить поточному користувачу.
 */
async function getTaskById(req, res) {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;

    const [rows] = await db.query(
      `SELECT t.*, c.name AS category_name, c.color AS category_color
       FROM tasks t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ? AND t.user_id = ?`,
      [taskId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Завдання не знайдено' });
    }

    res.json({ task: rows[0] });
  } catch (error) {
    console.error('GetTaskById error:', error);
    res.status(500).json({ error: 'Помилка отримання завдання' });
  }
}

/**
 * POST /api/tasks
 * Створення нового завдання.
 * Тіло запиту: { title, description?, category_id?, priority?, deadline? }
 */
async function createTask(req, res) {
  try {
    const userId = req.user.id;
    const { title, description, category_id, priority, deadline } = req.body;

    // --- Валідація ---
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Назва завдання є обов\'язковою' });
    }

    // Якщо вказано category_id, перевіряємо, що категорія належить цьому користувачу
    if (category_id) {
      const [cat] = await db.query(
        'SELECT id FROM categories WHERE id = ? AND user_id = ?',
        [category_id, userId]
      );
      if (cat.length === 0) {
        return res.status(400).json({ error: 'Категорію не знайдено' });
      }
    }

    // --- Вставка запису ---
    const [result] = await db.query(
      `INSERT INTO tasks (user_id, title, description, category_id, priority, deadline)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        title.trim(),
        description || null,
        category_id || null,
        priority || 'medium',
        deadline || null
      ]
    );

    // Повертаємо створене завдання
    const [newTask] = await db.query(
      `SELECT t.*, c.name AS category_name, c.color AS category_color
       FROM tasks t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Завдання створено',
      task: newTask[0]
    });
  } catch (error) {
    console.error('CreateTask error:', error);
    res.status(500).json({ error: 'Помилка створення завдання' });
  }
}

/**
 * PUT /api/tasks/:id
 * Оновлення існуючого завдання (будь-яке поле).
 * Тіло запиту: { title?, description?, category_id?, status?, priority?, deadline? }
 */
async function updateTask(req, res) {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;
    const { title, description, category_id, status, priority, deadline } = req.body;

    // Перевірка існування завдання та належності користувачу
    const [existing] = await db.query(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Завдання не знайдено' });
    }

    // Валідація статусу (якщо передано)
    const validStatuses = ['todo', 'in_progress', 'done'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Невірний статус. Допустимі: ${validStatuses.join(', ')}`
      });
    }

    // Валідація пріоритету (якщо передано)
    const validPriorities = ['low', 'medium', 'high'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({
        error: `Невірний пріоритет. Допустимі: ${validPriorities.join(', ')}`
      });
    }

    // Динамічне формування SET-частини запиту — оновлюємо тільки передані поля
    const updates = [];
    const params = [];

    if (title !== undefined) { updates.push('title = ?'); params.push(title.trim()); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (category_id !== undefined) { updates.push('category_id = ?'); params.push(category_id); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
    if (deadline !== undefined) { updates.push('deadline = ?'); params.push(deadline); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Не передано жодного поля для оновлення' });
    }

    params.push(taskId, userId);

    await db.query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    // Повертаємо оновлене завдання
    const [updated] = await db.query(
      `SELECT t.*, c.name AS category_name, c.color AS category_color
       FROM tasks t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`,
      [taskId]
    );

    res.json({
      message: 'Завдання оновлено',
      task: updated[0]
    });
  } catch (error) {
    console.error('UpdateTask error:', error);
    res.status(500).json({ error: 'Помилка оновлення завдання' });
  }
}

/**
 * DELETE /api/tasks/:id
 * Видалення завдання за ID.
 * Каскадно видаляє пов'язані записи time_logs (task_id → NULL).
 */
async function deleteTask(req, res) {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;

    const [result] = await db.query(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, userId]
    );

    // affectedRows === 0 означає, що завдання не існує або не належить користувачу
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Завдання не знайдено' });
    }

    res.json({ message: 'Завдання видалено' });
  } catch (error) {
    console.error('DeleteTask error:', error);
    res.status(500).json({ error: 'Помилка видалення завдання' });
  }
}

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask
};
