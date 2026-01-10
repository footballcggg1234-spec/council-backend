const path = require('path');
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');

const app = express();

// --- 1. Middleware ---
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

app.use(session({
    secret: 'school_council_secret_key_2025',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// --- 2. Database Connection ---
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://admin:rungradit@cluster0.8counxn.mongodb.net/?appName=Cluster0')
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB Error:', err));

// --- 3. Schema & Models ---
const anySchema = new mongoose.Schema({}, { strict: false });

// 🆕 Schema สำหรับเก็บประวัติย้อนหลัง
const HistorySchema = new mongoose.Schema({
    label: String,         // ชื่อช่วงเวลา เช่น "มกราคม สัปดาห์ที่ 2"
    timestamp: { type: Date, default: Date.now },
    data: Array            // เก็บข้อมูลคะแนนทั้งหมด ณ ตอนนั้น
});

const voteSchema = new mongoose.Schema({
    party: Number,
    timestamp: { type: Date, default: Date.now },
    ip: String
});

let News, Score, Suggestion, Vote, History;
try {
    News = mongoose.models.News || mongoose.model('News', anySchema);
    Score = mongoose.models.Score || mongoose.model('Score', anySchema);
    Suggestion = mongoose.models.Suggestion || mongoose.model('Suggestion', anySchema);
    Vote = mongoose.models.Vote || mongoose.model('Vote', voteSchema);
    History = mongoose.models.History || mongoose.model('History', HistorySchema);
} catch (e) { console.log(e); }

// ==========================================
// 🚀 API ROUTES
// ==========================================

// --- A. Login ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '123456') {
        req.session.user = { username: 'admin', role: 'admin' };
        req.session.save();
        return res.json({ success: true });
    }
    res.status(401).json({ success: false, message: 'Login Failed' });
});

app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });
app.get('/api/check-auth', (req, res) => { res.json({ authenticated: !!req.session.user }); });

// --- B. Scores System (ระบบคะแนน) ---
app.get('/api/scores', async (req, res) => {
    try {
        let scores = await Score.find();
        if (scores.length === 0) {
            const initialData = [];
            for(let i=1; i<=8; i++) initialData.push({ name: `หอพักชายที่ ${i}`, type: 'dorm', gender: 'male' });
            for(let i=9; i<=17; i++) initialData.push({ name: `หอพักหญิงที่ ${i}`, type: 'dorm', gender: 'female' });
            ['ม.1','ม.2','ม.3','ม.4','ม.5','ม.6'].forEach(l => { for(let r=1; r<=3; r++) initialData.push({ name: `${l}/${r}`, type: 'classroom' }); });
            scores = await Score.insertMany(initialData);
        }
        res.json(scores);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/scores', async (req, res) => {
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

// 🔥 API: เริ่มสัปดาห์ใหม่ (Backup ข้อมูลเก่า -> แล้วค่อยลบ)
app.post('/api/scores/reset-weekly', async (req, res) => {
    try {
        // 1. ดึงข้อมูลปัจจุบันมา backup ก่อน
        const currentScores = await Score.find();
        
        // สร้างชื่อประวัติจากวันที่ (เช่น "10 ม.ค. 67")
        const date = new Date();
        const thMonth = date.toLocaleString('th-TH', { month: 'short' });
        const label = `งวดวันที่ ${date.getDate()} ${thMonth} ${date.getFullYear() + 543}`;

        // บันทึกลง History
        if (currentScores.length > 0) {
            await new History({ label: label, data: currentScores }).save();
            console.log(`💾 Archived history: ${label}`);
        }

        // 2. ลบข้อมูลคะแนนในตารางหลัก
        const unsetFields = {};
        const days = [1, 2, 3, 4, 5, 6, 7];
        const types = ['points_exercise', 'points_dorm', 'points_class'];
        
        days.forEach(d => {
            types.forEach(t => {
                unsetFields[`${t}_${d}`] = "";
                unsetFields[`reason_${t}_${d}`] = "";
            });
        });

        await Score.updateMany({}, { $unset: unsetFields });
        
        res.json({ success: true, message: "Archived and Reset successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🆕 API: ดึงรายการประวัติย้อนหลัง (List)
app.get('/api/history-list', async (req, res) => {
    try {
        const list = await History.find({}, 'label timestamp').sort({ timestamp: -1 });
        res.json(list);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 🆕 API: ดึงข้อมูลประวัติระบุ ID
app.get('/api/history/:id', async (req, res) => {
    try {
        const history = await History.findById(req.params.id);
        res.json(history ? history.data : []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- C. News & Suggestions ---
app.get('/api/news', async (req, res) => { const news = await News.find().sort({ date: -1 }); res.json(news); });
app.post('/api/news', async (req, res) => { await new News(req.body).save(); res.json({ success: true }); });
app.delete('/api/news/:id', async (req, res) => { await News.findByIdAndDelete(req.params.id); res.json({ success: true }); });

app.get('/api/suggestions', async (req, res) => { const data = await Suggestion.find().sort({ createdAt: -1 }); res.json(data); });
app.put('/api/suggestions/:id', async (req, res) => { await Suggestion.findByIdAndUpdate(req.params.id, req.body); res.json({ success: true }); });

// --- D. Election ---
app.post('/api/vote', async (req, res) => {
    try {
        const { party } = req.body;
        if (![1, 2, 3].includes(party)) return res.status(400).json({ error: 'Invalid Party' });
        await new Vote({ party, ip: req.ip }).save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/election-results', async (req, res) => {
    try {
        const total = await Vote.countDocuments();
        const p1 = await Vote.countDocuments({ party: 1 });
        const p2 = await Vote.countDocuments({ party: 2 });
        const p3 = await Vote.countDocuments({ party: 3 });
        res.json({ total, results: [p1, p2, p3] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/election-reset', async (req, res) => {
    try {
        await Vote.deleteMany({});
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));