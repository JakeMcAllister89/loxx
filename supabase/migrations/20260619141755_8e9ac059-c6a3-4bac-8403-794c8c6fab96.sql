
-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  company TEXT,
  role TEXT NOT NULL DEFAULT 'facility_manager',
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles self select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- key_systems
CREATE TABLE public.key_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  reference TEXT,
  tree_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  door_count INT NOT NULL DEFAULT 0,
  next_differ INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.key_systems TO authenticated;
GRANT ALL ON public.key_systems TO service_role;
ALTER TABLE public.key_systems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Systems owner all" ON public.key_systems FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- nodes
CREATE TABLE public.nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID NOT NULL REFERENCES public.key_systems(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.nodes(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL CHECK (node_type IN ('gmk','smk','ck','cyl')),
  label TEXT,
  meta TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nodes TO authenticated;
GRANT ALL ON public.nodes TO service_role;
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Nodes via system" ON public.nodes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.key_systems s WHERE s.id = nodes.system_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.key_systems s WHERE s.id = nodes.system_id AND s.user_id = auth.uid()));

-- cylinders
CREATE TABLE public.cylinders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES public.nodes(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES public.key_systems(id) ON DELETE CASCADE,
  differ_number INT NOT NULL,
  room_label TEXT,
  cylinder_type TEXT,
  finish TEXT,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(system_id, differ_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cylinders TO authenticated;
GRANT ALL ON public.cylinders TO service_role;
ALTER TABLE public.cylinders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cylinders via system" ON public.cylinders FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.key_systems s WHERE s.id = cylinders.system_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.key_systems s WHERE s.id = cylinders.system_id AND s.user_id = auth.uid()));

-- keys
CREATE TABLE public.keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES public.nodes(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES public.key_systems(id) ON DELETE CASCADE,
  key_reference TEXT,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 12.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.keys TO authenticated;
GRANT ALL ON public.keys TO service_role;
ALTER TABLE public.keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Keys via system" ON public.keys FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.key_systems s WHERE s.id = keys.system_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.key_systems s WHERE s.id = keys.system_id AND s.user_id = auth.uid()));

-- products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  cylinder_type TEXT NOT NULL,
  pin_count INT NOT NULL DEFAULT 6,
  finish TEXT,
  size TEXT,
  price_gbp NUMERIC(10,2) NOT NULL,
  security_rating TEXT,
  bs_en_1303 BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products public read" ON public.products FOR SELECT TO anon, authenticated USING (true);

-- orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  system_id UUID REFERENCES public.key_systems(id) ON DELETE SET NULL,
  tree_snapshot JSONB,
  stripe_payment_intent TEXT,
  stripe_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','processing','shipped','delivered')),
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  vat NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  customer_name TEXT,
  customer_email TEXT,
  company TEXT,
  delivery_address JSONB,
  purchase_order_ref TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Orders self all" ON public.orders FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- order_items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('cylinder','key')),
  differ_ref TEXT,
  room_label TEXT,
  product_code TEXT,
  cylinder_type TEXT,
  finish TEXT,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(10,2) NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order items via order" ON public.order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()));

-- updated_at helper + triggers
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_set_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER systems_set_updated BEFORE UPDATE ON public.key_systems FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, company, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'facility_manager')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- seed products
INSERT INTO public.products (name, code, cylinder_type, pin_count, finish, size, price_gbp, description) VALUES
('Euro Cylinder Standard', 'EKZ-12', 'Single', 6, 'Nickel Plated', '35/35', 45.00, '6-pin Euro profile single cylinder.'),
('Euro Cylinder Anti-Snap', 'AZG', 'Single', 6, 'Satin Brass', '35/35', 38.00, 'Anti-snap Euro single cylinder.'),
('Double Cylinder Keyed Both Sides', 'C-KDZ36K36', 'Double', 6, 'Nickel Plated', '36/36', 68.00, 'Double cylinder keyed both sides.'),
('Double Cylinder Standard', 'C-DZ36/36', 'Double', 6, 'Polished Brass', '36/36', 58.00, 'Standard double cylinder.'),
('Double Cylinder Extended', 'C-KDZ36K41', 'Double', 6, 'Nickel Plated', '36/41', 68.00, 'Extended double cylinder.'),
('Double Cylinder Extended Standard', 'C-DZ36/41', 'Double', 6, 'Nickel Plated', '36/41', 58.00, 'Extended standard double cylinder.'),
('Double Cylinder Short', 'C-KDZ31K31', 'Double', 6, 'Nickel Plated', '31/31', 65.00, 'Short double cylinder.'),
('Oval Cylinder', 'C-OKZ36K36', 'Oval', 6, 'Polished Brass', '36/36', 72.00, 'Oval profile cylinder.'),
('Anti-Snap Euro', 'C-AZG', 'Single', 6, 'Polished Brass', '35/35', 42.00, 'Polished brass anti-snap Euro.'),
('High Security Euro', 'HS-EKZ', 'Single', 6, 'Satin Chrome', '35/35', 85.00, 'High security Euro cylinder.'),
('Thumbturn Cylinder', 'TT-30/10', 'Thumbturn', 5, 'Nickel Plated', '30/10', 52.00, 'Thumbturn cylinder for bathrooms/internal doors.'),
('Mortice Cylinder', 'MC-35', 'Mortice', 5, 'Satin Brass', '35mm', 48.00, 'Mortice profile cylinder.');
