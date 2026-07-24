import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/app-header";
import { NewEntryDialog } from "@/components/new-entry-dialog";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth" });
    }
  },
  head: () => ({
    meta: [
      { title: "Painel • Restaurante e Pizzaria do Lúcio" },
      { name: "description", content: "Área protegida do sistema financeiro." },
    ],
  }),
});

function AuthenticatedLayout() {
  const [entryOpen, setEntryOpen] = useState(false);

  return (
    <>
      <AppHeader onNewEntry={() => setEntryOpen(true)} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
      <NewEntryDialog open={entryOpen} onOpenChange={setEntryOpen} />
    </>
  );
}
