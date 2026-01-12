const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session');

const app = express();

// --- CONFIG ---
const BASE_PATH = '/studentcouncil';
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE ---
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'school_council_secret_key_2025',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// ????????????? Static (HTML/CSS/JS) ?????? /studentcouncil
app.use(BASE_PATH, express.static(path.join(__dirname)));

// --- DATABASE CONNECTION ---
mongoose.connect('mongodb+srv://admin:rungradit@cluster0.8counxn.mongodb.net/?appName=Cluster0')
.then(() => console.log('? Connected to MongoDB'))
.catch(err => console.error('? MongoDB Error:', err));

// --- SCHEMAS ---
const anySchema = new mongoose.Schema({}, { strict: false });
const Score = mongoose.model('Score', anySchema);
const Vote = mongoose.model('Vote', new mongoose.Schema({ party: Number, ip: String, timestamp: { type: Date, default: Date.now } }));
const Suggestion = mongoose.model('Suggestion', new mongoose.Schema({ topic: String, category: String, detail: String, status: { type: String, default: 'pending' } }));
const News = mongoose.model('News', anySchema);

// --- API ROUTES ---

// 1. Login API
app.post(`${BASE_PATH}/api/login`, (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '123456') {
        req.session.user = { role: 'admin' };
        return res.json({ success: true });
    }
    res.status(401).json({ success: false, message: '????????????????????????????????' });
});

// 2. Score API (????????????????)
app.get(`${BASE_PATH}/api/scores`, async (req, res) => {
    try {
        const scores = await Score.find();
        res.json(scores);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put(`${BASE_PATH}/api/scores`, async (req, res) => {
    try {
        const updates = req.body;
        for (const item of updates) {
            const updateObj = {};
            updateObj[item.field] = item.value;
            await Score.findByIdAndUpdate(item._id, updateObj);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. Election & Suggestion APIs
app.post(`${BASE_PATH}/api/vote`, async (req, res) => {
    try {
        const { party } = req.body;
        await new Vote({ party, ip: req.ip }).save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get(`${BASE_PATH}/api/election-results`, async (req, res) => {
    const total = await Vote.countDocuments();
    res.json({ total });
});

app.post(`${BASE_PATH}/api/suggestions`, async (req, res) => {
    try {
        await new Suggestion(req.body).save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get(`${BASE_PATH}/api/news`, async (req, res) => {
    try {
        const news = await News.find().sort({ date: -1 });
        res.json(news);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- HTML ROUTES ---
app.get(`${BASE_PATH}/login`, (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get(`${BASE_PATH}/admin`, (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get(`${BASE_PATH}/weekly-report`, (req, res) => res.sendFile(path.join(__dirname, 'weekly-report.html')));
app.get(`${BASE_PATH}/classroom-weekly`, (req, res) => res.sendFile(path.join(__dirname, 'classroom-weekly.html')));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`?? Server running at http://localhost:${PORT}${BASE_PATH}`);
});