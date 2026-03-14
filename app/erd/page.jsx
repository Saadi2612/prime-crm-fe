'use client';

import { useState, useRef, useEffect } from "react";

const TABLES = {
  users: {
    color: "#4F9EF8", x: 60, y: 80,
    columns: [
      { name: "id", type: "UUID", pk: true, notNull: true },
      { name: "email", type: "VARCHAR(255)", unique: true, notNull: true },
      { name: "wordpress_user_id", type: "INTEGER", unique: true },
      { name: "created_at", type: "TIMESTAMPTZ", notNull: true },
      { name: "updated_at", type: "TIMESTAMPTZ", notNull: true },
    ],
    indexes: ["PK: id", "UQ: email", "UQ: wordpress_user_id"],
  },
  merchants: {
    color: "#F4A535", x: 560, y: 60,
    columns: [
      { name: "id", type: "UUID", pk: true, notNull: true },
      { name: "name", type: "VARCHAR(255)", notNull: true },
      { name: "slug", type: "VARCHAR(100)", unique: true, notNull: true },
      { name: "affiliate_url", type: "TEXT", notNull: true },
      { name: "network", type: "VARCHAR(50)" },
      { name: "created_at", type: "TIMESTAMPTZ", notNull: true },
    ],
    indexes: ["PK: id", "UQ: slug"],
  },
  clicks: {
    color: "#A855F7", x: 60, y: 400,
    columns: [
      { name: "id", type: "UUID", pk: true, notNull: true },
      { name: "click_id", type: "UUID", unique: true, notNull: true },
      { name: "user_id", type: "UUID", notNull: true, fk: "users" },
      { name: "merchant_id", type: "UUID", notNull: true, fk: "merchants" },
      { name: "ip_address", type: "INET" },
      { name: "user_agent", type: "TEXT" },
      { name: "clicked_at", type: "TIMESTAMPTZ", notNull: true },
    ],
    indexes: ["PK: id", "UQ: click_id", "IDX: user_id", "IDX: merchant_id"],
  },
  transactions: {
    color: "#22C55E", x: 560, y: 330,
    columns: [
      { name: "id", type: "UUID", pk: true, notNull: true },
      { name: "idempotency_key", type: "VARCHAR(255)", unique: true, notNull: true },
      { name: "user_id", type: "UUID", notNull: true, fk: "users" },
      { name: "merchant_id", type: "UUID", notNull: true, fk: "merchants" },
      { name: "click_id", type: "UUID", fk: "clicks" },
      { name: "amount", type: "NUMERIC(12,2)", notNull: true },
      { name: "currency", type: "CHAR(3)", notNull: true },
      { name: "status", type: "ENUM", notNull: true },
      { name: "external_ref", type: "VARCHAR(255)" },
      { name: "transaction_date", type: "DATE", notNull: true },
      { name: "created_at", type: "TIMESTAMPTZ", notNull: true },
      { name: "updated_at", type: "TIMESTAMPTZ", notNull: true },
    ],
    indexes: ["PK: id", "UQ: idempotency_key", "IDX: user_id", "IDX: status"],
  },
  ledger_entries: {
    color: "#EF4444", x: 1060, y: 310,
    note: "Append-only. No UPDATE/DELETE.",
    columns: [
      { name: "id", type: "UUID", pk: true, notNull: true },
      { name: "idempotency_key", type: "VARCHAR(255)", unique: true, notNull: true },
      { name: "user_id", type: "UUID", notNull: true, fk: "users" },
      { name: "transaction_id", type: "UUID", fk: "transactions" },
      { name: "withdrawal_id", type: "UUID", fk: "withdrawals" },
      { name: "amount", type: "NUMERIC(12,2)", notNull: true },
      { name: "balance_type", type: "VARCHAR(20)", notNull: true },
      { name: "entry_type", type: "VARCHAR(10)", notNull: true },
      { name: "description", type: "TEXT" },
      { name: "created_at", type: "TIMESTAMPTZ", notNull: true },
    ],
    indexes: ["PK: id", "UQ: idempotency_key", "IDX: user_id", "IDX: transaction_id"],
  },
  balances: {
    color: "#06B6D4", x: 1060, y: 60,
    note: "Cache — must match ledger totals.",
    columns: [
      { name: "id", type: "UUID", pk: true, notNull: true },
      { name: "user_id", type: "UUID", unique: true, notNull: true, fk: "users" },
      { name: "pending_balance", type: "NUMERIC(12,2)", notNull: true },
      { name: "available_balance", type: "NUMERIC(12,2)", notNull: true },
      { name: "updated_at", type: "TIMESTAMPTZ", notNull: true },
    ],
    indexes: ["PK: id", "UQ: user_id"],
  },
  withdrawals: {
    color: "#F97316", x: 560, y: 700,
    columns: [
      { name: "id", type: "UUID", pk: true, notNull: true },
      { name: "idempotency_key", type: "VARCHAR(255)", unique: true, notNull: true },
      { name: "user_id", type: "UUID", notNull: true, fk: "users" },
      { name: "amount", type: "NUMERIC(12,2)", notNull: true },
      { name: "status", type: "ENUM", notNull: true },
      { name: "paypal_email", type: "VARCHAR(255)" },
      { name: "paypal_txn_id", type: "VARCHAR(255)" },
      { name: "requested_at", type: "TIMESTAMPTZ", notNull: true },
      { name: "processed_at", type: "TIMESTAMPTZ" },
    ],
    indexes: ["PK: id", "UQ: idempotency_key", "IDX: user_id", "IDX: status"],
  },
  audit_log: {
    color: "#64748B", x: 1060, y: 660,
    columns: [
      { name: "id", type: "UUID", pk: true, notNull: true },
      { name: "user_id", type: "UUID", fk: "users" },
      { name: "action", type: "VARCHAR(100)", notNull: true },
      { name: "entity_type", type: "VARCHAR(50)" },
      { name: "entity_id", type: "UUID" },
      { name: "old_values", type: "JSONB" },
      { name: "new_values", type: "JSONB" },
      { name: "ip_address", type: "INET" },
      { name: "created_at", type: "TIMESTAMPTZ", notNull: true },
    ],
    indexes: ["PK: id", "IDX: user_id", "IDX: entity_type+entity_id", "IDX: created_at"],
  },
};

const RELS = [
  { from: "clicks", fromCol: "user_id", to: "users", toCol: "id", card: "N:1" },
  { from: "clicks", fromCol: "merchant_id", to: "merchants", toCol: "id", card: "N:1" },
  { from: "transactions", fromCol: "user_id", to: "users", toCol: "id", card: "N:1" },
  { from: "transactions", fromCol: "merchant_id", to: "merchants", toCol: "id", card: "N:1" },
  { from: "transactions", fromCol: "click_id", to: "clicks", toCol: "click_id", card: "N:1" },
  { from: "ledger_entries", fromCol: "user_id", to: "users", toCol: "id", card: "N:1" },
  { from: "ledger_entries", fromCol: "transaction_id", to: "transactions", toCol: "id", card: "N:1" },
  { from: "ledger_entries", fromCol: "withdrawal_id", to: "withdrawals", toCol: "id", card: "N:1" },
  { from: "balances", fromCol: "user_id", to: "users", toCol: "id", card: "1:1" },
  { from: "withdrawals", fromCol: "user_id", to: "users", toCol: "id", card: "N:1" },
  { from: "audit_log", fromCol: "user_id", to: "users", toCol: "id", card: "N:1" },
];

const TW = 255;
const RH = 22;
const HH = 34;

function tableHeight(t) {
  return HH + t.columns.length * RH + (t.note ? 26 : 0) + 6;
}

function colY(tName, colName) {
  const t = TABLES[tName];
  const idx = t.columns.findIndex(c => c.name === colName);
  return t.y + HH + idx * RH + RH / 2;
}

function connectorX(tName, side) {
  return side === "right" ? TABLES[tName].x + TW : TABLES[tName].x;
}

function getSide(fromName, toName) {
  const fx = TABLES[fromName].x + TW / 2;
  const tx = TABLES[toName].x + TW / 2;
  return fx <= tx
    ? { fromSide: "right", toSide: "left" }
    : { fromSide: "left", toSide: "right" };
}

export default function ERD() {
  const [active, setActive] = useState(null);
  const [zoom, setZoom] = useState(0.68);
  const [pan, setPan] = useState({ x: 16, y: 16 });
  const dragRef = useRef(null);

  const onMouseDown = e => {
    if (e.button !== 0) return;
    dragRef.current = { sx: e.clientX - pan.x, sy: e.clientY - pan.y };
  };
  const onMouseMove = e => {
    if (!dragRef.current) return;
    setPan({ x: e.clientX - dragRef.current.sx, y: e.clientY - dragRef.current.sy });
  };
  const onMouseUp = () => { dragRef.current = null; };
  const onWheel = e => {
    e.preventDefault();
    setZoom(z => Math.max(0.25, Math.min(1.6, z + (e.deltaY < 0 ? 0.06 : -0.06))));
  };

  const activeRels = active ? RELS.filter(r => r.from === active || r.to === active) : [];

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0b0f18", display: "flex", flexDirection: "column", fontFamily: "'JetBrains Mono', 'Fira Code', monospace", overflow: "hidden" }}>
      {/* Topbar */}
      <div style={{ height: 52, background: "#0d1117", borderBottom: "1px solid #1c2333", display: "flex", alignItems: "center", padding: "0 20px", gap: 16, flexShrink: 0, zIndex: 20 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#4F9EF8 0%,#A855F7 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>◈</div>
        <div>
          <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em" }}>REWARDIO · Entity Relationship Diagram</div>
          <div style={{ color: "#3d4f6b", fontSize: 9, marginTop: 1 }}>Milestone 1 · 8 tables · Affiliate Rewards Platform</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          {[["−", () => setZoom(z => Math.max(0.25, z - 0.1))], ["+", () => setZoom(z => Math.min(1.6, z + 0.1))]].map(([label, fn]) => (
            <button key={label} onClick={fn} style={{ background: "#161c28", border: "1px solid #1c2333", color: "#64748b", borderRadius: 5, width: 28, height: 28, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{label}</button>
          ))}
          <span style={{ color: "#4F9EF8", fontSize: 11, minWidth: 38, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => { setZoom(0.68); setPan({ x: 16, y: 16 }); }} style={{ background: "#161c28", border: "1px solid #1c2333", color: "#64748b", borderRadius: 5, padding: "0 10px", height: 28, cursor: "pointer", fontSize: 10 }}>Reset</button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Canvas */}
        <div
          style={{ flex: 1, overflow: "hidden", cursor: dragRef.current ? "grabbing" : "grab", position: "relative" }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onWheel={onWheel}
        >
          <svg width="100%" height="100%" style={{ display: "block" }}>
            <defs>
              <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.8" fill="#1a2235" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {/* Relationship lines */}
              {RELS.map((rel, i) => {
                const { fromSide, toSide } = getSide(rel.from, rel.to);
                const x1 = connectorX(rel.from, fromSide);
                const y1 = colY(rel.from, rel.fromCol);
                const x2 = connectorX(rel.to, toSide);
                const y2 = colY(rel.to, rel.toCol);
                const mx = (x1 + x2) / 2;
                const isAct = active === rel.from || active === rel.to;
                const op = active ? (isAct ? 1 : 0.05) : 0.3;
                const col = isAct ? TABLES[rel.from].color : "#4a5568";
                return (
                  <g key={i} style={{ opacity: op, transition: "opacity 0.2s" }}>
                    <path d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                      fill="none" stroke={col} strokeWidth={isAct ? 2 : 1.2}
                      strokeDasharray={rel.card === "1:1" ? "6,3" : undefined} />
                    <circle cx={x1} cy={y1} r={3.5} fill={col} />
                    <circle cx={x2} cy={y2} r={3.5} fill={col} />
                  </g>
                );
              })}

              {/* Tables */}
              {Object.entries(TABLES).map(([name, t]) => {
                const h = tableHeight(t);
                const isAct = active === name;
                return (
                  <g key={name} transform={`translate(${t.x},${t.y})`}
                    onMouseEnter={() => setActive(name)} onMouseLeave={() => setActive(null)}
                    style={{ cursor: "default" }}>
                    {/* Drop shadow */}
                    <rect x={5} y={5} width={TW} height={h} rx={9} fill="rgba(0,0,0,0.4)" />
                    {/* Card */}
                    <rect x={0} y={0} width={TW} height={h} rx={9} fill="#111827"
                      stroke={isAct ? t.color : "#1e2d42"} strokeWidth={isAct ? 2 : 1} />
                    {/* Header bg */}
                    <rect x={0} y={0} width={TW} height={HH} rx={9} fill={t.color} />
                    <rect x={0} y={HH - 9} width={TW} height={9} fill={t.color} />
                    {/* Header text */}
                    <text x={TW / 2} y={HH / 2 + 1} textAnchor="middle" dominantBaseline="middle"
                      fill="#fff" fontSize={12} fontWeight="800" fontFamily="inherit" letterSpacing={0.8}>
                      {name}
                    </text>
                    {/* Columns */}
                    {t.columns.map((col, i) => (
                      <g key={col.name} transform={`translate(0,${HH + i * RH})`}>
                        <rect x={1} y={0} width={TW - 2} height={RH}
                          fill={i % 2 === 0 ? "rgba(255,255,255,0.025)" : "transparent"} />
                        {col.pk && <text x={9} y={RH / 2 + 1} dominantBaseline="middle" fill="#FFD700" fontSize={8} fontWeight="bold">PK</text>}
                        {col.fk && !col.pk && <text x={9} y={RH / 2 + 1} dominantBaseline="middle" fill={t.color} fontSize={8} fontWeight="bold">FK</text>}
                        <text x={col.pk || col.fk ? 28 : 10} y={RH / 2 + 1} dominantBaseline="middle"
                          fill={col.pk ? "#FFD700" : col.notNull ? "#cbd5e1" : "#4a5568"}
                          fontSize={10.5} fontFamily="inherit" fontWeight={col.pk ? "700" : "400"}>
                          {col.name}{col.unique ? " ᵁ" : ""}
                        </text>
                        <text x={TW - 8} y={RH / 2 + 1} dominantBaseline="middle" textAnchor="end"
                          fill="#2d3f58" fontSize={9} fontFamily="inherit">{col.type}</text>
                      </g>
                    ))}
                    {/* Note */}
                    {t.note && (
                      <text x={TW / 2} y={HH + t.columns.length * RH + 15}
                        textAnchor="middle" dominantBaseline="middle"
                        fill={t.color} fontSize={9} fontStyle="italic" fontFamily="inherit">
                        ⚡ {t.note}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Sidebar */}
        <div style={{ width: 252, background: "#0d1117", borderLeft: "1px solid #1c2333", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px" }}>
            {/* Tables list */}
            <div style={{ color: "#2d3f58", fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 8 }}>TABLES</div>
            {Object.entries(TABLES).map(([name, t]) => (
              <div key={name} onMouseEnter={() => setActive(name)} onMouseLeave={() => setActive(null)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 6, marginBottom: 2, cursor: "pointer", background: active === name ? "#161c28" : "transparent", transition: "background 0.15s" }}>
                <div style={{ width: 9, height: 9, borderRadius: 2, background: t.color, flexShrink: 0 }} />
                <span style={{ color: active === name ? "#e2e8f0" : "#4a5568", fontSize: 11, fontWeight: active === name ? 600 : 400, transition: "color 0.15s" }}>{name}</span>
                <span style={{ marginLeft: "auto", color: "#1e2d42", fontSize: 9 }}>{t.columns.length}c</span>
              </div>
            ))}

            {/* Legend */}
            <div style={{ borderTop: "1px solid #1c2333", marginTop: 14, paddingTop: 14 }}>
              <div style={{ color: "#2d3f58", fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 10 }}>LEGEND</div>
              {[["#FFD700", "Primary Key (PK)"], ["#4F9EF8", "Foreign Key (FK)"], ["#cbd5e1", "NOT NULL"], ["#4a5568", "Nullable"]].map(([c, l]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
                  <span style={{ color: "#3d4f6b", fontSize: 10 }}>{l}</span>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <svg width={26} height={8}><line x1={0} y1={4} x2={26} y2={4} stroke="#4a5568" strokeWidth={1.5} strokeDasharray="5,2" /></svg>
                <span style={{ color: "#3d4f6b", fontSize: 10 }}>1:1 relationship</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width={26} height={8}><line x1={0} y1={4} x2={26} y2={4} stroke="#4a5568" strokeWidth={1.5} /></svg>
                <span style={{ color: "#3d4f6b", fontSize: 10 }}>N:1 relationship</span>
              </div>
            </div>

            {/* Active detail */}
            {active && (
              <div style={{ borderTop: "1px solid #1c2333", marginTop: 14, paddingTop: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: TABLES[active].color }} />
                  <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 700 }}>{active}</span>
                </div>
                {TABLES[active].note && (
                  <div style={{ background: "#0f1520", border: `1px solid ${TABLES[active].color}33`, borderRadius: 6, padding: "6px 10px", marginBottom: 10, color: TABLES[active].color, fontSize: 9, fontStyle: "italic" }}>⚡ {TABLES[active].note}</div>
                )}
                <div style={{ color: "#2d3f58", fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 7 }}>INDEXES</div>
                {TABLES[active].indexes.map(idx => (
                  <div key={idx} style={{ color: "#3d4f6b", fontSize: 10, marginBottom: 4 }}>• {idx}</div>
                ))}
                {activeRels.length > 0 && <>
                  <div style={{ color: "#2d3f58", fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 7, marginTop: 10 }}>RELATIONSHIPS</div>
                  {activeRels.map((r, i) => (
                    <div key={i} style={{ fontSize: 9.5, color: "#4a5568", marginBottom: 5, padding: "4px 8px", background: "#111827", borderRadius: 4, borderLeft: `2px solid ${TABLES[r.from].color}` }}>
                      <span style={{ color: "#64748b" }}>{r.from}.{r.fromCol}</span>
                      <span style={{ color: "#4F9EF8" }}> → </span>
                      <span style={{ color: "#64748b" }}>{r.to}.{r.toCol}</span>
                      <span style={{ float: "right", color: TABLES[r.from].color, fontWeight: 700 }}>{r.card}</span>
                    </div>
                  ))}
                </>}
              </div>
            )}
          </div>
          <div style={{ padding: "10px 12px", borderTop: "1px solid #1c2333", color: "#1e2d42", fontSize: 9, textAlign: "center" }}>
            Scroll to zoom · Drag to pan · Hover to inspect
          </div>
        </div>
      </div>
    </div>
  );
}