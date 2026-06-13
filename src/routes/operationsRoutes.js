const express = require('express');
const router = express.Router();
const operationsController = require('../controllers/operationsController');
const authMiddleware = require('../middleware/authMiddleware');

// Dashboard
router.get('/operaciones', authMiddleware, operationsController.dashboard);

// Tickets
router.get('/operaciones/tickets', authMiddleware, operationsController.tickets);
router.post('/api/tickets', authMiddleware, operationsController.createTicket);
router.post('/api/tickets/:id/respond', authMiddleware, operationsController.respondTicket);
router.post('/api/tickets/:id/status', authMiddleware, operationsController.updateTicketStatus);

// Mensajes
router.get('/operaciones/mensajes', authMiddleware, operationsController.messages);
router.post('/api/messages', authMiddleware, operationsController.sendMessage);
router.get('/api/messages/:userId', authMiddleware, operationsController.getConversation);

// Tareas
router.get('/operaciones/tareas', authMiddleware, operationsController.tasks);
router.post('/api/tasks', authMiddleware, operationsController.createTask);
router.post('/api/tasks/:id/status', authMiddleware, operationsController.updateTaskStatus);

module.exports = router;
