-- Estoque disponível do medicamento para cada paciente.
-- A unidade é mantida separada para permitir, no futuro, calcular a duração
-- do estoque de acordo com a dose prescrita.
alter table public.medications
  add column if not exists quantidade_estoque numeric(12,2) not null default 0,
  add column if not exists unidade_estoque text not null default 'unidade';

alter table public.medications
  add constraint medications_quantidade_estoque_nonnegative
  check (quantidade_estoque >= 0);
