// ============================================================
// OsirisModule.jsx — Módulo Osiris Plant para Mediterra App
// Integración: importar y usar <OsirisModule ... /> en App.jsx
// ============================================================

import { useState, useCallback } from "react";

// ── Paleta de colores ──────────────────────────────────────
const COLOR = {
  azul:    "#2563eb",
  azulBg:  "#dbeafe",
  verde:   "#16a34a",
  verdeBg: "#dcfce7",
  rojo:    "#dc2626",
  rojoBg:  "#fee2e2",
  amarillo:"#d97706",
  amarilloBg:"#fef3c7",
  gris:    "#64748b",
  grisBg:  "#f1f5f9",
  morado:  "#7c3aed",
  moradoBg:"#ede9fe",
  slate:   "#1e293b",
};

const ESTATUS_COLORS = {
  "Pagado":    { bg: "#dcfce7", color: "#16a34a", border: "#86efac" },
  "Facturado": { bg: "#dbeafe", color: "#2563eb", border: "#93c5fd" },
  "Pendiente": { bg: "#fef3c7", color: "#d97706", border: "#fde047" },
  "Cancelado": { bg: "#fee2e2", color: "#dc2626", border: "#fca5a5" },
};

function EstatusBadge({ valor }) {
  const c = ESTATUS_COLORS[valor] || { bg: "#f1f5f9", color: "#64748b", border: "#d1d5db" };
  return (
    <span style={{
      background: c.bg, color: c.color,
      border: `1px solid ${c.border}`,
      borderRadius: 20, padding: "2px 10px",
      fontSize: 11, fontWeight: 700, whiteSpace: "nowrap"
    }}>{valor || "—"}</span>
  );
}

function HeaderTabla({ cols }) {
  return (
    <thead>
      <tr style={{ background: "#0f172a", color: "#fff", fontSize: 11 }}>
        {cols.map((c, i) => (
          <th key={i} style={{
            padding: "9px 12px", textAlign: c.center ? "center" : "left",
            fontWeight: 600, whiteSpace: "nowrap", minWidth: c.minW || 80
          }}>{c.label}</th>
        ))}
      </tr>
    </thead>
  );
}

function CeldaEdit({ valor, onChange, tipo = "text", opciones = null, puedeEditar }) {
  const [editando, setEditando] = useState(false);
  const [temp, setTemp] = useState(valor);

  if (!puedeEditar) {
    return <span style={{ fontSize: 12, color: COLOR.slate }}>{valor ?? "—"}</span>;
  }

  if (editando) {
    if (opciones) {
      return (
        <select value={temp} onChange={e => setTemp(e.target.value)}
          onBlur={() => { onChange(temp); setEditando(false); }}
          autoFocus
          style={{ fontSize: 12, borderRadius: 6, border: "1px solid #93c5fd",
            padding: "3px 6px", background: "#eff6ff", width: "100%" }}>
          {opciones.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    return (
      <input type={tipo} value={temp}
        onChange={e => setTemp(e.target.value)}
        onBlur={() => { onChange(tipo === "number" ? parseFloat(temp) || 0 : temp); setEditando(false); }}
        onKeyDown={e => { if (e.key === "Enter") { onChange(tipo === "number" ? parseFloat(temp) || 0 : temp); setEditando(false); } }}
        autoFocus
        style={{ fontSize: 12, borderRadius: 6, border: "1px solid #93c5fd",
          padding: "3px 6px", background: "#eff6ff", width: "100%",
          maxWidth: tipo === "number" ? 90 : 160 }}
      />
    );
  }

  return (
    <span onClick={() => { setTemp(valor); setEditando(true); }}
      style={{ fontSize: 12, color: COLOR.slate, cursor: "pointer",
        borderBottom: "1px dashed #93c5fd", paddingBottom: 1 }}>
      {valor ?? <span style={{ color: "#cbd5e1" }}>—</span>}
    </span>
  );
}

// ── Datos iniciales 2026+ ─────────────────────────────────

const ROYALTY_PLANTA_INIT = [
  { id: "rp1",  cliente: "Vanguard",       pais: "Peru",   año: 2026, trim: 1, nPlantas: 422776, usdPlanta: 0.85, montoFacturar: 359359.6,  montoCobrar: 359359.6,  estatus: "Pagado",    fechaPago: "2026-01-01", vivero: "Synergia Chile" },
  { id: "rp2",  cliente: "Vanguard",       pais: "Peru",   año: 2026, trim: 1, nPlantas: 298944, usdPlanta: 0.85, montoFacturar: 254102.4,  montoCobrar: 254102.4,  estatus: "Pagado",    fechaPago: "2026-02-01", vivero: "Synergia Chile" },
  { id: "rp3",  cliente: "Mainland",       pais: "Mexico", año: 2026, trim: 1, nPlantas: 150000, usdPlanta: 0.49, montoFacturar: 74044,     montoCobrar: 74044,     estatus: "Pagado",    fechaPago: "2026-02-01", vivero: "Synergia Mexico" },
  { id: "rp4",  cliente: "Integrity/Talsa",pais: "Peru",   año: 2026, trim: 1, nPlantas: 2100,   usdPlanta: 0.85, montoFacturar: 1785,      montoCobrar: 1785,      estatus: "Facturado", fechaPago: "2026-03-01", vivero: "Synergia Chile" },
  { id: "rp5",  cliente: "Mainland",       pais: "Mexico", año: 2026, trim: 1, nPlantas: 150000, usdPlanta: 0.01, montoFacturar: 2000,      montoCobrar: 2000,      estatus: "Pagado",    fechaPago: "2026-03-13", vivero: "Synergia Mexico" },
  { id: "rp6",  cliente: "Mainland",       pais: "Mexico", año: 2026, trim: 1, nPlantas: 150000, usdPlanta: 0.34, montoFacturar: 51455.63,  montoCobrar: 51455.63,  estatus: "Facturado", fechaPago: "2026-03-31", vivero: "Synergia Mexico" },
  { id: "rp7",  cliente: "Vanguard",       pais: "Peru",   año: 2026, trim: 1, nPlantas: 222559, usdPlanta: 0.85, montoFacturar: 189175.15, montoCobrar: 189175.15, estatus: "Pagado",    fechaPago: "2026-03-31", vivero: "Synergia Chile" },
  { id: "rp8",  cliente: "Dole Mexico",    pais: "Mexico", año: 2026, trim: 1, nPlantas: 2100,   usdPlanta: 0.85, montoFacturar: 1785,      montoCobrar: 1785,      estatus: "Pagado",    fechaPago: "2026-03-31", vivero: "Synergia Mexico" },
  { id: "rp9",  cliente: "Gourmet",        pais: "Mexico", año: 2026, trim: 1, nPlantas: 950,    usdPlanta: 0.85, montoFacturar: 807.5,     montoCobrar: 807.5,     estatus: "Pagado",    fechaPago: "2026-03-31", vivero: "Synergia Mexico" },
  { id: "rp10", cliente: "Agroextiende",   pais: "Peru",   año: 2026, trim: 1, nPlantas: 105840, usdPlanta: 0.85, montoFacturar: 89964,     montoCobrar: 89964,     estatus: "Pagado",    fechaPago: "2026-03-31", vivero: "Synergia Chile" },
  { id: "rp11", cliente: "Vanguard",       pais: "Peru",   año: 2026, trim: 1, nPlantas: 233708, usdPlanta: 0.85, montoFacturar: 198651.8,  montoCobrar: 198651.8,  estatus: "Facturado", fechaPago: "2026-04-30", vivero: "Synergia Chile" },
  { id: "rp12", cliente: "Agroextiende",   pais: "Peru",   año: 2026, trim: 1, nPlantas: 145527, usdPlanta: 0.85, montoFacturar: 123697.95, montoCobrar: 123697.95, estatus: "Facturado", fechaPago: "2026-04-30", vivero: "Synergia Chile" },
  { id: "rp13", cliente: "Mainland",       pais: "Mexico", año: 2026, trim: 2, nPlantas: 250000, usdPlanta: 0.34, montoFacturar: 85000,     montoCobrar: 85000,     estatus: "Pendiente", fechaPago: "2026-05-01", vivero: "Synergia Mexico" },
  { id: "rp14", cliente: "Agroextiende",   pais: "Peru",   año: 2026, trim: 1, nPlantas: 174634, usdPlanta: 0.85, montoFacturar: 148438.9,  montoCobrar: 148438.9,  estatus: "Pendiente", fechaPago: "2026-05-31", vivero: "Agromillora Pe" },
  { id: "rp15", cliente: "Vanguard",       pais: "Peru",   año: 2026, trim: 1, nPlantas: 195389, usdPlanta: 0.85, montoFacturar: 166080.65, montoCobrar: 166080.65, estatus: "Pendiente", fechaPago: "2026-05-31", vivero: "Synergia Chile" },
  { id: "rp16", cliente: "Mainland",       pais: "Mexico", año: 2026, trim: 1, nPlantas: 11760,  usdPlanta: 0.85, montoFacturar: 9996,      montoCobrar: 9996,      estatus: "Pendiente", fechaPago: "2026-09-01", vivero: "Synergia Mexico" },
  { id: "rp17", cliente: "Mainland",       pais: "Mexico", año: 2026, trim: 2, nPlantas: 250000, usdPlanta: 0.51, montoFacturar: 127500,    montoCobrar: 127500,    estatus: "Pendiente", fechaPago: "2026-09-01", vivero: "Synergia Mexico" },
  { id: "rp18", cliente: "Danper",         pais: "Peru",   año: 2026, trim: 3, nPlantas: 512,    usdPlanta: 0.85, montoFacturar: 435.2,     montoCobrar: 435.2,     estatus: "Pendiente", fechaPago: "2026-09-01", vivero: "Synergia Chile" },
  { id: "rp19", cliente: "Mainland",       pais: "Mexico", año: 2026, trim: 3, nPlantas: 1000,   usdPlanta: 0.85, montoFacturar: 850,       montoCobrar: 850,       estatus: "Pendiente", fechaPago: "2026-09-01", vivero: "Synergia Mexico" },
  { id: "rp20", cliente: "Danper",         pais: "Peru",   año: 2026, trim: 4, nPlantas: 884271, usdPlanta: 0.85, montoFacturar: 751630.35, montoCobrar: 751630.35, estatus: "Pendiente", fechaPago: "2026-10-01", vivero: "Synergia Chile" },
  { id: "rp21", cliente: "Frusan",         pais: "Peru",   año: 2026, trim: 4, nPlantas: 285405, usdPlanta: 1.0,  montoFacturar: 285405,    montoCobrar: 285405,    estatus: "Pendiente", fechaPago: "2026-12-01", vivero: "Synergia Chile" },
  { id: "rp22", cliente: "Frunatural",     pais: "Mexico", año: 2027, trim: 1, nPlantas: 136500, usdPlanta: 1.0,  montoFacturar: 136500,    montoCobrar: 136500,    estatus: "Pendiente", fechaPago: "2027-02-01", vivero: "Synergia Mexico" },
  { id: "rp23", cliente: "Frunatural",     pais: "Mexico", año: 2027, trim: 2, nPlantas: 72000,  usdPlanta: 1.0,  montoFacturar: 72000,     montoCobrar: 72000,     estatus: "Pendiente", fechaPago: "2027-05-01", vivero: "Synergia Mexico" },
];

const FEE_ENTRADA_INIT = [
  { id: "fe1",  cliente: "Agrolatina",  pais: "Peru",   estatus: "Facturado", fechaPago: "2026-04-30", montoUSD: 30000, detalle: "Sin Devolución" },
  { id: "fe2",  cliente: "Frunatural",  pais: "Mexico", estatus: "Pagado",    fechaPago: "2026-03-01", montoUSD: 30000, detalle: "Sin Devolución" },
];

const ROYALTY_COMERCIAL_INIT = [
  { id: "rc1",  cliente: "Agroextiende",  pais: "Peru",   trim: 2, año: 2026, montoUSD: 204000,         estatus: "Facturado" },
  { id: "rc2",  cliente: "Allpa",         pais: "Peru",   trim: 2, año: 2026, montoUSD: 76500,          estatus: "Facturado" },
  { id: "rc3",  cliente: "San Clemente",  pais: "Peru",   trim: 2, año: 2026, montoUSD: 99364.23,       estatus: "Facturado" },
  { id: "rc4",  cliente: "Mainland",      pais: "Mexico", trim: 3, año: 2026, montoUSD: 127814.5,       estatus: "Pendiente" },
  { id: "rc5",  cliente: "Giddings",      pais: "Mexico", trim: 3, año: 2026, montoUSD: 0,              estatus: "Pendiente" },
  { id: "rc6",  cliente: "Agroextiende",  pais: "Peru",   trim: 2, año: 2027, montoUSD: 418914,         estatus: "Pendiente" },
  { id: "rc7",  cliente: "Allpa",         pais: "Peru",   trim: 2, año: 2027, montoUSD: 114750,         estatus: "Pendiente" },
  { id: "rc8",  cliente: "Frusan",        pais: "Peru",   trim: 2, año: 2027, montoUSD: 111180,         estatus: "Pendiente" },
  { id: "rc9",  cliente: "Hass Peru",     pais: "Peru",   trim: 2, año: 2027, montoUSD: 107100,         estatus: "Pendiente" },
  { id: "rc10", cliente: "Pura Berries",  pais: "Peru",   trim: 2, año: 2027, montoUSD: 86139,          estatus: "Pendiente" },
  { id: "rc11", cliente: "Vanguard",      pais: "Peru",   trim: 2, año: 2027, montoUSD: 637500,         estatus: "Pendiente" },
  { id: "rc12", cliente: "San Clemente",  pais: "Peru",   trim: 2, año: 2027, montoUSD: 124950,         estatus: "Pendiente" },
  { id: "rc13", cliente: "Mainland",      pais: "Mexico", trim: 3, año: 2027, montoUSD: 325018.75,      estatus: "Pendiente" },
  { id: "rc14", cliente: "Giddings",      pais: "Mexico", trim: 3, año: 2027, montoUSD: 37148.65,       estatus: "Pendiente" },
];

const FEE_VIVEROS_INIT = [
  { id: "fv1",  vivero: "Synergiabio",  empresa: "Frusan Agro SAC",    pais: "Peru",   proforma: "HUARME-CL-2024-02",  nPlantas: 305185, regalia: 0.45, totalOsiris: 137333.25, tipoPago: "Entrega",  montoFacturar: 132660.23, fechaFacturar: "2026-03-31", estatus: "Facturado" },
  { id: "fv2",  vivero: "Synergiabio",  empresa: "Vanguard",           pais: "Peru",   proforma: "OLIVOS-CL-2024-01",  nPlantas: 1555705,regalia: 0.45, totalOsiris: 700067.25, tipoPago: "Entrega",  montoFacturar: 180827.37, fechaFacturar: "2026-03-31", estatus: "Facturado" },
  { id: "fv3",  vivero: "Agromillora",  empresa: "AgroExtiende",       pais: "Peru",   proforma: "2025 - 2705",        nPlantas: 420000, regalia: 1.15, totalOsiris: 483000,    tipoPago: "Anticipo", montoFacturar: 34650.42,  fechaFacturar: "2026-03-31", estatus: "Facturado" },
  { id: "fv4",  vivero: "Synergiabio",  empresa: "Frusan Agro SAC",    pais: "Peru",   proforma: "HUARME-CL-2026-0046",nPlantas: 285405, regalia: 0.45, totalOsiris: 128432.25, tipoPago: "Anticipo", montoFacturar: 67426.93,  fechaFacturar: "2026-03-31", estatus: "Facturado" },
  { id: "fv5",  vivero: "Synergiabio",  empresa: "Vanguard",           pais: "Peru",   proforma: "OLIVOS-CL-2024-01",  nPlantas: 1555705,regalia: 0.45, totalOsiris: 700067.25, tipoPago: "Entrega",  montoFacturar: 169206.25, fechaFacturar: "2026-06-30", estatus: "Pendiente" },
  { id: "fv6",  vivero: "Agromillora",  empresa: "AgroExtiende",       pais: "Peru",   proforma: "2025 - 2705",        nPlantas: 420000, regalia: 1.15, totalOsiris: 483000,    tipoPago: "Anticipo", montoFacturar: 192149.96, fechaFacturar: "2026-05-31", estatus: "Pendiente" },
  { id: "fv7",  vivero: "Synergiabio",  empresa: "Mainland Farms SA",  pais: "Mexico", proforma: "MAIFAR-MX-2025-01",  nPlantas: 150000, regalia: 0.45, totalOsiris: 67500,     tipoPago: "Entrega",  montoFacturar: 14987.03,  fechaFacturar: "2026-06-30", estatus: "Pendiente" },
  { id: "fv8",  vivero: "Synergiabio",  empresa: "Mainland Farms SA",  pais: "Mexico", proforma: "MAIFAR-MX-2025-02",  nPlantas: 250000, regalia: 0.45, totalOsiris: 112500,    tipoPago: "Entrega",  montoFacturar: 20250,     fechaFacturar: "2026-06-30", estatus: "Pendiente" },
  { id: "fv9",  vivero: "Synergiabio",  empresa: "La Calera",          pais: "Peru",   proforma: "BRIDGE-PE-2025-01",  nPlantas: 3500,   regalia: 0.45, totalOsiris: 1575,      tipoPago: "Entrega",  montoFacturar: 1575,      fechaFacturar: "2026-06-30", estatus: "Pendiente" },
  { id: "fv10", vivero: "Synergiabio",  empresa: "Integrity/Talsa",    pais: "Peru",   proforma: "INTFAR-PE-2026-01",  nPlantas: 2100,   regalia: 0.45, totalOsiris: 945,       tipoPago: "Entrega",  montoFacturar: 945,       fechaFacturar: "2026-06-30", estatus: "Pendiente" },
  { id: "fv11", vivero: "Agromillora",  empresa: "AgroExtiende",       pais: "Peru",   proforma: "2025 - 2705",        nPlantas: 420000, regalia: 1.15, totalOsiris: 483000,    tipoPago: "Entrega",  montoFacturar: 256199.62, fechaFacturar: "2026-07-31", estatus: "Pendiente" },
  { id: "fv12", vivero: "Synergiabio",  empresa: "Mainland Farms SA",  pais: "Mexico", proforma: "MAIFAR-MX-2024-04",  nPlantas: 50000,  regalia: 0.45, totalOsiris: 22500,     tipoPago: "Entrega",  montoFacturar: 2077.09,   fechaFacturar: "2026-09-30", estatus: "Pendiente" },
  { id: "fv13", vivero: "Synergiabio",  empresa: "Mainland Farms SA",  pais: "Mexico", proforma: "MAIFAR-MX-2025-02",  nPlantas: 250000, regalia: 0.45, totalOsiris: 112500,    tipoPago: "Entrega",  montoFacturar: 30375,     fechaFacturar: "2026-09-30", estatus: "Pendiente" },
  { id: "fv14", vivero: "Synergiabio",  empresa: "KJ Orchard CO Ltd",  pais: "Corea",  proforma: "KJORCH-CL-2025-01",  nPlantas: 12096,  regalia: 0.10, totalOsiris: 1209.6,    tipoPago: "Entrega",  montoFacturar: 483.84,    fechaFacturar: "2026-09-30", estatus: "Pendiente" },
  { id: "fv15", vivero: "Synergiabio",  empresa: "Danper Trujillo SAC",pais: "Peru",   proforma: "DANPER-CL-2025-0148",nPlantas: 884271, regalia: 0.45, totalOsiris: 397921.95, tipoPago: "Entrega",  montoFacturar: 159168.78, fechaFacturar: "2026-12-31", estatus: "Pendiente" },
  { id: "fv16", vivero: "Synergiabio",  empresa: "Frusan Agro SAC",    pais: "Peru",   proforma: "HUARME-CL-2026-0046",nPlantas: 285405, regalia: 0.45, totalOsiris: 128432.25, tipoPago: "Entrega",  montoFacturar: 51372.9,   fechaFacturar: "2026-12-31", estatus: "Pendiente" },
  { id: "fv17", vivero: "Synergiabio",  empresa: "Frusan Agro SAC",    pais: "Peru",   proforma: "HUARME-CL-2026-0046",nPlantas: 285405, regalia: 0.45, totalOsiris: 128432.25, tipoPago: "Entrega",  montoFacturar: 9632.42,   fechaFacturar: "2027-03-31", estatus: "Pendiente" },
];

const USD_FMT = v => v != null && v !== "" ? `$${Number(v).toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : "—";
const NUM_FMT = v => v != null ? Number(v).toLocaleString("es-CL") : "—";

// ── Sub-tab: Royalty por Planta ───────────────────────────
function RoyaltyPlanta({ data, setData, puedeEditar }) {
  const [filtroAño, setFiltroAño] = useState("Todos");
  const [filtroEst, setFiltroEst] = useState("Todos");
  const [modalNuevo, setModalNuevo] = useState(false);
  const [form, setForm] = useState({
    cliente: "", pais: "Peru", año: 2026, trim: 1,
    nPlantas: "", usdPlanta: "", montoFacturar: "", montoCobrar: "",
    estatus: "Pendiente", fechaPago: "", vivero: "Synergia Chile"
  });

  const años = ["Todos", ...Array.from(new Set(data.map(r => r.año))).sort()];
  const estList = ["Todos", "Pagado", "Facturado", "Pendiente", "Cancelado"];
  const viveros = ["Synergia Chile", "Synergia Mexico", "Agromillora Pe", "Agromillora"];
  const paises = ["Peru", "Mexico", "Chile", "Corea", "España"];
  const estatuses = ["Pendiente", "Facturado", "Pagado", "Cancelado"];

  const filtrado = data.filter(r =>
    (filtroAño === "Todos" || r.año === Number(filtroAño)) &&
    (filtroEst === "Todos" || r.estatus === filtroEst)
  );

  const totalFacturar = filtrado.reduce((s, r) => s + (Number(r.montoFacturar) || 0), 0);
  const totalCobrar = filtrado.reduce((s, r) => s + (Number(r.montoCobrar) || 0), 0);
  const totalPendiente = filtrado.filter(r => r.estatus === "Pendiente" || r.estatus === "Facturado")
    .reduce((s, r) => s + (Number(r.montoCobrar) || 0), 0);

  function actualizarCelda(id, campo, valor) {
    setData(prev => prev.map(r => r.id === id ? { ...r, [campo]: valor } : r));
  }

  function agregarFila() {
    if (!form.cliente.trim()) { alert("Cliente es obligatorio."); return; }
    const monto = form.nPlantas && form.usdPlanta
      ? parseFloat(form.nPlantas) * parseFloat(form.usdPlanta)
      : parseFloat(form.montoFacturar) || 0;
    const nuevo = {
      ...form, id: `rp_${Date.now()}`,
      nPlantas: parseFloat(form.nPlantas) || 0,
      usdPlanta: parseFloat(form.usdPlanta) || 0,
      montoFacturar: parseFloat(form.montoFacturar) || monto,
      montoCobrar: parseFloat(form.montoCobrar) || monto,
    };
    setData(prev => [...prev, nuevo]);
    setModalNuevo(false);
    setForm({ cliente: "", pais: "Peru", año: 2026, trim: 1, nPlantas: "", usdPlanta: "", montoFacturar: "", montoCobrar: "", estatus: "Pendiente", fechaPago: "", vivero: "Synergia Chile" });
  }

  const cols = [
    { label: "Cliente", minW: 110 },
    { label: "País", minW: 70 },
    { label: "Año", center: true, minW: 50 },
    { label: "Trim.", center: true, minW: 50 },
    { label: "N° Plantas", center: true, minW: 90 },
    { label: "US$/Planta", center: true, minW: 80 },
    { label: "Monto a Facturar", center: true, minW: 120 },
    { label: "Monto a Cobrar", center: true, minW: 120 },
    { label: "Estatus", center: true, minW: 100 },
    { label: "Fecha pago est.", center: true, minW: 100 },
    { label: "Vivero", minW: 120 },
  ];

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          ["Total a Facturar", totalFacturar, COLOR.azul, COLOR.azulBg],
          ["Total a Cobrar", totalCobrar, COLOR.verde, COLOR.verdeBg],
          ["Pendiente / Facturado", totalPendiente, COLOR.amarillo, COLOR.amarilloBg],
        ].map(([lbl, val, c, bg]) => (
          <div key={lbl} style={{ background: bg, borderRadius: 12, padding: "12px 18px", flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 11, color: c, fontWeight: 600, marginBottom: 2 }}>{lbl}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: c }}>{USD_FMT(val)}</div>
          </div>
        ))}
        <div style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 18px", flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 11, color: COLOR.gris, fontWeight: 600, marginBottom: 2 }}>Registros</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: COLOR.slate }}>{filtrado.length}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: COLOR.gris, fontWeight: 600 }}>Año:</span>
        {años.map(a => (
          <button key={a} onClick={() => setFiltroAño(String(a))}
            style={{ padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
              background: filtroAño === String(a) ? COLOR.azul : "#fff", color: filtroAño === String(a) ? "#fff" : COLOR.slate,
              boxShadow: "0 1px 3px #0001" }}>
            {a}
          </button>
        ))}
        <span style={{ fontSize: 12, color: COLOR.gris, fontWeight: 600, marginLeft: 8 }}>Estatus:</span>
        {estList.map(e => (
          <button key={e} onClick={() => setFiltroEst(e)}
            style={{ padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
              background: filtroEst === e ? COLOR.slate : "#fff", color: filtroEst === e ? "#fff" : COLOR.slate,
              boxShadow: "0 1px 3px #0001" }}>
            {e}
          </button>
        ))}
        {puedeEditar && (
          <button onClick={() => setModalNuevo(true)}
            style={{ marginLeft: "auto", background: COLOR.azul, color: "#fff", border: "none", borderRadius: 8,
              padding: "6px 16px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
            + Agregar
          </button>
        )}
      </div>

      {/* Tabla */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", background: "#fff", borderRadius: 10, overflow: "hidden" }}>
          <HeaderTabla cols={cols} />
          <tbody>
            {filtrado.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                <td style={{ padding: "8px 12px" }}>
                  <CeldaEdit valor={r.cliente} onChange={v => actualizarCelda(r.id, "cliente", v)} puedeEditar={puedeEditar} />
                </td>
                <td style={{ padding: "8px 12px" }}>
                  <CeldaEdit valor={r.pais} onChange={v => actualizarCelda(r.id, "pais", v)} opciones={paises} puedeEditar={puedeEditar} />
                </td>
                <td style={{ padding: "8px 12px", textAlign: "center" }}>
                  <CeldaEdit valor={r.año} onChange={v => actualizarCelda(r.id, "año", parseInt(v))} tipo="number" puedeEditar={puedeEditar} />
                </td>
                <td style={{ padding: "8px 12px", textAlign: "center" }}>
                  <CeldaEdit valor={r.trim} onChange={v => actualizarCelda(r.id, "trim", parseInt(v))} tipo="number" puedeEditar={puedeEditar} />
                </td>
                <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>
                  <CeldaEdit valor={r.nPlantas} onChange={v => actualizarCelda(r.id, "nPlantas", parseFloat(v))} tipo="number" puedeEditar={puedeEditar} />
                </td>
                <td style={{ padding: "8px 12px", textAlign: "center" }}>
                  <CeldaEdit valor={r.usdPlanta} onChange={v => actualizarCelda(r.id, "usdPlanta", parseFloat(v))} tipo="number" puedeEditar={puedeEditar} />
                </td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: COLOR.azul }}>
                  <CeldaEdit valor={r.montoFacturar} onChange={v => actualizarCelda(r.id, "montoFacturar", parseFloat(v))} tipo="number" puedeEditar={puedeEditar} />
                </td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: COLOR.verde }}>
                  <CeldaEdit valor={r.montoCobrar} onChange={v => actualizarCelda(r.id, "montoCobrar", parseFloat(v))} tipo="number" puedeEditar={puedeEditar} />
                </td>
                <td style={{ padding: "8px 12px", textAlign: "center" }}>
                  {puedeEditar ? (
                    <select value={r.estatus} onChange={e => actualizarCelda(r.id, "estatus", e.target.value)}
                      style={{ borderRadius: 6, border: "1px solid #d1d5db", padding: "3px 6px", fontSize: 11, cursor: "pointer", background: "#fff" }}>
                      {estatuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : <EstatusBadge valor={r.estatus} />}
                </td>
                <td style={{ padding: "8px 12px", textAlign: "center", fontSize: 11, color: COLOR.gris }}>
                  <CeldaEdit valor={r.fechaPago} onChange={v => actualizarCelda(r.id, "fechaPago", v)} tipo="date" puedeEditar={puedeEditar} />
                </td>
                <td style={{ padding: "8px 12px", fontSize: 11, color: COLOR.gris }}>
                  <CeldaEdit valor={r.vivero} onChange={v => actualizarCelda(r.id, "vivero", v)} opciones={viveros} puedeEditar={puedeEditar} />
                </td>
              </tr>
            ))}
            {filtrado.length === 0 && (
              <tr><td colSpan={11} style={{ textAlign: "center", padding: 32, color: COLOR.gris, fontSize: 13 }}>Sin registros</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal nuevo */}
      {modalNuevo && (
        <div style={{ position: "fixed", inset: 0, background: "#0006", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 480, maxWidth: "92vw", boxShadow: "0 8px 32px #0003", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 16px", color: COLOR.slate }}>Nuevo Royalty por Planta</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                ["Cliente *", "cliente", "text"], ["País", "pais", "select-pais"],
                ["Año", "año", "number"], ["Trimestre", "trim", "number"],
                ["N° Plantas", "nPlantas", "number"], ["US$/Planta", "usdPlanta", "number"],
                ["Monto a Facturar", "montoFacturar", "number"], ["Monto a Cobrar", "montoCobrar", "number"],
                ["Fecha pago est.", "fechaPago", "date"], ["Vivero", "vivero", "select-vivero"],
              ].map(([lbl, campo, tipo]) => (
                <div key={campo}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>{lbl}</label>
                  {tipo === "select-pais" ? (
                    <select value={form[campo]} onChange={e => setForm(p => ({ ...p, [campo]: e.target.value }))}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, boxSizing: "border-box" }}>
                      {paises.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : tipo === "select-vivero" ? (
                    <select value={form[campo]} onChange={e => setForm(p => ({ ...p, [campo]: e.target.value }))}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, boxSizing: "border-box" }}>
                      {viveros.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={tipo} value={form[campo]} onChange={e => setForm(p => ({ ...p, [campo]: e.target.value }))}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, boxSizing: "border-box" }} />
                  )}
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Estatus</label>
                <select value={form.estatus} onChange={e => setForm(p => ({ ...p, estatus: e.target.value }))}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, boxSizing: "border-box" }}>
                  {estatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setModalNuevo(false)} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
              <button onClick={agregarFila} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: COLOR.azul, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-tab: Fee Entrada ───────────────────────────────────
function FeeEntrada({ data, setData, puedeEditar }) {
  const [modalNuevo, setModalNuevo] = useState(false);
  const [form, setForm] = useState({ cliente: "", pais: "Peru", estatus: "Pendiente", fechaPago: "", montoUSD: 30000, detalle: "Sin Devolución" });

  const totalCobrado = data.filter(r => r.estatus === "Pagado").reduce((s, r) => s + (r.montoUSD || 0), 0);
  const totalPendiente = data.filter(r => r.estatus !== "Pagado" && r.estatus !== "Cancelado").reduce((s, r) => s + (r.montoUSD || 0), 0);

  function actualizar(id, campo, valor) {
    setData(prev => prev.map(r => r.id === id ? { ...r, [campo]: valor } : r));
  }

  function agregar() {
    if (!form.cliente.trim()) { alert("Cliente es obligatorio."); return; }
    setData(prev => [...prev, { ...form, id: `fe_${Date.now()}`, montoUSD: parseFloat(form.montoUSD) || 30000 }]);
    setModalNuevo(false);
  }

  const estatuses = ["Pendiente", "Facturado", "Pagado", "Cancelado"];
  const paises = ["Peru", "Mexico", "Chile", "Corea"];

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          ["Cobrado", totalCobrado, COLOR.verde, COLOR.verdeBg],
          ["Por cobrar", totalPendiente, COLOR.amarillo, COLOR.amarilloBg],
          ["Total registros", data.length, COLOR.gris, COLOR.grisBg],
        ].map(([lbl, val, c, bg]) => (
          <div key={lbl} style={{ background: bg, borderRadius: 12, padding: "12px 18px", flex: 1, minWidth: 130 }}>
            <div style={{ fontSize: 11, color: c, fontWeight: 600 }}>{lbl}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: c }}>{typeof val === "number" && lbl !== "Total registros" ? USD_FMT(val) : val}</div>
          </div>
        ))}
        {puedeEditar && (
          <button onClick={() => setModalNuevo(true)}
            style={{ background: COLOR.azul, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 12, fontWeight: 700, alignSelf: "center" }}>
            + Agregar
          </button>
        )}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", background: "#fff", borderRadius: 10, overflow: "hidden" }}>
          <HeaderTabla cols={[
            { label: "Cliente", minW: 130 },
            { label: "País", minW: 80 },
            { label: "Estatus", center: true, minW: 120 },
            { label: "Fecha pago", center: true, minW: 100 },
            { label: "Monto US$", center: true, minW: 100 },
            { label: "Detalle", minW: 140 },
          ]} />
          <tbody>
            {data.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                <td style={{ padding: "8px 12px" }}><CeldaEdit valor={r.cliente} onChange={v => actualizar(r.id, "cliente", v)} puedeEditar={puedeEditar} /></td>
                <td style={{ padding: "8px 12px" }}><CeldaEdit valor={r.pais} onChange={v => actualizar(r.id, "pais", v)} opciones={paises} puedeEditar={puedeEditar} /></td>
                <td style={{ padding: "8px 12px", textAlign: "center" }}>
                  {puedeEditar ? (
                    <select value={r.estatus} onChange={e => actualizar(r.id, "estatus", e.target.value)}
                      style={{ borderRadius: 6, border: "1px solid #d1d5db", padding: "3px 6px", fontSize: 11, cursor: "pointer" }}>
                      {estatuses.map(s => <option key={s}>{s}</option>)}
                    </select>
                  ) : <EstatusBadge valor={r.estatus} />}
                </td>
                <td style={{ padding: "8px 12px", textAlign: "center", fontSize: 11, color: COLOR.gris }}>
                  <CeldaEdit valor={r.fechaPago} onChange={v => actualizar(r.id, "fechaPago", v)} tipo="date" puedeEditar={puedeEditar} />
                </td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: COLOR.verde }}>
                  <CeldaEdit valor={r.montoUSD} onChange={v => actualizar(r.id, "montoUSD", parseFloat(v))} tipo="number" puedeEditar={puedeEditar} />
                </td>
                <td style={{ padding: "8px 12px", fontSize: 11, color: COLOR.gris }}>
                  <CeldaEdit valor={r.detalle} onChange={v => actualizar(r.id, "detalle", v)} puedeEditar={puedeEditar} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalNuevo && (
        <div style={{ position: "fixed", inset: 0, background: "#0006", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 400, maxWidth: "92vw", boxShadow: "0 8px 32px #0003" }}>
            <h3 style={{ margin: "0 0 16px", color: COLOR.slate }}>Nuevo Fee de Entrada</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["Cliente *", "cliente", "text"], ["Fecha pago est.", "fechaPago", "date"], ["Detalle", "detalle", "text"]].map(([lbl, campo, tipo]) => (
                <div key={campo}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>{lbl}</label>
                  <input type={tipo} value={form[campo]} onChange={e => setForm(p => ({ ...p, [campo]: e.target.value }))}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>País</label>
                  <select value={form.pais} onChange={e => setForm(p => ({ ...p, pais: e.target.value }))}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, boxSizing: "border-box" }}>
                    {paises.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Monto US$</label>
                  <input type="number" value={form.montoUSD} onChange={e => setForm(p => ({ ...p, montoUSD: e.target.value }))}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, boxSizing: "border-box" }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Estatus</label>
                <select value={form.estatus} onChange={e => setForm(p => ({ ...p, estatus: e.target.value }))}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, boxSizing: "border-box" }}>
                  {estatuses.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setModalNuevo(false)} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
              <button onClick={agregar} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: COLOR.azul, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-tab: Royalty Comercial ────────────────────────────
function RoyaltyComercial({ data, setData, puedeEditar }) {
  const [filtroAño, setFiltroAño] = useState("Todos");
  const [modalNuevo, setModalNuevo] = useState(false);
  const [form, setForm] = useState({ cliente: "", pais: "Peru", trim: 2, año: 2026, montoUSD: "", estatus: "Pendiente" });

  const años = ["Todos", ...Array.from(new Set(data.map(r => r.año))).sort()];
  const filtrado = data.filter(r => filtroAño === "Todos" || r.año === Number(filtroAño));
  const estatuses = ["Pendiente", "Facturado", "Pagado", "Cancelado"];
  const paises = ["Peru", "Mexico", "Chile"];

  const byCliente = {};
  filtrado.forEach(r => {
    if (!byCliente[r.cliente]) byCliente[r.cliente] = { cliente: r.cliente, pais: r.pais, filas: [] };
    byCliente[r.cliente].filas.push(r);
  });

  const totalFiltrado = filtrado.reduce((s, r) => s + (Number(r.montoUSD) || 0), 0);
  const totalFacturado = filtrado.filter(r => r.estatus === "Facturado" || r.estatus === "Pagado").reduce((s, r) => s + (Number(r.montoUSD) || 0), 0);

  function actualizar(id, campo, valor) {
    setData(prev => prev.map(r => r.id === id ? { ...r, [campo]: valor } : r));
  }

  function agregar() {
    if (!form.cliente.trim() || !form.montoUSD) { alert("Cliente y monto son obligatorios."); return; }
    setData(prev => [...prev, { ...form, id: `rc_${Date.now()}`, montoUSD: parseFloat(form.montoUSD), año: parseInt(form.año), trim: parseInt(form.trim) }]);
    setModalNuevo(false);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          ["Total proyectado", totalFiltrado, COLOR.morado, COLOR.moradoBg],
          ["Facturado/Pagado", totalFacturado, COLOR.verde, COLOR.verdeBg],
          ["Registros", filtrado.length, COLOR.gris, COLOR.grisBg],
        ].map(([lbl, val, c, bg]) => (
          <div key={lbl} style={{ background: bg, borderRadius: 12, padding: "12px 18px", flex: 1, minWidth: 130 }}>
            <div style={{ fontSize: 11, color: c, fontWeight: 600 }}>{lbl}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: c }}>{lbl === "Registros" ? val : USD_FMT(val)}</div>
          </div>
        ))}
        {puedeEditar && (
          <button onClick={() => setModalNuevo(true)}
            style={{ background: COLOR.azul, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 12, fontWeight: 700, alignSelf: "center" }}>
            + Agregar
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: COLOR.gris, fontWeight: 600 }}>Año:</span>
        {años.map(a => (
          <button key={a} onClick={() => setFiltroAño(String(a))}
            style={{ padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
              background: filtroAño === String(a) ? COLOR.morado : "#fff", color: filtroAño === String(a) ? "#fff" : COLOR.slate }}>
            {a}
          </button>
        ))}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", background: "#fff", borderRadius: 10, overflow: "hidden" }}>
          <HeaderTabla cols={[
            { label: "Cliente", minW: 130 },
            { label: "País", minW: 80 },
            { label: "Trim.", center: true, minW: 60 },
            { label: "Año", center: true, minW: 60 },
            { label: "Monto US$", center: true, minW: 130 },
            { label: "Estatus", center: true, minW: 120 },
          ]} />
          <tbody>
            {filtrado.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                <td style={{ padding: "8px 12px", fontWeight: 600 }}>{r.cliente}</td>
                <td style={{ padding: "8px 12px", fontSize: 12, color: COLOR.gris }}>{r.pais}</td>
                <td style={{ padding: "8px 12px", textAlign: "center", fontSize: 12 }}>T{r.trim}</td>
                <td style={{ padding: "8px 12px", textAlign: "center", fontSize: 12 }}>{r.año}</td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: COLOR.morado }}>
                  <CeldaEdit valor={r.montoUSD} onChange={v => actualizar(r.id, "montoUSD", parseFloat(v))} tipo="number" puedeEditar={puedeEditar} />
                </td>
                <td style={{ padding: "8px 12px", textAlign: "center" }}>
                  {puedeEditar ? (
                    <select value={r.estatus} onChange={e => actualizar(r.id, "estatus", e.target.value)}
                      style={{ borderRadius: 6, border: "1px solid #d1d5db", padding: "3px 6px", fontSize: 11, cursor: "pointer" }}>
                      {estatuses.map(s => <option key={s}>{s}</option>)}
                    </select>
                  ) : <EstatusBadge valor={r.estatus} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalNuevo && (
        <div style={{ position: "fixed", inset: 0, background: "#0006", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 400, maxWidth: "92vw", boxShadow: "0 8px 32px #0003" }}>
            <h3 style={{ margin: "0 0 16px", color: COLOR.slate }}>Nuevo Royalty Comercial</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["Cliente *", "cliente", "text", null], ["País", "pais", "select", paises],
                ["Trimestre", "trim", "number", null], ["Año", "año", "number", null],
                ["Monto US$", "montoUSD", "number", null]].map(([lbl, campo, tipo, opts]) => (
                <div key={campo}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>{lbl}</label>
                  {opts ? (
                    <select value={form[campo]} onChange={e => setForm(p => ({ ...p, [campo]: e.target.value }))}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, boxSizing: "border-box" }}>
                      {opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={tipo} value={form[campo]} onChange={e => setForm(p => ({ ...p, [campo]: e.target.value }))}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, boxSizing: "border-box" }} />
                  )}
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Estatus</label>
                <select value={form.estatus} onChange={e => setForm(p => ({ ...p, estatus: e.target.value }))}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, boxSizing: "border-box" }}>
                  {estatuses.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setModalNuevo(false)} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}>Cancelar</button>
              <button onClick={agregar} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: COLOR.azul, color: "#fff", cursor: "pointer", fontWeight: 600 }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-tab: Fee Viveros ──────────────────────────────────
function FeeViveros({ data, setData, puedeEditar }) {
  const [filtroEst, setFiltroEst] = useState("Todos");
  const [modalNuevo, setModalNuevo] = useState(false);
  const [form, setForm] = useState({ vivero: "Synergiabio", empresa: "", pais: "Peru", proforma: "", nPlantas: "", regalia: 0.45, totalOsiris: "", tipoPago: "Entrega", montoFacturar: "", fechaFacturar: "", estatus: "Pendiente" });
  const estatuses = ["Todos", "Facturado", "Pendiente", "Pagado", "Cancelado"];
  const viveros = ["Synergiabio", "Agromillora"];
  const paises = ["Peru", "Mexico", "Chile", "Corea", "España"];
  const tipos = ["Anticipo", "Entrega", "Anticipo/Entrega"];

  const filtrado = data.filter(r => filtroEst === "Todos" || r.estatus === filtroEst);
  const totalFacturar = filtrado.reduce((s, r) => s + (Number(r.montoFacturar) || 0), 0);
  const totalPend = filtrado.filter(r => r.estatus === "Pendiente" || r.estatus === "Facturado").reduce((s, r) => s + (Number(r.montoFacturar) || 0), 0);

  function actualizar(id, campo, valor) {
    setData(prev => prev.map(r => r.id === id ? { ...r, [campo]: valor } : r));
  }

  function agregar() {
    if (!form.empresa.trim()) { alert("Empresa es obligatoria."); return; }
    setData(prev => [...prev, {
      ...form, id: `fv_${Date.now()}`,
      nPlantas: parseFloat(form.nPlantas) || 0,
      regalia: parseFloat(form.regalia) || 0,
      totalOsiris: parseFloat(form.totalOsiris) || 0,
      montoFacturar: parseFloat(form.montoFacturar) || 0,
    }]);
    setModalNuevo(false);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          ["Total a Facturar", totalFacturar, COLOR.azul, COLOR.azulBg],
          ["Pendiente/Facturado", totalPend, COLOR.amarillo, COLOR.amarilloBg],
          ["Registros", filtrado.length, COLOR.gris, COLOR.grisBg],
        ].map(([lbl, val, c, bg]) => (
          <div key={lbl} style={{ background: bg, borderRadius: 12, padding: "12px 18px", flex: 1, minWidth: 130 }}>
            <div style={{ fontSize: 11, color: c, fontWeight: 600 }}>{lbl}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: c }}>{lbl === "Registros" ? val : USD_FMT(val)}</div>
          </div>
        ))}
        {puedeEditar && (
          <button onClick={() => setModalNuevo(true)}
            style={{ background: COLOR.azul, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 12, fontWeight: 700, alignSelf: "center" }}>
            + Agregar
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {estatuses.map(e => (
          <button key={e} onClick={() => setFiltroEst(e)}
            style={{ padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
              background: filtroEst === e ? COLOR.azul : "#fff", color: filtroEst === e ? "#fff" : COLOR.slate }}>
            {e}
          </button>
        ))}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", background: "#fff", borderRadius: 10, overflow: "hidden" }}>
          <HeaderTabla cols={[
            { label: "Vivero", minW: 100 },
            { label: "Empresa", minW: 150 },
            { label: "País", minW: 70 },
            { label: "Proforma", minW: 130 },
            { label: "N° Plantas", center: true, minW: 90 },
            { label: "Regalía", center: true, minW: 70 },
            { label: "Total Osiris", center: true, minW: 110 },
            { label: "Tipo Pago", center: true, minW: 90 },
            { label: "Monto a Facturar", center: true, minW: 130 },
            { label: "Fecha Facturar", center: true, minW: 110 },
            { label: "Estatus", center: true, minW: 100 },
          ]} />
          <tbody>
            {filtrado.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                <td style={{ padding: "8px 12px", fontSize: 11 }}>
                  <CeldaEdit valor={r.vivero} onChange={v => actualizar(r.id, "vivero", v)} opciones={viveros} puedeEditar={puedeEditar} />
                </td>
                <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                  <CeldaEdit valor={r.empresa} onChange={v => actualizar(r.id, "empresa", v)} puedeEditar={puedeEditar} />
                </td>
                <td style={{ padding: "8px 12px", fontSize: 11, color: COLOR.gris }}>{r.pais}</td>
                <td style={{ padding: "8px 12px", fontSize: 11, color: COLOR.gris }}>
                  <CeldaEdit valor={r.proforma} onChange={v => actualizar(r.id, "proforma", v)} puedeEditar={puedeEditar} />
                </td>
                <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>{NUM_FMT(r.nPlantas)}</td>
                <td style={{ padding: "8px 12px", textAlign: "center", fontSize: 11 }}>{r.regalia ? `${(r.regalia * 100).toFixed(0)}%` : "—"}</td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontSize: 12, color: COLOR.gris }}>{USD_FMT(r.totalOsiris)}</td>
                <td style={{ padding: "8px 12px", textAlign: "center", fontSize: 11 }}>
                  <CeldaEdit valor={r.tipoPago} onChange={v => actualizar(r.id, "tipoPago", v)} opciones={tipos} puedeEditar={puedeEditar} />
                </td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: COLOR.azul }}>
                  <CeldaEdit valor={r.montoFacturar} onChange={v => actualizar(r.id, "montoFacturar", parseFloat(v))} tipo="number" puedeEditar={puedeEditar} />
                </td>
                <td style={{ padding: "8px 12px", textAlign: "center", fontSize: 11, color: COLOR.gris }}>
                  <CeldaEdit valor={r.fechaFacturar} onChange={v => actualizar(r.id, "fechaFacturar", v)} tipo="date" puedeEditar={puedeEditar} />
                </td>
                <td style={{ padding: "8px 12px", textAlign: "center" }}>
                  {puedeEditar ? (
                    <select value={r.estatus} onChange={e => actualizar(r.id, "estatus", e.target.value)}
                      style={{ borderRadius: 6, border: "1px solid #d1d5db", padding: "3px 6px", fontSize: 11 }}>
                      {["Pendiente", "Facturado", "Pagado", "Cancelado"].map(s => <option key={s}>{s}</option>)}
                    </select>
                  ) : <EstatusBadge valor={r.estatus} />}
                </td>
              </tr>
            ))}
            {filtrado.length === 0 && (
              <tr><td colSpan={11} style={{ textAlign: "center", padding: 32, color: COLOR.gris }}>Sin registros</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalNuevo && (
        <div style={{ position: "fixed", inset: 0, background: "#0006", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 480, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px #0003" }}>
            <h3 style={{ margin: "0 0 16px", color: COLOR.slate }}>Nuevo Fee Vivero</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                ["Vivero", "vivero", "select", viveros],
                ["País", "pais", "select", paises],
                ["Empresa *", "empresa", "text", null],
                ["Proforma", "proforma", "text", null],
                ["N° Plantas", "nPlantas", "number", null],
                ["Regalía (dec.)", "regalia", "number", null],
                ["Total Osiris US$", "totalOsiris", "number", null],
                ["Tipo Pago", "tipoPago", "select", tipos],
                ["Monto a Facturar", "montoFacturar", "number", null],
                ["Fecha Facturar", "fechaFacturar", "date", null],
              ].map(([lbl, campo, tipo, opts]) => (
                <div key={campo}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>{lbl}</label>
                  {opts ? (
                    <select value={form[campo]} onChange={e => setForm(p => ({ ...p, [campo]: e.target.value }))}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, boxSizing: "border-box" }}>
                      {opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={tipo} value={form[campo]} onChange={e => setForm(p => ({ ...p, [campo]: e.target.value }))}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, boxSizing: "border-box" }} />
                  )}
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Estatus</label>
                <select value={form.estatus} onChange={e => setForm(p => ({ ...p, estatus: e.target.value }))}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, boxSizing: "border-box" }}>
                  {["Pendiente", "Facturado", "Pagado", "Cancelado"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setModalNuevo(false)} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}>Cancelar</button>
              <button onClick={agregar} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: COLOR.azul, color: "#fff", cursor: "pointer", fontWeight: 600 }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-tab: Resumen / Dashboard ──────────────────────────
function ResumenIngresos({ rpData, feData, rcData, fvData }) {
  const totalRP_pend = rpData.filter(r => r.estatus === "Pendiente" || r.estatus === "Facturado").reduce((s, r) => s + (Number(r.montoCobrar) || 0), 0);
  const totalRP_pago = rpData.filter(r => r.estatus === "Pagado").reduce((s, r) => s + (Number(r.montoCobrar) || 0), 0);
  const totalFE = feData.filter(r => r.estatus !== "Cancelado").reduce((s, r) => s + (Number(r.montoUSD) || 0), 0);
  const totalFE_pend = feData.filter(r => r.estatus === "Pendiente" || r.estatus === "Facturado").reduce((s, r) => s + (Number(r.montoUSD) || 0), 0);
  const totalRC_2026 = rcData.filter(r => r.año === 2026).reduce((s, r) => s + (Number(r.montoUSD) || 0), 0);
  const totalRC_2027 = rcData.filter(r => r.año === 2027).reduce((s, r) => s + (Number(r.montoUSD) || 0), 0);
  const totalFV_pend = fvData.filter(r => r.estatus === "Pendiente" || r.estatus === "Facturado").reduce((s, r) => s + (Number(r.montoFacturar) || 0), 0);
  const totalFV_pago = fvData.filter(r => r.estatus === "Pagado").reduce((s, r) => s + (Number(r.montoFacturar) || 0), 0);

  // Por vencer próximos 60 días
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const proximos = rpData.filter(r => {
    if (!r.fechaPago || (r.estatus !== "Pendiente" && r.estatus !== "Facturado")) return false;
    const f = new Date(r.fechaPago);
    const diff = (f - hoy) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 60;
  }).sort((a, b) => new Date(a.fechaPago) - new Date(b.fechaPago));

  // Resumen por cliente (royalty planta pendiente)
  const porCliente = {};
  rpData.filter(r => r.estatus === "Pendiente" || r.estatus === "Facturado").forEach(r => {
    if (!porCliente[r.cliente]) porCliente[r.cliente] = 0;
    porCliente[r.cliente] += Number(r.montoCobrar) || 0;
  });
  const clientesOrden = Object.entries(porCliente).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxVal = clientesOrden[0]?.[1] || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* KPIs principales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {[
          ["Royalty/Planta cobrado", totalRP_pago, "#22c55e", "#dcfce7", "✅"],
          ["Royalty/Planta pendiente", totalRP_pend, COLOR.amarillo, COLOR.amarilloBg, "⏳"],
          ["Fee Entrada total", totalFE, COLOR.azul, COLOR.azulBg, "📄"],
          ["Fee Entrada pendiente", totalFE_pend, COLOR.rojo, COLOR.rojoBg, "⚠️"],
          ["Royalty Comercial 2026", totalRC_2026, COLOR.morado, COLOR.moradoBg, "📊"],
          ["Royalty Comercial 2027", totalRC_2027, "#64748b", "#f1f5f9", "📈"],
          ["Fee Viveros cobrado", totalFV_pago, "#22c55e", "#dcfce7", "🌱"],
          ["Fee Viveros pendiente", totalFV_pend, COLOR.amarillo, COLOR.amarilloBg, "🌿"],
        ].map(([lbl, val, c, bg, ico]) => (
          <div key={lbl} style={{ background: bg, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: c, fontWeight: 600, marginBottom: 2 }}>{ico} {lbl}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{USD_FMT(val)}</div>
          </div>
        ))}
      </div>

      {/* Top clientes pendientes */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 20 }}>
        <h4 style={{ margin: "0 0 14px", color: COLOR.slate, fontSize: 14 }}>📊 Royalty/Planta pendiente por cliente</h4>
        {clientesOrden.map(([cliente, monto]) => (
          <div key={cliente} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: COLOR.slate }}>{cliente}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: COLOR.azul }}>{USD_FMT(monto)}</span>
            </div>
            <div style={{ background: "#f1f5f9", borderRadius: 6, height: 8 }}>
              <div style={{ background: COLOR.azul, borderRadius: 6, height: 8, width: `${(monto / maxVal) * 100}%`, transition: "width 0.5s" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Próximos vencimientos */}
      {proximos.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 14, padding: 20 }}>
          <h4 style={{ margin: "0 0 14px", color: COLOR.slate, fontSize: 14 }}>🗓️ Próximos cobros (60 días) — Royalty/Planta</h4>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc", color: COLOR.gris, fontSize: 11 }}>
                  {["Cliente", "País", "Vivero", "Fecha est.", "Monto", "Estatus"].map(h => (
                    <th key={h} style={{ padding: "7px 12px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {proximos.map((r, i) => {
                  const f = new Date(r.fechaPago);
                  const diff = Math.ceil((f - hoy) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={r.id} style={{ borderTop: "1px solid #f1f5f9", background: diff <= 7 ? "#fffbeb" : "#fff" }}>
                      <td style={{ padding: "7px 12px", fontWeight: 600 }}>{r.cliente}</td>
                      <td style={{ padding: "7px 12px", color: COLOR.gris }}>{r.pais}</td>
                      <td style={{ padding: "7px 12px", color: COLOR.gris, fontSize: 11 }}>{r.vivero}</td>
                      <td style={{ padding: "7px 12px" }}>
                        <span style={{ fontWeight: 600, color: diff <= 7 ? COLOR.rojo : COLOR.amarillo }}>
                          {r.fechaPago} {diff === 0 ? "HOY" : diff <= 7 ? `(${diff}d)` : ""}
                        </span>
                      </td>
                      <td style={{ padding: "7px 12px", fontWeight: 700, color: COLOR.verde }}>{USD_FMT(r.montoCobrar)}</td>
                      <td style={{ padding: "7px 12px" }}><EstatusBadge valor={r.estatus} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente principal exportado ────────────────────────
export default function OsirisModule({ usuarioActual, esAdmin, esSoloConsulta, osirisData, setOsirisData }) {
  const [subTab, setSubTab] = useState("resumen");

  // Inicializar datos si no existen aún
  const rpData = osirisData?.royaltyPlanta ?? ROYALTY_PLANTA_INIT;
  const feData = osirisData?.feeEntrada ?? FEE_ENTRADA_INIT;
  const rcData = osirisData?.royaltyComercial ?? ROYALTY_COMERCIAL_INIT;
  const fvData = osirisData?.feeViveros ?? FEE_VIVEROS_INIT;

  const setRp = useCallback(fn => setOsirisData(prev => ({ ...prev, royaltyPlanta: typeof fn === "function" ? fn(prev?.royaltyPlanta ?? ROYALTY_PLANTA_INIT) : fn })), [setOsirisData]);
  const setFe = useCallback(fn => setOsirisData(prev => ({ ...prev, feeEntrada: typeof fn === "function" ? fn(prev?.feeEntrada ?? FEE_ENTRADA_INIT) : fn })), [setOsirisData]);
  const setRc = useCallback(fn => setOsirisData(prev => ({ ...prev, royaltyComercial: typeof fn === "function" ? fn(prev?.royaltyComercial ?? ROYALTY_COMERCIAL_INIT) : fn })), [setOsirisData]);
  const setFv = useCallback(fn => setOsirisData(prev => ({ ...prev, feeViveros: typeof fn === "function" ? fn(prev?.feeViveros ?? FEE_VIVEROS_INIT) : fn })), [setOsirisData]);

  // Solo admin puede editar
  const puedeEditar = esAdmin(usuarioActual?.nombre || "");

  const SUBTABS = [
    { id: "resumen", label: "📊 Resumen" },
    { id: "royaltyPlanta", label: "🌿 Royalty/Planta" },
    { id: "feeEntrada", label: "📄 Fee Entrada" },
    { id: "royaltyComercial", label: "📈 Royalty Comercial" },
    { id: "feeViveros", label: "🌱 Fee Viveros" },
  ];

  // KPI rápido para el header
  const totalPendienteGlobal =
    rpData.filter(r => r.estatus === "Pendiente" || r.estatus === "Facturado").reduce((s, r) => s + (Number(r.montoCobrar) || 0), 0) +
    feData.filter(r => r.estatus === "Pendiente" || r.estatus === "Facturado").reduce((s, r) => s + (Number(r.montoUSD) || 0), 0) +
    fvData.filter(r => r.estatus === "Pendiente" || r.estatus === "Facturado").reduce((s, r) => s + (Number(r.montoFacturar) || 0), 0);

  return (
    <div>
      {/* Header Osiris */}
      <div style={{
        background: "linear-gradient(135deg, #0f2d4a, #1a5276)",
        borderRadius: 14, padding: "16px 22px", marginBottom: 18, color: "#fff",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#2980b9", fontWeight: 700, fontSize: 20, letterSpacing: 3 }}>OSIRIS</span>
            <span style={{ color: "#7fb3d3", fontSize: 11, letterSpacing: 2, background: "rgba(255,255,255,0.1)", borderRadius: 6, padding: "2px 8px" }}>PLANT MANAGEMENT</span>
          </div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>Gestión de Ingresos y Cobros · Datos 2026+</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>Total pendiente de cobro</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fbbf24" }}>{USD_FMT(totalPendienteGlobal)}</div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {SUBTABS.map(({ id, label }) => (
          <button key={id} onClick={() => setSubTab(id)}
            style={{
              padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              fontWeight: 600, fontSize: 12,
              background: subTab === id ? "#0f2d4a" : "#fff",
              color: subTab === id ? "#fff" : COLOR.slate,
              boxShadow: subTab === id ? "0 2px 8px #0f2d4a44" : "0 1px 4px #0001"
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 2px 10px #0001" }}>
        {subTab === "resumen" && <ResumenIngresos rpData={rpData} feData={feData} rcData={rcData} fvData={fvData} />}
        {subTab === "royaltyPlanta" && <RoyaltyPlanta data={rpData} setData={setRp} puedeEditar={puedeEditar} />}
        {subTab === "feeEntrada" && <FeeEntrada data={feData} setData={setFe} puedeEditar={puedeEditar} />}
        {subTab === "royaltyComercial" && <RoyaltyComercial data={rcData} setData={setRc} puedeEditar={puedeEditar} />}
        {subTab === "feeViveros" && <FeeViveros data={fvData} setData={setFv} puedeEditar={puedeEditar} />}
      </div>
    </div>
  );
}
