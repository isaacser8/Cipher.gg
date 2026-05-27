import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useUser } from '@clerk/clerk-react';
import { SocketContext } from './SocketContext';

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState(null as any);
  const [isConnected, setIsConnected] = useState(false);
  const { isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    const SOCKET_URL =
      import.meta.env.VITE_SOCKET_URL || 'https://ciphergg-production.up.railway.app';
    const socketInstance = io(SOCKET_URL);

    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('Global Socket Connected:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Global Socket Disconnected');
      setIsConnected(false);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [isLoaded]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
