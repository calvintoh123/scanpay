import React, { useState } from "react";
import { api } from "../api";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const nav = useNavigate();
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [msg,setMsg]=useState("");

  async function submit() {
    setMsg("");
    try {
      await api.post("/auth/register/", { username, password });
      nav("/login");
    } catch (e) {
      setMsg(JSON.stringify(e?.response?.data || "Register failed"));
    }
  }

  return (
    <div className="card">
      <h2>Create Account</h2>
      <input value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="Username" />
      <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" />
      <button onClick={submit}>Register</button>
      {msg && <div className="error">{msg}</div>}
      <div className="hint">Already have one? <Link to="/login">Login</Link></div>
    </div>
  );
}
