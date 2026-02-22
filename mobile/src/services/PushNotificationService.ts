import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { chatAPI } from '../api/client';
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';

class PushNotificationService {
    async initialize() {
        try {
            // 1. Request permissions
            if (Platform.OS === 'android') {
                await notifee.requestPermission();
            }

            // 2. Clear badge
            await notifee.setBadgeCount(0);

            // 3. Create a channel for notifications
            await notifee.createChannel({
                id: 'chamdoli_chat_v4',
                name: 'Chat Messages',
                sound: 'jai_chamdoli',
                importance: AndroidImportance.HIGH,
                visibility: AndroidVisibility.PUBLIC,
                vibration: true,
                vibrationPattern: [300, 500],
            });

            // 4. Register for remote notifications
            if (!messaging().isDeviceRegisteredForRemoteMessages) {
                await messaging().registerDeviceForRemoteMessages();
            }

            // 5. Get and save token
            await this.refreshFCMToken();

            // 6. Listen for token refresh
            messaging().onTokenRefresh(token => {
                this.saveTokenToServer(token);
            });

            // 7. Handle foreground messages
            messaging().onMessage(async remoteMessage => {
                console.log('FCM Foreground message received:', remoteMessage);
                // Socket should handle foreground, but if screen is off but socket connected, 
                // we might want to show local notification. 
                // Actually, usually onMessage is only if app is open.
            });

        } catch (error) {
            console.error('PushNotificationService Init Error:', error);
        }
    }

    async refreshFCMToken() {
        try {
            const token = await messaging().getToken();
            if (token) {
                await this.saveTokenToServer(token);
            }
        } catch (error) {
            console.error('Failed to get FCM token:', error);
        }
    }

    async saveTokenToServer(fcmToken: string) {
        try {
            console.log('Saving FCM Token:', fcmToken);
            await chatAPI.updateToken(fcmToken);
        } catch (error) {
            // Might fail if not logged in, that's okay
            console.log('Save FCM token failed (likely not logged in yet)');
        }
    }
}

export default new PushNotificationService();
