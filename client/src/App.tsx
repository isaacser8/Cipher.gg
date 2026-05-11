import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Lobby from './pages/Lobby'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby/:roomCode" element={<Lobby />} />
        {/* We will add /game/:roomCode later */}
      </Routes>
    </BrowserRouter>
  )
}

export default App