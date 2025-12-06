const mongoose = require('mongoose');

const NewsSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true // หัวข้อข่าว
    },
    content: { 
        type: String, 
        required: true // เนื้อหาข่าว
    },
    image: { 
        type: String,
        default: 'https://via.placeholder.com/300' // ลิงก์รูปภาพ
    },
    author: {
        type: String,
        default: 'Admin' // คนโพสต์
    },
    date: {
        type: Date,
        default: Date.now // วันที่โพสต์
    }
});

module.exports = mongoose.model('News', NewsSchema);