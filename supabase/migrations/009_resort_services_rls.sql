-- Persist the manager permissions applied to public.resort_services.
-- Managers/admins can manage services; guests can read them.

ALTER TABLE public.resort_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resort_services_public_read ON public.resort_services;
CREATE POLICY resort_services_public_read
ON public.resort_services
FOR SELECT
USING (true);

DROP POLICY IF EXISTS resort_services_manager_insert ON public.resort_services;
CREATE POLICY resort_services_manager_insert
ON public.resort_services
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
      AND r.name IN ('admin', 'manager')
  )
);

DROP POLICY IF EXISTS resort_services_manager_update ON public.resort_services;
CREATE POLICY resort_services_manager_update
ON public.resort_services
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
      AND r.name IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
      AND r.name IN ('admin', 'manager')
  )
);

DROP POLICY IF EXISTS resort_services_manager_delete ON public.resort_services;
CREATE POLICY resort_services_manager_delete
ON public.resort_services
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
      AND r.name IN ('admin', 'manager')
  )
);
