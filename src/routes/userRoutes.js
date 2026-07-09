const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/authMiddleware').adminOnly;

router.get('/profile', authMiddleware, userController.getProfile);
router.post('/profile/update', authMiddleware, userController.updateProfile);
router.post('/profile/change-password', authMiddleware, userController.changePassword);

router.get('/users', authMiddleware, adminOnly, userController.getUsers);
router.post('/api/users/create', authMiddleware, adminOnly, userController.createUser);
router.post('/api/users/:id/update', authMiddleware, adminOnly, userController.updateUser);
router.post('/api/users/:id/delete', authMiddleware, adminOnly, userController.deleteUser);

router.get('/assign-leads-jose', authMiddleware, adminOnly, userController.assignLeadsToJoseDaniel);
module.exports = router;
