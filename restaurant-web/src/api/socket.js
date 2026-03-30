// Use empty string to use the current origin, allowing Vite proxy to handle the connection
const SOCKET_URL = ''; 

class SocketService {
    socket = null;

    connect() {
        console.log('ℹ️ WebSocket disabled: Backend does not support Socket.io');
        return;
        
        /* 
        if (this.socket?.connected) return;

        const token = getToken();
        this.socket = io(SOCKET_URL, {
            auth: {
                token: token
            },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
            console.log('✅ Connected to WebSocket server');
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ Disconnected from WebSocket:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('⚠️ WebSocket connection error:', error.message);
        });
        */
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    on(event, callback) {
        if (!this.socket) this.connect();
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event) {
        if (this.socket) {
            this.socket.off(event);
        }
    }

    emit(event, data) {
        if (!this.socket) this.connect();
        if (this.socket) {
            this.socket.emit(event, data);
        }
    }
}

const socketService = new SocketService();
export default socketService;
