import { Routes, Route } from 'react-router-dom';
import JoinScreen from '../components/phone/JoinScreen';

function PhoneLayout() {
  return (
    <Routes>
      <Route path="/" element={<JoinScreen />} />
      {/* Games can add more routes here for game-specific screens */}
    </Routes>
  );
}

export default PhoneLayout;

