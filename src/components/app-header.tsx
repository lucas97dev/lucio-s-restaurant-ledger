import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ListOrdered, FileBarChart2, UtensilsCrossed, Plus } from "lucide-react";
import logoAsset from "@/assets/logo-lucio.png.asset.json";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/lancamentos", label: "Lançamentos", icon: ListOrdered },
  { to: "/relatorios", label: "Relatório do Turno", icon: FileBarChart2 },
  { to: "/cardapio", label: "Cardápio", icon: UtensilsCrossed },
] as const;

export function AppHeader({ onNewEntry }: { onNewEntry: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <img src={logoAsset.url} alt="Restaurante e Pizzaria do Lúcio" className="h-12 w-12 rounded-full ring-2 ring-primary/60" />
          <div className="hidden sm:block leading-tight">
            <div className="text-base font-bold">Restaurante e Pizzaria</div>
            <div className="text-sm text-primary font-semibold">do Lúcio</div>
          </div>
        </Link>

        <nav className="flex-1 flex items-center gap-1 overflow-x-auto">
          {nav.map((item) => {
            const active = path === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button
          onClick={onNewEntry}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-4 py-2.5 rounded-lg shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">Novo Lançamento</span>
        </button>
      </div>
    </header>
  );
}
