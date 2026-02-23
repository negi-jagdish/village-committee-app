import notifee, { AndroidImportance, AndroidVisibility, AndroidCategory } from '@notifee/react-native';
import Sound from 'react-native-sound';
import { Platform, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDB } from '../db/database';

// Enable playback in silence mode
Sound.setCategory('Playback');

export class NotificationService {
    private static lastNotificationKey: string = '';
    private static lastNotificationTime: number = 0;

    static async initialize() {
        // Create default channel used by FCM system notifications as fallback
        await notifee.createChannel({
            id: 'v11_chat_default',
            name: 'General Notifications',
            importance: AndroidImportance.HIGH,
            visibility: AndroidVisibility.PUBLIC,
            sound: 'altair',
        });
    }

    static async displayChatNotification(title: string, body: string, isForeground: boolean = false, groupId?: string | number) {
        try {
            // Force groupId to string/number for key
            const gIdStr = groupId?.toString() || 'global';
            const dedupeKey = `${gIdStr}:${body}`; // Use body for better dedupe
            const now = Date.now();

            // De-duplication check (prevent socket + FCM double firing)
            if (now - this.lastNotificationTime < 1500 && this.lastNotificationKey === dedupeKey) {
                return;
            }
            this.lastNotificationTime = now;
            this.lastNotificationKey = dedupeKey;

            // Check for mute status and custom settings if groupId is provided
            let customTone: string | null = null;
            let vibrationEnabled = true;
            let vibrationIntensity = 100;
            let isMuted = false;

            if (groupId) {
                const gIdNum = typeof groupId === 'string' ? parseInt(groupId, 10) : groupId;

                const db = await getDB();
                const chat: any = await new Promise((resolve) => {
                    db.transaction((tx: any) => {
                        tx.executeSql('SELECT * FROM local_chats WHERE id = ?', [gIdNum], (_: any, result: any) => {
                            if (result.rows.length > 0) resolve(result.rows.item(0));
                            else resolve(null);
                        });
                    });
                });

                if (chat) {
                    if (chat.mute_until) {
                        if (chat.mute_until === 'always') {
                            isMuted = true;
                        } else {
                            const muteExpiry = new Date(chat.mute_until);
                            if (!isNaN(muteExpiry.getTime()) && muteExpiry > new Date()) {
                                isMuted = true;
                            }
                        }
                    }
                    customTone = chat.notification_tone;
                    vibrationEnabled = chat.vibration_enabled !== 0;
                    vibrationIntensity = chat.vibration_intensity ?? 100;
                }
            }

            // If muted, just stop here
            if (isMuted) return;

            // Load app-level settings if not custom
            if (!customTone || customTone === 'default') {
                const appTone = await AsyncStorage.getItem('app_notification_tone');
                customTone = appTone || 'default';
            }

            const appVibration = await AsyncStorage.getItem('app_vibration_enabled');
            if (appVibration !== null && !groupId) {
                vibrationEnabled = appVibration === 'true';
            }

            if (!groupId) {
                const appIntensity = await AsyncStorage.getItem('app_vibration_intensity');
                if (appIntensity !== null) {
                    vibrationIntensity = parseInt(appIntensity, 10);
                }
            }

            // Designated Default: use altair if 'default' is requested
            const finalTone = (customTone === 'default' || !customTone) ? 'altair' : customTone.toLowerCase();

            if (isForeground) {
                // In foreground: Play sound and Vibrate manually
                this.playChatSound(finalTone, vibrationEnabled, vibrationIntensity);
                return;
            }

            // Android Channel ID: Standardized pattern
            const channelId = `v11_chat_${finalTone}_v${vibrationEnabled ? '1' : '0'}_i${vibrationIntensity}`;

            // Map intensity 0-100 to vibration pattern [wait, vibrate]
            const vibPattern = vibrationEnabled ? [300, Math.max(50, Math.round(vibrationIntensity * 5))] : [];

            await notifee.createChannel({
                id: channelId,
                name: 'Chat Messages',
                importance: AndroidImportance.HIGH,
                sound: finalTone,
                vibration: vibrationEnabled,
                vibrationPattern: vibPattern,
                visibility: AndroidVisibility.PUBLIC,
            });

            await notifee.displayNotification({
                id: gIdStr !== 'global' ? gIdStr : undefined, // Replace existing notification for this chat
                title: title,
                body: body,
                android: {
                    channelId,
                    category: AndroidCategory.MESSAGE,
                    smallIcon: 'ic_launcher',
                    pressAction: { id: 'default' },
                    importance: AndroidImportance.HIGH,
                    visibility: AndroidVisibility.PUBLIC,
                    // Grouping for Android
                    groupId: gIdStr,
                },
                ios: {
                    sound: `${finalTone}.ogg`,
                    critical: true,
                }
            });
        } catch (err) {
            console.log('Notification error: ', err);
        }
    }

    static playChatSound(toneName: string, vibrate: boolean = true, intensity: number = 100) {
        try {
            // Handle Vibration (Sync with background pattern: [wait, vibrate])
            if (vibrate) {
                const duration = Math.max(50, Math.round(intensity * 5));
                if (Platform.OS === 'android') {
                    Vibration.vibrate([300, duration], false);
                } else {
                    Vibration.vibrate(duration);
                }
            }

            // Handle Sound
            // On Android, res/raw files should NOT include the extension in react-native-sound
            const soundFile = Platform.OS === 'android' ? toneName : `${toneName}.ogg`;
            const sound = new Sound(soundFile, Sound.MAIN_BUNDLE, (error) => {
                if (error) {
                    console.log('Sound load error:', error, soundFile);
                    return;
                }
                sound.setVolume(1.0);
                sound.play((success) => sound.release());
            });
        } catch (err) {
            console.log('Audio playback error', err);
        }
    }
}
