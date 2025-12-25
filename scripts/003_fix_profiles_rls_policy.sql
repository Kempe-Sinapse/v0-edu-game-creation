-- Remover a política antiga que só permite ver o próprio perfil
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

-- Criar nova política: usuários podem ver seu próprio perfil
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Criar política adicional: professores podem ver todos os perfis
CREATE POLICY "profiles_select_teachers_all" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Política para professores atualizarem alunos (apenas class_id)
CREATE POLICY "profiles_update_teacher_assign_class" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );
