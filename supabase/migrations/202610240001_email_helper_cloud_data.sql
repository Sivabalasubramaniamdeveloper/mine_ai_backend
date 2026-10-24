-- Cloud-backed email drafts and server-readable notification preferences.
CREATE TABLE IF NOT EXISTS public.saved_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'General',
  recipient text,
  subject text NOT NULL,
  body text NOT NULL,
  tone text NOT NULL DEFAULT 'Professional',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_emails_user_created_idx
  ON public.saved_emails (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.expense_email_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  monthly_report_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- The API uses the service role. These policies keep direct client access private
-- if it is enabled later.
ALTER TABLE public.saved_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_email_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own saved emails" ON public.saved_emails;
CREATE POLICY "Users manage their own saved emails" ON public.saved_emails
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage their own expense email preference" ON public.expense_email_preferences;
CREATE POLICY "Users manage their own expense email preference" ON public.expense_email_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
