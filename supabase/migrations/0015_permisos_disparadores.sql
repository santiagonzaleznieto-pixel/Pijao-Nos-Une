-- Pijao Nos Une · 0015 · higiene de permisos (aviso 0029 del asesor de seguridad de Supabase)
-- Las funciones de disparador no deben quedar expuestas en la API. Los disparadores siguen funcionando:
-- PostgreSQL revisa el permiso de ejecución al crear el disparador, no cada vez que se dispara.
revoke all on function public.fn_auditoria_encadenar() from public, anon, authenticated;
revoke all on function public.fn_auth_antes_de_crear() from public, anon, authenticated;
revoke all on function public.fn_auth_despues_de_crear() from public, anon, authenticated;
revoke all on function public.fn_auditoria_solo_agregar() from public, anon, authenticated;
revoke all on function public.fn_touch() from public, anon, authenticated;
