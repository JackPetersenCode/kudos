-- Backfill categories.parent_slug from the curated category tree.
--
-- Some categories (e.g. bar, salon, coffee-shop) were imported without a
-- parent_slug. That broke:
--   * the search category "pills" (they filter to specific categories), and
--   * group-category searches (e.g. category=health-beauty matches children via
--     parent_slug, so salons with a NULL parent_slug were never returned).
--
-- Safe to re-run (idempotent). Run against the production DB, e.g.:
--   psql "$DATABASE_URL" -f Kudos.Server/sql/backfill_category_parents.sql
-- or paste into Railway's Postgres "Query" tab.

UPDATE categories SET parent_slug = 'food-drink'
WHERE slug IN ('restaurant','coffee-shop','bakery','bar','brewery','wine-bar',
  'dessert-shop','ice-cream-shop','food-truck','juice-bar','deli','pizza',
  'seafood','steakhouse','sushi','mexican','italian','bbq','breakfast-brunch',
  'fruit-stand','other-food-drink');

UPDATE categories SET parent_slug = 'shopping'
WHERE slug IN ('clothing-store','bookstore','gift-shop','jewelry-store','florist',
  'furniture-store','home-decor','electronics-store','pet-store','toy-store',
  'thrift-store','grocery-store','farmers-market-vendor','other-shopping');

UPDATE categories SET parent_slug = 'health-beauty'
WHERE slug IN ('salon','barber-shop','spa','massage','nail-salon','gym',
  'yoga-studio','pilates-studio','personal-trainer','skincare','tattoo-shop',
  'other-health-beauty');

UPDATE categories SET parent_slug = 'home-auto'
WHERE slug IN ('auto-repair','car-wash','detailing','plumber','electrician','hvac',
  'landscaping','cleaning-service','handyman','roofing','moving-company',
  'pest-control','other-home-auto');

UPDATE categories SET parent_slug = 'professional-services'
WHERE slug IN ('law-firm','accounting','insurance-agency','real-estate',
  'marketing-agency','web-design','photography','printing','consulting',
  'event-planning','other-professional-services');

UPDATE categories SET parent_slug = 'entertainment-recreation'
WHERE slug IN ('movie-theater','bowling-alley','arcade','music-venue','museum',
  'art-gallery','park','escape-room','mini-golf','dance-studio',
  'other-entertainment-recreation');

-- The 6 top-level groups must have NO parent.
UPDATE categories SET parent_slug = NULL
WHERE slug IN ('food-drink','shopping','health-beauty','home-auto',
  'professional-services','entertainment-recreation');
