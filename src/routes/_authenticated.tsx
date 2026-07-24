import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

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
  return <Outlet />;
}
