const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/llamadas', authMiddleware, callController.getLlamadas);
router.get('/seguimiento', authMiddleware, callController.getSeguimiento);
router.post('/api/llamadas', authMiddleware, callController.registrarLlamada);
router.post('/api/seguimiento/:id/resolver', authMiddleware, callController.resolverSeguimiento);
router.post('/api/pipeline/:customerId/status', authMiddleware, callController.actualizarEstadoPipeline);

module.exports = router;
