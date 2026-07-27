import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import logoAsset from "@/assets/logo-lucio.png.asset.json";
import { cn } from "@/lib/utils";




export const Route = createFileRoute("/auth")({
  component: AuthPage,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      throw redirect({ to: "/" });
    }
  },
  head: () => ({
    meta: [
      { title: "Entrar • Restaurante e Pizzaria do Lúcio" },
      { name: "description", content: "Acesse o sistema financeiro do restaurante." },
    ],
  }),
});

function AuthPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => setMounted(true), []);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message === "Invalid login credentials" ? "Email ou senha incorretos." : error.message);
        setLoading(false);
      } else {
        await router.invalidate();
        router.navigate({ to: "/" });
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage(error.message);
        setLoading(false);
      } else {
        setMessage("Conta criada! Entrando...");
        await router.invalidate();
        router.navigate({ to: "/" });
      }
    }
  }


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <img src={logoAsset.url} alt="Restaurante e Pizzaria do Lúcio" className="h-28 w-28 mx-auto rounded-full" />
          <h1 className="text-2xl font-bold">Restaurante e Pizzaria do Lúcio</h1>
          <p className="text-muted-foreground">Sistema financeiro</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={cn(
              "py-2 rounded-lg text-sm font-medium border-2 transition-colors",
              mode === "login" ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary hover:border-primary/40"
            )}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={cn(
              "py-2 rounded-lg text-sm font-medium border-2 transition-colors",
              mode === "signup" ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary hover:border-primary/40"
            )}
          >
            Criar conta
          </button>
        </div>



        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>


          {message && (
            <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-3 text-sm text-center">
              {message}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full h-12 text-base">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "login" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

