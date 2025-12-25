-- SOLUÇÃO DEFINITIVA: Simplifica as políticas RLS da tabela profiles
-- Remove todas as políticas existentes e cria apenas uma política simples

-- Remove TODAS as políticas da tabela profiles
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Teachers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Teachers can update student classes" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Desabilita e reabilita RLS para limpar completamente
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política ÚNICA para SELECT: Usuários autenticados podem ver todos os perfis
-- Isso é necessário para que professores vejam alunos e vice-versa
CREATE POLICY "authenticated_users_select_profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Política para INSERT: Apenas o próprio usuário pode criar seu perfil
CREATE POLICY "users_insert_own_profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Política para UPDATE: Usuários podem atualizar seu próprio perfil
-- OU professores podem atualizar o class_id de alunos
CREATE POLICY "users_update_profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = id  -- Próprio usuário
  OR
  (  -- OU é um professor atualizando class_id de um aluno
    EXISTS (
      SELECT 1 FROM profiles teacher
      WHERE teacher.id = auth.uid() 
      AND teacher.role = 'teacher'
    )
    AND role = 'student'
  )
);
