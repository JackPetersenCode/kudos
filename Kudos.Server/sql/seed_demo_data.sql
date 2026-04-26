-- ============================================
-- Demo: 3 fake businesses with staff and kudos
-- Uses fixed IDs and ON CONFLICT DO NOTHING — safe to run once
-- Will NOT duplicate data on restart
-- ============================================

-- Demo reviewers
INSERT INTO users (id, email, password_hash, role, display_name, email_verified, created_at_utc) VALUES
    ('a1000000-0000-0000-0000-000000000001'::uuid, 'sarah@demo.kudos', '$2a$11$placeholder', 'user', 'Sarah M.', TRUE, now() - interval '90 days'),
    ('a1000000-0000-0000-0000-000000000002'::uuid, 'mike@demo.kudos', '$2a$11$placeholder', 'user', 'Mike T.', TRUE, now() - interval '60 days'),
    ('a1000000-0000-0000-0000-000000000003'::uuid, 'jessica@demo.kudos', '$2a$11$placeholder', 'user', 'Jessica R.', TRUE, now() - interval '45 days'),
    ('a1000000-0000-0000-0000-000000000004'::uuid, 'david@demo.kudos', '$2a$11$placeholder', 'user', 'David L.', TRUE, now() - interval '30 days'),
    ('a1000000-0000-0000-0000-000000000005'::uuid, 'emma@demo.kudos', '$2a$11$placeholder', 'user', 'Emma K.', TRUE, now() - interval '20 days')
ON CONFLICT (email) DO NOTHING;

-- ======== BUSINESS 1: The Golden Spoon Kitchen ========
INSERT INTO businesses (id, name, slug, description, phone, address1, city, state, postal_code, latitude, longitude, price_level, accepts_reservations, offers_delivery, offers_takeout, outdoor_seating, offers_online_waitlist, time_zone, created_at_utc)
VALUES ('b1000000-0000-0000-0000-000000000097'::uuid, 'The Golden Spoon Kitchen', 'the-golden-spoon-kitchen',
    'Farm-to-table comfort food in the heart of South Austin. Award-winning burgers, craft cocktails, and a team that treats every guest like family.',
    '(512) 555-0197', '2000 S Congress Ave', 'Austin', 'TX', '78704', 30.2450, -97.7494,
    2, TRUE, TRUE, TRUE, TRUE, FALSE, 'America/Chicago', now() - interval '180 days')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO business_categories (id, business_id, category_id) SELECT gen_random_uuid(), 'b1000000-0000-0000-0000-000000000097'::uuid, c.id FROM categories c WHERE c.slug = 'restaurant' ON CONFLICT (business_id, category_id) DO NOTHING;

INSERT INTO business_hours (id, business_id, day_of_week, open_time, close_time, is_closed, created_at_utc)
SELECT gen_random_uuid(), 'b1000000-0000-0000-0000-000000000097'::uuid, d.dow, '08:00'::time, '21:00'::time, FALSE, now()
FROM (VALUES (0),(1),(2),(3),(4),(5),(6)) AS d(dow)
WHERE NOT EXISTS (SELECT 1 FROM business_hours bh WHERE bh.business_id = 'b1000000-0000-0000-0000-000000000097'::uuid AND bh.day_of_week = d.dow);

INSERT INTO staff_members (id, business_id, first_name, last_name, role, photo_url, is_active, created_at_utc) VALUES
    ('c1000000-0000-0000-0000-000000000011'::uuid, 'b1000000-0000-0000-0000-000000000097'::uuid, 'Marcus', 'Johnson', 'General Manager', 'https://i.pravatar.cc/200?img=12', TRUE, now() - interval '170 days'),
    ('c1000000-0000-0000-0000-000000000012'::uuid, 'b1000000-0000-0000-0000-000000000097'::uuid, 'Ashley', 'Chen', 'Lead Server', 'https://i.pravatar.cc/200?img=25', TRUE, now() - interval '160 days'),
    ('c1000000-0000-0000-0000-000000000013'::uuid, 'b1000000-0000-0000-0000-000000000097'::uuid, 'Sophia', 'Martinez', 'Bartender', 'https://i.pravatar.cc/200?img=45', TRUE, now() - interval '140 days')
ON CONFLICT DO NOTHING;

INSERT INTO reviews (id, business_id, user_id, rating, title, body, created_at_utc) VALUES
    ('d1000000-0000-0000-0000-000000000051'::uuid, 'b1000000-0000-0000-0000-000000000097'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 5, 'Best burgers in Austin!', 'The smash burger is incredible. Marcus checked on our table personally.', now() - interval '25 days'),
    ('d1000000-0000-0000-0000-000000000052'::uuid, 'b1000000-0000-0000-0000-000000000097'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 5, 'Great vibes', 'Sophia made the best Old Fashioned I have ever had.', now() - interval '18 days'),
    ('d1000000-0000-0000-0000-000000000053'::uuid, 'b1000000-0000-0000-0000-000000000097'::uuid, 'a1000000-0000-0000-0000-000000000004'::uuid, 5, 'Family dinner was perfect', 'Ashley was our server — attentive, friendly, and great with the kids.', now() - interval '5 days')
ON CONFLICT DO NOTHING;

INSERT INTO review_positive_tags (id, review_id, tag_name, created_at_utc) VALUES
    ('f1000000-0000-0000-0000-000000000001'::uuid, 'd1000000-0000-0000-0000-000000000051'::uuid, 'quality', now()),
    ('f1000000-0000-0000-0000-000000000002'::uuid, 'd1000000-0000-0000-0000-000000000051'::uuid, 'service', now()),
    ('f1000000-0000-0000-0000-000000000003'::uuid, 'd1000000-0000-0000-0000-000000000051'::uuid, 'experience', now()),
    ('f1000000-0000-0000-0000-000000000004'::uuid, 'd1000000-0000-0000-0000-000000000052'::uuid, 'service', now()),
    ('f1000000-0000-0000-0000-000000000005'::uuid, 'd1000000-0000-0000-0000-000000000052'::uuid, 'quality', now()),
    ('f1000000-0000-0000-0000-000000000006'::uuid, 'd1000000-0000-0000-0000-000000000053'::uuid, 'service', now()),
    ('f1000000-0000-0000-0000-000000000007'::uuid, 'd1000000-0000-0000-0000-000000000053'::uuid, 'experience', now()),
    ('f1000000-0000-0000-0000-000000000008'::uuid, 'd1000000-0000-0000-0000-000000000053'::uuid, 'cleanliness', now())
ON CONFLICT DO NOTHING;

INSERT INTO staff_kudos (id, staff_member_id, business_id, user_id, body, created_at_utc) VALUES
    ('e1000000-0000-0000-0000-000000000001'::uuid, 'c1000000-0000-0000-0000-000000000011'::uuid, 'b1000000-0000-0000-0000-000000000097'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'Marcus greeted us by name on our second visit.', now() - interval '24 days'),
    ('e1000000-0000-0000-0000-000000000002'::uuid, 'c1000000-0000-0000-0000-000000000011'::uuid, 'b1000000-0000-0000-0000-000000000097'::uuid, 'a1000000-0000-0000-0000-000000000004'::uuid, 'Comped dessert for our anniversary.', now() - interval '5 days'),
    ('e1000000-0000-0000-0000-000000000003'::uuid, 'c1000000-0000-0000-0000-000000000011'::uuid, 'b1000000-0000-0000-0000-000000000097'::uuid, 'a1000000-0000-0000-0000-000000000005'::uuid, 'Best manager ever. Professional and warm.', now() - interval '2 days'),
    ('e1000000-0000-0000-0000-000000000004'::uuid, 'c1000000-0000-0000-0000-000000000012'::uuid, 'b1000000-0000-0000-0000-000000000097'::uuid, 'a1000000-0000-0000-0000-000000000004'::uuid, 'Remembered our dietary restrictions without asking.', now() - interval '5 days'),
    ('e1000000-0000-0000-0000-000000000005'::uuid, 'c1000000-0000-0000-0000-000000000012'::uuid, 'b1000000-0000-0000-0000-000000000097'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'Recommended the special — best thing on the menu!', now() - interval '20 days'),
    ('e1000000-0000-0000-0000-000000000006'::uuid, 'c1000000-0000-0000-0000-000000000013'::uuid, 'b1000000-0000-0000-0000-000000000097'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'Sophia is a mixology genius.', now() - interval '18 days'),
    ('e1000000-0000-0000-0000-000000000007'::uuid, 'c1000000-0000-0000-0000-000000000013'::uuid, 'b1000000-0000-0000-0000-000000000097'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'Made a custom drink for us. So creative!', now() - interval '10 days')
ON CONFLICT DO NOTHING;

INSERT INTO staff_kudos_tags (id, staff_kudos_id, tag_name, created_at_utc) VALUES
    ('aa100000-0000-0000-0000-000000000001'::uuid, 'e1000000-0000-0000-0000-000000000001'::uuid, 'friendly', now()),
    ('aa100000-0000-0000-0000-000000000002'::uuid, 'e1000000-0000-0000-0000-000000000001'::uuid, 'professional', now()),
    ('aa100000-0000-0000-0000-000000000003'::uuid, 'e1000000-0000-0000-0000-000000000001'::uuid, 'went-above-and-beyond', now()),
    ('aa100000-0000-0000-0000-000000000004'::uuid, 'e1000000-0000-0000-0000-000000000002'::uuid, 'went-above-and-beyond', now()),
    ('aa100000-0000-0000-0000-000000000005'::uuid, 'e1000000-0000-0000-0000-000000000003'::uuid, 'professional', now()),
    ('aa100000-0000-0000-0000-000000000006'::uuid, 'e1000000-0000-0000-0000-000000000003'::uuid, 'friendly', now()),
    ('aa100000-0000-0000-0000-000000000007'::uuid, 'e1000000-0000-0000-0000-000000000004'::uuid, 'knowledgeable', now()),
    ('aa100000-0000-0000-0000-000000000008'::uuid, 'e1000000-0000-0000-0000-000000000004'::uuid, 'efficient', now()),
    ('aa100000-0000-0000-0000-000000000009'::uuid, 'e1000000-0000-0000-0000-000000000005'::uuid, 'friendly', now()),
    ('aa100000-0000-0000-0000-000000000010'::uuid, 'e1000000-0000-0000-0000-000000000006'::uuid, 'knowledgeable', now()),
    ('aa100000-0000-0000-0000-000000000011'::uuid, 'e1000000-0000-0000-0000-000000000006'::uuid, 'professional', now()),
    ('aa100000-0000-0000-0000-000000000012'::uuid, 'e1000000-0000-0000-0000-000000000007'::uuid, 'went-above-and-beyond', now()),
    ('aa100000-0000-0000-0000-000000000013'::uuid, 'e1000000-0000-0000-0000-000000000007'::uuid, 'friendly', now())
ON CONFLICT DO NOTHING;

-- ======== BUSINESS 2: Luxe & Bloom Salon ========
INSERT INTO businesses (id, name, slug, description, phone, address1, city, state, postal_code, latitude, longitude, price_level, accepts_reservations, time_zone, created_at_utc, offers_delivery, offers_takeout, outdoor_seating, offers_online_waitlist)
VALUES ('b1000000-0000-0000-0000-000000000098'::uuid, 'Luxe & Bloom Salon', 'luxe-and-bloom-salon',
    'Boutique salon and spa. Premium cuts, color, facials, and massage.',
    '(512) 555-0198', '1500 S Lamar Blvd', 'Austin', 'TX', '78704', 30.2530, -97.7680,
    3, TRUE, 'America/Chicago', now() - interval '150 days', FALSE, FALSE, FALSE, TRUE)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO business_categories (id, business_id, category_id) SELECT gen_random_uuid(), 'b1000000-0000-0000-0000-000000000098'::uuid, c.id FROM categories c WHERE c.slug = 'salon' ON CONFLICT (business_id, category_id) DO NOTHING;

INSERT INTO business_hours (id, business_id, day_of_week, open_time, close_time, is_closed, created_at_utc)
SELECT gen_random_uuid(), 'b1000000-0000-0000-0000-000000000098'::uuid, d.dow, '09:00'::time, '19:00'::time, FALSE, now()
FROM (VALUES (1),(2),(3),(4),(5),(6)) AS d(dow) WHERE NOT EXISTS (SELECT 1 FROM business_hours bh WHERE bh.business_id = 'b1000000-0000-0000-0000-000000000098'::uuid AND bh.day_of_week = d.dow);
INSERT INTO business_hours (id, business_id, day_of_week, open_time, close_time, is_closed, created_at_utc)
SELECT gen_random_uuid(), 'b1000000-0000-0000-0000-000000000098'::uuid, 0, NULL, NULL, TRUE, now()
WHERE NOT EXISTS (SELECT 1 FROM business_hours bh WHERE bh.business_id = 'b1000000-0000-0000-0000-000000000098'::uuid AND bh.day_of_week = 0);

INSERT INTO staff_members (id, business_id, first_name, last_name, role, photo_url, is_active, created_at_utc) VALUES
    ('c1000000-0000-0000-0000-000000000014'::uuid, 'b1000000-0000-0000-0000-000000000098'::uuid, 'Rachel', 'Kim', 'Owner & Lead Stylist', 'https://i.pravatar.cc/200?img=32', TRUE, now() - interval '145 days'),
    ('c1000000-0000-0000-0000-000000000015'::uuid, 'b1000000-0000-0000-0000-000000000098'::uuid, 'Olivia', 'Nguyen', 'Colorist', 'https://i.pravatar.cc/200?img=23', TRUE, now() - interval '130 days'),
    ('c1000000-0000-0000-0000-000000000016'::uuid, 'b1000000-0000-0000-0000-000000000098'::uuid, 'James', 'Wright', 'Massage Therapist', 'https://i.pravatar.cc/200?img=53', TRUE, now() - interval '120 days')
ON CONFLICT DO NOTHING;

INSERT INTO reviews (id, business_id, user_id, rating, title, body, created_at_utc) VALUES
    ('d1000000-0000-0000-0000-000000000054'::uuid, 'b1000000-0000-0000-0000-000000000098'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 5, 'Best haircut in years', 'Rachel transformed my hair. She listens and delivers.', now() - interval '20 days'),
    ('d1000000-0000-0000-0000-000000000055'::uuid, 'b1000000-0000-0000-0000-000000000098'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 5, 'Stunning color', 'Olivia did my balayage perfectly.', now() - interval '12 days')
ON CONFLICT DO NOTHING;

INSERT INTO review_positive_tags (id, review_id, tag_name, created_at_utc) VALUES
    ('f1000000-0000-0000-0000-000000000011'::uuid, 'd1000000-0000-0000-0000-000000000054'::uuid, 'quality', now()),
    ('f1000000-0000-0000-0000-000000000012'::uuid, 'd1000000-0000-0000-0000-000000000054'::uuid, 'service', now()),
    ('f1000000-0000-0000-0000-000000000013'::uuid, 'd1000000-0000-0000-0000-000000000055'::uuid, 'quality', now()),
    ('f1000000-0000-0000-0000-000000000014'::uuid, 'd1000000-0000-0000-0000-000000000055'::uuid, 'cleanliness', now())
ON CONFLICT DO NOTHING;

INSERT INTO staff_kudos (id, staff_member_id, business_id, user_id, body, created_at_utc) VALUES
    ('e1000000-0000-0000-0000-000000000011'::uuid, 'c1000000-0000-0000-0000-000000000014'::uuid, 'b1000000-0000-0000-0000-000000000098'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'Rachel is an artist with scissors.', now() - interval '20 days'),
    ('e1000000-0000-0000-0000-000000000012'::uuid, 'c1000000-0000-0000-0000-000000000014'::uuid, 'b1000000-0000-0000-0000-000000000098'::uuid, 'a1000000-0000-0000-0000-000000000005'::uuid, 'Best stylist in Austin.', now() - interval '6 days'),
    ('e1000000-0000-0000-0000-000000000013'::uuid, 'c1000000-0000-0000-0000-000000000015'::uuid, 'b1000000-0000-0000-0000-000000000098'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'Perfect balayage.', now() - interval '12 days'),
    ('e1000000-0000-0000-0000-000000000014'::uuid, 'c1000000-0000-0000-0000-000000000016'::uuid, 'b1000000-0000-0000-0000-000000000098'::uuid, 'a1000000-0000-0000-0000-000000000005'::uuid, 'Best deep tissue ever.', now() - interval '7 days')
ON CONFLICT DO NOTHING;

INSERT INTO staff_kudos_tags (id, staff_kudos_id, tag_name, created_at_utc) VALUES
    ('aa100000-0000-0000-0000-000000000021'::uuid, 'e1000000-0000-0000-0000-000000000011'::uuid, 'professional', now()),
    ('aa100000-0000-0000-0000-000000000022'::uuid, 'e1000000-0000-0000-0000-000000000011'::uuid, 'knowledgeable', now()),
    ('aa100000-0000-0000-0000-000000000023'::uuid, 'e1000000-0000-0000-0000-000000000012'::uuid, 'friendly', now()),
    ('aa100000-0000-0000-0000-000000000024'::uuid, 'e1000000-0000-0000-0000-000000000013'::uuid, 'knowledgeable', now()),
    ('aa100000-0000-0000-0000-000000000025'::uuid, 'e1000000-0000-0000-0000-000000000014'::uuid, 'efficient', now()),
    ('aa100000-0000-0000-0000-000000000026'::uuid, 'e1000000-0000-0000-0000-000000000014'::uuid, 'professional', now())
ON CONFLICT DO NOTHING;

-- ======== BUSINESS 3: Daybreak Coffee Roasters ========
INSERT INTO businesses (id, name, slug, description, phone, address1, city, state, postal_code, latitude, longitude, price_level, time_zone, created_at_utc, accepts_reservations, offers_delivery, offers_takeout, outdoor_seating, offers_online_waitlist)
VALUES ('b1000000-0000-0000-0000-000000000099'::uuid, 'Daybreak Coffee Roasters', 'daybreak-coffee-roasters',
    'Specialty coffee roasted in-house. Cozy vibes, fast wifi, best latte art in Austin.',
    '(512) 555-0199', '800 E 6th St', 'Austin', 'TX', '78702', 30.2655, -97.7310,
    1, 'America/Chicago', now() - interval '120 days', FALSE, TRUE, TRUE, TRUE, FALSE)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO business_categories (id, business_id, category_id) SELECT gen_random_uuid(), 'b1000000-0000-0000-0000-000000000099'::uuid, c.id FROM categories c WHERE c.slug = 'coffee-shop' ON CONFLICT (business_id, category_id) DO NOTHING;

INSERT INTO business_hours (id, business_id, day_of_week, open_time, close_time, is_closed, created_at_utc)
SELECT gen_random_uuid(), 'b1000000-0000-0000-0000-000000000099'::uuid, d.dow, '06:00'::time, '18:00'::time, FALSE, now()
FROM (VALUES (0),(1),(2),(3),(4),(5),(6)) AS d(dow) WHERE NOT EXISTS (SELECT 1 FROM business_hours bh WHERE bh.business_id = 'b1000000-0000-0000-0000-000000000099'::uuid AND bh.day_of_week = d.dow);

INSERT INTO staff_members (id, business_id, first_name, last_name, role, photo_url, is_active, created_at_utc) VALUES
    ('c1000000-0000-0000-0000-000000000017'::uuid, 'b1000000-0000-0000-0000-000000000099'::uuid, 'Alex', 'Rivera', 'Head Barista', 'https://i.pravatar.cc/200?img=7', TRUE, now() - interval '115 days'),
    ('c1000000-0000-0000-0000-000000000018'::uuid, 'b1000000-0000-0000-0000-000000000099'::uuid, 'Mia', 'Thompson', 'Barista', 'https://i.pravatar.cc/200?img=44', TRUE, now() - interval '100 days')
ON CONFLICT DO NOTHING;

INSERT INTO reviews (id, business_id, user_id, rating, title, body, created_at_utc) VALUES
    ('d1000000-0000-0000-0000-000000000057'::uuid, 'b1000000-0000-0000-0000-000000000099'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 5, 'My daily stop', 'Best oat milk latte in Austin. Alex remembers my order.', now() - interval '15 days'),
    ('d1000000-0000-0000-0000-000000000058'::uuid, 'b1000000-0000-0000-0000-000000000099'::uuid, 'a1000000-0000-0000-0000-000000000004'::uuid, 4, 'Great coffee', 'Mia made beautiful latte art. Fair prices.', now() - interval '8 days')
ON CONFLICT DO NOTHING;

INSERT INTO review_positive_tags (id, review_id, tag_name, created_at_utc) VALUES
    ('f1000000-0000-0000-0000-000000000021'::uuid, 'd1000000-0000-0000-0000-000000000057'::uuid, 'service', now()),
    ('f1000000-0000-0000-0000-000000000022'::uuid, 'd1000000-0000-0000-0000-000000000057'::uuid, 'quality', now()),
    ('f1000000-0000-0000-0000-000000000023'::uuid, 'd1000000-0000-0000-0000-000000000058'::uuid, 'quality', now()),
    ('f1000000-0000-0000-0000-000000000024'::uuid, 'd1000000-0000-0000-0000-000000000058'::uuid, 'value', now())
ON CONFLICT DO NOTHING;

INSERT INTO staff_kudos (id, staff_member_id, business_id, user_id, body, created_at_utc) VALUES
    ('e1000000-0000-0000-0000-000000000021'::uuid, 'c1000000-0000-0000-0000-000000000017'::uuid, 'b1000000-0000-0000-0000-000000000099'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'Best latte in Austin. Not even close.', now() - interval '15 days'),
    ('e1000000-0000-0000-0000-000000000022'::uuid, 'c1000000-0000-0000-0000-000000000017'::uuid, 'b1000000-0000-0000-0000-000000000099'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'Remembers every regular by name.', now() - interval '3 days'),
    ('e1000000-0000-0000-0000-000000000023'::uuid, 'c1000000-0000-0000-0000-000000000018'::uuid, 'b1000000-0000-0000-0000-000000000099'::uuid, 'a1000000-0000-0000-0000-000000000004'::uuid, 'Beautiful latte art!', now() - interval '8 days'),
    ('e1000000-0000-0000-0000-000000000024'::uuid, 'c1000000-0000-0000-0000-000000000018'::uuid, 'b1000000-0000-0000-0000-000000000099'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'Friendly and fast even when packed.', now() - interval '5 days')
ON CONFLICT DO NOTHING;

INSERT INTO staff_kudos_tags (id, staff_kudos_id, tag_name, created_at_utc) VALUES
    ('aa100000-0000-0000-0000-000000000031'::uuid, 'e1000000-0000-0000-0000-000000000021'::uuid, 'knowledgeable', now()),
    ('aa100000-0000-0000-0000-000000000032'::uuid, 'e1000000-0000-0000-0000-000000000021'::uuid, 'professional', now()),
    ('aa100000-0000-0000-0000-000000000033'::uuid, 'e1000000-0000-0000-0000-000000000022'::uuid, 'friendly', now()),
    ('aa100000-0000-0000-0000-000000000034'::uuid, 'e1000000-0000-0000-0000-000000000022'::uuid, 'went-above-and-beyond', now()),
    ('aa100000-0000-0000-0000-000000000035'::uuid, 'e1000000-0000-0000-0000-000000000023'::uuid, 'friendly', now()),
    ('aa100000-0000-0000-0000-000000000036'::uuid, 'e1000000-0000-0000-0000-000000000023'::uuid, 'efficient', now()),
    ('aa100000-0000-0000-0000-000000000037'::uuid, 'e1000000-0000-0000-0000-000000000024'::uuid, 'friendly', now()),
    ('aa100000-0000-0000-0000-000000000038'::uuid, 'e1000000-0000-0000-0000-000000000024'::uuid, 'efficient', now())
ON CONFLICT DO NOTHING;

-- Update photos on existing staff (in case they were already inserted without photos)
UPDATE staff_members SET photo_url = 'https://i.pravatar.cc/200?img=12' WHERE id = 'c1000000-0000-0000-0000-000000000011'::uuid AND photo_url IS NULL;
UPDATE staff_members SET photo_url = 'https://i.pravatar.cc/200?img=25' WHERE id = 'c1000000-0000-0000-0000-000000000012'::uuid AND photo_url IS NULL;
UPDATE staff_members SET photo_url = 'https://i.pravatar.cc/200?img=45' WHERE id = 'c1000000-0000-0000-0000-000000000013'::uuid AND photo_url IS NULL;
UPDATE staff_members SET photo_url = 'https://i.pravatar.cc/200?img=32' WHERE id = 'c1000000-0000-0000-0000-000000000014'::uuid AND photo_url IS NULL;
UPDATE staff_members SET photo_url = 'https://i.pravatar.cc/200?img=23' WHERE id = 'c1000000-0000-0000-0000-000000000015'::uuid AND photo_url IS NULL;
UPDATE staff_members SET photo_url = 'https://i.pravatar.cc/200?img=53' WHERE id = 'c1000000-0000-0000-0000-000000000016'::uuid AND photo_url IS NULL;
UPDATE staff_members SET photo_url = 'https://i.pravatar.cc/200?img=7' WHERE id = 'c1000000-0000-0000-0000-000000000017'::uuid AND photo_url IS NULL;
UPDATE staff_members SET photo_url = 'https://i.pravatar.cc/200?img=44' WHERE id = 'c1000000-0000-0000-0000-000000000018'::uuid AND photo_url IS NULL;
