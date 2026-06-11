import { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { useSocket } from '../../context/useSocket';

interface ChatBoxProps {
  roomCode: string;
  myName: string;
  myRole?: { role: string; team: string };
  phase?: string; 
}

export default function ChatBox({ roomCode, myName, myRole, phase }: ChatBoxProps) {  const { socket } = useSocket();
  const [messages, setMessages] = useState<string[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [channel, setChannel] = useState<'global' | 'evil'>('global');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Secure Comms</h3>
        </div>

        {myRole?.team === 'evil' && phase === 'PRE_GAME_STRATEGY' && (
          <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
            <button 
              onClick={() => setChannel('global')}
              className={`px-3 py-1 text-[10px] font-bold rounded transition-colors uppercase tracking-widest ${channel === 'global' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500'}`}
            >
              Global
            </button>
            <button 
              onClick={() => setChannel('evil')}
              className={`px-3 py-1 text-[10px] font-bold rounded transition-colors uppercase tracking-widest ${channel === 'evil' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-500'}`}
            >
              Evil
            </button>
          </div>
        )}
      </div>

      <div className="flex-grow overflow-y-auto mb-4 space-y-2 pr-2">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-slate-600 uppercase tracking-widest">No messages intercepted yet...</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.includes(` ${myName}:`);
            return (
              <div key={idx} className="text-sm">
                <span className={isMe ? 'text-cyan-400 font-medium' : 'text-slate-400'}>{msg}</span>
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