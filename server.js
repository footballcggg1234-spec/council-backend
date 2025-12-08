const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(express.static(__dirname));

app.use(session({
    secret: 'school_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Connect Database
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://footballcggg1234_db_user:rungradit@cluster1.rhemrut.mongodb.net/?appName=Cluster1';
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error(err));

// Import Models
const News = require('./models/News');
const Suggestion = require('./models/Suggestion');
const Score = require('./models/Score'); // ตัวใหม่

// --- API: Scores (ระบบคะแนนใหม่) ---

app.get('/api/scores', async (req, res) => {
    try {
        let scores = await Score.find();

        // 🛠️ ถ้ายังไม่มีข้อมูล ให้สร้างชุดเริ่มต้น (หอ + ห้องเรียน)
        if (scores.length === 0) {
            const initialData = [];

            // 1. สร้างหอชาย (1-8)
            for (let i = 1; i <= 8; i++) {
                initialData.push({ name: `หอพักชายที่ ${i}`, type: 'dorm', gender: 'male' });
            }
            // 2. สร้างหอหญิง (9-17)
            for (let i = 9; i <= 17; i++) {
                initialData.push({ name: `หอพักหญิงที่ ${i}`, type: 'dorm', gender: 'female' });
            }
            // 3. สร้างห้องเรียน (ตัวอย่าง ม.1 - ม.6 อย่างละ 3 ห้อง)
            ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'].forEach(level => {
                for (let r = 1; r <= 3; r++) {
                    initialData.push({ name: `${level}/${r}`, type: 'classroom', gender: 'none' });
                }
            });

            scores = await Score.insertMany(initialData);
        }
        res.json(scores);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/scores', async (req, res) => {
    // รับข้อมูลเป็น Array เพื่ออัปเดตหลายรายการพร้อมกัน
    const updates = req.body; // [{ _id: '...', field: 'points_exercise', value: 10 }]
    try {
        for (const item of updates) {
            // อัปเดตเฉพาะ field ที่ส่งมา (Dynamic Update)
            const updateObj = {};
            updateObj[item.field] = item.value; 
            await Score.findByIdAndUpdate(item._id, updateObj);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ... (Routes อื่นๆ ของ News, Suggestion, Login คงเดิม) ...
// Login, Logout, Check-Auth, News, Suggestions ใส่ไว้เหมือนไฟล์เดิมได้เลย

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));