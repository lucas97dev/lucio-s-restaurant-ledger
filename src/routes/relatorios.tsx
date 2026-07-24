import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { brl, paymentLabels } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Sun, Moon, Printer } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/relatorios")({
  component: Relatorios,
  head: () => ({
    meta: [
      { title: "Relatório do Turno • Restaurante e Pizzaria do Lúcio" },
      { name: "description", content: "Fechamento de caixa por turno com totais e formas de pagamento." },
      { property: "og:title", content: "Relatório do Turno" },
      { property: "og:description", content: "Fechamento de caixa por turno." },
    ],
  }),
});

function Relatorios() {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [turno, setTurno] = useState<"dia" | "noite">("dia");

  const { data: rows = [] } = useQuery({
    queryKey: ["transactions", "report", date, turno],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("type", "entrada")
        .eq("turno", turno)
        .gte("occurred_at", date + "T00:00:00")
        .lte("occurred_at", date + "T23:59:59")
        .order("occurred_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const total = rows.reduce((s, r) => s + Number(r.amount), 0);

  const byPay = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) if (r.payment_method) m.set(r.payment_method, (m.get(r.payment_method) ?? 0) + Number(r.amount));
    return Array.from(m.entries());
  }, [rows]);

  const vales = rows.filter((r) => r.payment_method === "vale");
  const totalVale = vales.reduce((s, r) => s + Number(r.vale_amount ?? 0), 0);

  const totals = useMemo(() => {
    const t = { refeicoes: 0, marmitex: 0, pizzas: 0, porcoes: 0, macarrao: 0, jantas: 0 };
    for (const r of rows) {
      t.refeicoes += r.qty_refeicoes ?? 0;
      t.marmitex += r.qty_marmitex ?? 0;
      t.pizzas += r.qty_pizzas ?? 0;
      t.porcoes += r.qty_porcoes ?? 0;
      t.macarrao += r.qty_macarrao ?? 0;
      t.jantas += r.qty_jantas ?? 0;
    }
    return t;
  }, [rows]);

  const dayItems = [["🍲", "Refeições", totals.refeicoes], ["📦", "Marmitex", totals.marmitex]];
  const nightItems = [["🍕", "Pizzas", totals.pizzas], ["🍟", "Porções", totals.porcoes], ["🍝", "Macarrão", totals.macarrao], ["🍽️", "Jantas", totals.jantas]];
  const items = (turno === "dia" ? dayItems : nightItems) as [string, string, number][];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Relatório do Turno</h1>
          <p className="text-muted-foreground">Fechamento de caixa</p>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-primary hover:text-primary-foreground">
          <Printer className="h-4 w-4" /> Imprimir
        </button>
      </div>

      <Card className="p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Data</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-2 rounded-lg bg-secondary border border-border h-10" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Turno</label>
          <div className="flex gap-2">
            <button onClick={() => setTurno("dia")} className={cn("flex items-center gap-2 px-4 h-10 rounded-lg border-2 font-semibold", turno === "dia" ? "border-warning bg-warning/10 text-warning" : "border-border bg-secondary")}>
              <Sun className="h-4 w-4" /> Dia
            </button>
            <button onClick={() => setTurno("noite")} className={cn("flex items-center gap-2 px-4 h-10 rounded-lg border-2 font-semibold", turno === "noite" ? "border-chart-4 bg-chart-4/10 text-chart-4" : "border-border bg-secondary")}>
              <Moon className="h-4 w-4" /> Noite
            </button>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-primary/15 to-transparent border-primary/30">
        <div className="text-sm uppercase tracking-wider text-muted-foreground font-medium">Total Faturado no Turno</div>
        <div className="text-5xl font-bold text-primary mt-2 tabular-nums">{brl(total)}</div>
        <div className="text-sm text-muted-foreground mt-1">{rows.length} venda{rows.length !== 1 ? "s" : ""} registrada{rows.length !== 1 ? "s" : ""}</div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-bold text-lg mb-4">Por Forma de Pagamento</h3>
          {byPay.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">Sem entradas</div>
          ) : (
            <div className="space-y-2">
              {byPay.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <span className="font-medium">{paymentLabels[k]}</span>
                  <span className="font-bold tabular-nums">{brl(v)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-lg mb-4">Volume Vendido</h3>
          <div className="space-y-2">
            {items.map(([e, l, n]) => (
              <div key={l} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <span className="flex items-center gap-2"><span className="text-2xl">{e}</span> <span className="font-medium">Total de {l}</span></span>
                <span className="font-bold text-xl tabular-nums">{n}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {vales.length > 0 && (
        <Card className="p-5 border-warning/40">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">Vales (Fiado) do Turno <span className="text-sm font-normal text-muted-foreground">— Total: {brl(totalVale)}</span></h3>
          <div className="space-y-2">
            {vales.map((v) => (
              <div key={v.id} className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/30">
                <span className="font-medium">{v.vale_customer_name}</span>
                <span className="font-bold tabular-nums text-warning">{brl(Number(v.vale_amount ?? 0))}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
