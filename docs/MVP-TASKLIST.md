# PartyPort Engine – MVP Task List

This document outlines the core engine functionality needed for PartyPort. Games built on PartyPort will extend this with their own features.

---

## Phase 1 – Backend Skeleton

**Goal:** Have a running Node + Express + Socket.io server with basic room and player management.

### Tasks

- [ ] Initialize `server/package.json`
  - Install dependencies: `express`, `socket.io`, `cors`, `nodemon` (dev)

- [ ] Create `server/server.js`
  - Set up basic Express server
  - Add `GET /health` endpoint returning `{ status: "ok" }`
  - Attach Socket.io to the HTTP server
  - Log when a client connects/disconnects

- [ ] Create `server/socket/index.js`
  - Export a function to initialize Socket.io
  - Wire it up from `server.js`

- [ ] Create `server/socket/gameHandlers.js`
  - Set up core handlers:
    - `create_profile`
    - `create_room`
    - `validate_room`
    - `join_room`
    - `disconnecting`

- [ ] Create `server/game/gameState.js`
  - Define in-memory structure for rooms and players
  - Functions: `getRoom`, `addPlayerToRoom`, `removePlayerFromRoom`, etc.

---

## Phase 2 – React Client Skeleton

**Goal:** Have a React app with `/tv` and `/play` routes and a live Socket.io connection.

### Tasks

- [ ] Initialize `client` React app
  - Use Vite
  - Install dependencies: `react-router-dom`, `socket.io-client`

- [ ] Set up routing in `client/src/App.tsx`
  - Route `/tv` → `TVLayout`
  - Route `/play` → `PhoneLayout`

- [ ] Create base route components:
  - `routes/TVLayout.tsx` - Simple placeholder
  - `routes/PhoneLayout.tsx` - Simple placeholder

- [ ] Create `hooks/useSocket.ts`
  - Connect to the backend via Socket.io
  - Expose: `socket` instance, `connected` state
  - Log connection events

---

## Phase 3 – Lobby & Profiles

**Goal:** Players can join, create/select a profile, and appear in a lobby seen on the TV.

### Backend

- [ ] `models/players.js`
  - In-memory or JSON-based storage for MVP
  - Functions:
    - `findOrCreateProfile(name, birthday, gender)`
    - `getProfileById(id)`

- [ ] Socket events:
  - `create_profile` → return `profileId`
  - `join_room` → add player to room state
  - Broadcast updated player list to TV (`room_update` event)

- [ ] `game/gameState.js` room management:
  - `getRoom(roomCode)`
  - `addPlayerToRoom(roomCode, socketId, profile)`
  - `removePlayerFromRoom(roomCode, socketId)`
  - `getPlayerBySocketId(roomCode, socketId)`
  - `getPlayerByProfileId(roomCode, profileId)`
  - `setHost(roomCode, profileId)`
  - `handlePlayerDisconnect(io, socket)`

### Frontend – Phone

- [ ] `JoinScreen.tsx`
  - Form for: Name, Birthday, Gender
  - Room code entry (5-character)
  - Profile selection from localStorage
  - On submit → emit `create_profile`
  - Then emit `join_room` with room code
  - Navigate to appropriate screen after join

### Frontend – TV

- [ ] `TVLobby.tsx`
  - Create/join room on TV load
  - Display room code prominently
  - Show list of connected players
  - Show host indicator
  - Listen to `room_update` socket events

At the end of Phase 3:
- Players can join on phones
- TV shows everyone in the lobby
- Profiles are created/stored

---

## What Games Add

Games built on PartyPort extend the engine with:

- **Team Management** - Random or manual team assignment
- **Game Logic** - Drafting, rounds, scoring, etc.
- **Game Components** - Game-specific screens
- **Game Events** - Game-specific socket events
- **Game State** - Extend room state with game data

See CircumAct for an example of a game built on PartyPort.

