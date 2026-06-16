// ============================================================
// controllers/categoryController.js — CRUD для категорій
// Категорії дозволяють групувати завдання за напрямками
// ============================================================

const db = require('../config/db');

/**
 * GET /api/categories
 * Список категорій поточного користувача.
 */
async function getAllCategories(req, res) {
  try {
    const userId = req.user.id;

    const [categories] = await db.query(
      `SELECT c.*, COUNT(t.id) AS task_count
       FROM categories c
       LEFT JOIN tasks t ON t.category_id = c.id
       GROUP BY c.id
       HAVING c.user_id = ?
       ORDER BY c.name ASC`,
      [userId]
    );

    res.json({ categories });
  } catch (error) {
    console.error('GetAllCategories error:', error);
    res.status(500).json({ error: 'Помилка отримання категорій' });
  }
}

/**
 * POST /api/categories
 * Створення нової категорії.
 * Тіло: { name, color? }
 */
async function createCategory(req, res) {
  try {
    const userId = req.user.id;
    const { name, color } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Назва категорії є обов\'язковою' });
    }

    // Перевірка унікальності назви в межах користувача
    const [existing] = await db.query(
      'SELECT id FROM categories WHERE user_id = ? AND name = ?',
      [userId, name.trim()]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Категорія з такою назвою вже існує' });
    }

    const [result] = await db.query(
      'INSERT INTO categories (user_id, name, color) VALUES (?, ?, ?)',
      [userId, name.trim(), color || '#4A90D9']
    );

    res.status(201).json({
      message: 'Категорію створено',
      category: {
        id: result.insertId,
        user_id: userId,
        name: name.trim(),
        color: color || '#4A90D9'
      }
    });
  } catch (error) {
    console.error('CreateCategory error:', error);
    res.status(500).json({ error: 'Помилка створення категорії' });
  }
}

/**
 * PUT /api/categories/:id
 * Оновлення категорії.
 * Тіло: { name?, color? }
 */
async function updateCategory(req, res) {
  try {
    const userId = req.user.id;
    const categoryId = req.params.id;
    const { name, color } = req.body;

    const [existing] = await db.query(
      'SELECT id FROM categories WHERE id = ? AND user_id = ?',
      [categoryId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Категорію не знайдено' });
    }

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
    if (color !== undefined) { updates.push('color = ?'); params.push(color); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Не передано полів для оновлення' });
    }

    params.push(categoryId, userId);

    await db.query(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    res.json({ message: 'Категорію оновлено' });
  } catch (error) {
    console.error('UpdateCategory error:', error);
    res.status(500).json({ error: 'Помилка оновлення категорії' });
  }
}

/**
 * DELETE /api/categories/:id
 * Видалення категорії. Завдання зберігаються (category_id → NULL).
 */
async function deleteCategory(req, res) {
  try {
    const userId = req.user.id;
    const categoryId = req.params.id;

    const [result] = await db.query(
      'DELETE FROM categories WHERE id = ? AND user_id = ?',
      [categoryId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Категорію не знайдено' });
    }

    res.json({ message: 'Категорію видалено' });
  } catch (error) {
    console.error('DeleteCategory error:', error);
    res.status(500).json({ error: 'Помилка видалення категорії' });
  }
}

module.exports = { getAllCategories, createCategory, updateCategory, deleteCategory };
