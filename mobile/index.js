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

    if (remoteMessage.data) {
        // Ensure channel exists
        await notifee.createChannel({
            id: 'chamdoli_chat',
            name: 'Chat Messages',
            importance: AndroidImportance.HIGH,
            visibility: AndroidVisibility.PUBLIC,
            vibration: true,
        });

        await notifee.displayNotification({
            title: remoteMessage.data.title || 'Devbhoomi Chamdoli',
            body: remoteMessage.data.body || 'New message arrived',
            android: {
                channelId: 'chamdoli_chat',
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
