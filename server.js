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

// ให้บริการไฟล์ Static ภายใต้ /studentcouncil
app.use(BASE_PATH, express.static(path.join(__dirname)));

// --- DATABASE CONNECTION ---
mongoose.connect('mongodb+srv://admin:rungradit@cluster0.8counxn.mongodb.net/?appName=Cluster0')
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB Error:', err));

// --- SCHEMAS ---
const anySchema = new mongoose.Schema({}, { strict: false });
const Score = mongoose.model('Score', anySchema);
const Vote = mongoose.model('Vote', new mongoose.Schema({ party: Number, ip: String, timestamp: { type: Date, default: Date.now } }));
const Suggestion = mongoose.model('Suggestion', new mongoose.Schema({ topic: String, category: String, detail: String, status: { type: String, default: 'pending' }, createdAt: { type: Date, default: Date.now } }));
const News = mongoose.model('News', anySchema);

// --- API ROUTES ---

// 1. API ดึงคะแนน (พร้อมระบบสร้างข้อมูลเริ่มต้นอัตโนมัติ)
app.get(`${BASE_PATH}/api/scores`, async (req, res) => {
    try {
        let scores = await Score.find();
        if (scores.length === 0) {
            const initialData = [];
            // สร้างข้อมูลหอพัก
            for(let i=1; i<=7; i++) initialData.push({ name: `หอนอนชาย ${i}`, type: 'dorm', gender: 'male', accumulated_score: 0 });
            for(let i=1; i<=10; i++) initialData.push({ name: `หอนอนหญิง ${i}`, type: 'dorm', gender: 'female', accumulated_score: 0 });
            // สร้างข้อมูลห้องเรียน
            ['ม.1','ม.2','ม.3','ม.4','ม.5','ม.6'].forEach(l => { 
                for(let r=1; r<=3; r++) initialData.push({ name: `${l}/${r}`, type: 'classroom', accumulated_score: 0 }); 
            });
            scores = await Score.insertMany(initialData);
        }
        res.json(scores);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. API Login
app.post(`${BASE_PATH}/api/login`, (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '123456') {
        req.session.user = { role: 'admin' };
        return res.json({ success: true });
    }
    res.status(401).json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
});

// 3. API แก้ไขคะแนน
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

// 4. API อื่นๆ
app.get(`${BASE_PATH}/api/news`, async (req, res) => {
    const news = await News.find().sort({ date: -1 });
    res.json(news);
});

app.post(`${BASE_PATH}/api/suggestions`, async (req, res) => {
    await new Suggestion(req.body).save();
    res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server started at http://localhost:${PORT}${BASE_PATH}`);
});