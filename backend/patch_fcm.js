const fs = require('fs');
const file = 'src/controllers/chatController.js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
    /android: \{\s*priority: 'high',\s*notification: \{\s*sound: 'default',\s*channelId: 'chamdoli_chat',\s*priority: 'max',\s*visibility: 'public'\s*\}\s*\}/g,
    `android: {
                    priority: 'high',
                    notification: {
                        sound: 'default',
                        channelId: 'chamdoli_chat',
                        priority: 'max',
                        visibility: 'public',
                        defaultSound: true,
                        defaultVibrateTimings: true,
                        defaultLightSettings: true
                    }
                }`
);
fs.writeFileSync(file, content);
