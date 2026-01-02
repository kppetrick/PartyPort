// Manages player profiles: create/find profiles, lookup by username or ID

const { v4: uuidv4 } = require('uuid');

const profiles = new Map();

const findOrCreateProfile = ({ name, username, birthday, gender, email }) => {
    let profileId;
    let existingProfile = null;
    
    // Determine profileId and check for existing profile
    if (email) {
        // Gmail user: Use email as profileId
        profileId = email.toLowerCase();
        existingProfile = profiles.get(profileId);
    } else {
        // Username user: Usernames must be unique (case-insensitive)
        const normalizedUsername = username.toLowerCase();
        
        // First, check if username already exists (for uniqueness)
        for (const [id, profile] of profiles.entries()) {
            if (!profile.email && profile.username.toLowerCase() === normalizedUsername) {
                // Username exists - check if it's the same user (username + birthday match)
                if (profile.birthday === birthday) {
                    // Same user logging in - return existing profile
                    existingProfile = profile;
                    profileId = id;
                    break;
                } else {
                    // Username exists but different birthday - username is taken
                    throw new Error(`Username "${username}" is already taken. Please choose a different username.`);
                }
            }
        }
        
        // If not found, generate UUID for new profile
        if (!existingProfile) {
            profileId = uuidv4();
        }
    }
    
    // Return existing profile if found
    if (existingProfile) {
        existingProfile.lastActive = Date.now();
        return existingProfile;
    }
    
    // Create new profile
    const profile = {
        id: profileId,
        username: username,
        name: name,
        birthday: birthday, // YYYY-MM-DD format
        gender: gender,
        email: email || undefined,
        gamesPlayed: 0,
        lastActive: Date.now(),
        lastRoom: undefined
    };
    
    profiles.set(profileId, profile);
    return profile;
}

const getProfileById = (profileId) => {
    return profiles.get(profileId) || null;
}

const findProfilesByUsername = (username) => {
    const searchTerm = username.toLowerCase();
    const matches = [];
    
    // Search all profiles for partial, case-insensitive match
    // Exclude Gmail profiles (they should use OAuth login)
    for (const [id, profile] of profiles.entries()) {
        // Only include profiles without email (username-based profiles)
        if (!profile.email && profile.username.toLowerCase().includes(searchTerm)) {
            matches.push({
                id: profile.id,
                username: profile.username,
                name: profile.name,
                birthday: profile.birthday
            });
        }
    }
    
    return matches;
}

module.exports = {
    profiles,
    findOrCreateProfile,
    getProfileById,
    findProfilesByUsername
};

