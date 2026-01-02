import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Profile {
  id: string;
  username: string;
  name: string;
  birthday: string;
  gender: string;
  email?: string;
  gamesPlayed: number;
  lastActive: number;
  lastRoom?: string;
}

interface GameContextType {
  profile: Profile | null;
  roomCode: string | null;
  room: any | null;
  setProfile: (profile: Profile | null) => void;
  setRoomCode: (code: string | null) => void;
  updateRoomState: (room: any) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [room, setRoom] = useState<any | null>(null);

  const updateRoomState = (roomData: any) => {
    setRoom(roomData);
  };

  return (
    <GameContext.Provider
      value={{
        profile,
        roomCode,
        room,
        setProfile,
        setRoomCode,
        updateRoomState
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within GameProvider');
  }
  return context;
};

