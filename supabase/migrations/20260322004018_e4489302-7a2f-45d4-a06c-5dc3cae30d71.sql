
-- Generations history table
CREATE TABLE public.generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id text NOT NULL,
  tool_name text NOT NULL,
  inputs jsonb NOT NULL DEFAULT '{}',
  output text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own generations" ON public.generations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generations" ON public.generations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own generations" ON public.generations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_generations_user_id ON public.generations(user_id);
CREATE INDEX idx_generations_tool_id ON public.generations(tool_id);

-- Drafts table for auto-saving form inputs
CREATE TABLE public.drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id text NOT NULL,
  inputs jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tool_id)
);

ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own drafts" ON public.drafts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drafts" ON public.drafts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drafts" ON public.drafts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own drafts" ON public.drafts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage bucket for CV uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cv-uploads', 'cv-uploads', false, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']);

-- Storage RLS for cv-uploads
CREATE POLICY "Users can upload own CVs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cv-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own CVs" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'cv-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own CVs" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'cv-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Function to check and increment usage
CREATE OR REPLACE FUNCTION public.check_and_increment_usage(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles;
  v_today date := current_date;
  v_result jsonb;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'Profile not found');
  END IF;

  IF v_profile.is_premium THEN
    UPDATE profiles 
    SET generations_today = CASE WHEN last_generation_date = v_today THEN generations_today + 1 ELSE 1 END,
        last_generation_date = v_today,
        updated_at = now()
    WHERE id = p_user_id;
    RETURN jsonb_build_object('allowed', true, 'remaining', -1, 'is_premium', true);
  END IF;

  IF v_profile.last_generation_date IS NULL OR v_profile.last_generation_date < v_today THEN
    UPDATE profiles 
    SET generations_today = 1, last_generation_date = v_today, updated_at = now()
    WHERE id = p_user_id;
    RETURN jsonb_build_object('allowed', true, 'remaining', 4, 'is_premium', false);
  END IF;

  IF v_profile.generations_today >= 5 THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'is_premium', false, 'error', 'Daily limit reached');
  END IF;

  UPDATE profiles 
  SET generations_today = generations_today + 1, updated_at = now()
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object('allowed', true, 'remaining', 4 - v_profile.generations_today, 'is_premium', false);
END;
$$;
