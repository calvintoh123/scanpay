import React, { useEffect, useState } from "react";
import { api } from "../api";
import ReloadPanel from "../components/ReloadPanel.jsx";
import { getAccessToken } from "../auth";
import { Link } from "react-router-dom";

export default function Wallet() {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState("");

  async function load() {
    setMsg("");
    try {
      const r = await api.get("/wallet/me/");
      setData(r.data);
    } catch {
      setData(null);
      setMsg("Please login to use wallet.");
    }
  }

  useEffect(() => { load(); }, []);

  if (!getAccessToken()) {
    return (
      <div className="card">
        <h2>Wallet</h2>
        <div className="error">You are not logged in.</div>
        <div className="hint"><Link to="/login">Login</Link> to use wallet and reload.</div>
      </div>
    );
  }

  return (
    <div>
      <h2>Wallet</h2>
      {msg && <div className="error">{msg}</div>}

      {data && (
        <div className="card">
          <div><b>Balance:</b> RM{data.balance}</div>
        </div>
      )}

      <ReloadPanel onReloaded={load} />

      {data && (
        <div className="card">
          <h3>Recent Transactions</h3>
          <div className="table">
            <div className="thead">
              <div>Type</div><div>Amount</div><div>Ref</div><div>Time</div>
            </div>
            {data.transactions.map((t, i) => (
              <div key={i} className="trow">
                <div>{t.tx_type}</div>
                <div>RM{t.amount}</div>
                <div className="mono">{t.reference}</div>
                <div className="mono">{new Date(t.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
