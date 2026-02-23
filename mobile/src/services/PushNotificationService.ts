import {
    getMessaging,
    getToken,
    onMessage,
    onTokenRefresh,
    registerDeviceForRemoteMessages,
    isDeviceRegisteredForRemoteMessages
} from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { chatAPI } from '../api/client';
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import { NotificationService } from './NotificationService';

class PushNotificationService {
    async initialize() {
        try {
            const messaging = getMessaging();

            // 1. Request permissions and initialize channels
            if (Platform.OS === 'android') {
                await notifee.requestPermission();
                await NotificationService.initialize();
            }

            // 2. Clear badge
            await notifee.setBadgeCount(0);

            // 3. Register for remote notifications
            if (!isDeviceRegisteredForRemoteMessages(messaging)) {
                await registerDeviceForRemoteMessages(messaging);
            }

            // 5. Get and save token
            await this.refreshFCMToken();

            // 6. Listen for token refresh
            onTokenRefresh(messaging, token => {
                this.saveTokenToServer(token);
            });

            // 7. Handle foreground messages
            onMessage(messaging, async remoteMessage => {
                console.log('FCM Foreground message received:', remoteMessage);
                const data = remoteMessage.data;
                const notification = remoteMessage.notification;

                if (data || notification) {
                    const groupId = (data?.group_id || data?.groupId) as any;

                    // Priority: Data > Notification > Fallback
                    const title = (data?.title || data?.display_name || notification?.title || 'Village Member') as string;
                    const body = (data?.body || data?.content || notification?.body || 'New message arrived') as string;

                    // Call the notification service just like the socket does
                    await NotificationService.displayChatNotification(title, body, true, groupId);
                }
            });

        } catch (error) {
            console.warn('PushNotificationService Init Warning (FCM might be unavailable):', error);
        }
    }

    async refreshFCMToken() {
        try {
            const token = await getToken(getMessaging());
            if (token) {
                await this.saveTokenToServer(token);
            }
        } catch (error: any) {
            // Service might be unavailable on emulators or poor network
            // Using warn instead of error to avoid development RedBox
            console.warn('FCM Token Refresh: Service not available or network error.', error?.message || error);
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
