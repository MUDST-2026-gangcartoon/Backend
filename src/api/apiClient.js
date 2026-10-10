// src/api/apiClient.js

// ถ้าโปรเจกต์คุณใช้ axios ให้เปิดใช้งาน (และอย่าลืม npm install axios)
// import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// ตัวอย่างโครงสร้างเบื้องต้น (สามารถปรับแก้ตาม Stack ที่ใช้ เช่น ใช้ axios หรือ fetch ปกติ)
const apiClient = {
    get: async (endpoint) => {
        const response = await fetch(`${BASE_URL}${endpoint}`);
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        return response.json();
    },
    post: async (endpoint, data) => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        return response.json();
    }
    // เดี๋ยวเราจะมาเพิ่ม PUT, DELETE หรือ Interceptor (ใส่ Token) ทีหลังได้
};

export default apiClient;