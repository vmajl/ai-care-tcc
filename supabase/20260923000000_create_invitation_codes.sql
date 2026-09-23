-- Códigos de convite vinculados ao paciente e armazenados no banco.
CREATE TABLE IF NOT EXISTS public.patient_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS patient_invites_patient_idx ON public.patient_invites(patient_id);
CREATE INDEX IF NOT EXISTS patient_invites_code_idx ON public.patient_invites(code);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_invites TO authenticated;
ALTER TABLE public.patient_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own patient invites select" ON public.patient_invites;
CREATE POLICY "own patient invites select"
  ON public.patient_invites FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_invites.patient_id
        AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "own patient invites insert" ON public.patient_invites;
CREATE POLICY "own patient invites insert"
  ON public.patient_invites FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_invites.patient_id
        AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "own patient invites update" ON public.patient_invites;
CREATE POLICY "own patient invites update"
  ON public.patient_invites FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_invites.patient_id
        AND p.owner_id = auth.uid()
    )
  );

-- Gera um código curto, legível e único. Cada paciente mantém sempre o mesmo código ativo.
CREATE OR REPLACE FUNCTION public.gerar_codigo_convite(_patient_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_code TEXT;
BEGIN
  SELECT owner_id
  INTO v_owner_id
  FROM public.patients
  WHERE id = _patient_id;

  IF v_owner_id IS NULL OR v_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Se este paciente já possui um código ativo, reutiliza o mesmo.
  SELECT code
  INTO v_code
  FROM public.patient_invites
  WHERE patient_id = _patient_id
    AND ativo = true
  ORDER BY criado_em ASC
  LIMIT 1;

  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  -- Caso ainda não exista código, cria um novo.
  LOOP
    v_code := 'AIC-' ||
      upper(
        substr(
          md5(random()::text || clock_timestamp()::text || _patient_id::text),
          1,
          7
        )
      );

    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.patient_invites
      WHERE code = v_code
    );
  END LOOP;

  INSERT INTO public.patient_invites (
    patient_id,
    owner_id,
    code,
    ativo
  )
  VALUES (
    _patient_id,
    v_owner_id,
    v_code,
    true
  );

  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.gerar_codigo_convite(UUID) TO authenticated;

-- Valida o código sem exigir login do familiar.
CREATE OR REPLACE FUNCTION public.validar_codigo_convite(_code TEXT)
RETURNS TABLE (patient_id UUID, patient_name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.nome
  FROM public.patient_invites i
  JOIN public.patients p ON p.id = i.patient_id
  WHERE upper(trim(i.code)) = upper(trim(_code))
    AND i.ativo = true
    AND (i.expira_em IS NULL OR i.expira_em > now())
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.validar_codigo_convite(TEXT) TO anon, authenticated;
