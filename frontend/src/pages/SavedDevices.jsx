import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function SavedDevices() {
  const [devices, setDevices] = useState([]);
  const [newId, setNewId] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadDevices();
  }, []);

  async function loadDevices() {
    setErr("");
    setBusy(true);
    try {
      const r = await api.get("/devices/");
      setDevices(r.data || []);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to load devices.");
    } finally {
      setBusy(false);
    }
  }

  async function addDevice() {
    const id = newId.trim();
    if (!id) {
      setMsg("Device ID is required.");
      return;
    }
    setMsg("");
    setErr("");
    try {
      const r = await api.post("/devices/", { device_id: id });
      setDevices((prev) => [...prev, r.data]);
      setNewId("");
      setMsg("Device saved.");
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to add device.");
    }
  }

  async function removeDevice(id) {
    setMsg("");
    setErr("");
    try {
      await api.delete(`/devices/${encodeURIComponent(id)}/`);
      setDevices((prev) => prev.filter((d) => d.device_id !== id));
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to delete device.");
    }
  }

  async function copyDevice(id) {
    if (!navigator?.clipboard?.writeText) {
      setMsg("Clipboard not available.");
      return;
    }
    try {
      await navigator.clipboard.writeText(id);
      setMsg("Copied to clipboard.");
    } catch {
      setMsg("Clipboard not available.");
    }
  }

  return (
    <div>
      <h2>Saved Devices</h2>

      <div className="card">
        <div className="row">
          <input
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            placeholder="Device ID (e.g. DEV001)"
            onKeyDown={(e) => {
              if (e.key === "Enter") addDevice();
            }}
          />
          <button onClick={addDevice}>Add Device</button>
          <button onClick={loadDevices} disabled={busy}>Refresh</button>
        </div>
        {err && <div className="error">{err}</div>}
        {msg && <div className="hint">{msg}</div>}
        <div className="hint muted">Devices are stored in the backend database.</div>
      </div>

      <div className="card">
        <h3>Device List</h3>
        {devices.length === 0 ? (
          <div className="hint muted">No saved devices yet.</div>
        ) : (
          <div className="table">
            <div className="thead">
              <div>Device ID</div>
              <div>Active</div>
              <div>Last Seen</div>
              <div>Actions</div>
            </div>
            {devices.map((d) => (
              <div key={d.device_id} className="trow">
                <div className="mono">{d.device_id}</div>
                <div>{d.is_active ? "Yes" : "No"}</div>
                <div className="mono">
                  {d.last_seen ? new Date(d.last_seen).toLocaleString() : "-"}
                </div>
                <div className="row">
                  <button onClick={() => copyDevice(d.device_id)}>Copy</button>
                  <button onClick={() => removeDevice(d.device_id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
