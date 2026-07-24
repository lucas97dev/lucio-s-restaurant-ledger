
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('entrada','saida')),
  turno TEXT CHECK (turno IN ('dia','noite')),
  amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('dinheiro','pix','credito','debito','voucher','vale')),
  vale_customer_name TEXT,
  vale_amount NUMERIC(12,2),
  description TEXT,
  category TEXT,
  qty_refeicoes INT DEFAULT 0,
  qty_marmitex INT DEFAULT 0,
  qty_pizzas INT DEFAULT 0,
  qty_porcoes INT DEFAULT 0,
  qty_macarrao INT DEFAULT 0,
  qty_jantas INT DEFAULT 0,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO anon, authenticated;
GRANT ALL ON public.transactions TO service_role;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "public insert transactions" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "public update transactions" ON public.transactions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete transactions" ON public.transactions FOR DELETE USING (true);

CREATE INDEX idx_transactions_occurred_at ON public.transactions(occurred_at DESC);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_turno ON public.transactions(turno);

CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('comidas','bebidas','balas_doces','picoles')),
  price NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO anon, authenticated;
GRANT ALL ON public.menu_items TO service_role;

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read menu" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "public insert menu" ON public.menu_items FOR INSERT WITH CHECK (true);
CREATE POLICY "public update menu" ON public.menu_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete menu" ON public.menu_items FOR DELETE USING (true);
