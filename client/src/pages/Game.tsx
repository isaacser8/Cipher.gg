import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Clock, MessageSquare, Terminal, Send, UserCircle, Target, Skull } from 'lucide-react';

export default function Game() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const myName = location.state?.displayName || 'Unknown Agent';
  
  const [activeTab, setActiveTab] = useState<'chat' | 'logs'>('logs');
  const [chatMessage, setChatMessage] = useState('');

  const [gamePhase, setGamePhase] = useState('NIGHT PHASE');
  const players = [
    { name: myName, status: 'alive', role: 'known' },
    { name: 'Agent Smith', status: 'alive', role: 'unknown' },
    { name: 'Neo', status: 'dead', role: 'unknown' },
    { name: 'Trinity', status: 'alive', role: 'unknown' },
  ];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    setChatMessage('');
  };

  return (
    <div className="min-h-screen w-full bg-[#05070A] font-sans text-white flex flex-col overflow-hidden">
      
      {/* --- TOP HUD (Heads Up Display) --- */}
      <header className="h-16 border-b border-white/10 bg-[#0A0D14]/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <Shield className="w-6 h-6 text-cyan-400" />
          <div>
            <h1 className="text-sm font-bold tracking-widest uppercase">cipher.gg</h1>
            <p className="text-[10px] text-slate-500 font-mono">ROOM: {roomCode}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Phase Indicator */}
          <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/20 px-4 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-xs font-black tracking-[0.2em] text-purple-300">{gamePhase}</span>
          </div>
          
          {/* Timer Placeholder */}
          <div className="flex items-center gap-2 text-amber-400 font-mono font-bold">
            <Clock className="w-4 h-4" /> 00:45
          </div>
        </div>
      </header>

      {/* --- MAIN BATTLEFIELD --- */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* LEFT COLUMN: Game Board */}
        <div className="flex-1 p-8 overflow-y-auto relative">
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-600/5 blur-[150px] rounded-full pointer-events-none" />
          
          <div className="max-w-4xl mx-auto relative z-10">
            <h2 className="text-xl font-black uppercase tracking-widest text-slate-300 mb-8">Active Operatives</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map((p, i) => (
                <div key={i} className={`p-4 rounded-2xl border backdrop-blur-sm transition-all ${
                  p.status === 'dead' 
                    ? 'bg-red-950/20 border-red-900/30 opacity-50 grayscale' 
                    : 'bg-white/5 border-white/10 hover:border-cyan-500/30'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <UserCircle className={`w-8 h-8 ${p.status === 'dead' ? 'text-red-500' : 'text-cyan-400'}`} />
                      <div>
                        <p className="font-bold text-sm">{p.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-mono">{p.status}</p>
                      </div>
                    </div>
                    {p.status === 'dead' && <Skull className="w-5 h-5 text-red-500/50" />}
                  </div>

                  {/* Action Buttons (Only visible if target is alive) */}
                  {p.status === 'alive' && p.name !== myName && (
                    <button className="w-full py-2 bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-xs font-bold uppercase tracking-widest rounded-lg border border-transparent hover:border-red-500/30 transition-all flex items-center justify-center gap-2">
                      <Target className="w-4 h-4" /> Target
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Comms & Logs */}
        <div className="w-[350px] bg-[#0A0D14] border-l border-white/10 flex flex-col shrink-0">
          
          {/* Tabs */}
          <div className="flex p-2 gap-2 bg-black/40 border-b border-white/5">
            <button 
              onClick={() => setActiveTab('logs')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'logs' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Terminal className="w-4 h-4" /> System Logs
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'chat' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <MessageSquare className="w-4 h-4" /> Comms
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === 'logs' ? (
              // System Logs UI
              <>
                <div className="text-[10px] font-mono text-slate-500 uppercase text-center mb-4">-- Secure Log Initiated --</div>
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <p className="text-xs text-purple-300 font-mono">[SERVER] The Night Phase has begun. Awaiting actions.</p>
                </div>
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-xs text-red-400 font-mono">[ALERT] Motion detected in Sector 4.</p>
                </div>
              </>
            ) : (
              // Player Chat UI
              <>
                <div className="flex flex-col gap-1 items-start">
                  <span className="text-[10px] text-cyan-500 font-bold ml-1">Trinity</span>
                  <div className="bg-white/10 px-4 py-2 rounded-2xl rounded-tl-sm text-sm">Did anyone hear that?</div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <span className="text-[10px] text-slate-400 font-bold mr-1">{myName}</span>
                  <div className="bg-cyan-600 px-4 py-2 rounded-2xl rounded-tr-sm text-sm">I'm staying in the lobby.</div>
                </div>
              </>
            )}
          </div>

          {/* Chat Input (Only show if in chat tab) */}
          {activeTab === 'chat' && (
            <form onSubmit={handleSendMessage} className="p-4 bg-black/40 border-t border-white/5 flex gap-2">
              <input 
                type="text" 
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Transmit message..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-cyan-500/50 text-white placeholder:text-slate-600"
              />
              <button type="submit" className="p-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}