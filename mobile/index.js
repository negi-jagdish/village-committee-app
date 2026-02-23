import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';
import { NotificationService } from './src/services/NotificationService';

// Background message handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Message handled in the background!', remoteMessage);
    if (remoteMessage.data) {
        await NotificationService.displayChatNotification(
            remoteMessage.data.title || 'Devbhoomi Chamdoli',
            remoteMessage.data.body || 'New message arrived',
            false,
            remoteMessage.data.group_id || remoteMessage.data.groupId
        );
    }
});

AppRegistry.registerComponent(appName, () => App);
