# PartyPort Engine Overview

## What is PartyPort?

PartyPort is a reusable party game engine that provides the core infrastructure for building Jackbox-style party games. It handles:

- **Room Management** - Creating rooms, joining rooms, managing players
- **Profile System** - Player accounts (name + birthday login)
- **Real-time Communication** - Socket.io setup for TV ↔ Phone sync
- **Basic UI Framework** - React app with `/tv` and `/play` routes

## Core Features

### ✅ Room System
- Generate unique 5-character room codes
- Create/join rooms
- Track connected players
- Handle disconnections and reconnections
- Host management (first player = host, host restoration on reconnect)

### ✅ Profile System
- Create profiles (name, birthday, gender)
- Find existing profiles by name + birthday
- No passwords required
- Persistent storage (in-memory for MVP, JSON/SQLite later)

### ✅ Socket.io Infrastructure
- WebSocket connections
- Event handlers for core functionality
- Room state broadcasting
- Connection/disconnection handling

### ✅ React Client Framework
- TV route (`/tv`) - Display interface
- Phone route (`/play`) - Interactive interface
- Socket.io hook for easy connection
- Game context for shared state

## What Games Need to Add

Games built on PartyPort extend the engine with:

1. **Game Logic** - Drafting, rounds, scoring, etc.
2. **Game Components** - Screens specific to the game
3. **Game Events** - Socket.io events for game actions
4. **Game State** - Extend room state with game-specific data

## Example: CircumAct

CircumAct uses PartyPort and adds:
- Card drafting system
- 4-round gameplay (Say Anything, One Word, Charades, Bonus)
- Timer system (60s + 30s grace)
- Skip approval system
- Scoring system
- Card analytics

## File Structure

```
PartyPort/
  server/
    server.js              # Express + Socket.io setup
    socket/
      index.js            # Socket.io initialization
      gameHandlers.js     # Core socket event handlers
    game/
      gameState.js        # Room/player management
    models/
      players.js          # Profile management
    utils/
      id.js               # Room code generation
  client/
    src/
      hooks/
        useSocket.ts      # Socket.io React hook
      context/
        GameContext.tsx   # Shared React context
      routes/
        TVLayout.tsx      # TV route
        PhoneLayout.tsx   # Phone route
      components/
        phone/
          JoinScreen.tsx  # Join room + profile creation
        tv/
          TVLobby.tsx     # Room code + player list
  docs/
    ARCHITECTURE.md       # Detailed architecture
    ENGINE-OVERVIEW.md    # This file
```

## Next Steps

1. Implement `JoinScreen.tsx` - Room code entry, profile creation
2. Implement `TVLobby.tsx` - Room creation, player list display
3. Test core flow: Create room → Join room → See players
4. Games can then extend with their own logic

