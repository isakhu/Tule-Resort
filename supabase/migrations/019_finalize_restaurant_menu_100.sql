-- Migration 018 was intentionally broad; remove five demo drink entries so the
-- final Restaurant department menu contains exactly 100 seeded demo items.
BEGIN;

DELETE FROM public.menu_items
WHERE name IN (
  'Macchiato',
  'Cappuccino',
  'Latte',
  'Fresh Avocado Juice',
  'Fresh Papaya Juice'
);

COMMIT;
