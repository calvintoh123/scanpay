import React, { useState } from "react";
import { api } from "../api";
import { QRCodeCanvas } from "qrcode.react";



export default function Home() {
  const [amount, setAmount] = useState("5.00");
  const [desc, setDesc] = useState("Sim payment");
  const [deviceId, setDeviceId] = useState("DEV001");
  const [duration, setDuration] = useState("240");
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  async function createInvoice() {
    setErr(""); setResult(null);
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

  return (
    <div>
      <h2>Simulated Scan-to-Pay (Device Control)</h2>

      <div className="card">
        <div className="row">
          <input value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="Amount" />
          <input value={desc} onChange={(e)=>setDesc(e.target.value)} placeholder="Description" />
        </div>

        <div className="row">
          <input value={deviceId} onChange={(e)=>setDeviceId(e.target.value)} placeholder="Device ID (e.g. DEV001)" />
          <input value={duration} onChange={(e)=>setDuration(e.target.value)} placeholder="Duration seconds" />
          <button onClick={createInvoice}>Create Invoice</button>
        </div>

        {err && <div className="error">{err}</div>}

        {result && (
            <div className="card">
                <div><b>Invoice:</b> {result.public_id}</div>
                <div><b>Device:</b> {result.device_id}</div>
                <div><b>Duration:</b> {result.duration_sec}s</div>

                <div><b>Pay URL (encode into QR):</b></div>
                <div className="mono">
                {location.origin + result.pay_url}
                </div>

                {/* ✅ QR CODE SECTION */}
                <div style={{ marginTop: "20px", textAlign: "center" }}>
                <QRCode
                    value={location.origin + result.pay_url}
                    size={220}
                    bgColor="#0b0f1a"
                    fgColor="#ffffff"
                    level="H"
                    includeMargin
                />
                <div style={{ marginTop: "8px", fontSize: "12px", color: "#9ae6b4" }}>
                    Scan with phone to pay
                </div>

                <div style={{ marginTop: "20px", textAlign: "center" }}>
                <QRCodeCanvas
                    value={location.origin + result.pay_url}
                    size={220}
                    bgColor="#0b0f1a"
                    fgColor="#ffffff"
                    level="H"
                    includeMargin
                />
                </div>

                </div>

                <div className="hint">
                After PAID → backend queues command action=1 for that device.
                </div>
            </div>
            )}

      </div>
    </div>
  );
}
