-- Membros convidados de um paciente (familiares com acesso de leitura)
CREATE TABLE public.patient_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (patient_id, user_id)
);

GRANT SELECT, DELETE ON public.patient_members TO authenticated;
GRANT ALL ON public.patient_members TO service_role;
ALTER TABLE public.patient_members ENABLE ROW LEVEL SECURITY;

-- Códigos de convite criados pelo cuidador
CREATE TABLE public.patient_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX patient_invites_patient_ativo_idx
  ON public.patient_invites(patient_id) WHERE ativo;

GRANT SELECT ON public.patient_invites TO authenticated;
GRANT ALL ON public.patient_invites TO service_role;
ALTER TABLE public.patient_invites ENABLE ROW LEVEL SECURITY;

-- Verifica acesso (dono ou convidado) sem recursão de RLS
CREATE OR REPLACE FUNCTION public.pode_ver_paciente(_patient_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = _patient_id AND p.owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.patient_members m
    WHERE m.patient_id = _patient_id AND m.user_id = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.pode_ver_paciente(UUID, UUID) TO authenticated;

CREATE POLICY "members read own memberships"
ON public.patient_members FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.pode_ver_paciente(patient_id, auth.uid()));

CREATE POLICY "owner or self removes membership"
ON public.patient_members FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.owner_id = auth.uid())
);

CREATE POLICY "owner reads invites"
ON public.patient_invites FOR SELECT TO authenticated
USING (owner_id = auth.uid());

-- Convidados podem ver o paciente e seus registros
CREATE POLICY "guests read patient"
ON public.patients FOR SELECT TO authenticated
USING (public.pode_ver_paciente(id, auth.uid()));

CREATE POLICY "guests read meds"
ON public.medications FOR SELECT TO authenticated
USING (public.pode_ver_paciente(patient_id, auth.uid()));

CREATE POLICY "guests read dose logs"
ON public.dose_logs FOR SELECT TO authenticated
USING (public.pode_ver_paciente(patient_id, auth.uid()));

-- Gera (ou reaproveita) o código de convite de um paciente do cuidador
CREATE OR REPLACE FUNCTION public.gerar_codigo_convite(_patient_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_code TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'nao autenticado';
  END IF;

  SELECT owner_id INTO v_owner FROM public.patients WHERE id = _patient_id;
  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'sem permissao';
  END IF;

  SELECT code INTO v_code
  FROM public.patient_invites
  WHERE patient_id = _patient_id AND ativo
  LIMIT 1;

  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  LOOP
    v_code := upper(substr(replace(encode(gen_random_bytes(6), 'base64'), '/', ''), 1, 6));
    v_code := translate(v_code, '+=OI01', 'ABCDEF');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.patient_invites WHERE code = v_code);
  END LOOP;

  INSERT INTO public.patient_invites (patient_id, owner_id, code)
  VALUES (_patient_id, auth.uid(), v_code);

  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.gerar_codigo_convite(UUID) TO authenticated;

-- Entra como convidado usando um código
CREATE OR REPLACE FUNCTION public.entrar_com_codigo(_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient UUID;
  v_owner UUID;
  v_nome TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'nao autenticado';
  END IF;

  SELECT i.patient_id, i.owner_id, p.nome
  INTO v_patient, v_owner, v_nome
  FROM public.patient_invites i
  JOIN public.patients p ON p.id = i.patient_id
  WHERE upper(trim(i.code)) = upper(trim(_code)) AND i.ativo;

  IF v_patient IS NULL THEN
    RAISE EXCEPTION 'codigo invalido';
  END IF;

  IF v_owner = auth.uid() THEN
    RETURN v_nome;
  END IF;

  INSERT INTO public.patient_members (patient_id, user_id)
  VALUES (v_patient, auth.uid())
  ON CONFLICT (patient_id, user_id) DO NOTHING;

  RETURN v_nome;
END;
$$;

GRANT EXECUTE ON FUNCTION public.entrar_com_codigo(TEXT) TO authenticated;