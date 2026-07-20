import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Leaderboard from "./pages/Leaderboard";
import TasksPage from "./pages/TasksPage";
import About from "./pages/About";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import XOAuthCallback from "./pages/XOAuthCallback";
import TrustPage from "./pages/Trust";
import LoadingScreen from "./components/LoadingScreen";
import CustomCursor from "./components/CustomCursor";
import ScrollAnimations from "./components/ScrollAnimations";
import { Toaster } from "sonner";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <LoadingScreen />;
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RedirectIfAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <CustomCursor />
          <ScrollAnimations />
          <Toaster position="bottom-right" theme="dark" toastOptions={{ style: { background: "#15151D", border: "1px solid #2A2A36", color: "#F5F5F7", fontFamily: "VT323, monospace", fontSize: "16px" } }} />
          <Routes>
            <Route path="/login" element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
            <Route path="/register" element={<RedirectIfAuth><Register /></RedirectIfAuth>} />
            <Route path="/oauth/x/callback" element={<XOAuthCallback />} />
            <Route path="/" element={<Protected><Dashboard /></Protected>} />
            <Route path="/leaderboard" element={<Protected><Leaderboard /></Protected>} />
            <Route path="/tasks" element={<Protected><TasksPage /></Protected>} />
            <Route path="/profile" element={<Protected><Profile /></Protected>} />
            <Route path="/admin" element={<Protected><AdminDashboard /></Protected>} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<TrustPage page="privacy" />} />
            <Route path="/terms" element={<TrustPage page="terms" />} />
            <Route path="/contact" element={<TrustPage page="contact" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}
