import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { brl, categoryLabels } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, UtensilsCrossed, GlassWater, Candy, IceCream } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/cardapio")({
  component: Cardapio,
  head: () => ({
    meta: [
      { title: "Cardápio • Restaurante e Pizzaria do Lúcio" },
      { name: "description", content: "Gestão de produtos e preços do restaurante." },
      { property: "og:title", content: "Cardápio" },
      { property: "og:description", content: "Cadastro de produtos e preços." },
    ],
  }),
});

const cats = [
  { v: "comidas", label: "Comidas", icon: UtensilsCrossed },
  { v: "bebidas", label: "Bebidas", icon: GlassWater },
  { v: "balas_doces", label: "Balas / Doces", icon: Candy },
  { v: "picoles", label: "Picolés", icon: IceCream },
] as const;

function Cardapio() {
  const qc = useQueryClient();
  const [cat, setCat] = useState<string>("comidas");
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["menu", cat],
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_items").select("*").eq("category", cat).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const del = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", toDelete);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Item excluído"); qc.invalidateQueries({ queryKey: ["menu"] }); }
    setToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Cardápio</h1>
          <p className="text-muted-foreground">Cadastro de produtos e preços</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="h-11">
          <Plus className="h-4 w-4 mr-1" /> Novo Item
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {cats.map((c) => {
          const Icon = c.icon;
          return (
            <button key={c.v} onClick={() => setCat(c.v)} className={cn(
              "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
              cat === c.v ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40",
            )}>
              <Icon className={cn("h-6 w-6", cat === c.v ? "text-primary" : "text-muted-foreground")} />
              <span className="font-semibold">{c.label}</span>
            </button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Nenhum item cadastrado em {categoryLabels[cat]}. Clique em "Novo Item" para começar.
        </Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <Card key={it.id} className="p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{it.name}</div>
                <div className="text-primary font-bold text-lg tabular-nums">{brl(Number(it.price))}</div>
              </div>
              <button onClick={() => { setEditing(it); setOpen(true); }} className="h-10 w-10 rounded-lg bg-secondary hover:bg-primary hover:text-primary-foreground grid place-items-center">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => setToDelete(it.id)} className="h-10 w-10 rounded-lg bg-secondary hover:bg-destructive hover:text-destructive-foreground grid place-items-center">
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      <ItemDialog open={open} onOpenChange={setOpen} editing={editing} defaultCategory={cat} />

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este item?</AlertDialogTitle>
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

function ItemDialog({ open, onOpenChange, editing, defaultCategory }: { open: boolean; onOpenChange: (v: boolean) => void; editing: any; defaultCategory: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) { setName(editing.name); setPrice(String(editing.price)); setCategory(editing.category); }
    else { setName(""); setPrice(""); setCategory(defaultCategory); }
  }, [editing, open, defaultCategory]);

  const submit = async () => {
    if (!name.trim() || !price) return toast.error("Preencha nome e preço");
    setSaving(true);
    const payload = { name: name.trim(), price: parseFloat(price.replace(",", ".")), category };
    const { error } = editing
      ? await supabase.from("menu_items").update(payload).eq("id", editing.id)
      : await supabase.from("menu_items").insert(payload);
    setSaving(false);
    if (error) return toast.error("Erro: " + error.message);
    toast.success(editing ? "Item atualizado" : "Item cadastrado");
    qc.invalidateQueries({ queryKey: ["menu"] });
    onOpenChange(false);
    setName(""); setPrice("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Editar Item" : "Novo Item"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-1 block">Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Pizza Calabresa Grande" />
          </div>
          <div>
            <Label className="mb-1 block">Preço (R$)</Label>
            <Input type="text" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" className="text-lg font-bold" />
          </div>
          <div>
            <Label className="mb-1 block">Categoria</Label>
            <div className="grid grid-cols-2 gap-2">
              {cats.map((c) => (
                <button key={c.v} type="button" onClick={() => setCategory(c.v)} className={cn(
                  "py-2.5 rounded-lg border-2 text-sm font-medium",
                  category === c.v ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary",
                )}>{c.label}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancelar</Button>
            <Button onClick={submit} disabled={saving} className="flex-1">{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
