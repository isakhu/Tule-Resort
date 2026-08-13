-- Create trigger to insert notifications when new orders are created
-- This will create a notification row for each staff with access to the department

CREATE OR REPLACE FUNCTION public.notify_on_order_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  staff_row RECORD;
BEGIN
  -- Insert a general notification for department (for polling by department)
  INSERT INTO notifications (department_id, payload) VALUES (NEW.department_id, jsonb_build_object('type','order','order_id', NEW.id));

  -- Optionally, insert per-user notifications for staff with explicit access
  FOR staff_row IN SELECT user_id FROM staff_department_access WHERE department_id = NEW.department_id LOOP
    INSERT INTO notifications (user_id, department_id, payload) VALUES (staff_row.user_id, NEW.department_id, jsonb_build_object('type','order','order_id', NEW.id));
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_order_insert ON orders;
CREATE TRIGGER trg_notify_on_order_insert
AFTER INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION public.notify_on_order_insert();
