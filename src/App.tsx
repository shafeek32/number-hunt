import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { MobileNavigation } from './components/layout/MobileNavigation';
import { MigrationModal } from './components/common/MigrationModal';
import { Home } from './pages/Home';
import { LevelSelect } from './pages/LevelSelect';
import { Game } from './pages/Game';
import { Result } from './pages/Result';
import { Leaderboard } from './pages/Leaderboard';
import { DailyChallenge } from './pages/DailyChallenge';
import { Profile } from './pages/Profile';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { NotFound } from './pages/NotFound';
import { Admin } from './pages/Admin';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <MobileNavigation />
        <MigrationModal />

        <Routes>
          <Route path="/"            element={<Home />} />
          <Route path="/levels"      element={<LevelSelect />} />
          <Route path="/game"        element={<Game />} />
          <Route path="/result"      element={<Result />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/daily"       element={<DailyChallenge />} />
          <Route path="/profile"     element={<Profile />} />
          <Route path="/login"       element={<Login />} />
          <Route path="/signup"      element={<Signup />} />
          <Route path="/admin"       element={<Admin />} />
          <Route path="*"            element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
