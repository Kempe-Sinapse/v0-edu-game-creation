-- Create profiles table for user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create games table
CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  time_limit INTEGER NOT NULL DEFAULT 60, -- seconds
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create game_questions table
CREATE TABLE IF NOT EXISTS public.game_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create word_bank table (words available to drag and drop)
CREATE TABLE IF NOT EXISTS public.word_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  is_distractor BOOLEAN DEFAULT FALSE, -- false = correct answer, true = distractor
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create game_attempts table (student results)
CREATE TABLE IF NOT EXISTS public.game_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  time_taken INTEGER NOT NULL, -- seconds
  answers JSONB NOT NULL, -- stores array of {question_id, user_answer, is_correct}
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_attempts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Games policies
CREATE POLICY "games_select_all" ON public.games
  FOR SELECT USING (true); -- All authenticated users can view games

CREATE POLICY "games_insert_teacher" ON public.games
  FOR INSERT WITH CHECK (
    auth.uid() = teacher_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
  );

CREATE POLICY "games_update_teacher" ON public.games
  FOR UPDATE USING (
    auth.uid() = teacher_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
  );

CREATE POLICY "games_delete_teacher" ON public.games
  FOR DELETE USING (
    auth.uid() = teacher_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
  );

-- Game questions policies
CREATE POLICY "game_questions_select_all" ON public.game_questions
  FOR SELECT USING (true);

CREATE POLICY "game_questions_insert_teacher" ON public.game_questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.games g
      INNER JOIN public.profiles p ON g.teacher_id = p.id
      WHERE g.id = game_id AND p.id = auth.uid() AND p.role = 'teacher'
    )
  );

CREATE POLICY "game_questions_update_teacher" ON public.game_questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.games g
      INNER JOIN public.profiles p ON g.teacher_id = p.id
      WHERE g.id = game_id AND p.id = auth.uid() AND p.role = 'teacher'
    )
  );

CREATE POLICY "game_questions_delete_teacher" ON public.game_questions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.games g
      INNER JOIN public.profiles p ON g.teacher_id = p.id
      WHERE g.id = game_id AND p.id = auth.uid() AND p.role = 'teacher'
    )
  );

-- Word bank policies (same as game_questions)
CREATE POLICY "word_bank_select_all" ON public.word_bank
  FOR SELECT USING (true);

CREATE POLICY "word_bank_insert_teacher" ON public.word_bank
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.games g
      INNER JOIN public.profiles p ON g.teacher_id = p.id
      WHERE g.id = game_id AND p.id = auth.uid() AND p.role = 'teacher'
    )
  );

CREATE POLICY "word_bank_delete_teacher" ON public.word_bank
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.games g
      INNER JOIN public.profiles p ON g.teacher_id = p.id
      WHERE g.id = game_id AND p.id = auth.uid() AND p.role = 'teacher'
    )
  );

-- Game attempts policies
CREATE POLICY "game_attempts_select_own" ON public.game_attempts
  FOR SELECT USING (
    auth.uid() = student_id OR
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_id AND g.teacher_id = auth.uid()
    )
  );

CREATE POLICY "game_attempts_insert_student" ON public.game_attempts
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', SPLIT_PART(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_games_teacher_id ON public.games(teacher_id);
CREATE INDEX IF NOT EXISTS idx_game_questions_game_id ON public.game_questions(game_id);
CREATE INDEX IF NOT EXISTS idx_word_bank_game_id ON public.word_bank(game_id);
CREATE INDEX IF NOT EXISTS idx_game_attempts_game_id ON public.game_attempts(game_id);
CREATE INDEX IF NOT EXISTS idx_game_attempts_student_id ON public.game_attempts(student_id);
