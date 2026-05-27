import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUser } from '@clerk/clerk-react';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

export const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    const SOCKET_URL =
      import.meta.env.VITE_SOCKET_URL || 'https://ciphergg-production.up.railway.app';
    const socketInstance = io(SOCKET_URL);

    socketInstance.on('connect', () => {
      console.log('Global Socket Connected:', socketInstance.id);
      setSocket(socketInstance);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Global Socket Disconnected');
      setSocket(null);
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
