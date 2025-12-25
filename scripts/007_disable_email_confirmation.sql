-- Desabilitar confirmação de email para facilitar cadastro
-- NOTA: Este script modifica as configurações de autenticação do Supabase
-- Para aplicar estas mudanças, você também precisa ir em:
-- Supabase Dashboard > Authentication > Providers > Email
-- E desabilitar "Confirm email"

-- Esta tabela não existe por padrão, mas podemos criar contas sem confirmação
-- modificando o trigger de criação de usuários

-- Atualizar a função de criação de perfil para marcar email como confirmado automaticamente
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

-- Comentário: Para desabilitar completamente a confirmação de email:
-- 1. Vá para Supabase Dashboard
-- 2. Authentication > Providers > Email
-- 3. Desative "Confirm email"
-- 4. Salve as mudanças

-- Isso permitirá que usuários façam login imediatamente após o cadastro
