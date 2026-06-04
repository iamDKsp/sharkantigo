"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LabelList,
} from "recharts";

interface MesProjecao {
  label: string;
  valor: number;
  year: number;
  month: number;
}

interface ProjecaoBarChartProps {
  data: MesProjecao[];
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: v >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 0,
  }).format(v);

const fmtFull = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

// Tooltip customizado
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 dark:bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 shadow-2xl">
        <p className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-1">{label}</p>
        <p className="text-sm font-black text-white">{fmtFull(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

// Label no topo das barras
const CustomLabel = ({ x, y, width, value, index }: any) => {
  if (!value || value === 0) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 8}
      textAnchor="middle"
      fontSize={9}
      fontWeight={800}
      fill={index === 0 ? "#10b981" : "#71717a"}
      letterSpacing="0.04em"
    >
      {fmt(value)}
    </text>
  );
};

export function ProjecaoBarChart({ data }: ProjecaoBarChartProps) {
  const maxVal = Math.max(...data.map((d) => d.valor), 1);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        margin={{ top: 24, right: 8, left: 0, bottom: 0 }}
        barCategoryGap="28%"
      >
        <defs>
          <linearGradient id="barGradientCurrent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
          </linearGradient>
          <linearGradient id="barGradientFuture" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4d4d8" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#a1a1aa" stopOpacity={0.5} />
          </linearGradient>
          <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#10b981" floodOpacity="0.25" />
          </filter>
        </defs>

        <CartesianGrid
          vertical={false}
          strokeDasharray="4 4"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth={1}
        />

        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fontWeight: 800, fill: "#71717a", letterSpacing: "0.06em" }}
          dy={8}
        />

        <YAxis
          tickFormatter={fmt}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 9, fontWeight: 700, fill: "#a1a1aa" }}
          width={64}
          tickCount={4}
        />

        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)", radius: 8 }} />

        <Bar
          dataKey="valor"
          radius={[8, 8, 0, 0]}
          maxBarSize={72}
        >
          <LabelList content={<CustomLabel />} />
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={index === 0 ? "url(#barGradientCurrent)" : "url(#barGradientFuture)"}
              filter={index === 0 ? "url(#barShadow)" : undefined}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
