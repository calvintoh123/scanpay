import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { api } from "../api";
import { getAccessToken } from "../auth";
import ReloadPanel from "../components/ReloadPanel.jsx";

export default function Pay() {
  const { publicId } = useParams();
  const [sp] = useSearchParams();
  const token = sp.get("t") || "";

  const [inv, setInv] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [msg, setMsg] = useState("");
  const authed = !!getAccessToken();

  async function loadInvoice() {
    setMsg("");
    try {
      const r = await api.get(`/invoices/${publicId}/?t=${encodeURIComponent(token)}`);
      setInv(r.data);
    } catch {
      setInv(null);
      setMsg("Invalid/expired payment link.");
    }
  }

  async function loadWallet() {
    if (!authed) { setWallet(null); return; }
    try {
      const r = await api.get("/wallet/me/");
      setWallet(r.data);
    } catch {
      setWallet(null);
    }
  }

  useEffect(() => { loadInvoice(); }, [publicId, token]);
  useEffect(() => { loadWallet(); }, [authed]);

  const balance = useMemo(() => wallet ? Number(wallet.balance) : 0, [wallet]);
  const invAmount = inv ? Number(inv.amount) : 0;

  async function payWithWallet() {
    setMsg("");
    try {
      const r = await api.post("/wallet/pay/", { invoice_public_id: publicId });
      setMsg(`Paid! Receipt: ${r.data.paid_reference}. New balance RM${r.data.new_balance}`);
      await loadInvoice();
      await loadWallet();
    } catch (e) {
      setMsg(e?.response?.data?.detail || "Wallet pay failed");
    }
  }

  async function guestPay() {
    setMsg("");
    try {
      const r = await api.post("/pay/guest/", { invoice_public_id: publicId });
      setMsg(`Paid as Guest! Receipt: ${r.data.paid_reference}`);
      await loadInvoice();
    } catch (e) {
      setMsg(e?.response?.data?.detail || "Guest pay failed");
    }
  }

  if (!inv) {
    return (
      <div className="card">
        <h2>Payment</h2>
        <div className="error">{msg || "Loading..."}</div>
      </div>
    );
  }

  const canWalletPay = authed && wallet && balance >= invAmount && inv.status === "PENDING";

  return (
    <div>
      <h2>Pay Invoice</h2>

      <div className="card">
        <div><b>Invoice:</b> {inv.public_id}</div>
        <div><b>Amount:</b> RM{inv.amount}</div>
        <div><b>Device:</b> {inv.device_id || "-"}</div>
        <div><b>Duration:</b> {inv.duration_sec}s</div>
        <div><b>Status:</b> {inv.status}</div>
        <div><b>Expires:</b> {new Date(inv.expires_at).toLocaleString()}</div>
        {inv.paid_reference && <div><b>Receipt:</b> {inv.paid_reference}</div>}
      </div>

      {msg && <div className={msg.includes("Paid") ? "hint" : "error"}>{msg}</div>}

      {inv.status !== "PENDING" ? (
        <div className="card">
          <div className="hint">This invoice is not payable anymore.</div>
        </div>
      ) : (
        <>
          <div className="card">
            <h3>Pay with Wallet</h3>

            {!authed ? (
              <div className="hint">
                <Link to="/login">Login</Link> to use wallet + reload.
              </div>
            ) : (
              <>
                <div><b>Your balance:</b> RM{wallet ? wallet.balance : "..."}</div>
                {wallet && balance < invAmount && (
                  <div className="hint">Insufficient balance. Reload below then pay.</div>
                )}

                {/* Reload feature on pay page (your requirement) */}
                <ReloadPanel onReloaded={loadWallet} />

                <button disabled={!canWalletPay} onClick={payWithWallet}>
                  Pay RM{inv.amount} with Wallet
                </button>
              </>
            )}
          </div>

          <div className="card">
            <h3>Pay as Guest (Simulated)</h3>
            <button onClick={guestPay}>Guest Pay RM{inv.amount}</button>
          </div>
        </>
      )}
    </div>
  );
}
