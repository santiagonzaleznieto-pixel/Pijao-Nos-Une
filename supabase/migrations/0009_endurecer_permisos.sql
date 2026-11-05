-- Pijao Nos Une · 0009 · cierra la ejecución de funciones para usuarios sin sesión y fija search_path
revoke execute on all functions in schema public from public, anon;
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon;

alter function public.fn_touch() set search_path = public, pg_temp;
alter function public.sumar_dias_habiles(date, int) set search_path = public, pg_temp;
alter function public.fn_auditoria_solo_agregar() set search_path = public, pg_temp;
alter function public.dist_m(double precision, double precision, double precision, double precision) set search_path = public, pg_temp;
alter function public.estado_por_resultado(text) set search_path = public, pg_temp;
