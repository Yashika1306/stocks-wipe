import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AIAssistant } from './components/AIAssistant';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SwipePage } from './pages/SwipePage';
import { PortfolioPage } from './pages/PortfolioPage';
import { FriendsPage } from './pages/FriendsPage';
import { JoinPage } from './pages/JoinPage';
import { useStreakRewards } from './hooks/useStreakRewards';

function AuthLayout() {
  const token  = localStorage.getItem('auth_token');
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;

  const streak = Number(localStorage.getItem('streak_days') ?? 7);
  const tier   = useStreakRewards(streak);
  const coins  = Number(localStorage.getItem('coins_balance') ?? 340);

  return (
    <>
      <Navbar streak={streak} tier={tier} coins={coins} />
      <main style={{ paddingTop: 68, minHeight: '100vh' }}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <AIAssistant />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"       element={<LoginPage />} />
      <Route path="/join/:code"  element={<JoinPage />} />
      <Route element={<AuthLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/swipe"     element={<SwipePage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/friends"   element={<FriendsPage />} />
        <Route path="*"          element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
