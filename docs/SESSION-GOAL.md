# Session Goal: CircumAct Room Code & Login Flow

## Objective
Implement a complete login and room joining flow for CircumAct:
- **TV**: Display random room code (4-letter word + 2 numbers, e.g., "DANC42")
- **Phone**: Gmail OAuth 2.0 or username/birthday login → Room code entry → Join room

## Requirements

### TV Display
- Show random room code prominently (4-letter word + 2 numbers)
- Display "Waiting for players" until first player joins
- After first player joins: Show "Players: X - Waiting for host to start game"
- Grey out disconnected players (but keep state - they can rejoin)
- When player reconnects on phone, they automatically rejoin the room
- Future: Game selection menu (like Jackbox)

### Phone Login Flow
1. **Login Options**:
   - Option A: Login with Gmail (OAuth)
   - Option B: Create user without email
   
2. **Profile Creation/Login**:
   - Username (required)
   - Birthday: mm/dd/yy format
   - If profile exists:
     - Gmail users: Login via Gmail OAuth
     - Username users: Type username → Show matching usernames with birthdates → Select correct one

3. **Room Joining**:
   - Enter room code (4-letter word + 2 numbers)
   - Show previous rooms user was in (stored on phone AND server)
   - Grey out rooms user is already in
   - Allow rejoining rooms
   - Auto-rejoin if user disconnects and reopens app (state preserved)

### Design Principles
- Minimalistic, modern UI
- Follow industry best practices
- Responsive design for phone screens
- Clean, intuitive UX

---

## Implementation Steps (In Order)

### Phase 1: Backend Foundation

#### Step 1: Implement Room Code Generation
**File**: `server/utils/id.js`
- Create `randomRoomCode()` function
- Generate 4 random letters (A-Z) + 2 random numbers (00-99)
- Format: "ABCD##" (e.g., "XYZW42", "ABCD17")
- Case insensitive (store as uppercase, compare case-insensitively)
- Ensure uniqueness (check against active rooms, retry if collision)
- Rooms wiped on server restart (in-memory only)
- Export function

#### Step 2: Implement Room State Management
**File**: `server/game/gameState.js`
- Create in-memory room storage (Map: roomCode → roomState)
- Implement `createEmptyRoom(roomCode)` - Create new room
- Implement `getOrCreateRoom(roomCode)` - Get existing or create
- Implement `getRoom(roomCode)` - Get room (throws if doesn't exist)
- Implement `addPlayerToRoom(roomCode, socketId, profile)` - Add player
- Implement `removePlayerFromRoom(roomCode, socketId)` - Remove player
- Implement `getPlayerBySocketId(roomCode, socketId)` - Find player
- Implement `getPlayerByProfileId(roomCode, profileId)` - Find player
- Implement `setHost(roomCode, profileId)` - Set host
- Implement `handlePlayerDisconnect(io, socket)` - Handle disconnects
- Room state structure:
  ```js
  {
    code: string,
    players: Array<{
      socketId: string,
      profileId: string,
      name: string,
      username: string,
      email?: string, // If logged in via Gmail
      isHost: boolean,
      wasOriginalHost: boolean,
      disconnected: boolean,
      joinedAt: timestamp,
      lastSeen: timestamp // For tracking disconnections
    }>,
    createdAt: timestamp,
    gameType: 'circumact' // Future: selectable
  }
  ```
- Handle reconnection logic:
  - When player disconnects: Set `disconnected: true`, update `lastSeen`
  - When player reconnects: Check if profileId matches existing player in room
  - If match: Update socketId, set `disconnected: false`
  - If no match: Add as new player

#### Step 3: Implement Profile Management
**File**: `server/models/players.js`
- Create in-memory profile storage (Map: profileId → profile)
- Implement `findOrCreateProfile({ name, username, birthday, gender, email })`
  - **Profile ID Generation (Industry Standard)**:
    - Gmail users: Use email as profileId (unique identifier)
    - Username users: Generate UUID v4 (industry standard for unique IDs)
  - Check for existing profile by email (if Gmail) or username+birthday (if username)
  - Create new if doesn't exist
- Implement `getProfileById(profileId)`
- Implement `findProfilesByUsername(username)` - Partial match, case-insensitive
  - Returns array of matching profiles with birthdates
- Profile structure:
  ```js
  {
    id: string,              // UUID (username) or email (Gmail)
    username: string,
    name: string,
    birthday: string,         // YYYY-MM-DD format
    gender: string,           // male/female/other/preferNot
    email?: string,           // If logged in via Gmail
    gamesPlayed: number,
    lastActive: timestamp,
    lastRoom?: string         // Last room code user was in (single value, not array)
  }
  ```

#### Step 4: Set Up Gmail OAuth 2.0 Integration
**Files**: `server/auth/googleAuth.js` (new), `server/server.js`
- Install: `passport`, `passport-google-oauth20`, `express-session`, `uuid`
- **OAuth 2.0 Flow (Industry Standard)**:
  - Server-side sessions with secure HTTP-only cookies
  - State parameter for CSRF protection
  - Redirect URLs: Handle both development (localhost) and production
  - Mobile: Use deep links or redirect back to app URL
- Create Google OAuth 2.0 strategy
- Add `/auth/google` route (initiate OAuth - redirects to Google)
- Add `/auth/google/callback` route (handle callback from Google)
- Store OAuth tokens/session in server-side session (secure cookies)
- Link Gmail account to profile (user clicks, account links)
- Create middleware to check if user is authenticated via Gmail
- Return user email and profile info after successful OAuth
- Handle OAuth errors gracefully (show user-friendly message, allow retry)

#### Step 5: Implement Socket Handlers
**File**: `server/socket/gameHandlers.js`
- Implement `create_profile` handler:
  - Accept: `{ username, name, birthday, gender, email? }`
  - Call `findOrCreateProfile`
  - Return profile data
- Implement `create_room` handler:
  - Generate unique room code
  - Create room with `gameType: 'circumact'`
  - Join socket to room
  - Return room code
- Implement `validate_room` handler:
  - Check if room exists
  - Return `{ exists: boolean, playerCount: number, connectedPlayerIds: [] }`
- Implement `join_room` handler:
  - Validate profile exists
  - Check if player already in room (rejoin logic):
    - If profileId matches existing player: Update socketId, set disconnected: false
    - If new player: Add to room
  - Add/update player in room
  - Update profile's `lastRoom` (server-side, single value)
  - Broadcast `room_update` to all clients in room
  - Return success + room state
- Implement `disconnecting` handler:
  - Call `handlePlayerDisconnect`
  - Set player's `disconnected: true`, update `lastSeen`
  - **Keep player in room indefinitely** (until game ends)
  - Broadcast room update (so TV can grey out player)
- Implement `reconnect` handler:
  - Check if profileId exists in room
  - If yes: Update socketId, set disconnected: false
  - Broadcast room update

#### Step 6: Initialize Socket.io
**File**: `server/socket/index.js`
- Create Socket.io server instance
- Configure CORS
- Handle connection events
- Register game handlers from `gameHandlers.js`
- Handle disconnection events

#### Step 7: Set Up Express Server
**File**: `server/server.js`
- Create Express app
- Set up session middleware (for OAuth)
- Add `/health` endpoint
- Add OAuth routes (`/auth/google`, `/auth/google/callback`)
- Initialize Socket.io
- Serve static files (for production React build)
- Start HTTP server

---

### Phase 2: Frontend TV Display

#### Step 8: Create TV Layout Component
**File**: `client/src/routes/TVLayout.tsx`
- Use `useSocket` hook
- On mount: Emit `create_room` event
- Listen for `room_update` events
- Display room code prominently (large, centered)
- Conditional display:
  - If no players: "Waiting for players..."
  - If 1+ players: "Players: X - Waiting for host to start game"
- Display connected players list:
  - Show all players (connected and disconnected)
  - Grey out disconnected players (disconnected: true)
  - Show host indicator
- Minimalistic, modern design
- Full-screen TV-optimized layout

#### Step 9: Create TV Lobby Component
**File**: `client/src/components/tv/TVLobby.tsx`
- Display room code (very large, easy to read from distance)
- Show player count
- List connected players
- Show "Game: CircumAct" indicator
- Future: Add game selection menu (for now, hardcode CircumAct)

---

### Phase 3: Frontend Phone Login Flow

#### Step 10: Create Login Screen Component
**File**: `client/src/components/phone/LoginScreen.tsx` (new)
- Two options:
  - Button: "Login with Gmail"
  - Button: "Continue without email"
- Handle Gmail OAuth redirect
- Navigate to profile creation/selection based on choice

#### Step 11: Create Profile Creation Component
**File**: `client/src/components/phone/ProfileCreationScreen.tsx` (new)
- Form fields:
  - Username (required, unique check, case-insensitive)
  - Birthday: **Modern calendar picker** (YYYY-MM-DD format)
    - Only allow past dates (no future dates)
    - Industry-standard date picker component
  - Gender: dropdown (male/female/other/prefer not to say)
- Submit button
- On submit: Emit `create_profile` event
- Handle errors:
  - Profile creation fails: Show user-friendly error, prompt to try again
  - Network errors: Alert user, handle as industry standard (show retry option)
- Navigate to room code entry after success

#### Step 12: Create Profile Selection Component
**File**: `client/src/components/phone/ProfileSelectionScreen.tsx` (new)
- For Gmail users: Auto-select profile if exists
- For username login:
  - Username input field
  - As user types: **Partial match search** (case-insensitive)
  - Display list of matching profiles with birthdates
  - User selects correct profile
- Show "Create new profile" option
- Navigate to room code entry after selection

#### Step 13: Update Join Screen Component
**File**: `client/src/components/phone/JoinScreen.tsx`
- Integrate login flow:
  1. Check if user has active session (Gmail or localStorage profile)
  2. If not: Show LoginScreen
  3. If yes: Show room code entry
- Room code input (4 random letters + 2 numbers, text input, case-insensitive)
- Validate room code (emit `validate_room`)
- Show previous room section:
  - Load from localStorage (phone-side) AND server (profile's `lastRoom`)
  - Display last room user was in (if exists)
  - Grey out if user is already in that room (check if profileId in room's players)
  - Allow clicking to rejoin
- Auto-rejoin logic:
  - On app open: Check if user was in a room (from localStorage)
  - If yes: Automatically emit `join_room` with saved profileId
  - Server handles reconnection (updates socketId, sets disconnected: false)
- "Join Room" button
- On join: Emit `join_room` event
- Save room code to localStorage (for auto-rejoin)
- Handle errors:
  - Invalid room code: Show "Room does not exist" message
  - Network disconnect mid-join: Alert user, handle as industry standard (show retry)
  - Profile creation fails: Show error, prompt to try again
- Navigate to game screen after successful join

#### Step 14: Update Phone Layout
**File**: `client/src/routes/PhoneLayout.tsx`
- Set up React Router routes:
  - `/` → JoinScreen (with login flow)
  - Future: Game-specific routes
- Use `useSocket` hook
- Update GameContext with profile and roomCode

---

### Phase 4: State Management & Context

#### Step 15: Update Game Context
**File**: `client/src/context/GameContext.tsx`
- Add profile state (username, name, birthday, profileId, email?)
- Add roomCode state
- Add room state (players, host, etc.)
- Add functions: `setProfile`, `setRoomCode`, `updateRoomState`
- Persist profile to localStorage (for username login)
- Persist last room to localStorage (single value, not array)
- On reconnect: Check localStorage for last room and auto-rejoin

#### Step 16: Update Socket Hook
**File**: `client/src/hooks/useSocket.ts`
- Ensure proper connection handling
- Add event listeners for `room_update`
- Expose socket instance and connection state

---

### Phase 5: Styling & UX

#### Step 17: Create Global Styles
**File**: `client/src/styles/globals.css`
- Modern, minimalistic design system
- Color palette (choose modern, accessible colors)
- Typography (large, readable fonts)
- Button styles
- Input styles
- Responsive breakpoints
- TV-optimized styles (large text, high contrast)

#### Step 18: Style TV Components
- TVLobby: Large room code, clear player list
- TVLayout: Full-screen, centered content

#### Step 19: Style Phone Components
- LoginScreen: Clean buttons, clear options
- ProfileCreationScreen: Form styling, date picker styling
- ProfileSelectionScreen: List styling, selection states
- JoinScreen: Input styling, previous rooms list, disabled states

---

### Phase 6: Testing & Polish

#### Step 20: Test Complete Flow
- TV: Room code generates and displays (4 random letters + 2 numbers)
- TV: Shows "Waiting for players" until first player
- TV: Shows "Players: X - Waiting for host to start game" after first player
- TV: Greys out disconnected players (kept indefinitely)
- Phone: Gmail OAuth 2.0 login works (click → Google → callback → linked)
- Phone: Username/birthday login works (partial match, case-insensitive)
- Phone: Profile creation works (modern calendar picker, past dates only)
- Phone: Profile selection works (partial match, multiple matches)
- Phone: Room code entry works (4 random letters + 2 numbers, case-insensitive)
- Phone: Last room displays correctly (from localStorage AND server)
- Phone: Rejoining rooms works
- Phone: Auto-rejoin on app reopen works (state preserved)
- Phone: Room updates broadcast correctly
- TV: Shows connected/disconnected players correctly
- Error handling: Invalid room codes, network disconnects, OAuth failures

#### Step 21: Error Handling
- Invalid room codes
- Duplicate usernames
- Network errors
- Socket disconnections
- OAuth errors

#### Step 22: Polish & Refinement
- Loading states
- Success/error messages
- Animations (subtle, modern)
- Accessibility (keyboard navigation, screen readers)
- Mobile optimization (touch targets, responsive)

---

## Technical Decisions

### Room Codes
- **Format**: 4 random letters (A-Z) + 2 random numbers (00-99)
- **Examples**: "XYZW42", "ABCD17", "MNOP89"
- **Case Insensitive**: Store as uppercase, compare case-insensitively
- **Uniqueness**: Check against active rooms only, retry if collision
- **Lifecycle**: Wiped on server restart (in-memory only)

### Gmail OAuth 2.0
- **Library**: `passport-google-oauth20`
- **Version**: OAuth 2.0 (latest standard)
- **Flow**: User clicks "Login with Gmail" → Redirects to Google → User authorizes → Callback links account
- **Industry Standard Implementation**:
  - Server-side sessions with secure HTTP-only cookies
  - State parameter for CSRF protection
  - Proper redirect URL handling (development + production)
  - Mobile: Deep links or redirect back to app URL
- **Scopes**: `profile`, `email`
- **Error Handling**: User-friendly messages, allow retry

### Profile Storage
- **MVP**: In-memory (Map) on server
- **Future**: JSON file or SQLite database

### Profile ID Generation (Industry Standard)
- **Gmail users**: Use email as profileId (unique identifier)
- **Username users**: Generate UUID v4 (industry standard for unique IDs)
- **Library**: `uuid` package for UUID generation

### Previous Rooms
- **Storage**: BOTH phone (localStorage) AND server (in profile's `lastRoom` - single value)
- **Display**: Show last room user was in
- **Rejoin Logic**: 
  - Check if player's profileId already in room's players array
  - If disconnected: Update socketId, set disconnected: false
  - If new: Add as new player
- **Auto-rejoin**: On app open, check localStorage for last room and auto-rejoin
- **Disconnected Players**: Kept indefinitely until game ends (not removed)

### Date Format
- **Input**: Modern calendar picker (YYYY-MM-DD format)
- **Validation**: Only past dates allowed (no future dates)
- **Storage**: YYYY-MM-DD (ISO format, server-side)

---

## Future Considerations (Not This Session)

- Game selection menu on TV (like Jackbox)
- Persistent storage (JSON/SQLite)
- Profile avatars
- Room history/details
- Analytics

---

## Notes

- Keep code modular and extensible (other games will use this)
- Follow React best practices (hooks, context, proper state management)
- Use TypeScript types where applicable
- Ensure Socket.io events are properly typed
- Test on actual phone devices for UX validation

---

## Key Decisions Summary

### Room Codes
- **Format**: 4 random letters (A-Z) + 2 random numbers (00-99)
- **Case**: Insensitive (store uppercase, compare case-insensitively)
- **Uniqueness**: Check active rooms, retry on collision
- **Lifecycle**: Wiped on server restart

### Profile IDs (Industry Standard)
- **Gmail users**: Email address as profileId
- **Username users**: UUID v4 (using `uuid` package)
- **Rationale**: Industry standard for unique user identification

### OAuth 2.0 (Industry Standard)
- **Session**: Server-side with secure HTTP-only cookies
- **Security**: State parameter for CSRF protection
- **Mobile**: Deep links or redirect URLs
- **Error Handling**: User-friendly messages with retry option

### Birthday Input
- **Format**: YYYY-MM-DD (full year)
- **UI**: Modern calendar picker component
- **Validation**: Only past dates allowed

### Previous Rooms
- **Storage**: Single `lastRoom` value (not array)
- **Location**: Both localStorage (phone) and server (profile)
- **Display**: Show last room, grey out if already in it

### Disconnected Players
- **Retention**: Kept indefinitely until game ends
- **Reconnection**: Auto-rejoin on app reopen
- **TV Display**: Grey out but keep visible

### Username Search
- **Matching**: Partial match, case-insensitive
- **Display**: Show all matches with birthdates for selection

### Error Handling
- **Invalid room**: "Room does not exist" message
- **Network disconnect**: Alert user, show retry option
- **Profile creation fails**: User-friendly error, prompt retry
- **OAuth fails**: Industry standard error handling

