-- ============================================
-- Migration: New Features
-- Staff Members, Staff Kudos, Business Responses,
-- Bookmarks, Helpful Votes, Business Claims,
-- Check-Ins, Seasonal Tags, User Badges
-- ============================================

-- 1. Staff Members
CREATE TABLE IF NOT EXISTS staff_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT,
    photo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at_utc TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_staff_members_business_id ON staff_members(business_id);

-- 2. Staff Kudos (reviews for staff)
CREATE TABLE IF NOT EXISTS staff_kudos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_member_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT,
    created_at_utc TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_staff_kudos_staff_member_id ON staff_kudos(staff_member_id);
CREATE INDEX IF NOT EXISTS idx_staff_kudos_business_id ON staff_kudos(business_id);

-- 3. Staff Kudos Tags
CREATE TABLE IF NOT EXISTS staff_kudos_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_kudos_id UUID NOT NULL REFERENCES staff_kudos(id) ON DELETE CASCADE,
    tag_name TEXT NOT NULL,
    created_at_utc TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_staff_kudos_tags_kudos_id ON staff_kudos_tags(staff_kudos_id);

-- 4. Business Responses to Reviews
CREATE TABLE IF NOT EXISTS review_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL UNIQUE REFERENCES reviews(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at_utc TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_review_responses_review_id ON review_responses(review_id);

-- 5. Bookmarks / Favorites
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    created_at_utc TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    UNIQUE (user_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);

-- 6. Helpful Votes on Reviews
CREATE TABLE IF NOT EXISTS review_helpful_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at_utc TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    UNIQUE (review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review_id ON review_helpful_votes(review_id);

-- 7. Business Claims
CREATE TABLE IF NOT EXISTS business_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, approved, rejected
    verification_note TEXT,
    admin_note TEXT,
    created_at_utc TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    resolved_at_utc TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_business_claims_business_id ON business_claims(business_id);
CREATE INDEX IF NOT EXISTS idx_business_claims_status ON business_claims(status);

-- 8. Check-Ins
CREATE TABLE IF NOT EXISTS check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    created_at_utc TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_business_id ON check_ins(business_id);

-- 9. Seasonal / Event Tags
CREATE TABLE IF NOT EXISTS business_seasonal_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    tag_name TEXT NOT NULL,
    expires_at_utc TIMESTAMP,
    created_at_utc TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_business_seasonal_tags_business_id ON business_seasonal_tags(business_id);

-- 10. User Badges
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_key TEXT NOT NULL,
    badge_label TEXT NOT NULL,
    awarded_at_utc TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    UNIQUE (user_id, badge_key)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);

-- 11. Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    email_on_new_review BOOLEAN NOT NULL DEFAULT TRUE,
    email_on_review_response BOOLEAN NOT NULL DEFAULT TRUE,
    email_on_new_kudos BOOLEAN NOT NULL DEFAULT TRUE,
    email_on_favorite_activity BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at_utc TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

-- 12. Notification Queue (for async sending)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,  -- new_review, review_response, new_kudos, favorite_activity
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_emailed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at_utc TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);

-- 13. Add stripe_payment_intent_id to ad_campaigns for payment tracking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ad_campaigns' AND column_name = 'stripe_payment_intent_id'
    ) THEN
        ALTER TABLE ad_campaigns ADD COLUMN stripe_payment_intent_id TEXT;
    END IF;
END $$;

-- 14. Email verification and password reset tokens
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'email_verified'
    ) THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN verification_token TEXT;
        ALTER TABLE users ADD COLUMN verification_token_expires_at TIMESTAMP;
        ALTER TABLE users ADD COLUMN reset_token TEXT;
        ALTER TABLE users ADD COLUMN reset_token_expires_at TIMESTAMP;
    END IF;
END $$;

-- 15. Premium business subscriptions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'businesses' AND column_name = 'is_premium'
    ) THEN
        ALTER TABLE businesses ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE businesses ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE businesses ADD COLUMN premium_expires_at TIMESTAMP;
    END IF;
END $$;

-- 16. Add display_name to users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'display_name'
    ) THEN
        ALTER TABLE users ADD COLUMN display_name TEXT;
    END IF;
END $$;

-- 17. Add claim verification fields
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'business_claims' AND column_name = 'verification_method'
    ) THEN
        ALTER TABLE business_claims ADD COLUMN verification_method TEXT;
        ALTER TABLE business_claims ADD COLUMN verification_code TEXT;
        ALTER TABLE business_claims ADD COLUMN verification_code_expires_at TIMESTAMP;
        ALTER TABLE business_claims ADD COLUMN verification_email TEXT;
        ALTER TABLE business_claims ADD COLUMN verification_phone TEXT;
    END IF;
END $$;

-- 18. Track who added a business
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'businesses' AND column_name = 'added_by_user_id'
    ) THEN
        ALTER TABLE businesses ADD COLUMN added_by_user_id UUID;
    END IF;
END $$;

-- 19. Performance indexes for geo search
CREATE INDEX IF NOT EXISTS idx_businesses_lat_lng ON businesses(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(city);

-- 19. Add new ad placements
INSERT INTO ad_placements (id, slug, name, is_active)
VALUES
    (gen_random_uuid(), 'business-page', 'Business Page', TRUE),
    (gen_random_uuid(), 'category-browse', 'Category Browse', TRUE),
    (gen_random_uuid(), 'map-view', 'Map View', TRUE)
ON CONFLICT (slug) DO NOTHING;

-- 17. Add yelp_id to businesses for deduplication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'businesses' AND column_name = 'yelp_id'
    ) THEN
        ALTER TABLE businesses ADD COLUMN yelp_id TEXT;
        CREATE UNIQUE INDEX idx_businesses_yelp_id ON businesses(yelp_id) WHERE yelp_id IS NOT NULL;
    END IF;
END $$;

-- Add uploaded_by_user_id to track who uploaded community photos
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'business_photos' AND column_name = 'uploaded_by_user_id'
    ) THEN
        ALTER TABLE business_photos ADD COLUMN uploaded_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Link staff kudos to reviews
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'staff_kudos' AND column_name = 'review_id'
    ) THEN
        ALTER TABLE staff_kudos ADD COLUMN review_id uuid REFERENCES reviews(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Change staff_kudos.review_id FK to CASCADE delete
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'staff_kudos_review_id_fkey' AND confdeltype = 'n'
    ) THEN
        ALTER TABLE staff_kudos DROP CONSTRAINT staff_kudos_review_id_fkey;
        ALTER TABLE staff_kudos ADD CONSTRAINT staff_kudos_review_id_fkey
          FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Review flagging
CREATE TABLE IF NOT EXISTS review_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending',
  created_at_utc timestamptz NOT NULL DEFAULT now(),
  resolved_at_utc timestamptz,
  resolved_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  resolution_note text,
  UNIQUE(review_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_review_flags_review_id ON review_flags(review_id);
CREATE INDEX IF NOT EXISTS idx_review_flags_status ON review_flags(status);

-- Device tokens for push notifications (Expo push tokens)
CREATE TABLE IF NOT EXISTS device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL,
  device_name text,
  created_at_utc timestamptz NOT NULL DEFAULT now(),
  last_seen_at_utc timestamptz NOT NULL DEFAULT now(),
  UNIQUE(token)
);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
