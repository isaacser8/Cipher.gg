import { useState } from 'react'

function App() {
  const [displayName, setDisplayName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [message, setMessage] = useState('');

  const handleJoin = async (e: React.SyntheticEvent) => {
    
    // prevents browser from refreshing page when submit is clicked
    e.preventDefault(); 

    const cleanName = displayName.trim();
    const cleanRoomCode = roomCode.trim().toUpperCase();
    const nameRegex = /^[a-zA-Z0-9 ]{2,15}$/;
    if (!nameRegex.test(cleanName)) {
      setMessage("❌ Name must be 2-15 letters or numbers.");
      return;
    }
    const roomRegex = /^[A-Z]{4,6}$/;
    if (!roomRegex.test(cleanRoomCode)) {
      setMessage("❌ Room code must be 4 to 6 letters.");
      return;
    }

    setMessage('Connecting to server...');

    try {
      const response = await fetch('https://ciphergg-production.up.railway.app/api/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          displayName: displayName, 
          roomCode: roomCode 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ Success! Welcome, ${data.player.displayName}.`);
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Cannot reach the server. Is it running on port 5001?`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white font-sans">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-96 border border-gray-700">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-400 tracking-widest">CIPHER.GG</h1>
        
        <form onSubmit={handleJoin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500 text-white"
              placeholder="e.g. Merlin"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Room Code</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500 text-white uppercase"
              placeholder="4-6 Letters"
              maxLength={6}
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded transition duration-200"
          >
            Join Game
          </button>
        </form>

        
        {message && (
          <div className="mt-6 p-4 rounded bg-gray-700 border border-gray-600 text-center text-sm font-medium">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
