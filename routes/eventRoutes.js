// ============================================================
// routes/eventRoutes.js — маршрути подій календаря
// Prefix: /api/events
// Усі маршрути захищені authMiddleware
// ============================================================

const express = require('express');
const router = express.Router();
const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent
} = require('../controllers/eventController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// GET  /api/events         — список подій (з фільтрами ?month= або ?date=)
router.get('/', getEvents);

// GET  /api/events/:id     — одна подія за ID
router.get('/:id', getEventById);

// POST /api/events         — створення нової події
router.post('/', createEvent);

// PUT  /api/events/:id     — оновлення події
router.put('/:id', updateEvent);

// DELETE /api/events/:id   — видалення події
router.delete('/:id', deleteEvent);

module.exports = router;
