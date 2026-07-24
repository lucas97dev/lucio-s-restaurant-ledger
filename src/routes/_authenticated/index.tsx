import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { brl, paymentLabels } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Painel • Restaurante e Pizzaria do Lúcio" },
      { name: "description", content: "Visão geral financeira do restaurante: entradas, saídas e saldo por período." },
      { property: "og:title", content: "Painel • Restaurante e Pizzaria do Lúcio" },
      { property: "og:description", content: "Visão geral financeira do restaurante." },
    ],
  }),
});

type Range = "hoje" | "semana" | "30dias" | "mes" | "custom";

const ranges: { v: Range; label: string }[] = [
  { v: "hoje", label: "Hoje" },
  { v: "semana", label: "Última Semana" },
  { v: "30dias", label: "Últimos 30 Dias" },
  { v: "mes", label: "Este Mês" },
  { v: "custom", label: "Data Específica" },
];

function rangeDates(r: Range, custom?: string): [Date, Date] {
  const now = new Date();
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  if (r === "hoje") return [start, end];
  if (r === "semana") { const s = new Date(start); s.setDate(s.getDate() - 6); return [s, end]; }
  if (r === "30dias") { const s = new Date(start); s.setDate(s.getDate() - 29); return [s, end]; }
  if (r === "mes") { const s = new Date(now.getFullYear(), now.getMonth(), 1); return [s, end]; }
  if (r === "custom" && custom) {
    const d = new Date(custom + "T00:00:00");
    const e = new Date(custom + "T23:59:59");
    return [d, e];
  }
  return [start, end];
}

function Dashboard() {
  const [range, setRange] = useState<Range>("semana");
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [from, to] = useMemo(() => rangeDates(range, customDate), [range, customDate]);

  const { data: rows = [] } = useQuery({
    queryKey: ["transactions", "dashboard", from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .gte("occurred_at", from.toISOString())
        .lte("occurred_at", to.toISOString())
        .order("occurred_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const entradas = rows.filter((r) => r.type === "entrada").reduce((s, r) => s + Number(r.amount), 0);
  const saidas = rows.filter((r) => r.type === "saida").reduce((s, r) => s + Number(r.amount), 0);
  const valeAberto = rows.filter((r) => r.payment_method === "vale").reduce((s, r) => s + Number(r.vale_amount ?? 0), 0);
  const saldo = entradas - saidas;

  // Chart: daily buckets
  const daily = useMemo(() => {
    const map = new Map<string, { day: string; entradas: number; saidas: number }>();
    for (const r of rows) {
      const key = new Date(r.occurred_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const cur = map.get(key) ?? { day: key, entradas: 0, saidas: 0 };
      if (r.type === "entrada") cur.entradas += Number(r.amount);
      else cur.saidas += Number(r.amount);
      map.set(key, cur);
    }
    return Array.from(map.values());
  }, [rows]);

  const byPayment = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows.filter((r) => r.type === "entrada" && r.payment_method)) {
      map.set(r.payment_method!, (map.get(r.payment_method!) ?? 0) + Number(r.amount));
    }
    const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--warning)"];
    return Array.from(map.entries()).map(([k, v], i) => ({ name: paymentLabels[k] ?? k, value: v, fill: colors[i % colors.length] }));
  }, [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Painel</h1>
        <p className="text-muted-foreground">Visão geral do movimento financeiro</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {ranges.map((r) => (
          <button
            key={r.v}
            onClick={() => setRange(r.v)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors",
              range === r.v ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:border-primary/40",
            )}
          >
            {r.label}
          </button>
        ))}
        {range === "custom" && (
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-card border-2 border-border text-sm"
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi title="Saldo do Período" value={brl(saldo)} icon={<Wallet />} tone={saldo >= 0 ? "primary" : "danger"} />
        <Kpi title="Entradas" value={brl(entradas)} icon={<TrendingUp />} tone="success" />
        <Kpi title="Saídas" value={brl(saidas)} icon={<TrendingDown />} tone="danger" />
        <Kpi title="Vales em Aberto" value={brl(valeAberto)} icon={<AlertCircle />} tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-bold text-lg mb-4">Entradas vs Saídas</h3>
          <div className="h-72">
            {daily.length === 0 ? (
              <Empty msg="Sem lançamentos no período" />
            ) : (
              <ResponsiveContainer>
                <BarChart data={daily}>
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                    formatter={(v: number) => brl(v)}
                  />
                  <Legend />
                  <Bar dataKey="entradas" name="Entradas" fill="var(--success)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="saidas" name="Saídas" fill="var(--destructive)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-lg mb-4">Formas de Pagamento</h3>
          <div className="h-72">
            {byPayment.length === 0 ? (
              <Empty msg="Sem entradas registradas" />
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byPayment} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {byPayment.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => brl(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ title, value, icon, tone }: { title: string; value: string; icon: React.ReactNode; tone: "primary" | "success" | "danger" | "warning" }) {
  const styles = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    danger: "text-destructive bg-destructive/10",
    warning: "text-warning bg-warning/10",
  }[tone];
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={cn("h-10 w-10 rounded-lg grid place-items-center", styles)}>{icon}</div>
        <span className="text-sm text-muted-foreground font-medium">{title}</span>
      </div>
      <div className="text-3xl font-bold tabular-nums">{value}</div>
    </Card>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="h-full grid place-items-center text-muted-foreground text-sm">{msg}</div>;
}
