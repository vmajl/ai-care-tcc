-- Modelo de acesso por paciente.
ALTER TABLE public.patient_invites ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.patient_invites ADD COLUMN IF NOT EXISTS relacao TEXT NOT NULL DEFAULT 'familiar';
ALTER TABLE public.patient_invites ADD COLUMN IF NOT EXISTS nivel_acesso TEXT NOT NULL DEFAULT 'visualizacao';
ALTER TABLE public.patient_invites DROP CONSTRAINT IF EXISTS patient_invites_relacao_check;
ALTER TABLE public.patient_invites ADD CONSTRAINT patient_invites_relacao_check CHECK (relacao IN ('familiar','cuidador'));
ALTER TABLE public.patient_invites DROP CONSTRAINT IF EXISTS patient_invites_nivel_acesso_check;
ALTER TABLE public.patient_invites ADD CONSTRAINT patient_invites_nivel_acesso_check CHECK (nivel_acesso IN ('administrador','visualizacao'));

CREATE TABLE IF NOT EXISTS public.patient_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relacao TEXT NOT NULL DEFAULT 'familiar',
  nivel_acesso TEXT NOT NULL DEFAULT 'visualizacao',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(patient_id,user_id)
);
ALTER TABLE public.patient_members ADD COLUMN IF NOT EXISTS relacao TEXT NOT NULL DEFAULT 'familiar';
ALTER TABLE public.patient_members ADD COLUMN IF NOT EXISTS nivel_acesso TEXT NOT NULL DEFAULT 'visualizacao';
ALTER TABLE public.patient_members DROP CONSTRAINT IF EXISTS patient_members_relacao_check;
ALTER TABLE public.patient_members ADD CONSTRAINT patient_members_relacao_check CHECK (relacao IN ('familiar','cuidador'));
ALTER TABLE public.patient_members DROP CONSTRAINT IF EXISTS patient_members_nivel_acesso_check;
ALTER TABLE public.patient_members ADD CONSTRAINT patient_members_nivel_acesso_check CHECK (nivel_acesso IN ('administrador_principal','administrador','visualizacao'));
CREATE UNIQUE INDEX IF NOT EXISTS patient_members_patient_user_unique ON public.patient_members(patient_id,user_id);
CREATE INDEX IF NOT EXISTS patient_members_patient_idx ON public.patient_members(patient_id);
CREATE INDEX IF NOT EXISTS patient_members_user_idx ON public.patient_members(user_id);

INSERT INTO public.patient_members(patient_id,user_id,relacao,nivel_acesso)
SELECT p.id,p.owner_id,'familiar','administrador_principal' FROM public.patients p
WHERE NOT EXISTS(SELECT 1 FROM public.patient_members m WHERE m.patient_id=p.id AND m.user_id=p.owner_id)
ON CONFLICT(patient_id,user_id) DO UPDATE SET relacao='familiar',nivel_acesso='administrador_principal';

CREATE OR REPLACE FUNCTION public.eh_membro_paciente(_patient_id UUID,_user_id UUID DEFAULT auth.uid()) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.patient_members m WHERE m.patient_id=_patient_id AND m.user_id=_user_id) OR EXISTS(SELECT 1 FROM public.patients p WHERE p.id=_patient_id AND p.owner_id=_user_id); $$;
CREATE OR REPLACE FUNCTION public.pode_administrar_paciente(_patient_id UUID,_user_id UUID DEFAULT auth.uid()) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.patients p WHERE p.id=_patient_id AND p.owner_id=_user_id) OR EXISTS(SELECT 1 FROM public.patient_members m WHERE m.patient_id=_patient_id AND m.user_id=_user_id AND m.nivel_acesso IN('administrador_principal','administrador')); $$;
CREATE OR REPLACE FUNCTION public.eh_administrador_principal(_patient_id UUID,_user_id UUID DEFAULT auth.uid()) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.patients p WHERE p.id=_patient_id AND p.owner_id=_user_id) OR EXISTS(SELECT 1 FROM public.patient_members m WHERE m.patient_id=_patient_id AND m.user_id=_user_id AND m.nivel_acesso='administrador_principal'); $$;
CREATE OR REPLACE FUNCTION public.pode_ver_paciente(_patient_id UUID,_user_id UUID DEFAULT auth.uid()) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.eh_membro_paciente(_patient_id,_user_id); $$;

CREATE OR REPLACE FUNCTION public.gerar_codigo_convite(_patient_id UUID,_relacao TEXT DEFAULT 'familiar',_nivel_acesso TEXT DEFAULT 'visualizacao') RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_owner_id UUID; v_code TEXT;
BEGIN
 IF _relacao NOT IN('familiar','cuidador') THEN RAISE EXCEPTION 'Relação de convite inválida'; END IF;
 IF _nivel_acesso NOT IN('administrador','visualizacao') THEN RAISE EXCEPTION 'Nível de acesso inválido'; END IF;
 SELECT owner_id INTO v_owner_id FROM public.patients WHERE id=_patient_id;
 IF v_owner_id IS NULL OR NOT public.eh_administrador_principal(_patient_id,auth.uid()) THEN RAISE EXCEPTION 'Não autorizado'; END IF;
 SELECT code INTO v_code FROM public.patient_invites WHERE patient_id=_patient_id AND relacao=_relacao AND nivel_acesso=_nivel_acesso AND ativo=true ORDER BY criado_em ASC LIMIT 1;
 IF v_code IS NOT NULL THEN RETURN v_code; END IF;
 LOOP v_code:='AIC-'||upper(substr(md5(random()::text||clock_timestamp()::text||_patient_id::text),1,7)); EXIT WHEN NOT EXISTS(SELECT 1 FROM public.patient_invites WHERE code=v_code); END LOOP;
 INSERT INTO public.patient_invites(patient_id,owner_id,code,ativo,relacao,nivel_acesso) VALUES(_patient_id,v_owner_id,v_code,true,_relacao,_nivel_acesso);
 RETURN v_code;
END; $$;

DROP FUNCTION IF EXISTS public.validar_codigo_convite(TEXT);
CREATE FUNCTION public.validar_codigo_convite(_code TEXT) RETURNS TABLE(patient_id UUID,patient_name TEXT,relacao TEXT,nivel_acesso TEXT) LANGUAGE sql SECURITY DEFINER SET search_path=public AS $ SELECT p.id,p.nome,i.relacao,i.nivel_acesso FROM public.patient_invites i JOIN public.patients p ON p.id=i.patient_id WHERE upper(trim(i.code))=upper(trim(_code)) AND i.ativo=true AND(i.expira_em IS NULL OR i.expira_em>now()) LIMIT 1; $;

CREATE OR REPLACE FUNCTION public.entrar_com_codigo(_code TEXT) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_invite public.patient_invites%ROWTYPE; v_existing TEXT; v_rank_existing INT; v_rank_new INT;
BEGIN
 SELECT * INTO v_invite FROM public.patient_invites WHERE upper(trim(code))=upper(trim(_code)) AND ativo=true AND(expira_em IS NULL OR expira_em>now()) LIMIT 1;
 IF v_invite.id IS NULL THEN RAISE EXCEPTION 'Código de convite inválido ou expirado'; END IF;
 v_rank_new:=CASE v_invite.nivel_acesso WHEN 'administrador' THEN 2 WHEN 'visualizacao' THEN 1 ELSE 0 END;
 SELECT nivel_acesso INTO v_existing FROM public.patient_members WHERE patient_id=v_invite.patient_id AND user_id=auth.uid();
 IF v_existing IS NULL THEN
   INSERT INTO public.patient_members(patient_id,user_id,relacao,nivel_acesso) VALUES(v_invite.patient_id,auth.uid(),v_invite.relacao,v_invite.nivel_acesso);
 ELSE
   v_rank_existing:=CASE v_existing WHEN 'administrador_principal' THEN 3 WHEN 'administrador' THEN 2 WHEN 'visualizacao' THEN 1 ELSE 0 END;
   IF v_rank_new>v_rank_existing THEN UPDATE public.patient_members SET relacao=v_invite.relacao,nivel_acesso=v_invite.nivel_acesso WHERE patient_id=v_invite.patient_id AND user_id=auth.uid(); END IF;
 END IF;
 RETURN v_invite.patient_id;
END; $$;

CREATE OR REPLACE FUNCTION public.listar_membros_paciente(_patient_id UUID) RETURNS TABLE(user_id UUID,nome TEXT,relacao TEXT,nivel_acesso TEXT) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT m.user_id,COALESCE(pr.nome,'Usuário'),m.relacao,m.nivel_acesso FROM public.patient_members m LEFT JOIN public.profiles pr ON pr.id=m.user_id WHERE m.patient_id=_patient_id AND public.eh_membro_paciente(_patient_id,auth.uid()); $$;

CREATE OR REPLACE FUNCTION public.alterar_nivel_membro(_patient_id UUID,_user_id UUID,_nivel_acesso TEXT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.eh_administrador_principal(_patient_id,auth.uid()) THEN RAISE EXCEPTION 'Apenas o administrador principal pode alterar permissões'; END IF;
 IF _nivel_acesso NOT IN('administrador','visualizacao') THEN RAISE EXCEPTION 'Nível de acesso inválido'; END IF;
 IF _user_id=auth.uid() THEN RAISE EXCEPTION 'O administrador principal não pode remover a própria administração'; END IF;
 UPDATE public.patient_members SET nivel_acesso=_nivel_acesso WHERE patient_id=_patient_id AND user_id=_user_id;
END; $$;

CREATE OR REPLACE FUNCTION public.remover_membro_paciente(_patient_id UUID,_user_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.eh_administrador_principal(_patient_id,auth.uid()) THEN RAISE EXCEPTION 'Apenas o administrador principal pode remover acessos'; END IF;
 IF _user_id=auth.uid() THEN RAISE EXCEPTION 'O administrador principal não pode remover o próprio acesso'; END IF;
 DELETE FROM public.patient_members WHERE patient_id=_patient_id AND user_id=_user_id;
END; $$;

ALTER TABLE public.patient_members ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.patient_members TO authenticated;
DROP POLICY IF EXISTS "patient members select" ON public.patient_members;
CREATE POLICY "patient members select" ON public.patient_members FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.eh_administrador_principal(patient_id,auth.uid()));
DROP POLICY IF EXISTS "patient members insert" ON public.patient_members;
CREATE POLICY "patient members insert" ON public.patient_members FOR INSERT TO authenticated WITH CHECK(public.eh_administrador_principal(patient_id,auth.uid()));
DROP POLICY IF EXISTS "patient members update" ON public.patient_members;
CREATE POLICY "patient members update" ON public.patient_members FOR UPDATE TO authenticated USING(public.eh_administrador_principal(patient_id,auth.uid())) WITH CHECK(public.eh_administrador_principal(patient_id,auth.uid()));
DROP POLICY IF EXISTS "patient members delete" ON public.patient_members;
CREATE POLICY "patient members delete" ON public.patient_members FOR DELETE TO authenticated USING(public.eh_administrador_principal(patient_id,auth.uid()));

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "patients select" ON public.patients;
CREATE POLICY "patients select" ON public.patients FOR SELECT TO authenticated USING(public.eh_membro_paciente(id,auth.uid()));
DROP POLICY IF EXISTS "patients update" ON public.patients;
CREATE POLICY "patients update" ON public.patients FOR UPDATE TO authenticated USING(public.pode_administrar_paciente(id,auth.uid())) WITH CHECK(public.pode_administrar_paciente(id,auth.uid()));

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "medications member select" ON public.medications;
CREATE POLICY "medications member select" ON public.medications FOR SELECT TO authenticated USING(public.eh_membro_paciente(patient_id,auth.uid()));
DROP POLICY IF EXISTS "medications admin insert" ON public.medications;
CREATE POLICY "medications admin insert" ON public.medications FOR INSERT TO authenticated WITH CHECK(public.pode_administrar_paciente(patient_id,auth.uid()));
DROP POLICY IF EXISTS "medications admin update" ON public.medications;
CREATE POLICY "medications admin update" ON public.medications FOR UPDATE TO authenticated USING(public.pode_administrar_paciente(patient_id,auth.uid())) WITH CHECK(public.pode_administrar_paciente(patient_id,auth.uid()));
DROP POLICY IF EXISTS "medications admin delete" ON public.medications;
CREATE POLICY "medications admin delete" ON public.medications FOR DELETE TO authenticated USING(public.pode_administrar_paciente(patient_id,auth.uid()));

ALTER TABLE public.dose_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dose logs member select" ON public.dose_logs;
CREATE POLICY "dose logs member select" ON public.dose_logs FOR SELECT TO authenticated USING(public.eh_membro_paciente(patient_id,auth.uid()));
DROP POLICY IF EXISTS "dose logs admin insert" ON public.dose_logs;
CREATE POLICY "dose logs admin insert" ON public.dose_logs FOR INSERT TO authenticated WITH CHECK(public.pode_administrar_paciente(patient_id,auth.uid()));
DROP POLICY IF EXISTS "dose logs admin update" ON public.dose_logs;
CREATE POLICY "dose logs admin update" ON public.dose_logs FOR UPDATE TO authenticated USING(public.pode_administrar_paciente(patient_id,auth.uid())) WITH CHECK(public.pode_administrar_paciente(patient_id,auth.uid()));
DROP POLICY IF EXISTS "dose logs admin delete" ON public.dose_logs;
CREATE POLICY "dose logs admin delete" ON public.dose_logs FOR DELETE TO authenticated USING(public.pode_administrar_paciente(patient_id,auth.uid()));

ALTER TABLE public.patient_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "patient invites admin select" ON public.patient_invites;
CREATE POLICY "patient invites admin select" ON public.patient_invites FOR SELECT TO authenticated USING(public.pode_administrar_paciente(patient_id,auth.uid()));
DROP POLICY IF EXISTS "patient invites admin insert" ON public.patient_invites;
CREATE POLICY "patient invites admin insert" ON public.patient_invites FOR INSERT TO authenticated WITH CHECK(public.pode_administrar_paciente(patient_id,auth.uid()));
DROP POLICY IF EXISTS "patient invites admin update" ON public.patient_invites;
CREATE POLICY "patient invites admin update" ON public.patient_invites FOR UPDATE TO authenticated USING(public.pode_administrar_paciente(patient_id,auth.uid())) WITH CHECK(public.pode_administrar_paciente(patient_id,auth.uid()));
DROP POLICY IF EXISTS "patient invites admin delete" ON public.patient_invites;
CREATE POLICY "patient invites admin delete" ON public.patient_invites FOR DELETE TO authenticated USING(public.pode_administrar_paciente(patient_id,auth.uid()));

CREATE OR REPLACE FUNCTION public.adicionar_dono_como_admin_principal() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN INSERT INTO public.patient_members(patient_id,user_id,relacao,nivel_acesso) VALUES(NEW.id,NEW.owner_id,'familiar','administrador_principal') ON CONFLICT(patient_id,user_id) DO UPDATE SET relacao='familiar',nivel_acesso='administrador_principal'; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS patient_owner_membership ON public.patients;
CREATE TRIGGER patient_owner_membership AFTER INSERT ON public.patients FOR EACH ROW EXECUTE FUNCTION public.adicionar_dono_como_admin_principal();

GRANT EXECUTE ON FUNCTION public.eh_membro_paciente(UUID,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_administrar_paciente(UUID,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eh_administrador_principal(UUID,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_codigo_convite(UUID,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validar_codigo_convite(TEXT) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.entrar_com_codigo(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_membros_paciente(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.alterar_nivel_membro(UUID,UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remover_membro_paciente(UUID,UUID) TO authenticated;
