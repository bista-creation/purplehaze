"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNPR } from "@/lib/money";

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid #e5e0ee",
  fontSize: 12,
  boxShadow: "0 16px 40px -24px rgba(26,16,37,.4)",
};

export function RevenueChart({
  data,
}: {
  data: Array<{ label: string; revenue: number; orders: number }>;
}) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="adminRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,.12)" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#8b8198" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "#8b8198" }}
            tickFormatter={(value: number) =>
              value >= 100000 ? `${Math.round(value / 100000)}k` : `${Math.round(value / 100)}`
            }
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value, name) => [
              name === "revenue" ? formatNPR(Number(value)) : Number(value),
              name === "revenue" ? "Paid revenue" : "Orders",
            ]}
            labelStyle={{ fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#5B21B6"
            strokeWidth={2.4}
            fill="url(#adminRevenue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const COLORS = ["#5B21B6", "#7C3AED", "#A78BFA", "#F5B942", "#E9A23B", "#10B981", "#EF4444"];

export function TopDishChart({
  data,
}: {
  data: Array<{ name: string; quantity: number }>;
}) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,.1)" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={120}
            tick={{ fontSize: 10, fill: "#8b8198" }}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => [`${Number(value)} sold`, "Quantity"]}
          />
          <Bar dataKey="quantity" radius={[0, 6, 6, 0]} barSize={16}>
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
