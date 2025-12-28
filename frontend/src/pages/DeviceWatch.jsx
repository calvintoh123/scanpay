import React, { useEffect, useState } from "react";
import { api } from "../api";
import { QRCodeCanvas } from "qrcode.react";

export default function DeviceWatch() {
  const [deviceId, setDeviceId] = useState("DEV001");
  const [auto, setAuto] = useState(true);
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const baseUrl = (import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin)
    .replace(/\/+$/, "");
  const payUrl = data?.pay_url ? `${baseUrl}${data.pay_url}` : "";

  async function loadLatest() {
    if (!deviceId) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await api.get(
        `/device/${encodeURIComponent(deviceId)}/latest-invoice/?only_pending=1`
      );
      if (r.data.has_invoice) {
        setData(r.data);
      } else {
        setData(null);
        setMsg("No pending invoice.");
      }
    } catch (e) {
      setData(null);
      setMsg(e?.response?.data?.detail || "Failed to load latest invoice.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!deviceId) return;
    loadLatest();
    if (!auto) return;
    const id = setInterval(loadLatest, 4000);
    return () => clearInterval(id);
  }, [deviceId, auto]);

  return (
    <div>
      <h2>Device Invoice Monitor</h2>

      <div className="card">
        <div className="row">
          <input
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="Device ID (e.g. DEV001)"
          />
          <button onClick={loadLatest} disabled={busy || !deviceId}>
            Refresh
          </button>
          <button onClick={() => setAuto((v) => !v)}>
            Auto: {auto ? "On" : "Off"}
          </button>
        </div>
        <div className="hint muted">Polling every 4s when auto is on.</div>
      </div>

      {msg && <div className={msg.includes("Failed") ? "error" : "hint"}>{msg}</div>}

      {data?.invoice && (
        <div className="card">
          <div><b>Invoice:</b> {data.invoice.public_id}</div>
          <div><b>Amount:</b> RM{data.invoice.amount}</div>
          <div><b>Device:</b> {data.invoice.device_id || "-"}</div>
          <div><b>Duration:</b> {data.invoice.duration_sec}s</div>
          <div><b>Status:</b> {data.invoice.status}</div>
          <div><b>Expires:</b> {new Date(data.invoice.expires_at).toLocaleString()}</div>
          {data.invoice.paid_reference && (
            <div><b>Receipt:</b> {data.invoice.paid_reference}</div>
          )}

          <div style={{ marginTop: "14px" }}>
            <div><b>Pay URL:</b></div>
            <div className="mono">{payUrl}</div>
          </div>

          {payUrl && (
            <div style={{ marginTop: "16px", textAlign: "center" }}>
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
          )}
        </div>
      )}
    </div>
  );
}
