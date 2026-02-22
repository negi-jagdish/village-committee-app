import notifee, { AndroidImportance, AndroidVisibility, AndroidCategory } from '@notifee/react-native';
import Sound from 'react-native-sound';
import { Platform } from 'react-native';

// Enable playback in silence mode
Sound.setCategory('Playback');

export class NotificationService {
    static async displayChatNotification(title: string, body: string, isForeground: boolean = false) {
        try {
            // If the user is actively staring at the chat, just play the sound without the banner!
            if (isForeground) {
                this.playChatSound();
                return;
            }

            // Request permissions (required for iOS)
            await notifee.requestPermission();

            // Create a channel (required for Android)
            const channelId = await notifee.createChannel({
                id: 'chamdoli_chat_v3',
                name: 'Urgent Chat Messages',
                sound: 'jai_chamdoli',
                importance: AndroidImportance.HIGH,
                vibration: true,
                vibrationPattern: [300, 500],
                visibility: AndroidVisibility.PUBLIC,
            });

            // Display a notification
            await notifee.displayNotification({
                title: title,
                body: body,
                android: {
                    channelId,
                    category: AndroidCategory.MESSAGE,
                    smallIcon: 'ic_launcher',
                    pressAction: {
                        id: 'default',
                    },
                    sound: 'jai_chamdoli',
                    importance: AndroidImportance.HIGH,
                    visibility: AndroidVisibility.PUBLIC,
                    asForegroundService: false, // Don't use foreground service for chat pings
                },
                ios: {
                    sound: 'jai_chamdoli.wav',
                    critical: true,
                }
            });
        } catch (err) {
            console.log('Notification error: ', err);
        }
    }

    static playChatSound() {
        try {
            const soundFile = Platform.OS === 'android' ? 'jai_chamdoli.wav' : 'jai_chamdoli.wav';
            const sound = new Sound(soundFile, Sound.MAIN_BUNDLE, (error) => {
                if (error) {
                    console.log('failed to load the sound', error);
                    return;
                }

                // Play out loud
                sound.play((success) => {
                    sound.release();
                });
            });
        } catch (err) {
            console.log('Audio playback error', err);
        }
    }
}
