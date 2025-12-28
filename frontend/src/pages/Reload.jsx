import React, { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { getAccessToken } from "../auth";

export default function Reload() {
  const [sp] = useSearchParams();
  const location = useLocation();
  const amount = (sp.get("amount") || "").trim();
  const mode = (sp.get("mode") || "reload").toLowerCase();
  const isGuestPay = mode === "guest";
  const invoiceId = (sp.get("invoice") || "").trim();
  const returnRaw = sp.get("return") || "";
  const returnTo = returnRaw.startsWith("/") ? returnRaw : "";
  const nextParam = encodeURIComponent(`${location.pathname}${location.search}`);
  const authed = !!getAccessToken();

  const [method, setMethod] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });

  async function doAction(label) {
    if (!amount) {
      setStatus({ type: "error", text: "Missing reload amount." });
      return;
    }
    if (isGuestPay && !invoiceId) {
      setStatus({ type: "error", text: "Missing invoice id." });
      return;
    }
    setBusy(true);
    setStatus({ type: "", text: "" });
    try {
      if (isGuestPay) {
        const r = await api.post("/pay/guest/", { invoice_public_id: invoiceId });
        setStatus({
          type: "success",
          text: `Paid RM${amount} via ${label}. Receipt: ${r.data.paid_reference}`,
        });
      } else {
        const r = await api.post("/wallet/topup/", { amount });
        setStatus({
          type: "success",
          text: `Reloaded RM${amount} via ${label}. New balance RM${r.data.balance}`,
        });
      }
    } catch (e) {
      setStatus({
        type: "error",
        text: e?.response?.data?.detail || JSON.stringify(e?.response?.data || "Topup failed"),
      });
    } finally {
      setBusy(false);
    }
  }

  if (!authed && !isGuestPay) {
    return (
      <div className="card">
        <h2>Reload Wallet</h2>
        <div className="error">You are not logged in.</div>
        <div className="hint"><Link to={`/login?next=${nextParam}`}>Login</Link> to reload.</div>
      </div>
    );
  }

  if (!amount) {
    return (
      <div className="card">
        <h2>{isGuestPay ? "Pay as Guest" : "Reload Wallet"}</h2>
        <div className="error">Missing {isGuestPay ? "payment" : "reload"} amount.</div>
        <div className="hint"><Link to="/wallet">Back to wallet</Link></div>
      </div>
    );
  }

  const canSubmitCard = cardNumber && cardName && cardCvv;

  return (
    <div>
      <h2>{isGuestPay ? "Pay as Guest" : "Reload Wallet"}</h2>

      <div className="card">
        <div><b>Amount:</b> RM{amount}</div>
      </div>

      {status.text && (
        <div className={status.type === "success" ? "hint" : "error"}>
          {status.text}
        </div>
      )}

      <div className="card">
        <h3>Choose Payment Method</h3>
        <div className="rowWrap">
          <button disabled={busy} onClick={() => setMethod("card")}>Visa/Master</button>
          <button disabled={busy} onClick={() => doAction("TnG E-Wallet")}>TnG E-Wallet</button>
          <button disabled={busy} onClick={() => doAction("ShopeePay")}>ShopeePay</button>
          <button disabled={busy} onClick={() => doAction("GrabPay")}>GrabPay</button>
        </div>
      </div>

      {method === "card" && (
        <div className="card">
          <h3>Card Details</h3>
          <div style={{ display: "grid", gap: "10px" }}>
            <input
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="Card number"
            />
            <input
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="Name on card"
            />
            <input
              value={cardCvv}
              onChange={(e) => setCardCvv(e.target.value)}
              placeholder="CVV"
            />
            <button
              disabled={busy || !canSubmitCard}
              onClick={() => doAction("Visa/Master")}
            >
              {isGuestPay ? "Pay" : "Reload"} RM{amount}
            </button>
          </div>
        </div>
      )}

      {returnTo && <div className="hint"><Link to={returnTo}>Back to previous page</Link></div>}
      {!isGuestPay && <div className="hint"><Link to="/wallet">Back to wallet</Link></div>}
    </div>
  );
}
