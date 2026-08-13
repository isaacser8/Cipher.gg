import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUser } from '@clerk/clerk-react';
import { SocketContext } from './SocketContext';

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    const SOCKET_URL =
      import.meta.env.VITE_SOCKET_URL || 'https://ciphergg-production.up.railway.app';
    const socketInstance = io(SOCKET_URL);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      setSocket(null);
    };
  }, [isLoaded]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
