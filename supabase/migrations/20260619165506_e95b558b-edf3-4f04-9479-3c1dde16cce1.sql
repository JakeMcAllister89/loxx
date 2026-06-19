ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price numeric(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

INSERT INTO public.products (name, code, cylinder_type, pin_count, finish, size, price_gbp, cost_price, bs_en_1303, description, is_active) VALUES
('Euro Cylinder Standard', 'EKZ-12', 'Single', 6, 'Nickel Plated', '35/35', 45.00, 22.00, true, 'Standard euro cylinder, 6-pin, suitable for most residential and commercial applications', true),
('Euro Cylinder Anti-Snap', 'AZG', 'Single', 6, 'Satin Brass', '35/35', 38.00, 18.00, true, 'Anti-snap euro cylinder with sacrificial snap point for enhanced security', true),
('Double Cylinder Keyed Both Sides', 'C-KDZ36K36', 'Double', 6, 'Nickel Plated', '36/36', 68.00, 32.00, true, 'Double cylinder keyed both sides, suitable for doors requiring key access from both sides', true),
('Double Cylinder Standard', 'C-DZ36/36', 'Double', 6, 'Polished Brass', '36/36', 58.00, 27.00, true, 'Standard double cylinder, polished brass finish', true),
('Double Cylinder Extended', 'C-KDZ36K41', 'Double', 6, 'Nickel Plated', '36/41', 68.00, 32.00, true, 'Extended double cylinder for thicker doors', true),
('Double Cylinder Extended Standard', 'C-DZ36/41', 'Double', 6, 'Nickel Plated', '36/41', 58.00, 27.00, true, 'Extended double cylinder standard version', true),
('Double Cylinder Short', 'C-KDZ31K31', 'Double', 6, 'Nickel Plated', '31/31', 65.00, 30.00, true, 'Short double cylinder for slim door profiles', true),
('Oval Cylinder', 'C-OKZ36K36', 'Oval', 6, 'Polished Brass', '36/36', 72.00, 34.00, true, 'Oval format cylinder for specialist lock cases', true),
('Anti-Snap Euro', 'C-AZG', 'Single', 6, 'Polished Brass', '35/35', 42.00, 20.00, true, 'Anti-snap euro cylinder in polished brass', true),
('High Security Euro', 'HS-EKZ', 'Single', 6, 'Satin Chrome', '35/35', 85.00, 40.00, true, 'High security euro cylinder with enhanced pick and drill resistance', true),
('Thumbturn Cylinder', 'TT-30/10', 'Thumbturn', 5, 'Nickel Plated', '30/10', 52.00, 24.00, true, 'Thumbturn cylinder, key outside thumbturn inside', true),
('Mortice Cylinder', 'MC-35', 'Mortice', 5, 'Satin Brass', '35mm', 48.00, 22.00, true, 'Mortice format cylinder for traditional mortice lock cases', true)
ON CONFLICT (code) DO NOTHING;