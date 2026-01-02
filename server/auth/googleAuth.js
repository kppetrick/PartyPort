// Google OAuth 2.0 authentication setup

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { findOrCreateProfile } = require('../models/players');

// Google OAuth credentials (set these as environment variables)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const CALLBACK_URL = process.env.CALLBACK_URL || 'http://localhost:3000/auth/google/callback';

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Extract user info from Google profile
        const email = profile.emails[0].value;
        const name = profile.displayName || profile.name.givenName + ' ' + profile.name.familyName;
        
        // Create or find profile with Gmail
        const userProfile = findOrCreateProfile({
            name: name,
            username: email.split('@')[0], // Use email prefix as username
            birthday: '2000-01-01', // Default birthday (user can update later)
            gender: 'preferNot',
            email: email
        });
        
        return done(null, {
            id: userProfile.id,
            email: email,
            name: name,
            profile: userProfile
        });
    } catch (error) {
        return done(error, null);
    }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
    done(null, user);
});

module.exports = passport;

