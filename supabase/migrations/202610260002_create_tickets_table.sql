-- Migration: Create Support Tickets Table in Supabase
-- Stores user support tickets, priority, category, and admin review notes.

CREATE TABLE IF NOT EXISTS public.tickets (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  user_name text NOT NULL,
  module text NOT NULL,
  category text NOT NULL,
  priority text NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indices for rapid querying by user and ticket status
CREATE INDEX IF NOT EXISTS tickets_user_id_idx ON public.tickets (user_id);
CREATE INDEX IF NOT EXISTS tickets_status_idx ON public.tickets (status);
CREATE INDEX IF NOT EXISTS tickets_created_at_idx ON public.tickets (created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Allow users to view and insert their own support tickets, while service role and admin can manage all
DROP POLICY IF EXISTS "Users can view and create their own tickets" ON public.tickets;
CREATE POLICY "Users can view and create their own tickets" ON public.tickets
  FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL)
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);
