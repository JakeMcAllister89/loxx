
CREATE TABLE public.rate_limits (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies: table is only accessible via service_role (edge functions).

CREATE OR REPLACE FUNCTION public.check_rate_limit(_key TEXT, _max INT, _window_minutes INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.rate_limits%ROWTYPE;
  v_window INTERVAL := make_interval(mins => _window_minutes);
BEGIN
  SELECT * INTO v_row FROM public.rate_limits WHERE key = _key FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.rate_limits(key, window_start, count, updated_at)
      VALUES (_key, now(), 1, now());
    RETURN TRUE;
  END IF;

  IF v_row.window_start + v_window <= now() THEN
    UPDATE public.rate_limits
       SET window_start = now(), count = 1, updated_at = now()
     WHERE key = _key;
    RETURN TRUE;
  END IF;

  IF v_row.count >= _max THEN
    RETURN FALSE;
  END IF;

  UPDATE public.rate_limits
     SET count = count + 1, updated_at = now()
   WHERE key = _key;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) TO service_role;
