# CircumAct 🎉  

_A Raspberry Pi party console for CircumAct-style chaos_



CircumAct is a multiplayer, real-time party game combining charades and Taboo-style gameplay, built to run as a **self-contained Raspberry Pi party console** using HDMI output and phone controllers over a local Wi-Fi hotspot.



- The **Raspberry Pi** plugs into the TV (HDMI).

- The Pi broadcasts its **own Wi-Fi network**.

- Players join on their **phones** (browser) and play using a room code.

- The TV shows the main game: teams, timer, cards, and scores.

- The same drafted deck is reused across all rounds, CircumAct-style.



---

## 🧱 Tech Stack



**Runtime / Platform**



- Raspberry Pi 4 or 5

- Raspberry Pi OS (full desktop for dev → kiosk/console mode later)

- HDMI output (TV)

- Pi in **Wi-Fi Access Point mode** (phones connect directly; no internet required)



**Backend**



- Node.js

- Express

- Socket.io (real-time communication)

- SQLite (or JSON files for very early MVP)



**Frontend**



- React (single app, separate routes/layouts for TV vs phones)

- React Router

- Socket.io client

- Responsive layouts for:

  - `/tv` – big screen UI

  - `/play` – phone UI



---

## 🎮 Gameplay Overview



- Players join via their phones by connecting to the Pi's Wi-Fi and opening the game URL.

- First player to join becomes the **Host**.

- Players create profiles with:

  - **Name**

  - **Birthday** (used to compute age + age range)

  - **Gender** (male/female/other/prefer not)

- Host chooses:

  - **Random teams** OR

  - **Manual team selection**

- Players **draft cards** by swiping:

  - ✅ Right = add this card to the game deck

  - ❌ Left = skip this card

- Each player sees a unique sequence of cards while drafting (no duplicates at the same time).

- The total draft target depends on game length:

  - Short: ~50 cards

  - Medium: ~75 cards

  - Long: ~100 cards

- When drafting is done, host confirms:

  - Team compositions

  - Clue-giver order per team



### Rounds (Deck is reused each round)



1. **Round 1 — Say Anything**  

   Say anything except the exact answer (no reading description word-for-word, no spelling the name).



2. **Round 2 — One Word**  

   You may only say a single word per card.



3. **Round 3 — Charades**  

   No words, only gestures/acting.



4. **Round 4 — Bonus Round**  

   A special bonus mode chosen at the start of Round 4  

   (host pick or player vote – planned; simple host pick for MVP).



**Scoring:**  

- Every correctly guessed card = **1 point**.  

- Same deck is reused for all rounds.



**Deck behavior:**



- If the deck empties before the 60s timer ends:

  - Deck is immediately reshuffled.

  - The **same clue-giver** continues with remaining time.

- If time expires:

  - A **30s grace window** allows the clue-giver to finish the **current** card (no new card).



**Skip behavior:**



- Clue-giver taps **Skip Request**.

- Timer **pauses**.

- Card is revealed on the TV for everyone to see.

- Host decides:

  - ✅ Allow Skip → card is put back into deck (not in the very top few cards), timer resumes.

  - ❌ Reject Skip → turn ends immediately and summary is shown.



---

## 👤 Player Profiles & Stats



Each player has a persistent local profile stored on the Pi.



**Profile fields (MVP):**



- `id` (UUID)

- `name`

- `birthday` (YYYY-MM-DD)

- `age` (computed on login)

- `ageRange` (6–9, 10–13, 14–17, 18–24, 25–34, 35–44, 45+)

- `gender` (male/female/other/preferNot)

- `gamesPlayed`

- `pointsEarnedAsClueGiver`

- `turnsAsClueGiver`

- `avgPointsPerTurn`

- `lifetimeCardsOffered`

- `lifetimeCardsDrafted`

- `createdCards` (IDs of custom cards they added)

- `lastActive` (timestamp)



Login is **Name + Birthday** → no passwords or PINs required.



---

## 🃏 Card Model & Analytics



All cards (base deck + custom) share the same structure.



### Card object



```json

{

  "id": "uuid",

  "answer": "string",

  "description": "string",

  "isCustom": false,

  "createdBy": "profileId or 'system'",

  "createdAt": "timestamp",



  "timesOfferedByAge": {

    "6-9": 0,

    "10-13": 0,

    "14-17": 0,

    "18-24": 0,

    "25-34": 0,

    "35-44": 0,

    "45+": 0

  },

  "timesDraftedByAge": {

    "6-9": 0,

    "10-13": 0,

    "14-17": 0,

    "18-24": 0,

    "25-34": 0,

    "35-44": 0,

    "45+": 0

  },



  "timesOfferedByGender": {

    "male": 0,

    "female": 0,

    "other": 0,

    "preferNot": 0

  },

  "timesDraftedByGender": {

    "male": 0,

    "female": 0,

    "other": 0,

    "preferNot": 0

  },



  "archived": false

}

```



---

## ⭐ Draft Preference Analytics



For each age range:

```

draftPctByAge[range] =

  timesDraftedByAge[range] / timesOfferedByAge[range]

```



For each gender:

```

draftPctByGender[gender] =

  timesDraftedByGender[gender] / timesOfferedByGender[gender]

```



These percentages are calculated at runtime and used for:

- Weighting which cards appear during drafting  

- Auto-archiving cards that are rarely picked  

- Improving card suggestions for specific player demographics  



---

## 🧠 Custom Cards



Players can add their own cards (answer + description).



Custom card rules:

- Must pass **fuzzy similarity detection** to avoid duplicates  

- Stored alongside the base deck  

- Tracked with the same age/gender stats  

- Auto-archived if drafted at a very low rate  

- Host/developer can manually restore archived cards  



---

## 🧠 High-Level Architecture



### Single React App

The project uses one React codebase with two UI surfaces:

- **`/tv`** → TV interface (scoreboard, timer, round info, current team, etc.)  

- **`/play`** → Phone interface (join screen, drafting, clue-giver UI, spectator UI)



### Server (Node.js + Express + Socket.io)

The backend handles:

- Rooms and host detection  

- Player profile creation and persistence  

- Team assignment (random or manual)  

- Draft engine (unique cards per player)  

- Round engine (1–4)  

- Timer system (60s + 30s grace)  

- Turn order and clue-giver rotation  

- Skip approval and timer pause  

- Scoring  

- Card analytics updates  

- Broadcasting all state to TV + phones  



### Raspberry Pi Responsibilities

- Run Node backend + serve built React app  

- Display `/tv` UI on HDMI through Chromium  

- Host a dedicated Wi-Fi Access Point ("CircumAct")  

- Allow phones to join locally (no internet needed)  

- Store all card/player data (JSON or SQLite)  



---

## 🗂 Suggested Folder Structure



```

CircumAct/

  README.md



  server/

    package.json

    server.js



    /socket

      index.js

      gameHandlers.js



    /game

      gameState.js

      rounds.js

      drafting.js

      scoring.js



    /models

      players.js

      cards.js



    /data

      baseDeck.json

      customCards.json



    /utils

      id.js

      fuzzyMatch.js



  client/

    package.json

    /src

      index.tsx

      App.tsx



      /routes

        TVLayout.tsx

        PhoneLayout.tsx



      /components

        tv/

          TVLobby.tsx

          TVScoreboard.tsx

          TVRoundStatus.tsx



        phone/

          JoinScreen.tsx

          DraftScreen.tsx

          ClueGiverScreen.tsx

          SpectatorScreen.tsx

          HostControls.tsx



      /hooks

        useSocket.ts

        useGameState.ts



      /context

        GameContext.tsx



      /styles

        globals.css

```



---

## 🧪 Development Workflow



1. Clone the repository locally  

2. Install server dependencies (`cd server && npm install`)  

3. Install client dependencies (`cd client && npm install`)  

4. Start backend (`npm run dev` or `node server.js`)  

5. Start frontend (`npm start`)  

6. Open:

   - `http://localhost:3000/tv` (TV interface)

   - `http://localhost:3000/play` (Phone interface)

7. Simulate players using multiple browser windows or mobile devices  

8. Once stable → deploy to Raspberry Pi  



---

## 🚀 Deploying to Raspberry Pi (MVP)



```bash

git clone https://github.com/<your-user>/CircumAct

cd CircumAct



cd server

npm install



cd ../client

npm install

npm run build



cd ../server

npm start

```



Then:

- Connect Pi to TV via HDMI  

- Open Chromium to the `/tv` route  

- Phones connect to the Pi Wi-Fi Access Point  

- Phones open `/play` to join the game  



Additional setup (later):

- Chromium kiosk mode on boot  

- Automatic launch into `/tv`  

- Pi Access Point mode  



---

## 📊 Current Status

**Completed:**
- ✅ Phase 1: Backend Skeleton (Express + Socket.io server)
- ✅ Phase 2: React Client Skeleton (TV and phone routes)
- ✅ Phase 3 Backend: Player profiles, room management, socket handlers
- ✅ Phase 3 Phone: JoinScreen with room code entry and profile creation

**Next Steps (TV Implementation):**
- 🚧 Phase 3 TV: Implement TVLobby to display room code and connected players
- 🚧 TV should create room on load and listen to `room_update` events
- 🚧 Display player list with host indicator

See `docs/MVP-TASKLIST.md` and `docs/PHASE3-PROGRESS.md` for detailed progress.

---

## ✅ MVP Checklist



### Core

- [x] Node + Express + Socket.io backend ✅

- [x] React app with TV and phone routes ✅

- [x] Room creation + host detection ✅ (Backend complete, TV UI next)

- [x] Profile creation (name, birthday, gender) ✅

- [ ] Team selection (random/manual)  

- [ ] Draft engine (unique card delivery)  

- [ ] 4-round flow (basic rule enforcement)  

- [ ] Timer system (60s + 30s grace)  

- [ ] Deck reshuffle on empty  

- [ ] Host-only skip approval  

- [ ] Turn/round scoring  

- [ ] End-of-game summary  

- [ ] Persistent player stats (basic structure in place)  



### Raspberry Pi

- [ ] Repo cloned  

- [ ] React build running locally  

- [ ] HDMI → `/tv` works  

- [ ] Pi AP mode hosting game  

- [ ] Phones connect + play locally  



---

## 🔮 Future Enhancements



- [ ] Bonus round voting  

- [ ] Demographic-aware drafting (age/gender weighting)  

- [ ] Automatic archiving of low-draft cards  

- [ ] Profile avatars  

- [ ] Rich animations + sound effects  

- [ ] Analytics dashboard (card popularity, player stats)  

- [ ] Cloud sync (optional)  

- [ ] Native TV apps (Samsung / LG / Roku / Fire TV)  

- [ ] Web-only version (cloud-hosted mode)

