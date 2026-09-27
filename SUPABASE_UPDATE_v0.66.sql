-- BANDA DE LA CALA v0.66
-- Permite a ADMIN/GESTOR eliminar definitivament registres d'archive_submissions.
-- Executar UNA SOLA VEGADA al SQL Editor del projecte Supabase.

begin;

grant delete on public.archive_submissions to authenticated;

drop policy if exists "archive submissions editor delete" on public.archive_submissions;
create policy "archive submissions editor delete"
on public.archive_submissions for delete to authenticated
using (public.is_banda_editor());

commit;
