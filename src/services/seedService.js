const authController = require('../controllers/authController');

async function runSeed() {
    try {
        await authController.seedAdmin();
    } catch (error) {
        console.error('❌ Seed Error:', error);
    }
}

module.exports = runSeed;
