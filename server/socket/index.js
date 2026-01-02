// Initializes Socket.io server: configures CORS, handles connections, registers event handlers

const { Server } = require('socket.io');
const { registerGameHandlers } = require('./gameHandlers');

const initializeSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: "*", // Allow all origins for MVP (restrict in production)
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);

        // Register all game event handlers
        registerGameHandlers(io, socket);

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

module.exports = { initializeSocket };

