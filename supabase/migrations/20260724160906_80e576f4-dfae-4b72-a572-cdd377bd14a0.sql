CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    UNIQUE (user_id, role)
);

GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

REVOKE ALL ON public.transactions FROM anon;
REVOKE ALL ON public.menu_items FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;

DROP POLICY IF EXISTS "public read transactions" ON public.transactions;
DROP POLICY IF EXISTS "public insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "public update transactions" ON public.transactions;
DROP POLICY IF EXISTS "public delete transactions" ON public.transactions;

CREATE POLICY "authenticated read transactions" ON public.transactions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated insert transactions" ON public.transactions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated update transactions" ON public.transactions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated delete transactions" ON public.transactions
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "public read menu" ON public.menu_items;
DROP POLICY IF EXISTS "public insert menu" ON public.menu_items;
DROP POLICY IF EXISTS "public update menu" ON public.menu_items;
DROP POLICY IF EXISTS "public delete menu" ON public.menu_items;

CREATE POLICY "authenticated read menu" ON public.menu_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated insert menu" ON public.menu_items
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated update menu" ON public.menu_items
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated delete menu" ON public.menu_items
  FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.handle_first_user_admin()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS first_user_admin ON auth.users;
CREATE TRIGGER first_user_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_first_user_admin();
