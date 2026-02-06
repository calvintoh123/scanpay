import React, { useEffect, useState } from "react";
import { api } from "../api";
import { QRCodeCanvas } from "qrcode.react";
import { getAccessToken } from "../auth";
import { Link } from "react-router-dom";

export default function Home() {
  const [amount, setAmount] = useState("5.00");
  const [desc, setDesc] = useState("Sim payment");
  const [deviceId, setDeviceId] = useState("");
  const [devices, setDevices] = useState([]);
  const [duration, setDuration] = useState("240");
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [deviceErr, setDeviceErr] = useState("");
  const [payMsg, setPayMsg] = useState("");
  const [payBusy, setPayBusy] = useState(false);
  const baseUrl = (import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin)
    .replace(/\/+$/, "");
  const payUrl = result ? `${baseUrl}${result.pay_url}` : "";
  const authed = !!getAccessToken();

  async function loadDevices() {
    setDeviceErr("");
    try {
      const r = await api.get("/devices/");
      const list = r.data || [];
      setDevices(list);
      if (!list.length) {
        setDeviceId("");
      } else if (!list.find((d) => d.device_id === deviceId)) {
        setDeviceId(list[0].device_id);
      }
    } catch (e) {
      setDevices([]);
      setDeviceErr(e?.response?.data?.detail || "Failed to load devices.");
    }
  }

  useEffect(() => {
    loadDevices();
  }, []);

  async function createInvoice() {
    setErr(""); setResult(null); setPayMsg(""); setPayBusy(false);
    if (!deviceId) {
      setErr("Please select a device.");
      return;
    }
    try {
      const r = await api.post("/invoices/", {
        amount,
        description: desc,
        device_id: deviceId,
        duration_sec: Number(duration),
      });
      setResult(r.data);
    } catch (e) {
      setErr(JSON.stringify(e?.response?.data || "Failed"));
    }
  }

  async function payWithWallet() {
    if (!result) return;
    setPayBusy(true);
    setPayMsg("");
    try {
      const r = await api.post("/wallet/pay/", { invoice_public_id: result.public_id });
      setPayMsg(`Paid! Receipt: ${r.data.paid_reference}. New balance RM${r.data.new_balance}`);
      setResult((prev) => prev ? { ...prev, status: "PAID", paid_reference: r.data.paid_reference } : prev);
    } catch (e) {
      setPayMsg(e?.response?.data?.detail || "Wallet pay failed");
    } finally {
      setPayBusy(false);
    }
  }

  return (
    <div>
      <h2>Simulated Scan-to-Pay (Device Control)</h2>

      <div className="card">
        <div className="row">
          <input value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="Amount" />
          <input value={desc} onChange={(e)=>setDesc(e.target.value)} placeholder="Description" />
        </div>

        <div className="row">
          <select value={deviceId} onChange={(e)=>setDeviceId(e.target.value)}>
            {devices.length === 0 && <option value="">No devices</option>}
            {devices.map((d) => (
              <option key={d.device_id} value={d.device_id}>
                {d.device_id}
              </option>
            ))}
          </select>
          <input value={duration} onChange={(e)=>setDuration(e.target.value)} placeholder="Duration seconds" />
          <button onClick={createInvoice} disabled={!deviceId}>Create Invoice</button>
          <button onClick={loadDevices}>Refresh Devices</button>
        </div>
        <div className="hint muted">
          Manage devices in <Link to="/devices">Saved Devices</Link>.
        </div>
        {deviceErr && <div className="error">{deviceErr}</div>}

        {err && <div className="error">{err}</div>}

        {result && (
            <div className="card">
                <div><b>Invoice:</b> {result.public_id}</div>
                <div><b>Device:</b> {result.device_id}</div>
                <div><b>Duration:</b> {result.duration_sec}s</div>
                <div><b>Status:</b> {result.status}</div>
                {result.paid_reference && <div><b>Receipt:</b> {result.paid_reference}</div>}

                <div><b>Pay URL (encode into QR):</b></div>
                <div className="mono">{payUrl}</div>

                <div style={{ marginTop: "20px", textAlign: "center" }}>
                  <QRCodeCanvas
                    value={payUrl}
                    size={220}
                    bgColor="#0b0f1a"
                    fgColor="#ffffff"
                    level="H"
                    includeMargin
                  />
                  <div style={{ marginTop: "8px", fontSize: "12px", color: "#9ae6b4" }}>
                    Scan with phone to pay
                  </div>
                </div>

                {authed ? (
                  <div className="card">
                    <h3>Pay with Wallet</h3>
                    <button
                      disabled={payBusy || result.status !== "PENDING"}
                      onClick={payWithWallet}
                    >
                      Pay RM{result.amount} with Wallet
                    </button>
                    {payMsg && (
                      <div className={payMsg.includes("Paid") ? "hint" : "error"}>{payMsg}</div>
                    )}
                  </div>
                ) : (
                  <div className="hint">Login to pay with wallet.</div>
                )}

                <div className="hint">
                After PAID → backend queues command action=1 for that device.
                </div>
            </div>
            )}

      </div>
    </div>
  );
}
