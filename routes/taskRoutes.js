// ============================================================
// routes/taskRoutes.js — маршрути для роботи із завданнями
// Prefix: /api/tasks
// Усі маршрути захищені authMiddleware (потрібен JWT)
// ============================================================

const express = require('express');
const router = express.Router();
const {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask
} = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');

// Захист усіх маршрутів — без валідного токена повернеться 401
router.use(authMiddleware);

// GET  /api/tasks        — список завдань (з фільтрами)
router.get('/', getAllTasks);

// GET  /api/tasks/:id    — одне завдання за ID
router.get('/:id', getTaskById);

// POST /api/tasks        — створення нового завдання
router.post('/', createTask);

// PUT  /api/tasks/:id    — оновлення завдання
router.put('/:id', updateTask);

// DELETE /api/tasks/:id  — видалення завдання
router.delete('/:id', deleteTask);

module.exports = router;
