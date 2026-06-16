// ============================================================
// routes/categoryRoutes.js — маршрути категорій
// Prefix: /api/categories
// Усі маршрути захищені authMiddleware
// ============================================================

const express = require('express');
const router = express.Router();
const {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// GET    /api/categories      — список категорій
router.get('/', getAllCategories);

// POST   /api/categories      — створення категорії
router.post('/', createCategory);

// PUT    /api/categories/:id  — оновлення категорії
router.put('/:id', updateCategory);

// DELETE /api/categories/:id  — видалення категорії
router.delete('/:id', deleteCategory);

module.exports = router;
