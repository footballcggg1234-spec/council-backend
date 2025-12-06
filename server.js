const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const path = require('path'); // เพิ่มตัวนี้
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(cors({ origin: true, credentials: true }));

// ✅ ให้ Server โชว์ไฟล์ HTML/CSS/รูปภาพ ในโฟลเดอร์ปัจจุบัน
app.use(express.static(__dirname));

app.use(session({
    secret: 'secret_key_na_krub',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// ✅ เชื่อมต่อ Database (รองรับทั้ง Cloud และ Local)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/councilDB';
mongoose.connect(MONGO_URI)
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Error:', err));

// Models
const News = require('./models/News');
const Suggestion = require('./models/Suggestion');

// --- Routes (เหมือนเดิม) ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '123456') {
        req.session.user = { username: 'admin', role: 'admin' };
        req.session.save();
        return res.json({ success: true });
    }
    res.status(401).json({ success: false, message: 'ชื่อหรือรหัสผ่านผิด' });
});

app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });
app.get('/api/check-auth', (req, res) => { res.json({ authenticated: !!req.session.user }); });

app.get('/api/news', async (req, res) => { const news = await News.find().sort({ date: -1 }); res.json(news); });
app.post('/api/news', async (req, res) => { await new News(req.body).save(); res.json({ success: true }); });
app.delete('/api/news/:id', async (req, res) => { await News.findByIdAndDelete(req.params.id); res.json({ success: true }); });

app.get('/api/suggestions', async (req, res) => { const data = await Suggestion.find().sort({ createdAt: -1 }); res.json(data); });
app.post('/api/suggestions', async (req, res) => { await new Suggestion(req.body).save(); res.json({ success: true }); });
app.put('/api/suggestions/:id', async (req, res) => { await Suggestion.findByIdAndUpdate(req.params.id, req.body); res.json({ success: true }); });

// ✅ ถ้าเข้าลิงก์อื่น ให้เด้งไปหน้าแรก
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));