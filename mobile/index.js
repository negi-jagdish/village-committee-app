import { AppRegistry } from 'react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';
import { NotificationService } from './src/services/NotificationService';

// Background message handler
setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
    console.log('Message handled in the background!', remoteMessage);
    const data = remoteMessage.data;
    if (data) {
        const groupId = data.group_id || data.groupId;
        await NotificationService.displayChatNotification(
            data.title || data.display_name || 'Village Member',
            data.body || data.content || 'New message arrived',
            false,
            groupId
        );
    }
});

AppRegistry.registerComponent(appName, () => App);
