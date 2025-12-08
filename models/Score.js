const mongoose = require('mongoose');

const ScoreSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    type: { 
        type: String, 
        enum: ['dorm', 'classroom'], // เป็น 'หอ' หรือ 'ห้องเรียน'
        required: true 
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'none'], // ชาย, หญิง, หรือไม่มี (สำหรับห้องเรียน)
        default: 'none'
    },
    // แยกคะแนน 3 หมวด
    points_exercise: { type: Number, default: 0 }, // คะแนนออกกาย (เฉพาะหอ)
    points_dorm: { type: Number, default: 0 },     // คะแนนตรวจหอ (เฉพาะหอ)
    points_class: { type: Number, default: 0 }     // คะแนนห้องเรียน (เฉพาะห้อง)
});

module.exports = mongoose.model('Score', ScoreSchema);