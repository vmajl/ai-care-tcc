-- Perfis
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Pacientes
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX patients_owner_idx ON public.patients(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own patients select" ON public.patients FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "own patients insert" ON public.patients FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "own patients update" ON public.patients FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "own patients delete" ON public.patients FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- Medicamentos
CREATE TABLE public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  dosagem TEXT NOT NULL DEFAULT '',
  instrucoes TEXT,
  intervalo_horas INTEGER NOT NULL DEFAULT 24,
  primeiro_horario TEXT NOT NULL DEFAULT '08:00',
  continuo BOOLEAN NOT NULL DEFAULT true,
  data_fim DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX medications_patient_idx ON public.medications(patient_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medications TO authenticated;
GRANT ALL ON public.medications TO service_role;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own meds select" ON public.medications FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "own meds insert" ON public.medications FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "own meds update" ON public.medications FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "own meds delete" ON public.medications FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- Registro de doses tomadas
CREATE TABLE public.dose_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  horario_previsto TIMESTAMPTZ NOT NULL,
  tomado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (medication_id, horario_previsto)
);
CREATE INDEX dose_logs_patient_idx ON public.dose_logs(patient_id, horario_previsto);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dose_logs TO authenticated;
GRANT ALL ON public.dose_logs TO service_role;
ALTER TABLE public.dose_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own logs select" ON public.dose_logs FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "own logs insert" ON public.dose_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "own logs delete" ON public.dose_logs FOR DELETE TO authenticated USING (auth.uid() = owner_id);