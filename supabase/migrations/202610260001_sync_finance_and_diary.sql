-- Supabase migration for Multi-Tier Cloud Sync & Custom Categories
-- Enables automatic cloud backup for Pro & Premium users across Transactions, Budgets, Categories, and Personal Diary.

-- 1. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  amount numeric(12, 2) NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  category_id text NOT NULL,
  time timestamptz NOT NULL,
  update_time timestamptz NOT NULL DEFAULT now(),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_user_time_idx
  ON public.transactions (user_id, time DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own transactions" ON public.transactions;
CREATE POLICY "Users manage their own transactions" ON public.transactions
  FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL)
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- 2. Custom Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id text PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  icon text,
  color bigint,
  is_custom integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS categories_user_idx
  ON public.categories (user_id);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own categories" ON public.categories;
CREATE POLICY "Users manage their own categories" ON public.categories
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL OR auth.uid() IS NULL)
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- 3. Budgets Table
CREATE TABLE IF NOT EXISTS public.budgets (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id text NOT NULL,
  allocated_amount numeric(12, 2) NOT NULL,
  month_year text NOT NULL,
  edit_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS budgets_user_month_idx
  ON public.budgets (user_id, month_year);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own budgets" ON public.budgets;
CREATE POLICY "Users manage their own budgets" ON public.budgets
  FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL)
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- 4. Diary Entries Table
CREATE TABLE IF NOT EXISTS public.diary_entries (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date text NOT NULL,
  title text,
  content text,
  mood text NOT NULL,
  mood_score integer NOT NULL DEFAULT 3,
  template_id text NOT NULL DEFAULT 'standard',
  gender_preset text DEFAULT 'neutral',
  image_paths jsonb DEFAULT '[]'::jsonb,
  audio_path text,
  audio_duration integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS diary_entries_user_date_idx
  ON public.diary_entries (user_id, date DESC);

ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own diary entries" ON public.diary_entries;
CREATE POLICY "Users manage their own diary entries" ON public.diary_entries
  FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL)
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);
