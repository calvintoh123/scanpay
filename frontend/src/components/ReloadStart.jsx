import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const presets = [1, 2, 5, 10, 20, 50];

export default function ReloadStart({ to = "/wallet/reload", returnTo = "" }) {
  const nav = useNavigate();
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState("");

  function pickPreset(p) {
    setAmount(String(p));
    setMsg("");
  }

  function goToMethods() {
    if (!amount) {
      setMsg("Select or enter an amount first.");
      return;
    }
    const params = new URLSearchParams({ amount });
    if (returnTo) {
      params.set("return", returnTo);
    }
    nav(`${to}?${params.toString()}`);
  }

  return (
    <div className="card">
      <h3>Reload Wallet</h3>
      <div className="rowWrap">
        {presets.map((p) => (
          <button key={p} onClick={() => pickPreset(p)}>
            RM{p}
          </button>
        ))}
      </div>

      <div className="row">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Other amount e.g. 13.50"
        />
        <button disabled={!amount} onClick={goToMethods}>Reload</button>
      </div>

      {msg && <div className="hint">{msg}</div>}
      <div className="hint muted">* Reload requires login (wallet belongs to account).</div>
    </div>
  );
}
