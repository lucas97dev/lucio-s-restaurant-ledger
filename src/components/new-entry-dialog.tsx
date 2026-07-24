import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDownCircle, ArrowUpCircle, Sun, Moon, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "entrada" | "saida" | null;
type Turno = "dia" | "noite" | null;

const payments = [
  { v: "dinheiro", label: "Dinheiro" },
  { v: "pix", label: "PIX" },
  { v: "credito", label: "Cartão Crédito" },
  { v: "debito", label: "Cartão Débito" },
  { v: "voucher", label: "Voucher" },
  { v: "vale", label: "Vale (Fiado)" },
] as const;

function Counter({ label, emoji, value, onChange }: { label: string; emoji: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between bg-secondary rounded-xl p-3">
      <div className="flex items-center gap-2 text-base">
        <span className="text-2xl">{emoji}</span>
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} className="h-10 w-10 rounded-full bg-background border border-border grid place-items-center hover:border-primary">
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-10 text-center font-bold text-lg tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(value + 1)} className="h-10 w-10 rounded-full bg-primary text-primary-foreground grid place-items-center hover:brightness-110">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function NewEntryDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (v: boolean) => void; editing?: any }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>(null);
  const [turno, setTurno] = useState<Turno>(null);
  const [amount, setAmount] = useState("");
  const [payment, setPayment] = useState<string>("");
  const [valeName, setValeName] = useState("");
  const [valeAmount, setValeAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");
  const [q, setQ] = useState({ refeicoes: 0, marmitex: 0, pizzas: 0, porcoes: 0, macarrao: 0, jantas: 0 });
  const [saving, setSaving] = useState(false);

  // hydrate for edit
  useState(() => {
    if (editing) {
      setKind(editing.type);
      setTurno(editing.turno);
      setAmount(String(editing.amount));
      setPayment(editing.payment_method ?? "");
      setValeName(editing.vale_customer_name ?? "");
      setValeAmount(editing.vale_amount ? String(editing.vale_amount) : "");
      setDesc(editing.description ?? "");
      setCategory(editing.category ?? "");
      setQ({
        refeicoes: editing.qty_refeicoes ?? 0,
        marmitex: editing.qty_marmitex ?? 0,
        pizzas: editing.qty_pizzas ?? 0,
        porcoes: editing.qty_porcoes ?? 0,
        macarrao: editing.qty_macarrao ?? 0,
        jantas: editing.qty_jantas ?? 0,
      });
    }
  });

  const reset = () => {
    setKind(null); setTurno(null); setAmount(""); setPayment("");
    setValeName(""); setValeAmount(""); setDesc(""); setCategory("");
    setQ({ refeicoes: 0, marmitex: 0, pizzas: 0, porcoes: 0, macarrao: 0, jantas: 0 });
  };

  const close = () => { onOpenChange(false); setTimeout(reset, 200); };

  const submit = async () => {
    if (!kind) return toast.error("Selecione Entrada ou Saída");
    const value = parseFloat(amount.replace(",", "."));
    if (!value || value <= 0) return toast.error("Informe um valor válido");

    if (kind === "entrada") {
      if (!turno) return toast.error("Selecione o turno");
      if (!payment) return toast.error("Selecione a forma de pagamento");
      if (payment === "vale" && (!valeName.trim() || !valeAmount)) return toast.error("Preencha nome do cliente e valor do vale");
    }

    setSaving(true);
    const payload: any = {
      type: kind,
      amount: value,
      turno: kind === "entrada" ? turno : null,
      payment_method: kind === "entrada" ? payment : null,
      vale_customer_name: kind === "entrada" && payment === "vale" ? valeName.trim() : null,
      vale_amount: kind === "entrada" && payment === "vale" ? parseFloat(valeAmount.replace(",", ".")) : null,
      description: kind === "saida" ? desc : null,
      category: kind === "saida" ? category : null,
      qty_refeicoes: kind === "entrada" && turno === "dia" ? q.refeicoes : 0,
      qty_marmitex: kind === "entrada" && turno === "dia" ? q.marmitex : 0,
      qty_pizzas: kind === "entrada" && turno === "noite" ? q.pizzas : 0,
      qty_porcoes: kind === "entrada" && turno === "noite" ? q.porcoes : 0,
      qty_macarrao: kind === "entrada" && turno === "noite" ? q.macarrao : 0,
      qty_jantas: kind === "entrada" && turno === "noite" ? q.jantas : 0,
    };

    const { error } = editing
      ? await supabase.from("transactions").update(payload).eq("id", editing.id)
      : await supabase.from("transactions").insert(payload);

    setSaving(false);
    if (error) return toast.error("Erro ao salvar: " + error.message);
    toast.success(editing ? "Lançamento atualizado!" : "Lançamento registrado!");
    qc.invalidateQueries({ queryKey: ["transactions"] });
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : close())}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{editing ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle>
        </DialogHeader>

        {/* STEP 1: type */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setKind("entrada")}
            className={cn(
              "flex flex-col items-center gap-2 py-6 rounded-xl border-2 transition-all",
              kind === "entrada" ? "border-success bg-success/10" : "border-border bg-secondary hover:border-success/50",
            )}
          >
            <ArrowUpCircle className={cn("h-10 w-10", kind === "entrada" ? "text-success" : "text-muted-foreground")} />
            <span className="font-bold text-lg">ENTRADA</span>
            <span className="text-xs text-muted-foreground">Receita / Venda</span>
          </button>
          <button
            type="button"
            onClick={() => setKind("saida")}
            className={cn(
              "flex flex-col items-center gap-2 py-6 rounded-xl border-2 transition-all",
              kind === "saida" ? "border-destructive bg-destructive/10" : "border-border bg-secondary hover:border-destructive/50",
            )}
          >
            <ArrowDownCircle className={cn("h-10 w-10", kind === "saida" ? "text-destructive" : "text-muted-foreground")} />
            <span className="font-bold text-lg">SAÍDA</span>
            <span className="text-xs text-muted-foreground">Despesa</span>
          </button>
        </div>

        {kind && (
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-base mb-2 block">Valor (R$) *</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-2xl font-bold h-14 text-center"
                autoFocus
              />
            </div>

            {kind === "saida" && (
              <>
                <div>
                  <Label className="text-base mb-2 block">Descrição</Label>
                  <Textarea placeholder="Ex: Compra de ingredientes" value={desc} onChange={(e) => setDesc(e.target.value)} />
                </div>
                <div>
                  <Label className="text-base mb-2 block">Categoria</Label>
                  <Input placeholder="Ex: Fornecedores, Contas, Salário" value={category} onChange={(e) => setCategory(e.target.value)} />
                </div>
              </>
            )}

            {kind === "entrada" && (
              <>
                <div>
                  <Label className="text-base mb-2 block">Turno *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setTurno("dia")} className={cn("flex items-center justify-center gap-2 py-4 rounded-xl border-2 font-semibold", turno === "dia" ? "border-warning bg-warning/10" : "border-border bg-secondary")}>
                      <Sun className="h-5 w-5" /> Dia
                    </button>
                    <button type="button" onClick={() => setTurno("noite")} className={cn("flex items-center justify-center gap-2 py-4 rounded-xl border-2 font-semibold", turno === "noite" ? "border-chart-4 bg-chart-4/10" : "border-border bg-secondary")}>
                      <Moon className="h-5 w-5" /> Noite
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-base mb-2 block">Forma de Pagamento *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {payments.map((p) => (
                      <button
                        key={p.v}
                        type="button"
                        onClick={() => setPayment(p.v)}
                        className={cn(
                          "py-3 rounded-lg border-2 text-sm font-medium",
                          payment === p.v ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary",
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {payment === "vale" && (
                  <div className="space-y-3 p-3 rounded-lg bg-primary/5 border border-primary/30">
                    <div>
                      <Label className="mb-1 block">Nome do Cliente *</Label>
                      <Input placeholder="Nome de quem fez o vale" value={valeName} onChange={(e) => setValeName(e.target.value)} />
                    </div>
                    <div>
                      <Label className="mb-1 block">Valor do Vale (R$) *</Label>
                      <Input type="text" inputMode="decimal" placeholder="0,00" value={valeAmount} onChange={(e) => setValeAmount(e.target.value)} />
                    </div>
                  </div>
                )}

                {turno === "dia" && (
                  <div className="space-y-2">
                    <Label className="text-base">Quantidades (opcional)</Label>
                    <Counter label="Refeições" emoji="🍲" value={q.refeicoes} onChange={(n) => setQ({ ...q, refeicoes: n })} />
                    <Counter label="Marmitex" emoji="📦" value={q.marmitex} onChange={(n) => setQ({ ...q, marmitex: n })} />
                  </div>
                )}

                {turno === "noite" && (
                  <div className="space-y-2">
                    <Label className="text-base">Quantidades (opcional)</Label>
                    <Counter label="Pizzas" emoji="🍕" value={q.pizzas} onChange={(n) => setQ({ ...q, pizzas: n })} />
                    <Counter label="Porções" emoji="🍟" value={q.porcoes} onChange={(n) => setQ({ ...q, porcoes: n })} />
                    <Counter label="Macarrão" emoji="🍝" value={q.macarrao} onChange={(n) => setQ({ ...q, macarrao: n })} />
                    <Counter label="Jantas" emoji="🍽️" value={q.jantas} onChange={(n) => setQ({ ...q, jantas: n })} />
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={close} className="flex-1 h-12">Cancelar</Button>
              <Button type="button" onClick={submit} disabled={saving} className="flex-1 h-12 text-base font-bold">
                {saving ? "Salvando..." : editing ? "Salvar Alterações" : "Registrar"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
