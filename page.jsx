"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");

  async function createTrip() {
    setCreating(true);
    setErr("");
    try {
      const r = await fetch("/api/create-trip", { method: "POST" });
      const data = await r.json();
      if (data.code) {
        router.push(`/${data.code}`);
      } else {
        setErr(data.error || "Couldn't create trip. Try again.");
        setCreating(false);
      }
    } catch (e) {
      setErr("Network error. Try again.");
      setCreating(false);
    }
  }

  function joinTrip() {
    const c = code.trim().toLowerCase();
    if (c) router.push(`/${c}`);
  }

  const S = {
    app: {
      minHeight: "100vh",
      background: "#0b1c11",
      fontFamily: "'DM Sans', sans-serif",
      color: "#ddd8c0",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 20px",
      boxSizing: "border-box",
    },
    title: {
      fontFamily: "'Playfair Display', serif",
      fontSize: 36,
      fontWeight: 900,
      color: "#c9a84c",
      margin: "0 0 6px",
      letterSpacing: -0.5,
      textAlign: "center",
    },
    sub: {
      fontSize: 11,
      color: "#4a6a54",
      letterSpacing: 2.5,
      textTransform: "uppercase",
      marginBottom: 36,
      textAlign: "center",
    },
    card: {
      width: "100%",
      maxWidth: 360,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 12,
      padding: 20,
      marginBottom: 14,
    },
    label: {
      fontSize: 10,
      color: "#4a6a54",
      letterSpacing: 1.5,
      textTransform: "uppercase",
      marginBottom: 10,
    },
    inp: {
      width: "100%",
      boxSizing: "border-box",
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 8,
      padding: "11px 14px",
      color: "#ddd8c0",
      fontSize: 14,
      fontFamily: "'DM Sans', sans-serif",
      outline: "none",
      letterSpacing: 1,
    },
    btnGold: {
      width: "100%",
      padding: "12px 16px",
      borderRadius: 8,
      border: "none",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      fontFamily: "'DM Sans', sans-serif",
      background: "#c9a84c",
      color: "#0b1c11",
      letterSpacing: 0.5,
    },
    btnGhost: {
      width: "100%",
      padding: "12px 16px",
      borderRadius: 8,
      border: "1px solid rgba(255,255,255,0.12)",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      fontFamily: "'DM Sans', sans-serif",
      background: "transparent",
      color: "#ddd8c0",
      marginTop: 10,
    },
    div: {
      width: "100%",
      maxWidth: 360,
      textAlign: "center",
      fontSize: 10,
      color: "#3a4a3a",
      letterSpacing: 2,
      textTransform: "uppercase",
      margin: "6px 0 14px",
    },
    err: {
      width: "100%",
      maxWidth: 360,
      padding: "10px 14px",
      borderRadius: 8,
      background: "rgba(204,0,102,0.1)",
      border: "1px solid rgba(204,0,102,0.3)",
      color: "#cc6688",
      fontSize: 12,
      marginBottom: 14,
      textAlign: "center",
    },
  };

  return (
    <div style={S.app}>
      <div style={S.title}>Golf Trip</div>
      <div style={S.sub}>Real-time scoring · share the trip code</div>

      {err && <div style={S.err}>{err}</div>}

      <div style={S.card}>
        <div style={S.label}>Start a new trip</div>
        <button
          style={{ ...S.btnGold, opacity: creating ? 0.5 : 1 }}
          onClick={createTrip}
          disabled={creating}
        >
          {creating ? "Creating..." : "Create New Trip"}
        </button>
      </div>

      <div style={S.div}>or</div>

      <div style={S.card}>
        <div style={S.label}>Join existing trip</div>
        <input
          style={S.inp}
          placeholder="Trip code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && joinTrip()}
          autoCapitalize="off"
          autoCorrect="off"
        />
        <button
          style={{ ...S.btnGhost, opacity: code.trim() ? 1 : 0.5 }}
          onClick={joinTrip}
          disabled={!code.trim()}
        >
          Join Trip
        </button>
      </div>
    </div>
  );
}
