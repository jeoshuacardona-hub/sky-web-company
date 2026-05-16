const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Redirigir raíz a leads que sí existe
router.get('/', authMiddleware, function(req, res) {
    res.redirect('/leads');
});

module.exports = router;
