import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { API_BASE_URL } from '../api/client';
import { AppState, AppStateStatus } from 'react-native';

import ChatSyncService from '../services/ChatSyncService';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const token = useSelector((state: RootState) => state.auth.token);
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        let currentSocket: Socket | null = null;

        if (token) {
            const socketUrl = API_BASE_URL.replace('/api', '');

            currentSocket = io(socketUrl, {
                auth: { token },
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 1000,
                timeout: 20000,
            });

            currentSocket.on('connect', () => {
                console.log('Socket connected:', currentSocket?.id);
                setIsConnected(true);
                ChatSyncService.init(currentSocket);
            });

            currentSocket.on('disconnect', (reason) => {
                console.log('Socket disconnected:', reason);
                setIsConnected(false);
            });

            currentSocket.on('connect_error', (err) => {
                console.error('Socket connect error:', err);
            });

            setSocket(currentSocket);

            const handleAppStateChange = (nextAppState: AppStateStatus) => {
                if (
                    appState.current.match(/inactive|background/) &&
                    nextAppState === 'active'
                ) {
                    console.log('App has come to the foreground, checking socket...');
                    if (currentSocket && !currentSocket.connected) {
                        currentSocket.connect();
                    }
                }
                appState.current = nextAppState;
            };

            const subscription = AppState.addEventListener('change', handleAppStateChange);

            return () => {
                subscription.remove();
                currentSocket?.disconnect();
            };
        } else {
            setSocket(null);
            setIsConnected(false);
        }
    }, [token]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
