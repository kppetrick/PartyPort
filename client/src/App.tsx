import { Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import TVLayout from './routes/TVLayout';
import PhoneLayout from './routes/PhoneLayout';

function App() {
  return (
    <GameProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/play" replace />} />
        <Route path="/tv" element={<TVLayout />} />
        <Route path="/play/*" element={<PhoneLayout />} />
      </Routes>
    </GameProvider>
  );
}

export default App;

