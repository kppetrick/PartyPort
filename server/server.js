// Express + Socket.io server: handles HTTP requests, WebSocket connections, serves static files

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const passport = require('./auth/googleAuth');
const { initializeSocket } = require('./socket/index');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware (for OAuth)
app.use(session({
    secret: process.env.SESSION_SECRET || 'partyport-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint: List all profiles (for development only)
app.get('/debug/profiles', (req, res) => {
    const { profiles } = require('./models/players');
    const profilesList = Array.from(profiles.values()).map(profile => ({
        id: profile.id,
        username: profile.username,
        name: profile.name,
        birthday: profile.birthday,
        email: profile.email ? '***' : undefined, // Hide email for privacy
        hasEmail: !!profile.email,
        lastActive: new Date(profile.lastActive).toISOString(),
        lastRoom: profile.lastRoom
    }));
    res.json({ 
        count: profilesList.length,
        profiles: profilesList 
    });
});

// OAuth routes
app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/play?error=oauth_failed' }),
    (req, res) => {
        // Successful authentication
        // req.user contains: { id, email, name, profile }
        const redirectUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        // Pass profile data via URL (for MVP - in production, use session/token)
        const profileData = encodeURIComponent(JSON.stringify(req.user.profile));
        res.redirect(`${redirectUrl}/play?oauth=success&profile=${profileData}`);
    }
);

// Get current user (for checking auth status)
app.get('/auth/me', (req, res) => {
    if (req.user) {
        res.json({ authenticated: true, user: req.user });
    } else {
        res.json({ authenticated: false });
    }
});

// Logout
app.get('/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.redirect(process.env.CLIENT_URL || 'http://localhost:5173/play');
    });
});

// Serve static files (React build in production)
if (process.env.NODE_ENV === 'production') {
    const buildPath = path.join(__dirname, '../client/dist');
    app.use(express.static(buildPath));
    
    // Serve React app for all routes (SPA)
    app.get('*', (req, res) => {
        res.sendFile(path.join(buildPath, 'index.html'));
    });
}

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize Socket.io
const io = initializeSocket(httpServer);

// Start server
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    if (process.env.NODE_ENV !== 'production') {
        console.log(`Development mode - React app should be running separately`);
    }
});

module.exports = { app, httpServer, io };

