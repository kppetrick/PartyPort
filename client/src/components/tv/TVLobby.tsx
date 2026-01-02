import React from 'react';

interface TVLobbyProps {
  roomCode: string | null;
  room: any | null;
}

function TVLobby({ roomCode, room }: TVLobbyProps) {
  const playerCount = room?.players?.length || 0;
  const connectedPlayers = room?.players?.filter((p: any) => !p.disconnected) || [];

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      minHeight: '100vh',
      fontSize: '2rem',
      padding: '40px'
    }}>
      {roomCode ? (
        <>
          <h1 style={{ fontSize: '4rem', marginBottom: '20px' }}>{roomCode}</h1>
          {playerCount === 0 ? (
            <p>Waiting for players...</p>
          ) : (
            <>
              <p>Players: {playerCount} - Waiting for host to start game</p>
              <div style={{ marginTop: '40px' }}>
                <h2>Players:</h2>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {room?.players?.map((player: any) => (
                    <li 
                      key={player.socketId}
                      style={{ 
                        opacity: player.disconnected ? 0.5 : 1,
                        fontSize: '1.5rem',
                        margin: '10px 0'
                      }}
                    >
                      {player.name} {player.isHost && '(Host)'}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </>
      ) : (
        <p>Creating room...</p>
      )}
    </div>
  );
}

export default TVLobby;

