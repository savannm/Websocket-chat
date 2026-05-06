import express from "express";
import { createServer as createHttpServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";

// Define our types
interface Attachment {
  type: string;
  name: string;
  data: string;
}

interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: number;
  attachment?: Attachment;
  isEdited?: boolean;
  reactions?: Record<string, string[]>;
  isSystem?: boolean;
}

async function startServer() {
  const app = express();
  const httpServer = createHttpServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*", // In production, you'd specify your app's URL
      methods: ["GET", "POST"]
    },
    // Increase limit for attachments (e.g. 50MB)
    maxHttpBufferSize: 50 * 1024 * 1024
  });

  const PORT = 4000;

  // Store messages in memory for this simple template
  const messages: Message[] = [];

  // Track online users: map socket.id to username
  const onlineUsers = new Map<string, string>();

  // Helper to emit updated online users
  const broadcastOnlineUsers = () => {
    const usersList = Array.from(onlineUsers.values());
    io.emit("update_users", usersList);
  };

  const addSystemMessage = (text: string) => {
    const sysMsg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      user: "System",
      text,
      timestamp: Date.now(),
      isSystem: true
    };
    messages.push(sysMsg);
    if (messages.length > 100) messages.shift();
    io.emit("new_message", sysMsg);
  }

  // --- Socket.io logic ---
  // This listener triggers whenever a new browser tab/client connects to the WS server.
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Initial Sync: On connection, sync the new client with current message history.
    socket.emit("previous_messages", messages);

    // Also send the current list of online users to the newly connected socket directly
    // so they see the list even before they choose a name.
    socket.emit("update_users", Array.from(onlineUsers.values()));

    // Handle user joining (registering their username)
    socket.on("join_chat", (username: string) => {
      onlineUsers.set(socket.id, username);
      broadcastOnlineUsers();
      addSystemMessage(`👋 ${username} has joined the chat.`);
    });

    // Message Listener: When a client emits 'send_message', we process and broadcast it.
    socket.on("send_message", (data: { user: string; text: string; attachment?: Attachment }) => {
      const newMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        user: data.user || "Anonymous",
        text: data.text || "",
        timestamp: Date.now(),
        // Check if an attachment was sent
        attachment: data.attachment
      };

      // Store in memory
      messages.push(newMessage);

      // Keep memory usage lean - only store last 100 messages
      if (messages.length > 100) messages.shift();

      // Broadcast: Send the new message to everyone connected.
      io.emit("new_message", newMessage);
    });

    // Handle editing message
    socket.on("edit_message", (data: { id: string, text: string }) => {
      const msgIndex = messages.findIndex(m => m.id === data.id);
      if (msgIndex !== -1) {
        messages[msgIndex].text = data.text;
        messages[msgIndex].isEdited = true;
        io.emit("message_updated", messages[msgIndex]);
      }
    });

    // Handle reactions
    socket.on("add_reaction", (data: { messageId: string, reaction: string, user: string }) => {
      const msgIndex = messages.findIndex(m => m.id === data.messageId);
      if (msgIndex !== -1) {
        const msg = messages[msgIndex];
        if (!msg.reactions) {
          msg.reactions = {};
        }
        if (!msg.reactions[data.reaction]) {
          msg.reactions[data.reaction] = [];
        }

        const usersReactions = msg.reactions[data.reaction];
        // Toggle reaction
        if (usersReactions.includes(data.user)) {
          msg.reactions[data.reaction] = usersReactions.filter(u => u !== data.user);
        } else {
          msg.reactions[data.reaction].push(data.user);
        }

        io.emit("message_updated", msg);
      }
    });


    // Logout or disconnect
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      const username = onlineUsers.get(socket.id);
      if (username) {
        addSystemMessage(`🚪 ${username} has left the chat.`);
      }
      onlineUsers.delete(socket.id);
      broadcastOnlineUsers();
    });
  });

  app.use(cors());
  app.use(express.json({ limit: "50mb" })); // Increase limit for express json as well

  // API Route example
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", port: PORT });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start listening on 0.0.0.0
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
