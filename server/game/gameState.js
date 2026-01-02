// Manages rooms and players: create rooms, add/remove players, handle reconnections and disconnections

const roomState = new Map();
// gameType defaults to 'circumact' for now, but will be passed upon game selection in the future
const createEmptyRoom = (roomCode, gameType = 'circumact') => {
    const codeUpper = roomCode.toUpperCase();
    const room = {
        code: codeUpper,
        players: [],
        createdAt: Date.now(),
        gameType: gameType
    };
    roomState.set(codeUpper, room);
    return room;
}

const getRoom = (roomCode) => {
    const codeUpper = roomCode.toUpperCase();
    const room = roomState.get(codeUpper);
    if (!room) {
        throw new Error(`Room ${codeUpper} does not exist`);
    }
    return room;
}

const getOrCreateRoom = (roomCode, gameType = 'circumact') => {
    const codeUpper = roomCode.toUpperCase();
    const room = roomState.get(codeUpper);
    if (!room) {
        return createEmptyRoom(codeUpper, gameType);
    }
    return room;
}

const getPlayerBySocketId = (roomCode, socketId) => {
    const room = getRoom(roomCode);
    return room.players.find(player => player.socketId === socketId);
}

const getPlayerByProfileId = (roomCode, profileId) => {
    const room = getRoom(roomCode);
    return room.players.find(player => player.profileId === profileId);
}

// Prevent duplicate users in the same room
const checkDuplicateUser = (roomCode, profileId) => {
    const existingPlayer = getPlayerByProfileId(roomCode, profileId);
    if (existingPlayer && !existingPlayer.disconnected) {
        throw new Error(`User with profileId ${profileId} already exists in room`);
    }
    return existingPlayer; // Return existing player if disconnected (for reconnection)
}

const setHost = (roomCode, profileId) => {
    const room = getRoom(roomCode);
    const player = getPlayerByProfileId(roomCode, profileId);
    
    if (!player) {
        throw new Error(`Player with profileId ${profileId} not found in room`);
    }
    
    // Set all players to not host
    room.players.forEach(p => {
        p.isHost = false;
    });
    
    // Set target player as host
    player.isHost = true;
    
    // If no one was original host yet, mark this one
    const hasOriginalHost = room.players.some(p => p.wasOriginalHost);
    if (!hasOriginalHost) {
        player.wasOriginalHost = true;
    }
}

const addPlayerToRoom = (roomCode, socketId, profile) => {
    const room = getRoom(roomCode);
    
    // Check for existing player (for reconnection)
    const existingPlayer = checkDuplicateUser(roomCode, profile.id);
    
    if (existingPlayer) {
        // Reconnection: Update socketId and set disconnected to false
        existingPlayer.socketId = socketId;
        existingPlayer.disconnected = false;
        existingPlayer.lastSeen = Date.now();
        return existingPlayer;
    }
    
    // New player: Create full player object
    const isFirstPlayer = room.players.length === 0;
    const player = {
        socketId: socketId,
        profileId: profile.id,
        name: profile.name,
        username: profile.username,
        email: profile.email || undefined,
        isHost: false, // Will be set by setHost if first player
        wasOriginalHost: false, // Will be set by setHost if first player
        disconnected: false,
        joinedAt: Date.now(),
        lastSeen: Date.now()
    };
    
    room.players.push(player);
    
    // Set first player as host
    if (isFirstPlayer) {
        setHost(roomCode, profile.id);
    }
    
    return player;
}

const removePlayerFromRoom = (roomCode, socketId) => {
    const room = getRoom(roomCode);
    const player = getPlayerBySocketId(roomCode, socketId);
    
    if (!player) {
        throw new Error(`Player with socketId ${socketId} not found in room`);
    }
    
    // Mark as disconnected (keep player in room indefinitely)
    player.disconnected = true;
    player.lastSeen = Date.now();
    
    return player;
}   

const handlePlayerDisconnect = (io, socket) => {
    const socketId = socket.id;
    
    // Find which room the player is in by searching all rooms
    for (const [roomCode, room] of roomState.entries()) {
        const player = room.players.find(p => p.socketId === socketId);
        if (player) {
            // Mark player as disconnected
            removePlayerFromRoom(roomCode, socketId);
            
            // Broadcast room update to all clients in the room
            io.to(roomCode).emit('room_update', {
                code: roomCode,
                players: room.players
            });
            
            return { roomCode, player };
        }
    }
    
    // Player not found in any room (shouldn't happen, but handle gracefully)
    return null;
}

module.exports = { 
    roomState,
    createEmptyRoom,
    getRoom,
    getOrCreateRoom,
    getPlayerBySocketId,
    getPlayerByProfileId,
    setHost,
    checkDuplicateUser,
    addPlayerToRoom,
    removePlayerFromRoom,
    handlePlayerDisconnect
};

