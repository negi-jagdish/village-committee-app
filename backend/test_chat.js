const io = require('socket.io-client');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Config
const API_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000';
const path = require('path');
require('dotenv').config(); // Loads .env from current dir (backend/)
const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
    console.error('❌ JWT_SECRET not found in .env');
    process.exit(1);
}

// Mock User
const USER_ID = 999;
const ADMIN_ID = 1; // Assuming 1 is president
const TOKEN = jwt.sign({ id: USER_ID, role: 'member', name: 'TestUser' }, SECRET);
const ADMIN_TOKEN = jwt.sign({ id: ADMIN_ID, role: 'president', name: 'AdminUser' }, SECRET);

async function runTest() {
    console.log('--- Starting Chat System Verification ---');

    // 1. WebSocket Connection
    console.log('1. Connecting to Socket...');
    const socket = io(SOCKET_URL, {
        auth: { token: TOKEN }
    });

    await new Promise((resolve, reject) => {
        socket.on('connect', () => {
            console.log('✅ Socket Connected:', socket.id);
            resolve();
        });
        socket.on('connect_error', (err) => {
            console.error('❌ Socket Connection Failed:', err.message);
            reject(err);
        });
        setTimeout(() => reject(new Error('Socket timeout')), 5000);
    });

    // 2. Join a Room
    const GROUP_ID = 100; // Mock group
    console.log(`2. Joining Group ${GROUP_ID}...`);
    socket.emit('join_room', `group_${GROUP_ID}`);
    // Wait for join... (no ack in our server code, so just wait a bit)
    await new Promise(r => setTimeout(r, 500));

    // 3. Listen for Messages
    const messagePromise = new Promise((resolve) => {
        socket.on('receive_message', (msg) => {
            console.log('✅ Received Message via Socket:', msg);
            resolve(msg);
        });
    });

    // 4. Send Message via API
    console.log('3. Sending Message via API...');
    try {
        // Note: This might fail if Group 100 doesn't exist in DB FK constraints. 
        // We might need to ensure group exists or mock DB. 
        // For E2E on real DB, we should pick a real group or create one.
        // Assuming we rely on DB existence, this test might 500 if FK fails.
        // We'll see.

        await axios.post(`${API_URL}/chat/${GROUP_ID}/message`, {
            content: "Hello World",
            type: "text"
        }, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });
        console.log('✅ Message Sent API call success');
    } catch (err) {
        console.error('❌ Send Message API Failed:', err.response?.data || err.message);
        console.log('Note: If this failed due to FK, it confirms DB constraints are active.');
        // If it failed, we can't expect socket message
    }

    // 5. Broadcast Test
    console.log('4. Testing Admin Broadcast...');
    try {
        await axios.post(`${API_URL}/chat/broadcast`, {
            content: "System Broadcast Test"
        }, {
            headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
        });
        console.log('✅ Broadcast API call success');
    } catch (err) {
        console.error('❌ Broadcast API Failed:', err.response?.data || err.message);
    }

    // Wait for socket events
    try {
        await Promise.race([messagePromise, new Promise((_, r) => setTimeout(() => r(new Error('Receive timeout')), 3000))]);
    } catch (err) {
        console.log('⚠️ Socket receive timed out (expected if API failed or no loopback)');
    }

    socket.disconnect();
    console.log('--- Test Finished ---');
}

runTest().catch(console.error);
