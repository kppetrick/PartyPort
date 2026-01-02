// Handles Socket.io events: profile creation, room management, player joining/disconnecting

const { randomRoomCode } = require('../utils/id');
const { roomState, createEmptyRoom, getRoom, addPlayerToRoom, handlePlayerDisconnect } = require('../game/gameState');
const { profiles, findOrCreateProfile, getProfileById, findProfilesByUsername } = require('../models/players');

const registerGameHandlers = (io, socket) => {
    // list_all_profiles: List all profiles (for debugging)
    socket.on('list_all_profiles', (data, callback) => {
        try {
            const profilesList = Array.from(profiles.values()).map(profile => ({
                id: profile.id,
                username: profile.username,
                name: profile.name,
                birthday: profile.birthday,
                hasEmail: !!profile.email,
                email: profile.email ? profile.email.substring(0, 3) + '***' : undefined, // Partially hide email
                lastActive: new Date(profile.lastActive).toISOString(),
                lastRoom: profile.lastRoom
            }));
            callback({ success: true, count: profilesList.length, profiles: profilesList });
        } catch (error) {
            callback({ error: error.message });
        }
    });

    // search_profiles: Search for existing profiles by username
    socket.on('search_profiles', (data, callback) => {
        try {
            const { username } = data;
            
            if (!username || username.trim().length === 0) {
                return callback({ error: 'Username required' });
            }
            
            const matches = findProfilesByUsername(username.trim());
            callback({ success: true, profiles: matches });
        } catch (error) {
            callback({ error: error.message });
        }
    });

    // create_profile: Create or find player profile
    socket.on('create_profile', (data, callback) => {
        try {
            const { username, name, birthday, gender, email } = data;
            
            if (!username || !name || !birthday || !gender) {
                return callback({ error: 'Missing required fields: username, name, birthday, gender' });
            }
            
            const profile = findOrCreateProfile({ username, name, birthday, gender, email });
            callback({ success: true, profile });
        } catch (error) {
            callback({ error: error.message });
        }
    });

    // create_room: Generate unique room code and create room
    socket.on('create_room', (data, callback) => {
        try {
            const { gameType = 'circumact' } = data;
            const roomCode = randomRoomCode(roomState);
            const room = createEmptyRoom(roomCode, gameType);
            
            // Join socket to room
            socket.join(roomCode);
            
            callback({ success: true, roomCode, room });
        } catch (error) {
            callback({ error: error.message });
        }
    });

    // validate_room: Check if room exists
    socket.on('validate_room', (data, callback) => {
        try {
            const { roomCode } = data;
            
            if (!roomCode) {
                return callback({ error: 'Room code required' });
            }
            
            try {
                const room = getRoom(roomCode);
                const connectedPlayerIds = room.players
                    .filter(p => !p.disconnected)
                    .map(p => p.profileId);
                
                callback({
                    success: true,
                    exists: true,
                    playerCount: room.players.length,
                    connectedPlayerIds
                });
            } catch (error) {
                // Room doesn't exist
                callback({
                    success: true,
                    exists: false,
                    playerCount: 0,
                    connectedPlayerIds: []
                });
            }
        } catch (error) {
            callback({ error: error.message });
        }
    });

    // join_room: Add player to room, handle reconnection
    socket.on('join_room', (data, callback) => {
        try {
            const { roomCode, profileId } = data;
            
            if (!roomCode || !profileId) {
                return callback({ error: 'Room code and profile ID required' });
            }
            
            // Validate profile exists
            const profile = getProfileById(profileId);
            if (!profile) {
                return callback({ error: 'Profile not found' });
            }
            
            // Get room
            const room = getRoom(roomCode);
            
            // Add player to room (handles reconnection automatically)
            const player = addPlayerToRoom(roomCode, socket.id, profile);
            
            // Update profile's lastRoom
            profile.lastRoom = roomCode;
            
            // Join socket to room
            socket.join(roomCode);
            
            // Broadcast room update to all clients in the room
            io.to(roomCode).emit('room_update', {
                code: roomCode,
                players: room.players,
                gameType: room.gameType
            });
            
            callback({
                success: true,
                roomCode,
                player,
                room: {
                    code: room.code,
                    players: room.players,
                    gameType: room.gameType,
                    createdAt: room.createdAt
                }
            });
        } catch (error) {
            callback({ error: error.message });
        }
    });

    // disconnecting: Handle player disconnect
    socket.on('disconnecting', () => {
        handlePlayerDisconnect(io, socket);
    });

    // reconnect: Handle player reconnection
    socket.on('reconnect', (data, callback) => {
        try {
            const { roomCode, profileId } = data;
            
            if (!roomCode || !profileId) {
                return callback({ error: 'Room code and profile ID required' });
            }
            
            const room = getRoom(roomCode);
            const player = room.players.find(p => p.profileId === profileId);
            
            if (!player) {
                return callback({ error: 'Player not found in room' });
            }
            
            // Update socketId and set disconnected to false
            player.socketId = socket.id;
            player.disconnected = false;
            player.lastSeen = Date.now();
            
            // Join socket to room
            socket.join(roomCode);
            
            // Broadcast room update
            io.to(roomCode).emit('room_update', {
                code: roomCode,
                players: room.players,
                gameType: room.gameType
            });
            
            callback({
                success: true,
                roomCode,
                player
            });
        } catch (error) {
            callback({ error: error.message });
        }
    });
};

module.exports = { registerGameHandlers };

