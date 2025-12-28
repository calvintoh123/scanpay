import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Pay from "./pages/Pay.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Wallet from "./pages/Wallet.jsx";
import Reload from "./pages/Reload.jsx";
import DeviceWatch from "./pages/DeviceWatch.jsx";
import { logout, getAccessToken, onAuthChange } from "./auth";

export default function App() {
  const [authed, setAuthed] = useState(!!getAccessToken());

  useEffect(() => {
    const sync = () => setAuthed(!!getAccessToken());
    sync();
    const offAuth = onAuthChange(sync);
    window.addEventListener("storage", sync);
    return () => {
      offAuth();
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <BrowserRouter>
      <div className="nav">
        {!authed ? (
          <>
            <Link to="/wallet">Wallet</Link>
            <Link to="/login">Login</Link>
          </>
        ) : (
          <button className="linkBtn" onClick={() => { logout(); }}>
            Logout
          </button>
        )}
      </div>

      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pay/:publicId" element={<Pay />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/wallet/reload" element={<Reload />} />
          <Route path="/device" element={<DeviceWatch />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
