import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Pay from "./pages/Pay.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Wallet from "./pages/Wallet.jsx";
import { logout, getAccessToken } from "./auth";

export default function App() {
  const authed = !!getAccessToken();

  return (
    <BrowserRouter>
      <div className="nav">
        <Link to="/">Home</Link>
        <Link to="/wallet">Wallet</Link>
        {!authed ? (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        ) : (
          <button className="linkBtn" onClick={() => { logout(); location.href="/"; }}>
            Logout
          </button>
        )}
      </div>

      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pay/:publicId" element={<Pay />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
