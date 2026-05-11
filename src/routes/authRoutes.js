const authController = require('../controllers/authController');
const express = require('express');
const router = express.Router();

router.get('/login', (req, res) => {
    res.render('pages/login', { title: 'Login - Sky Web Company' });
});

router.post('/login', authController.login);
router.get('/logout', authController.logout);

module.exports = router;
