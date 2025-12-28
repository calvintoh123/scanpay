import React, { useState } from "react";
import { api } from "../api";

const presets = [1, 2, 5, 10, 20, 50];

export default function ReloadPanel({ onReloaded }) {
  const [other, setOther] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function topupPreset(p) {
    setBusy(true); setMsg("");
    try {
      const r = await api.post("/wallet/topup/", { preset: p });
      setMsg(`Reloaded RM${p}. New balance RM${r.data.balance}`);
      onReloaded?.();
    } catch (e) {
      setMsg(JSON.stringify(e?.response?.data || "Topup failed"));
    } finally {
      setBusy(false);
    }
  }

  async function topupOther() {
    setBusy(true); setMsg("");
    try {
      const r = await api.post("/wallet/topup/", { amount: other });
      setMsg(`Reloaded RM${other}. New balance RM${r.data.balance}`);
      setOther("");
      onReloaded?.();
    } catch (e) {
      setMsg(JSON.stringify(e?.response?.data || "Topup failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3>Reload Wallet</h3>
      <div className="rowWrap">
        {presets.map((p) => (
          <button key={p} disabled={busy} onClick={() => topupPreset(p)}>
            RM{p}
          </button>
        ))}
      </div>

      <div className="row">
        <input
          value={other}
          onChange={(e) => setOther(e.target.value)}
          placeholder="Other amount e.g. 13.50"
        />
        <button disabled={busy || !other} onClick={topupOther}>Reload</button>
      </div>

      {msg && <div className="hint">{msg}</div>}
      <div className="hint muted">* Reload requires login (wallet belongs to account).</div>
    </div>
  );
}
