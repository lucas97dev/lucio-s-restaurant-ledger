import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { brl, paymentLabels } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, Sun, Moon } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { NewEntryDialog } from "@/components/new-entry-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/lancamentos")({
  component: Lancamentos,
  head: () => ({
    meta: [
      { title: "Lançamentos • Restaurante e Pizzaria do Lúcio" },
      { name: "description", content: "Histórico de entradas e saídas com filtros e edição." },
      { property: "og:title", content: "Lançamentos" },
      { property: "og:description", content: "Histórico de entradas e saídas do restaurante." },
    ],
  }),
});

function Lancamentos() {
  const qc = useQueryClient();
  const [type, setType] = useState<"all" | "entrada" | "saida">("all");
  const [turno, setTurno] = useState<"all" | "dia" | "noite">("all");
  const [date, setDate] = useState<string>("");
  const [editing, setEditing] = useState<any>(null);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["transactions", "list", type, turno, date],
    queryFn: async () => {
      let q = supabase.from("transactions").select("*").order("occurred_at", { ascending: false }).limit(500);
      if (type !== "all") q = q.eq("type", type);
      if (turno !== "all") q = q.eq("turno", turno);
      if (date) {
        q = q.gte("occurred_at", date + "T00:00:00").lte("occurred_at", date + "T23:59:59");
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const del = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("transactions").delete().eq("id", toDelete);
    if (error) toast.error("Erro ao excluir");
    else {
      toast.success("Lançamento excluído");
      qc.invalidateQueries({ queryKey: ["transactions"] });
    }
    setToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Lançamentos</h1>
        <p className="text-muted-foreground">Todos os registros de entrada e saída</p>
      </div>

      <Card className="p-4 flex flex-wrap gap-3 items-end">
        <FilterGroup label="Tipo" value={type} onChange={(v) => setType(v as any)} options={[
          { v: "all", label: "Todos" }, { v: "entrada", label: "Entradas" }, { v: "saida", label: "Saídas" },
        ]} />
        <FilterGroup label="Turno" value={turno} onChange={(v) => setTurno(v as any)} options={[
          { v: "all", label: "Todos" }, { v: "dia", label: "Dia" }, { v: "noite", label: "Noite" },
        ]} />
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Data</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm h-10" />
        </div>
        {(type !== "all" || turno !== "all" || date) && (
          <Button variant="ghost" onClick={() => { setType("all"); setTurno("all"); setDate(""); }} className="h-10">Limpar</Button>
        )}
      </Card>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Nenhum lançamento encontrado.</Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => <Row key={r.id} r={r} onEdit={() => setEditing(r)} onDelete={() => setToDelete(r.id)} />)}
        </div>
      )}

      {editing && <NewEntryDialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)} editing={editing} />}

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este lançamento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={del} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterGroup({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; label: string }[] }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <div className="flex gap-1">
        {options.map((o) => (
          <button key={o.v} onClick={() => onChange(o.v)} className={cn(
            "px-3 h-10 rounded-lg text-sm font-medium border-2",
            value === o.v ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary",
          )}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

function Row({ r, onEdit, onDelete }: { r: any; onEdit: () => void; onDelete: () => void }) {
  const isEntrada = r.type === "entrada";
  const quantities = [
    ["🍲", r.qty_refeicoes, "Refeições"],
    ["📦", r.qty_marmitex, "Marmitex"],
    ["🍕", r.qty_pizzas, "Pizzas"],
    ["🍟", r.qty_porcoes, "Porções"],
    ["🍝", r.qty_macarrao, "Macarrão"],
    ["🍽️", r.qty_jantas, "Jantas"],
  ].filter(([, n]) => Number(n) > 0);

  return (
    <Card className="p-4 flex items-center gap-4">
      <div className={cn("h-11 w-11 rounded-xl grid place-items-center shrink-0", isEntrada ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
        {isEntrada ? <ArrowUpCircle className="h-6 w-6" /> : <ArrowDownCircle className="h-6 w-6" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("text-xl font-bold tabular-nums", isEntrada ? "text-success" : "text-destructive")}>
            {isEntrada ? "+" : "−"} {brl(Number(r.amount))}
          </span>
          {r.turno && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary flex items-center gap-1">
              {r.turno === "dia" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />} {r.turno === "dia" ? "Dia" : "Noite"}
            </span>
          )}
          {r.payment_method && <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">{paymentLabels[r.payment_method]}</span>}
          {r.payment_method === "vale" && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning font-semibold">
              VALE • {r.vale_customer_name}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
          <span>{new Date(r.occurred_at).toLocaleString("pt-BR")}</span>
          {r.description && <span>• {r.description}</span>}
          {r.category && <span>• {r.category}</span>}
          {quantities.map(([e, n, l], i) => <span key={i}>• {e} {n} {l}</span>)}
        </div>
      </div>

      <div className="flex gap-1 shrink-0">
        <button onClick={onEdit} className="h-10 w-10 rounded-lg bg-secondary hover:bg-primary hover:text-primary-foreground grid place-items-center" aria-label="Editar">
          <Pencil className="h-4 w-4" />
        </button>
        <button onClick={onDelete} className="h-10 w-10 rounded-lg bg-secondary hover:bg-destructive hover:text-destructive-foreground grid place-items-center" aria-label="Excluir">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}
