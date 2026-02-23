import notifee, { AndroidImportance, AndroidVisibility, AndroidCategory } from '@notifee/react-native';
import Sound from 'react-native-sound';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDB } from '../db/database';

// Enable playback in silence mode
Sound.setCategory('Playback');

export class NotificationService {
    static async displayChatNotification(title: string, body: string, isForeground: boolean = false, groupId?: string | number) {
        try {
            // Check for mute status and custom settings if groupId is provided
            let customTone: string | null = null;
            let vibrationEnabled = true;
            let vibrationIntensity = 100;
            let isMuted = false;

            if (groupId) {
                const db = await getDB();
                const chat: any = await new Promise((resolve) => {
                    db.transaction((tx: any) => {
                        tx.executeSql('SELECT * FROM local_chats WHERE id = ?', [groupId], (_: any, result: any) => {
                            if (result.rows.length > 0) resolve(result.rows.item(0));
                            else resolve(null);
                        });
                    });
                });

                if (chat) {
                    if (chat.mute_until) {
                        if (chat.mute_until === 'always') isMuted = true;
                        else if (new Date(chat.mute_until) > new Date()) isMuted = true;
                    }
                    customTone = chat.notification_tone;
                    vibrationEnabled = chat.vibration_enabled !== 0;
                    vibrationIntensity = chat.vibration_intensity ?? 100;
                }
            }

            // If muted, just stop here (even in foreground, per usual behavior of mutes)
            if (isMuted) return;

            // Load app-level settings if not custom
            if (customTone === null || customTone === 'default') {
                const appTone = await AsyncStorage.getItem('app_notification_tone');
                customTone = appTone || 'default';
            }

            const appVibration = await AsyncStorage.getItem('app_vibration_enabled');
            if (appVibration !== null && !groupId) { // App level only if no chat setting or default
                vibrationEnabled = appVibration === 'true';
            }

            if (!groupId || (groupId && vibrationIntensity === 100)) {
                const appIntensity = await AsyncStorage.getItem('app_vibration_intensity');
                if (appIntensity !== null && !groupId) {
                    vibrationIntensity = parseInt(appIntensity, 10);
                }
            }

            if (isForeground) {
                this.playChatSound(customTone);
                return;
            }

            // Create a channel ID based on tone and vibration to force Android to use correct settings
            const soundName = customTone && customTone !== 'default' ? customTone : 'default';
            // Use sound name as part of the ID, and a salt to ensure fresh channel if we ever change them
            const channelId = `v7_chat_${soundName}_v${vibrationEnabled ? '1' : '0'}_i${vibrationIntensity}`;

            // Map intensity 0-100 to vibration pattern [wait, vibrate]
            // Standard is [300, 500]. We scale 500 based on intensity.
            const vibPattern = vibrationEnabled ? [300, Math.round(vibrationIntensity * 5)] : [];

            await notifee.createChannel({
                id: channelId,
                name: 'Chat Messages',
                importance: AndroidImportance.HIGH,
                sound: soundName,
                vibration: vibrationEnabled,
                vibrationPattern: vibPattern,
                visibility: AndroidVisibility.PUBLIC,
            });

            await notifee.displayNotification({
                title: title,
                body: body,
                android: {
                    channelId,
                    category: AndroidCategory.MESSAGE,
                    smallIcon: 'ic_launcher',
                    pressAction: { id: 'default' },
                    sound: soundName,
                    importance: AndroidImportance.HIGH,
                    visibility: AndroidVisibility.PUBLIC,
                },
                ios: {
                    sound: soundName === 'default' ? 'default' : `${soundName}.ogg`,
                    critical: true,
                }
            });
        } catch (err) {
            console.log('Notification error: ', err);
        }
    }

    static playChatSound(toneName: string | null = 'default') {
        try {
            if (!toneName || toneName === 'default') {
                return;
            }

            const soundFile = `${toneName}.ogg`;
            const sound = new Sound(soundFile, Sound.MAIN_BUNDLE, (error) => {
                if (error) {
                    console.log('Sound load error:', error);
                    return;
                }
                sound.play((success) => sound.release());
            });
        } catch (err) {
            console.log('Audio playback error', err);
        }
    }
}
