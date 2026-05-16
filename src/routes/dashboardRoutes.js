const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Restaurar ruta raíz para que cargue tu dashboard original
router.get('/', authMiddleware, function(req, res) {
    res.render('pages/dashboard', { title: 'Dashboard' });
});

module.exports = router;
