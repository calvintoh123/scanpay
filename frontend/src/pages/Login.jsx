import React, { useState } from "react";
import { api } from "../api";
import { setAccessToken } from "../auth";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [msg,setMsg]=useState("");

  async function submit() {
    setMsg("");
    try {
      const r = await api.post("/auth/login/", { username, password });
      setAccessToken(r.data.access);
      nav("/wallet");
    } catch (e) {
      setMsg(JSON.stringify(e?.response?.data || "Login failed"));
    }
  }

  return (
    <div className="card">
      <h2>Login</h2>
      <input value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="Username" />
      <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" />
      <button onClick={submit}>Login</button>
      {msg && <div className="error">{msg}</div>}
      <div className="hint">No account? <Link to="/register">Register</Link></div>
    </div>
  );
}
