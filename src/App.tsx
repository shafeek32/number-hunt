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

// Admin Suite Components
import { AdminGuard } from './components/admin/AdminGuard';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminUserDetail } from './pages/admin/AdminUserDetail';
import { AdminGames } from './pages/admin/AdminGames';
import { AdminLeaderboard } from './pages/admin/AdminLeaderboard';
import { AdminLevels } from './pages/admin/AdminLevels';
import { AdminAchievements } from './pages/admin/AdminAchievements';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { AdminSettings } from './pages/admin/AdminSettings';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <MobileNavigation />
        <MigrationModal />

        <Routes>
          {/* Main Number Hunt Gameplay & Community Routes */}
          <Route path="/"            element={<Home />} />
          <Route path="/levels"      element={<LevelSelect />} />
          <Route path="/game"        element={<Game />} />
          <Route path="/result"      element={<Result />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/daily"       element={<DailyChallenge />} />
          <Route path="/profile"     element={<Profile />} />
          <Route path="/login"       element={<Login />} />
          <Route path="/signup"      element={<Signup />} />

          {/* Secure Admin Console Suite */}
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <AdminLayout />
              </AdminGuard>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:id" element={<AdminUserDetail />} />
            <Route path="games" element={<AdminGames />} />
            <Route path="leaderboard" element={<AdminLeaderboard />} />
            <Route path="levels" element={<AdminLevels />} />
            <Route path="achievements" element={<AdminAchievements />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* 404 Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
