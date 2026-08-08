"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface CarteiraPieChartProps {
  receberProprio: number;
  receberParceiros: number;
  totalRecebivel: number;
  pctProprio: number;
  pctParceiros: number;
}

const fmtFull = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xl">
        <p className="text-sm font-black uppercase tracking-widest text-slate-500 mb-1">
          {payload[0].name}
        </p>
        <p className="text-sm font-black text-slate-900">{fmtFull(payload[0].value)}</p>
        <p className="text-sm text-emerald-600 font-bold mt-0.5">
          {payload[0].payload.pct.toFixed(1)}% do total
        </p>
      </div>
    );
  }
  return null;
};

// Label customizado dentro do donut (centro)
const CenterLabel = ({ cx, cy, total }: { cx: number; cy: number; total: number }) => (
  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
    <tspan x={cx} dy="-10" fontSize="9" fontWeight={800} fill="#64748b" letterSpacing="0.08em">
      TOTAL
    </tspan>
    <tspan x={cx} dy="20" fontSize="13" fontWeight={900} fill="#0f172a">
      {new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(total)}
    </tspan>
  </text>
);

export function CarteiraPieChart({
  receberProprio,
  receberParceiros,
  totalRecebivel,
  pctProprio,
  pctParceiros,
}: CarteiraPieChartProps) {
  const data = [
    { name: "Capital Próprio", value: receberProprio, pct: pctProprio, color: "#06b6d4" },
    { name: "Parceiros", value: receberParceiros, pct: pctParceiros, color: "#8b5cf6" },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-36 text-zinc-400 text-sm font-bold">
        Sem dados
      </div>
    );
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={170}>
        <PieChart>
          <defs>
            <filter id="pieShadowCyan" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="6" floodColor="#06b6d4" floodOpacity="0.3" />
            </filter>
            <filter id="pieShadowViolet" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="6" floodColor="#8b5cf6" floodOpacity="0.3" />
            </filter>
          </defs>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={75}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
            startAngle={90}
            endAngle={-270}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                filter={entry.color === "#06b6d4" ? "url(#pieShadowCyan)" : "url(#pieShadowViolet)"}
                stroke="none"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Label central posicionado por cima */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Total</div>
          <div className="text-sm font-black text-zinc-900 leading-tight">
            {new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(totalRecebivel)}
          </div>
        </div>
      </div>
    </div>
  );
}
