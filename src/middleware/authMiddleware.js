const authMiddleware = (req, res, next) => {
    if (!req.session.userId) return res.redirect('/login');
    res.locals.currentUser = req.session.user || null;
    next();
};

const adminOnly = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).send('<div style="font-family:sans-serif;text-align:center;padding:80px"><h2>Acceso denegado</h2><p>No tienes permiso para ver esta pagina.</p><a href="/">Volver al inicio</a></div>');
    }
    next();
};

module.exports = authMiddleware;
module.exports.adminOnly = adminOnly;
