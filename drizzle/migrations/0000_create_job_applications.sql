CREATE TABLE public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  external_id text,
  title text NOT NULL,
  company text,
  location text,
  url text,
  description text,
  salary text,
  contact_email text,
  match_score int,
  status text NOT NULL DEFAULT 'saved',
  cover_letter text,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, external_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_applications TO authenticated;
GRANT ALL ON public.job_applications TO service_role;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own apps select" ON public.job_applications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own apps insert" ON public.job_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own apps update" ON public.job_applications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own apps delete" ON public.job_applications FOR DELETE TO authenticated USING (auth.uid() = user_id);