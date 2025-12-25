-- Criando tabela de turmas
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionando class_id aos profiles dos estudantes
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

-- Adicionando campos de publicação e turma aos jogos
ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Adicionando campo para permitir nova tentativa
ALTER TABLE public.game_attempts
ADD COLUMN IF NOT EXISTS can_retry BOOLEAN DEFAULT FALSE;

-- Modificando a estrutura de perguntas para suportar múltiplas respostas
ALTER TABLE public.game_questions
DROP COLUMN IF EXISTS correct_answer;

ALTER TABLE public.game_questions
ADD COLUMN IF NOT EXISTS correct_answers JSONB NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS distractors JSONB NOT NULL DEFAULT '[]';

-- Removendo a tabela word_bank já que agora cada pergunta tem suas próprias palavras
DROP TABLE IF EXISTS public.word_bank;

-- RLS Policies para classes
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classes_select_teacher" ON public.classes
  FOR SELECT USING (
    auth.uid() = teacher_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND class_id = classes.id)
  );

CREATE POLICY "classes_insert_teacher" ON public.classes
  FOR INSERT WITH CHECK (
    auth.uid() = teacher_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
  );

CREATE POLICY "classes_update_teacher" ON public.classes
  FOR UPDATE USING (
    auth.uid() = teacher_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
  );

CREATE POLICY "classes_delete_teacher" ON public.classes
  FOR DELETE USING (
    auth.uid() = teacher_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
  );

-- Atualizar política de games para incluir turma e publicação
DROP POLICY IF EXISTS "games_select_all" ON public.games;

CREATE POLICY "games_select_published" ON public.games
  FOR SELECT USING (
    -- Teacher pode ver seus próprios jogos
    auth.uid() = teacher_id OR
    -- Alunos podem ver apenas jogos publicados de sua turma
    (
      is_published = true AND
      class_id IN (SELECT class_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON public.classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_profiles_class_id ON public.profiles(class_id);
CREATE INDEX IF NOT EXISTS idx_games_class_id ON public.games(class_id);
CREATE INDEX IF NOT EXISTS idx_games_published ON public.games(is_published);
