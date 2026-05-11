const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const seedService = require('./services/seedService');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
    }),
    cookie: {
        secure: process.env.ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
}));

// --- DB CONNECTION ---
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');
        await seedService();
    })
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- IMPORTS ---
const authRoutes = require('./routes/authRoutes');
const businessRoutes = require('./routes/businessRoutes');

// --- ROUTES ---
app.use(authRoutes);
app.use(businessRoutes);

app.listen(PORT, () => {
    console.log(`🚀 Sky Web Company Server started on http://localhost:${PORT}`);
});
