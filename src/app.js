const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const expressLayouts = require('express-ejs-layouts');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback_secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: { secure: process.env.ENV === 'production', maxAge: 1000 * 60 * 60 * 24 }
}));

app.use(function(req, res, next) {
    res.locals.currentUser = req.session.user || null;
    next();
});

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const leadRoutes = require('./routes/leadRoutes');
const callRoutes = require('./routes/callRoutes');
const businessRoutes = require('./routes/businessRoutes');
const calendarRoutes = require('./routes/calendarRoutes');

app.use(dashboardRoutes);
app.use(authRoutes);
app.use(leadRoutes);
app.use(callRoutes);
app.use(businessRoutes);
app.use(calendarRoutes);

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        app.listen(PORT, '0.0.0.0', () => console.log('Server started on port ' + PORT));
    })
    .catch(function(err) { console.error('MongoDB Connection Error:', err); process.exit(1); });
