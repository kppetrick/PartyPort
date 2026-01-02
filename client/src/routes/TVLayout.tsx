import { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import TVLobby from '../components/tv/TVLobby';

function TVLayout() {
  const { socket, connected } = useSocket();
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [room, setRoom] = useState<any | null>(null);

  useEffect(() => {
    if (connected && socket) {
      // Create room on mount
      socket.emit('create_room', { gameType: 'circumact' }, (response: any) => {
        if (response.success) {
          setRoomCode(response.roomCode);
          setRoom(response.room);
        }
      });

      // Listen for room updates
      socket.on('room_update', (roomData: any) => {
        setRoom(roomData);
      });

      return () => {
        socket.off('room_update');
      };
    }
  }, [connected, socket]);

  return <TVLobby roomCode={roomCode} room={room} />;
}

export default TVLayout;

