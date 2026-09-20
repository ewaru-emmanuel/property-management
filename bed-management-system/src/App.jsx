import { useState, useEffect } from "react";
import Header from "./components/Layout/Header";
import Sidebar from "./components/Layout/Sidebar";
import Dashboard from "./pages/Dashboard";
import Floors from "./pages/Floors";
import Rooms from "./pages/Rooms";
import Occupants from "./pages/Occupants";
import Payments from "./pages/Payments";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import { BuildingsProvider } from "./context/BuildingsContext";
import { api } from "./lib/api";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState("login");
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [verifyEmail, setVerifyEmail] = useState(null);
  const [resetEmail, setResetEmail] = useState(null);

  // Verify stored token on boot
  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem("access_token");
      const stored = localStorage.getItem("user");

      if (!token || !stored) {
        setCheckingAuth(false);
        return;
      }

      try {
        const res = await api.get("/api/auth/me");
        setUser(res.user);
      } catch {
        setUser(null);
      } finally {
        setCheckingAuth(false);
      }
    };

    verifyAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
    setAuthView("login");
    setCurrentPage("dashboard");
    setSelectedFloor(null);
  };

  // 1. Loading
  if (checkingAuth) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#1e293b",
          color: "#fff",
          fontSize: 18,
        }}
      >
        Loading...
      </div>
    );
  }

  // 2. Email verification (higher priority than login)
  if (verifyEmail) {
    return (
      <VerifyEmail
        email={verifyEmail}
        onVerified={() => {
          setVerifyEmail(null);
          setAuthView("login");
        }}
        onBackToLogin={() => {
          setVerifyEmail(null);
          setAuthView("login");
        }}
      />
    );
  }

  // 3. Not logged in → auth screens
  if (!user) {
    if (authView === "forgot") {
      return (
        <ForgotPassword
          onCodeSent={(email) => {
            setResetEmail(email);
            setAuthView("reset");
          }}
          onBackToLogin={() => setAuthView("login")}
        />
      );
    }

    if (authView === "reset" && resetEmail) {
      return (
        <ResetPassword
          email={resetEmail}
          onResetDone={() => {
            setResetEmail(null);
            setAuthView("login");
          }}
          onBackToLogin={() => {
            setResetEmail(null);
            setAuthView("login");
          }}
        />
      );
    }

    return authView === "login" ? (
      <Login
        onLoginSuccess={setUser}
        onSwitchToSignup={() => setAuthView("signup")}
        onForgotPassword={() => setAuthView("forgot")}
      />
    ) : (
      <Signup
        onSignupSuccess={(email) => setVerifyEmail(email)}
        onSwitchToLogin={() => setAuthView("login")}
      />
    );
  }

  // 4. Authenticated → full app
  return (
    <BuildingsProvider>
      <div className="app">
        <Header
          onAdminClick={() => setCurrentPage("admin")}
          onLogout={handleLogout}
        />

        <div className="app-body">
          <Sidebar
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />

          <main className="main-content">
            {currentPage === "dashboard" && <Dashboard />}
            {currentPage === "floors" && (
              <Floors
                onSelectFloor={(floor) => {
                  setSelectedFloor(floor);
                  setCurrentPage("rooms");
                }}
              />
            )}
            {currentPage === "rooms" && <Rooms selectedFloor={selectedFloor} />}
            {currentPage === "occupants" && <Occupants />}
            {currentPage === "payments" && <Payments />}
            {currentPage === "settings" && <Settings />}
            {currentPage === "admin" && <Admin />}
          </main>
        </div>
      </div>
    </BuildingsProvider>
  );
}

export default App;