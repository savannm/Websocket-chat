import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Send, User, MessageCircle, Hash, Paperclip, X, File as FileIcon, Image as ImageIcon, Music, Users, Edit2, Smile, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import MsgSave from "./components/MessageSave";

/**
 * Message types definition
 */
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

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢"];

export default function App() {



  // --- State Management ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [username, setUsername] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Features state
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit State
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageText, setEditMessageText] = useState("");

  // Reaction State
  const [reactionPopoverId, setReactionPopoverId] = useState<string | null>(null);

  // Refs for UI behavior
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Socket Initialization ---
  useEffect(() => {



    const newSocket = io();
    setSocket(newSocket);

    newSocket.on("previous_messages", (prevMessages: Message[]) => {
      setMessages(prevMessages);
    });

    newSocket.on("new_message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on("message_updated", (updatedMsg: Message) => {
      setMessages((prev) => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
    });

    newSocket.on("update_users", (users: string[]) => {
      setOnlineUsers(Array.from(new Set(users.filter(Boolean))));
    });

    return () => {

      newSocket.disconnect();
    };
  }, []);

  // --- Auto-scroll Effect ---
  useEffect(() => {

    if (scrollRef.current && !editingMessageId) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, editingMessageId]);

  // --- Handlers ---
  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && socket) {
      socket.emit("join_chat", username.trim());
      setIsJoined(true);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((inputText.trim() || pendingAttachment) && socket) {
      socket.emit("send_message", {
        user: username,
        text: inputText,
        attachment: pendingAttachment
      });
      setInputText("");
      setPendingAttachment(null);
    }
  };

  const handleEditMessage = (id: string, text: string) => {
    setEditingMessageId(id);
    setEditMessageText(text);
    setReactionPopoverId(null);
  };

  const submitEditMessage = () => {
    if (editingMessageId && editMessageText.trim() && socket) {
      socket.emit("edit_message", { id: editingMessageId, text: editMessageText });
    }
    setEditingMessageId(null);
    setEditMessageText("");
  };

  const toggleReaction = (messageId: string, reaction: string) => {
    if (socket) {
      socket.emit("add_reaction", { messageId, reaction, user: username });
    }
    setReactionPopoverId(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert("File is too large! Maximum allowed is 50MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      setPendingAttachment({
        type: file.type || "application/octet-stream",
        name: file.name,
        data: base64Data
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearAttachment = () => {
    setPendingAttachment(null);
  };



  // Helper to render attachment based on its type
  const renderAttachment = (attachment: Attachment) => {
    if (attachment.type.startsWith("image/")) {
      return (
        <img
          src={attachment.data}
          alt={attachment.name}
          className="mt-2 max-h-60 rounded-xl object-contain shadow-sm border border-black/5"
        />
      );
    } else if (attachment.type.startsWith("audio/")) {
      return (
        <audio controls className="mt-2 h-10 w-full max-w-[240px]">
          <source src={attachment.data} type={attachment.type} />
          Your browser does not support the audio element.
        </audio>
      );
    } else {
      return (
        <a
          href={attachment.data}
          download={attachment.name}
          className="mt-2 flex items-center gap-2 rounded-lg bg-black/5 p-3 transition-colors hover:bg-black/10"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/50 text-indigo-600 shadow-sm">
            <FileIcon size={20} />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{attachment.name}</p>
            <p className="text-[10px] uppercase tracking-wider opacity-70">Download file</p>
          </div>
        </a>
      );
    }
  };

  const renderPendingAttachmentPreview = () => {
    if (!pendingAttachment) return null;
    let icon = <FileIcon size={20} className="text-slate-500" />;
    if (pendingAttachment.type.startsWith("image/")) icon = <ImageIcon size={20} className="text-blue-500" />;
    else if (pendingAttachment.type.startsWith("audio/")) icon = <Music size={20} className="text-purple-500" />;

    return (
      <div className="absolute bottom-full left-0 mb-4 flex items-center gap-3 rounded-xl border border-white/50 bg-white/80 p-3 pr-4 shadow-lg backdrop-blur-md">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
          {icon}
        </div>
        <div className="max-w-[150px] overflow-hidden md:max-w-xs">
          <p className="truncate text-sm font-medium text-slate-700">{pendingAttachment.name}</p>
          <p className="text-xs text-slate-500">Ready to send</p>
        </div>
        <button
          type="button"
          onClick={clearAttachment}
          className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-500 transition-colors hover:bg-red-100 hover:text-red-500"
        >
          <X size={16} />
        </button>
      </div>
    );
  };

  // --- UI Components ---

  if (!isJoined) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-3xl border border-white/40 bg-white/30 p-8 shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/50 text-indigo-600 shadow-sm border border-white/50">
              <MessageCircle size={32} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">GlassChat</h1>
            <p className="text-sm text-slate-500">Pick a nickname to start chatting</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div className="relative">
              <User className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username..."
                autoFocus
                className="w-full rounded-xl border border-white/50 bg-white/40 py-3 pr-4 pl-10 text-slate-800 outline-none ring-indigo-500/20 transition-all focus:border-indigo-500/50 focus:ring-4"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-indigo-300 active:scale-95"
            >
              Join Chat
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
            </span>
            {onlineUsers.length} user{onlineUsers.length !== 1 ? 's' : ''} online
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center p-2 md:p-8">
      <div className="flex h-full w-full max-w-6xl overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/30 shadow-2xl backdrop-blur-2xl">


        {/* Left Sidebar - Online Users */}
        <aside className="hidden w-64 flex-col border-r border-white/20 bg-white/10 p-4 lg:flex">
          <div className="mb-4 flex items-center gap-2 px-2 text-slate-800">
            <Users size={18} className="text-indigo-600" />
            <h3 className="font-semibold text-sm">Online Users — {onlineUsers.length}</h3>
          </div>
          <ul className="flex flex-col gap-1 overflow-y-auto">
            {onlineUsers.map((user, idx) => (
              <li
                key={idx}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${user === username ? "bg-white/40 font-medium text-indigo-700" : "text-slate-600 hover:bg-white/20"
                  }`}
              >
                <div className="relative">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-white text-indigo-700 shadow-sm border border-white/50">
                    {user.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white/50"></span>
                </div>
                <span className="truncate">{user} {user === username && "(You)"}</span>
              </li>
            ))}
          </ul>
          <MsgSave />
        </aside>

        {/* Chat Area */}
        <div className="flex flex-1 flex-col overflow-hidden relative">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-white/20 bg-white/20 px-6 py-5 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
                <Hash size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Public Lounge</h2>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                  Real-time active
                  <span className="ml-2 lg:hidden">({onlineUsers.length} online)</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden items-center gap-2 rounded-full bg-white/40 px-4 py-1.5 text-sm font-medium text-slate-700 md:flex border border-white/30">
                <User size={14} className="text-indigo-600" />
                {username}
              </div>
            </div>
          </header>

          {/* Messages Area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8"
            onClick={() => setReactionPopoverId(null)} // Click anywhere to close popover
          >
            <div className="flex flex-col gap-6" onClick={(e) => e.stopPropagation()}>
              <AnimatePresence initial={false}>
                {messages.map((msg) => {

                  // Render system messages differently
                  if (msg.isSystem) {
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="flex justify-center"
                      >
                        <div className="rounded-full bg-white/30 px-4 py-1 md:py-1.5 border border-white/40 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-sm">
                          {msg.text}
                          <span className="ml-2 opacity-50 font-normal">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </motion.div>
                    )
                  }

                  const isMe = msg.user === username;
                  const isEditing = editingMessageId === msg.id;

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`flex group relative ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[85%] md:max-w-[70%] ${isMe ? "flex flex-col items-end" : "flex flex-col items-start"}`}>
                        {!isMe && (
                          <span className="mb-1 ml-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                            {msg.user}
                          </span>
                        )}

                        <div className={`relative flex items-center gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>

                          {/* Message Bubble container */}
                          <div
                            className={`
                              relative rounded-2xl px-4 py-3 shadow-sm transition-all
                              ${isMe
                                ? "rounded-tr-none bg-indigo-600 text-white shadow-md shadow-indigo-100"
                                : "rounded-tl-none border border-white/50 bg-white/60 text-slate-800 backdrop-blur-sm"
                              }
                            `}
                          >
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  autoFocus
                                  className="bg-white/20 text-white placeholder-white/60 px-2 py-1 rounded outline-none border-b border-white/40"
                                  value={editMessageText}
                                  onChange={(e) => setEditMessageText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') submitEditMessage();
                                    if (e.key === 'Escape') setEditingMessageId(null);
                                  }}
                                />
                                <button onClick={submitEditMessage} className="text-green-300 hover:text-green-400">
                                  <Check size={16} />
                                </button>
                                <button onClick={() => setEditingMessageId(null)} className="text-red-300 hover:text-red-400">
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              msg.text && (
                                <p className="text-sm leading-relaxed md:text-base break-words whitespace-pre-wrap">{msg.text}</p>
                              )
                            )}

                            {/* Render Attachment if present */}
                            {!isEditing && msg.attachment && renderAttachment(msg.attachment)}

                            {/* Meta Info */}
                            {!isEditing && (
                              <span
                                className={`mt-1 flex items-center gap-1.5 text-[10px] opacity-70 ${isMe ? "justify-end text-indigo-100" : "justify-start text-slate-400"}`}
                              >
                                {msg.isEdited && <span>(edited)</span>}
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}

                            {/* Reactions display cluster */}
                            {!isEditing && msg.reactions && Object.keys(msg.reactions).length > 0 && (
                              <div className={`absolute -bottom-3 flex flex-wrap gap-1 ${isMe ? 'right-0 lg:-left-6 lg:right-auto' : 'left-4'}`}>
                                {Object.entries(msg.reactions).map(([reaction, users]: [string, string[]]) => {
                                  if (users.length === 0) return null;
                                  const iReacted = users.includes(username);
                                  return (
                                    <button
                                      key={reaction}
                                      onClick={() => toggleReaction(msg.id, reaction)}
                                      className={`
                                        flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs shadow-sm text-slate-700
                                        ${iReacted ? "bg-indigo-100/90 border border-indigo-200" : "bg-white/90 border border-white"}
                                      `}
                                    >
                                      <span className="text-[10px]">{reaction}</span>
                                      <span className="font-semibold px-0.5">{users.length}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            )}

                          </div>

                          {/* Hover Actions (Edit & React) */}
                          <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ${isEditing ? 'hidden' : ''}`}>
                            <div className="relative">
                              <button
                                onClick={() => setReactionPopoverId(reactionPopoverId === msg.id ? null : msg.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/50 text-slate-500 hover:bg-white hover:text-indigo-600 shadow-sm"
                                title="Add Reaction"
                              >
                                <Smile size={14} />
                              </button>

                              {/* Reaction Popover */}
                              <AnimatePresence>
                                {reactionPopoverId === msg.id && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 5 }}
                                    className={`absolute top-10 flex gap-1 rounded-full bg-white px-2 py-1.5 shadow-lg border border-slate-100 z-10 ${isMe ? "right-0" : "left-0"}`}
                                  >
                                    {REACTIONS.map(emoji => (
                                      <button
                                        key={emoji}
                                        onClick={(e) => { e.stopPropagation(); toggleReaction(msg.id, emoji); }}
                                        className="rounded-full p-1 text-lg hover:bg-slate-100 transition-transform hover:scale-125"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            {isMe && !isEditing && (
                              <button
                                onClick={() => handleEditMessage(msg.id, msg.text)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/50 text-slate-500 hover:bg-white hover:text-amber-600 shadow-sm"
                                title="Edit my message"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                          </div>

                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Input Area */}
          <footer className="border-t border-white/20 bg-white/20 p-4 md:p-6 backdrop-blur-md relative" onClick={() => setReactionPopoverId(null)}>
            {renderPendingAttachmentPreview()}

            <form onSubmit={handleSendMessage} className="relative flex items-center gap-2 md:gap-4">
              <div className="relative flex flex-1 items-center">
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />

                {/* Attachment Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/40 text-slate-500 hover:bg-white/60 hover:text-indigo-600 transition-colors z-10"
                >
                  <Paperclip size={18} />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message or attach a file..."
                  className="flex-1 rounded-2xl border border-white/50 bg-white/50 py-4 pr-16 pl-14 text-sm md:text-base text-slate-800 placeholder-slate-400 outline-none ring-indigo-500/20 transition-all focus:border-indigo-500/50 focus:ring-4 backdrop-blur-sm"
                />
              </div>

              <button
                type="submit"
                disabled={!(inputText.trim() || pendingAttachment)}
                className="flex shrink-0 h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 transition-all hover:scale-105 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-indigo-600"
              >
                <Send size={22} className="mr-1" />
              </button>
            </form>
          </footer>

        </div>
      </div>
    </div>
  );
}
