import { useState, useEffect, useMemo, useRef } from 'react';
import { Send, MessageSquare, Search, X } from 'lucide-react';
import { useSocket } from '../../context/useSocket';

interface ChatBoxProps {
  roomCode: string;
  myName: string;
  myRole?: { role: string; team: string };
  phase?: string; 
}

export default function ChatBox({ roomCode, myName, myRole, phase }: ChatBoxProps) {  
  const { socket } = useSocket();
  const [messages, setMessages] = useState<string[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [channel, setChannel] = useState<'global' | 'evil'>('global');

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  const trimmedSearchQuery = searchQuery.trim().toLowerCase();

  const displayedMessages = useMemo(() => {
    if (!trimmedSearchQuery) {
      return messages;
    }

    return messages.filter((message) =>
      message.toLowerCase().includes(trimmedSearchQuery),
    );
  }, [messages, trimmedSearchQuery]);

  useEffect(() => {
    if (!isSearchOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSearchOpen]);

  useEffect(() => {
    if (phase !== 'PRE_GAME_STRATEGY' && channel === 'evil') {
      setChannel('global');
    }
  }, [phase, channel]);

  useEffect(() => {
    if (!socket) return;

    socket.on('chat_history', (history: string[]) => {
      setMessages(history);
    });

    socket.on('receive_message', (data: { text: string }) => {
      setMessages((prev) => [...prev, data.text]);
    });

    return () => {
      socket.off('chat_history');
      socket.off('receive_message');
    };
  }, [socket]);

  const handleToggleSearch = () => {
    setIsSearchOpen((prev) => {
      const nextIsOpen = !prev;

      if (!nextIsOpen) {
        setSearchQuery('');
      }

      return nextIsOpen;
    });
  };

  const handleSendMessage = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    socket.emit('send_message', {
      roomCode,
      sender: myName,
      message: newMessage.trim(),
      channel: channel 
    });

    setNewMessage('');
  };

  return (
    <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col h-[400px]">
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-cyan-400" />
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Secure Comms
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {myRole?.team === 'evil' && phase === 'PRE_GAME_STRATEGY' && !isSearchOpen && (
            <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
              <button 
                type="button"
                onClick={() => setChannel('global')}
                className={`px-3 py-1 text-[10px] font-bold rounded transition-colors uppercase tracking-widest ${
                  channel === 'global' 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-slate-500'
                }`}
              >
                Global
              </button>
              <button 
                type="button"
                onClick={() => setChannel('evil')}
                className={`px-3 py-1 text-[10px] font-bold rounded transition-colors uppercase tracking-widest ${
                  channel === 'evil' 
                    ? 'bg-rose-500/20 text-rose-400' 
                    : 'text-slate-500'
                }`}
              >
                Evil
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleToggleSearch}
            className={`p-2 rounded-lg border transition-colors ${
              isSearchOpen
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                : 'bg-black/40 text-slate-500 border-white/10 hover:text-cyan-400'
            }`}
            aria-label={isSearchOpen ? 'Close chat search' : 'Open chat search'}
          >
            {isSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isSearchOpen && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search intercepted messages..."
            className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>
      )}

      <div className="flex-grow overflow-y-auto mb-4 space-y-2 pr-2">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-slate-600 uppercase tracking-widest">
              No messages intercepted yet...
            </p>
          </div>
        ) : displayedMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center px-4">
            <p className="text-xs text-slate-600 uppercase tracking-widest">
              No results found for "{searchQuery.trim()}"
            </p>
          </div>
        ) : (
          displayedMessages.map((msg, idx) => {
            const isMe = msg.includes(` ${myName}:`);

            return (
              <div key={`${msg}-${idx}`} className="text-sm">
                <span className={isMe ? 'text-cyan-400 font-medium' : 'text-slate-400'}>
                  {msg}
                </span>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="relative mt-auto">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Transmit message..."
          className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}