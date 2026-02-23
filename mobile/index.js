import { AppRegistry } from 'react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';
import { NotificationService } from './src/services/NotificationService';

setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
    console.log('Background FCM received:', remoteMessage);
    const data = remoteMessage.data;
    const notification = remoteMessage.notification;

    if (data || notification) {
        const groupId = data?.group_id || data?.groupId;

        // Extract content with priority: Data > Notification > Fallback
        const title = data?.title || data?.display_name || notification?.title || 'Village Member';
        const body = data?.body || data?.content || notification?.body || 'New message arrived';

        // NOTE: If 'notification' block exists, Android OS displays it automatically.
        // CALLING displayChatNotification here will cause a second notification.
        // However, we MUST call it to respect MUTE status and CUSTOM TONES.
        // To fix this globally, the server should send 'Data-only' messages.
        await NotificationService.displayChatNotification(
            title,
            body,
            false,
            groupId
        );
    }
});

AppRegistry.registerComponent(appName, () => App);
