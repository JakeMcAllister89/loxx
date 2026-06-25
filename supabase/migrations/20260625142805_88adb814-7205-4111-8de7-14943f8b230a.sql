ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_features TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS finish_colour TEXT;

UPDATE public.products SET finish_colour = '#C0C0C0' WHERE finish IN ('Nickel Plated', 'Satin Nickel', 'Polished Chrome') AND finish_colour IS NULL;
UPDATE public.products SET finish_colour = '#9E9E9E' WHERE finish = 'Satin Chrome' AND finish_colour IS NULL;
UPDATE public.products SET finish_colour = '#CFB53B' WHERE finish = 'Polished Brass' AND finish_colour IS NULL;
UPDATE public.products SET finish_colour = '#B8860B' WHERE finish = 'Satin Brass' AND finish_colour IS NULL;
UPDATE public.products SET finish_colour = '#967117' WHERE finish = 'Antique Brass' AND finish_colour IS NULL;
UPDATE public.products SET finish_colour = '#222222' WHERE finish = 'Black' AND finish_colour IS NULL;