-- Corrige o problema de recursão infinita nas políticas RLS
-- Remove políticas problemáticas e cria novas sem recursão

-- Remove todas as políticas da tabela profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Teachers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Teachers can update student classes" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Cria políticas sem recursão usando auth.jwt() para verificar role
-- Todos podem ver seu próprio perfil
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Professores podem ver todos os perfis (usando JWT para evitar recursão)
CREATE POLICY "Teachers can view all profiles"
ON profiles FOR SELECT
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'teacher'
);

-- Usuários podem atualizar seu próprio perfil
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Professores podem atualizar o class_id de alunos (usando JWT)
CREATE POLICY "Teachers can update student classes"
ON profiles FOR UPDATE
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'teacher' AND
  role = 'student'
)
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'teacher' AND
  role = 'student'
);
