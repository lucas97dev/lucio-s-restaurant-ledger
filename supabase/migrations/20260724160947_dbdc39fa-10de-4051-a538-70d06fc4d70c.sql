DROP POLICY IF EXISTS "authenticated read transactions" ON public.transactions;
DROP POLICY IF EXISTS "authenticated insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "authenticated update transactions" ON public.transactions;
DROP POLICY IF EXISTS "authenticated delete transactions" ON public.transactions;
DROP POLICY IF EXISTS "authenticated read menu" ON public.menu_items;
DROP POLICY IF EXISTS "authenticated insert menu" ON public.menu_items;
DROP POLICY IF EXISTS "authenticated update menu" ON public.menu_items;
DROP POLICY IF EXISTS "authenticated delete menu" ON public.menu_items;

CREATE POLICY "authenticated read transactions" ON public.transactions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());
CREATE POLICY "authenticated insert transactions" ON public.transactions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "authenticated update transactions" ON public.transactions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid()) WITH CHECK (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());
CREATE POLICY "authenticated delete transactions" ON public.transactions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

CREATE POLICY "authenticated read menu" ON public.menu_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());
CREATE POLICY "authenticated insert menu" ON public.menu_items
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "authenticated update menu" ON public.menu_items
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid()) WITH CHECK (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());
CREATE POLICY "authenticated delete menu" ON public.menu_items
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_user_id_on_transactions()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_user_id_transactions ON public.transactions;
CREATE TRIGGER set_user_id_transactions
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_id_on_transactions();

CREATE OR REPLACE FUNCTION public.set_user_id_on_menu_items()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_user_id_menu_items ON public.menu_items;
CREATE TRIGGER set_user_id_menu_items
  BEFORE INSERT ON public.menu_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_id_on_menu_items();

GRANT EXECUTE ON FUNCTION public.set_user_id_on_transactions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_id_on_menu_items() TO authenticated;
