const path = require('path');
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

app.use(session({
    secret: 'school_council_secret_key_2025',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://admin:rungradit@cluster0.8counxn.mongodb.net/?appName=Cluster0')
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB Error:', err));

const anySchema = new mongoose.Schema({}, { strict: false });

const HistorySchema = new mongoose.Schema({
    label: String,
    type: String, // 'weekly' or 'monthly'
    timestamp: { type: Date, default: Date.now },
    data: Array
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

// API Routes
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

app.get('/api/scores', async (req, res) => {
    try {
        let scores = await Score.find();
        if (scores.length === 0) {
            const initialData = [];
            for(let i=1; i<=7; i++) initialData.push({ name: `หอนอนชาย ${i}`, type: 'dorm', gender: 'male' });
            for(let i=1; i<=10; i++) initialData.push({ name: `หอนอนหญิง ${i}`, type: 'dorm', gender: 'female' });
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

// 🔥 API: จบสัปดาห์ (เก็บคะแนนเข้า 'สะสมรายเดือน' แล้วลบคะแนนรายวัน)
app.post('/api/scores/reset-weekly', async (req, res) => {
    try {
        const scores = await Score.find();
        const date = new Date();
        const label = `สัปดาห์วันที่ ${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()+543}`;

        // 1. Backup ประวัติ
        if(scores.length > 0) await new History({ label, type: 'weekly', data: scores }).save();

        // 2. คำนวณคะแนนสัปดาห์นี้ -> บวกเข้าคะแนนสะสม (accumulated_score)
        const days = [1, 2, 3, 4, 5];
        
        for (const s of scores) {
            let weeklySum = 0;
            if(s.type === 'dorm') {
                days.forEach(d => weeklySum += (parseInt(s[`points_exercise_${d}`]||0) + parseInt(s[`points_dorm_${d}`]||0)));
            } else {
                days.forEach(d => weeklySum += parseInt(s[`points_class_${d}`]||0));
            }

            const update = { 
                $inc: { accumulated_score: weeklySum } // บวกเพิ่ม
            };
            
            // ลบคะแนนรายวัน
            const unsetFields = {};
            days.forEach(d => {
                unsetFields[`points_exercise_${d}`] = "";
                unsetFields[`points_dorm_${d}`] = "";
                unsetFields[`points_class_${d}`] = "";
                unsetFields[`reason_points_exercise_${d}`] = "";
                unsetFields[`reason_points_dorm_${d}`] = "";
                unsetFields[`reason_points_class_${d}`] = "";
            });
            update.$unset = unsetFields;

            await Score.findByIdAndUpdate(s._id, update);
        }

        console.log('✅ Weekly reset complete (Scores accumulated)');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 🚀 API: เริ่มเดือนใหม่ (ล้างคะแนนสะสมทั้งหมดเป็น 0)
app.post('/api/scores/reset-monthly', async (req, res) => {
    try {
        const scores = await Score.find();
        const date = new Date();
        const label = `สรุปประจำเดือน ${date.getMonth()+1}/${date.getFullYear()+543}`;
        
        // Backup
        if(scores.length > 0) await new History({ label, type: 'monthly', data: scores }).save();

        // ล้างทุกอย่าง (รวมถึง accumulated_score)
        const unsetFields = { accumulated_score: "" };
        [1,2,3,4,5].forEach(d => {
            unsetFields[`points_exercise_${d}`] = "";
            unsetFields[`points_dorm_${d}`] = "";
            unsetFields[`points_class_${d}`] = "";
            unsetFields[`reason_points_exercise_${d}`] = "";
            unsetFields[`reason_points_dorm_${d}`] = "";
            unsetFields[`reason_points_class_${d}`] = "";
        });

        await Score.updateMany({}, { $unset: unsetFields });
        console.log('💥 Monthly reset complete (All cleared)');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/history-list', async (req, res) => {
    const list = await History.find({}, 'label type timestamp').sort({ timestamp: -1 });
    res.json(list);
});
app.get('/api/history/:id', async (req, res) => {
    const h = await History.findById(req.params.id);
    res.json(h ? h.data : []);
});

app.get('/api/news', async (req, res) => { const news = await News.find().sort({ date: -1 }); res.json(news); });
app.post('/api/news', async (req, res) => { await new News(req.body).save(); res.json({ success: true }); });
app.delete('/api/news/:id', async (req, res) => { await News.findByIdAndDelete(req.params.id); res.json({ success: true }); });
app.get('/api/suggestions', async (req, res) => { const data = await Suggestion.find().sort({ createdAt: -1 }); res.json(data); });
app.put('/api/suggestions/:id', async (req, res) => { await Suggestion.findByIdAndUpdate(req.params.id, req.body); res.json({ success: true }); });

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