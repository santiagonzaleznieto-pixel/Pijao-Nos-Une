-- Corrige rpc_registrar_visita: añadir un texto a un arreglo (text[] || 'texto') fallaba. Ahora lleva ::text.
do $$
declare d text;
begin
  select pg_get_functiondef('public.rpc_registrar_visita(jsonb)'::regprocedure) into d;
  d := regexp_replace(d, '(v_motivos|v_avisos) := (v_motivos|v_avisos) \|\| ''([^'']*)''(?!::text)', '\1 := \2 || ''\3''::text', 'g');
  execute d;
end $$;
