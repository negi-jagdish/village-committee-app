/**
 * @format
 */

import { AppRegistry, LogBox } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

// Ignore Firebase Migration Warnings and other noisy logs
LogBox.ignoreLogs([
    'This method is deprecated',
    'API Error Response: 401',
    'SerializableStateInvariantMiddleware'
]);

// Register background handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Message handled in the background!', remoteMessage);

    // Only display local notification if there is NO native notification block
    if (remoteMessage.data && !remoteMessage.notification) {
        // Ensure channel exists
        await notifee.createChannel({
            id: 'chamdoli_chat_v4',
            name: 'Chat Messages',
            sound: 'jai_chamdoli',
            importance: AndroidImportance.HIGH,
            visibility: AndroidVisibility.PUBLIC,
            vibration: true,
            vibrationPattern: [300, 500],
        });

        await notifee.displayNotification({
            title: remoteMessage.data.title || 'Devbhoomi Chamdoli',
            body: remoteMessage.data.body || 'New message arrived',
            android: {
                channelId: 'chamdoli_chat_v4',
                visibility: AndroidVisibility.PUBLIC,
                importance: AndroidImportance.HIGH,
                pressAction: {
                    id: 'default',
                    launchActivity: 'default',
                },
            },
        });
    }
});

AppRegistry.registerComponent(appName, () => App);
