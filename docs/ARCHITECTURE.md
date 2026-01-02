# PartyPort – Engine Architecture

This document describes the architecture of PartyPort: a reusable party game engine for building Jackbox-style party games that run on Raspberry Pi with TV + phone UIs.

---

## 1. System Overview

PartyPort provides the core infrastructure for party games:

1. **Raspberry Pi** (or any Node.js server)
   - Runs the Node.js backend and serves the built React frontend
   - Acts as a Wi-Fi Access Point (for Pi) or local network server
   - Outputs the TV UI via HDMI (Chromium in kiosk mode)

2. **TV UI (`/tv` route)**
   - Display-only interface (no direct input)
   - Shows: lobby, players, game state, scores, timers
   - Subscribes to game state via Socket.io (read-only)

3. **Phone UI (`/play` route)**
   - Interactive interface for players and host
   - Used for: joining rooms, creating profiles, game interactions
   - Sends inputs to the server via Socket.io

All communication between TV and phones is handled by the backend using **Socket.io**.

---

## 2. Tech Stack

**Backend**
- Node.js
- Express (HTTP API + static file hosting)
- Socket.io (WebSockets, real-time events)
- SQLite or JSON (local storage for MVP)

**Frontend**
- React (single app)
- React Router (`/tv`, `/play`)
- Socket.io client
- Responsive layouts (TV vs phone)

**Platform**
- Raspberry Pi 4/5 (or any Node.js server)
- HDMI output (TV)
- Wi-Fi Access Point mode (for Pi) or local network

---

## 3. Core Engine Components

### 3.1 Room Management (`server/game/gameState.js`)

**Purpose:** Manages rooms and player connections.

**Key Functions:**
- `createEmptyRoom(roomCode)` - Creates a new room
- `getOrCreateRoom(roomCode)` - Gets existing or creates new room
- `getRoom(roomCode)` - Gets room (throws if doesn't exist)
- `addPlayerToRoom(roomCode, socketId, profile)` - Adds player, handles reconnection
- `removePlayerFromRoom(roomCode, socketId)` - Marks player as disconnected
- `getPlayerBySocketId(roomCode, socketId)` - Finds player by socket
- `getPlayerByProfileId(roomCode, profileId)` - Finds player by profile
- `setHost(roomCode, profileId)` - Sets host for a room
- `handlePlayerDisconnect(io, socket)` - Handles disconnect events

**Room State Structure:**
```javascript
{
  code: string,           // Room code (e.g., "ABC12")
  players: [],           // Array of player objects
  createdAt: timestamp,  // When room was created
  // Games can extend this with game-specific state
}
```

**Player Object:**
```javascript
{
  socketId: string,      // Socket.io socket ID
  profileId: string,     // Profile ID
  name: string,          // Player name
  isHost: boolean,       // Is this player the host?
  wasOriginalHost: boolean, // Were they the original host?
  disconnected: boolean, // Currently disconnected?
  // Games can extend with game-specific fields
}
```

---

### 3.2 Profile Management (`server/models/players.js`)

**Purpose:** Manages player profiles (accounts).

**Key Functions:**
- `findOrCreateProfile({ name, birthday, gender })` - Creates or finds existing profile
- `getProfileById(profileId)` - Gets profile by ID

**Profile Structure:**
```javascript
{
  id: string,                    // Profile ID
  name: string,                  // Player name
  birthday: string,              // YYYY-MM-DD
  gender: string,                // male/female/other/preferNot
  gamesPlayed: number,           // Lifetime games
  lastActive: timestamp,          // Last activity
  // Games can extend with game-specific stats
}
```

**Login:** Name + Birthday (no passwords required)

---

### 3.3 Socket Handlers (`server/socket/gameHandlers.js`)

**Purpose:** Handles all Socket.io events for core engine functionality.

**Core Events:**
- `create_profile` - Creates or finds a player profile
- `create_room` - Creates a new game room
- `validate_room` - Validates if a room exists
- `join_room` - Joins a player to a room
- `disconnecting` - Handles player disconnection

**Event Flow:**
1. TV loads → calls `create_room` → gets room code
2. Phone loads → calls `validate_room` → checks if room exists
3. Phone → calls `create_profile` → gets profile
4. Phone → calls `join_room` → joins room
5. Server → emits `room_update` → all clients receive updated player list

**Games extend this** with game-specific events (e.g., `start_game`, `submit_answer`, etc.)

---

### 3.4 Utilities (`server/utils/id.js`)

**Purpose:** Helper functions for IDs and codes.

**Functions:**
- `randomRoomCode(length)` - Generates unique room codes (5 chars, avoids confusing chars)

---

### 3.5 Server Setup (`server/server.js`)

**Purpose:** Main Express + Socket.io server.

**Responsibilities:**
- Sets up Express server
- Attaches Socket.io
- Serves static files (React build in production)
- Health check endpoint (`/health`)

---

## 4. Frontend Architecture

### 4.1 Socket Hook (`client/src/hooks/useSocket.ts`)

**Purpose:** Provides Socket.io connection to React components.

**Returns:**
- `socket` - Socket.io instance
- `connected` - Connection status

---

### 4.2 Game Context (`client/src/context/GameContext.tsx`)

**Purpose:** Shared React context for current player and room state.

**State:**
- `profile` - Current player profile
- `roomCode` - Current room code
- `setProfile` - Update profile
- `setRoomCode` - Update room code

**Games extend this** with game-specific state.

---

### 4.3 Routes

**`/tv`** → `TVLayout.tsx`
- TV display interface
- Shows lobby, players, game state

**`/play`** → `PhoneLayout.tsx`
- Phone player interface
- Shows join screen, game screens

---

### 4.4 Core Components

**Phone:**
- `JoinScreen.tsx` - Room code entry, profile creation/selection

**TV:**
- `TVLobby.tsx` - Room code display, player list

**Games extend these** with game-specific components.

---

## 5. How Games Extend the Engine

Games built on PartyPort:

1. **Extend room state** - Add game-specific fields to room object
2. **Add socket handlers** - Register game-specific events
3. **Add components** - Create game-specific UI components
4. **Extend context** - Add game-specific state to context
5. **Add routes** - Add game-specific routes

**Example:** A trivia game might add:
- `room.triviaQuestions` - Questions for the game
- `room.currentQuestion` - Current question index
- `socket.on('submit_answer')` - Handle answer submission
- `TriviaScreen.tsx` - Show questions and answers
- `context.currentQuestion` - Track current question

---

## 6. Data Flow

1. **Server boot** → Starts Express + Socket.io
2. **TV loads** → Creates room → Displays room code
3. **Phone loads** → Validates room → Creates/selects profile → Joins room
4. **Server** → Emits `room_update` → All clients receive player list
5. **Game starts** → Game-specific events flow through Socket.io
6. **State updates** → Server broadcasts to all clients

---

## 7. Persistence Strategy

**MVP:** In-memory (rooms reset on server restart)

**Future:** 
- JSON files for profiles
- SQLite for profiles and game data
- Redis for active rooms (optional)

---

## 8. Raspberry Pi Specifics

- Run server on boot using `systemd`
- Start Chromium in kiosk mode pointing to `/tv`
- Configure Pi as Wi-Fi Access Point
- Show connection instructions on TV

---

## 9. Development Workflow

1. Clone PartyPort
2. Install dependencies (`npm install` in server/ and client/)
3. Start backend (`npm run dev` in server/)
4. Start frontend (`npm run dev` in client/)
5. Open `http://localhost:3000/tv` and `http://localhost:3000/play`
6. Build game on top of engine

---

## 10. Engine vs Game Code

**Engine (PartyPort):**
- Room management
- Profile management
- Socket.io setup
- Core UI components (JoinScreen, TVLobby)
- Basic routing

**Game (CircumAct, etc.):**
- Game-specific logic (drafting, rounds, scoring)
- Game-specific components (DraftScreen, ClueGiverScreen)
- Game-specific socket events
- Game-specific state management

