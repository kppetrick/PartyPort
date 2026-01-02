// Generates unique room codes: 4 random letters + 2 numbers (e.g., "ABCD42")

/**
 * Generates a unique room code: 4 random letters + 2 random numbers
 * @param {Map} roomsMap - Map of active room codes to check uniqueness against
 * @returns {string} Room code in format "ABCD42" (uppercase)
 */
function randomRoomCode(roomsMap) {
    const maxAttempts = 10;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        // Generate 4 random letters (A-Z)
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        let roomCode = "";
        for (let i = 0; i < 4; i++) {
            roomCode += chars[Math.floor(Math.random() * chars.length)];
        }
        
        // Generate 2 random numbers (00-99, padded)
        const numbers = String(Math.floor(Math.random() * 100)).padStart(2, '0');
        roomCode += numbers;
        
        const codeUpper = roomCode.toUpperCase();
        
        // Industry standard uniqueness check (case-insensitive)
        const exists = roomsMap && Array.from(roomsMap.keys()).some(
            existingCode => existingCode.toUpperCase() === codeUpper
        );
        
        if (!exists) {
            return codeUpper;
        }
        
        attempts++;
    }
    
    // Fallback if all attempts failed (should be very rare)
    throw new Error('Failed to generate unique room code after multiple attempts');
}

module.exports = { randomRoomCode };


