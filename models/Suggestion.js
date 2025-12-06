const mongoose = require('mongoose');

const SuggestionSchema = new mongoose.Schema({
    topic: { 
        type: String, 
        required: true // หัวข้อเรื่อง (ต้องใส่)
    },
    detail: { 
        type: String, 
        required: true // รายละเอียด (ต้องใส่)
    },
    category: {
        type: String,
        enum: ['general', 'complaint', 'activity', 'other'], // หมวดหมู่: ทั่วไป, ร้องเรียน, กิจกรรม, อื่นๆ
        default: 'general'
    },
    studentID: {
        type: String,
        default: 'Anonymous' // รหัสนักเรียน (ถ้าไม่ใส่จะเป็นนิรนาม)
    },
    status: {
        type: String,
        enum: ['pending', 'acknowledged', 'resolved'], // สถานะ: รอดำเนินการ, รับเรื่องแล้ว, แก้ไขแล้ว
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now // วันที่ส่งเรื่อง
    }
});

module.exports = mongoose.model('Suggestion', SuggestionSchema);