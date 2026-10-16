-- Give each application user a foreign key to the data-driven plans catalog.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.plans(id);

UPDATE public.users AS app_user
SET plan_id = (
  SELECT id
  FROM public.plans
  WHERE tier_code = 0
  ORDER BY id
  LIMIT 1
)
WHERE app_user.plan_id IS NULL;

ALTER TABLE public.users
  ALTER COLUMN plan_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS users_plan_id_idx ON public.users(plan_id);
