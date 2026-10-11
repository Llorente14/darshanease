import { io } from "socket.io-client";

// One shared connection for the whole app. Components subscribe through hooks, never by creating sockets.
const socket = io(import.meta.env.VITE_SOCKET_URL);

export default socket;
