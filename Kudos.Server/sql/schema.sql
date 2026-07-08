--
-- PostgreSQL database dump
--

-- Dumped from database version 16.4
-- Dumped by pg_dump version 16.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: reverse_like(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reverse_like(text, text) RETURNS boolean
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    AS $_$ select $2 like $1 $_$;


--
-- Name: <~~; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR public.<~~ (
    FUNCTION = public.reverse_like,
    LEFTARG = text,
    RIGHTARG = text
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ad_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ad_id uuid NOT NULL,
    start_at_utc timestamp with time zone NOT NULL,
    end_at_utc timestamp with time zone NOT NULL,
    budget_cents integer NOT NULL,
    pricing_model text DEFAULT 'flat'::text NOT NULL,
    bid_cents integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    stripe_payment_intent_id text,
    CONSTRAINT chk_ad_campaign_dates CHECK ((end_at_utc > start_at_utc)),
    CONSTRAINT chk_ad_campaigns_pricing_model CHECK ((pricing_model = ANY (ARRAY['flat'::text, 'cpm'::text, 'cpc'::text])))
);


--
-- Name: ad_clicks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_clicks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ad_id uuid NOT NULL,
    placement_slug text NOT NULL,
    page_path text,
    clicked_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text
);


--
-- Name: ad_impressions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_impressions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ad_id uuid NOT NULL,
    placement_slug text NOT NULL,
    page_path text,
    viewed_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text
);


--
-- Name: ad_placements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_placements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at_utc timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ad_targeting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_targeting (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    category_slug text,
    city text,
    state text
);


--
-- Name: ads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    title text NOT NULL,
    headline text,
    description text,
    image_url text,
    destination_url text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    updated_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_ads_status CHECK ((status = ANY (ARRAY['draft'::text, 'pending_review'::text, 'active'::text, 'paused'::text, 'rejected'::text, 'ended'::text])))
);


--
-- Name: autoServices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."autoServices" (
    id integer NOT NULL,
    name character varying(100),
    images character varying[],
    tags character varying[],
    reviews character varying[]
);


--
-- Name: autoServices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."autoServices_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: autoServices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."autoServices_id_seq" OWNED BY public."autoServices".id;


--
-- Name: business_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    category_id uuid NOT NULL
);


--
-- Name: business_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    verification_note text,
    admin_note text,
    created_at_utc timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    resolved_at_utc timestamp without time zone,
    verification_method text,
    verification_code text,
    verification_code_expires_at timestamp without time zone,
    verification_email text,
    verification_phone text
);


--
-- Name: business_hours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_hours (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    day_of_week smallint NOT NULL,
    open_time time without time zone,
    close_time time without time zone,
    is_closed boolean DEFAULT false NOT NULL,
    created_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT business_hours_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);


--
-- Name: business_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    user_id uuid NOT NULL,
    membership_role text NOT NULL,
    created_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_membership_role CHECK ((membership_role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text])))
);


--
-- Name: business_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    storage_key text NOT NULL,
    original_url text NOT NULL,
    content_type text,
    size_bytes bigint,
    is_primary boolean DEFAULT false NOT NULL,
    created_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    uploaded_by_user_id uuid
);


--
-- Name: business_seasonal_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_seasonal_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    tag_name text NOT NULL,
    expires_at_utc timestamp without time zone,
    created_at_utc timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
);


--
-- Name: businesses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.businesses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    phone text,
    website_url text,
    address1 text,
    address2 text,
    city text,
    state text,
    postal_code text,
    latitude numeric(9,6),
    longitude numeric(9,6),
    is_claimed boolean DEFAULT false NOT NULL,
    created_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    time_zone text DEFAULT 'America/Chicago'::text NOT NULL,
    price_level smallint,
    accepts_reservations boolean DEFAULT false NOT NULL,
    offers_online_waitlist boolean DEFAULT false NOT NULL,
    offers_delivery boolean DEFAULT false NOT NULL,
    offers_takeout boolean DEFAULT false NOT NULL,
    outdoor_seating boolean DEFAULT false NOT NULL,
    yelp_id text,
    is_premium boolean DEFAULT false NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    premium_expires_at timestamp without time zone,
    added_by_user_id uuid
);


--
-- Name: businesses_old; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.businesses_old (
    id integer NOT NULL,
    name character varying(100),
    images character varying[],
    tags character varying[],
    reviews character varying[],
    address character varying(300),
    email character varying(100),
    description character varying(2000)
);


--
-- Name: businesses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.businesses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: businesses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.businesses_id_seq OWNED BY public.businesses_old.id;


--
-- Name: campaign_placements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_placements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    placement_id uuid NOT NULL
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    parent_slug text
);


--
-- Name: check_ins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.check_ins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    business_id uuid NOT NULL,
    created_at_utc timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
);


--
-- Name: homeServices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."homeServices" (
    id integer NOT NULL,
    name character varying(100),
    images character varying[],
    tags character varying[],
    reviews character varying[]
);


--
-- Name: homeServices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."homeServices_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: homeServices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."homeServices_id_seq" OWNED BY public."homeServices".id;


--
-- Name: images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.images (
    id integer NOT NULL,
    name character varying(100),
    url character varying(100)
);


--
-- Name: images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.images_id_seq OWNED BY public.images.id;


--
-- Name: more; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.more (
    id integer NOT NULL,
    name character varying(100),
    images character varying[],
    tags character varying[],
    reviews character varying[]
);


--
-- Name: more_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.more_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: more_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.more_id_seq OWNED BY public.more.id;


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email_on_new_review boolean DEFAULT true NOT NULL,
    email_on_review_response boolean DEFAULT true NOT NULL,
    email_on_new_kudos boolean DEFAULT true NOT NULL,
    email_on_favorite_activity boolean DEFAULT false NOT NULL,
    updated_at_utc timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    notification_type text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    is_emailed boolean DEFAULT false NOT NULL,
    created_at_utc timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
);


--
-- Name: restaurants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restaurants (
    id integer NOT NULL,
    name character varying(100),
    images character varying[],
    tags character varying[],
    reviews character varying[]
);


--
-- Name: restaurants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.restaurants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: restaurants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.restaurants_id_seq OWNED BY public.restaurants.id;


--
-- Name: review_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    review_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reason text NOT NULL,
    details text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at_utc timestamp with time zone,
    resolved_by_user_id uuid,
    resolution_note text
);


--
-- Name: review_helpful_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_helpful_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    review_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at_utc timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
);


--
-- Name: review_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    review_id uuid NOT NULL,
    storage_key text NOT NULL,
    original_url text NOT NULL,
    content_type text,
    size_bytes bigint,
    created_at_utc timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: review_positive_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_positive_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    review_id uuid NOT NULL,
    tag_name text NOT NULL,
    created_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_review_positive_tag_name CHECK ((tag_name = ANY (ARRAY['service'::text, 'quality'::text, 'cleanliness'::text, 'value'::text, 'experience'::text])))
);


--
-- Name: review_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    review_id uuid NOT NULL,
    business_id uuid NOT NULL,
    user_id uuid NOT NULL,
    body text NOT NULL,
    created_at_utc timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating smallint NOT NULL,
    title text,
    body text,
    created_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: reviews_old; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews_old (
    id integer NOT NULL,
    name character varying(100),
    review character varying(5000),
    reviewer character varying(100),
    images character varying[]
);


--
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews_old.id;


--
-- Name: staff_kudos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_kudos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_member_id uuid NOT NULL,
    business_id uuid NOT NULL,
    user_id uuid NOT NULL,
    body text,
    created_at_utc timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    review_id uuid
);


--
-- Name: staff_kudos_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_kudos_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_kudos_id uuid NOT NULL,
    tag_name text NOT NULL,
    created_at_utc timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
);


--
-- Name: staff_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    role text,
    photo_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at_utc timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
);


--
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tags (
    id integer NOT NULL,
    name character varying(100),
    tag character varying(100)
);


--
-- Name: tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tags_id_seq OWNED BY public.tags.id;


--
-- Name: user_badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_badges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    badge_key text NOT NULL,
    badge_label text NOT NULL,
    awarded_at_utc timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
);


--
-- Name: user_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    business_id uuid NOT NULL,
    created_at_utc timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
);


--
-- Name: user_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    storage_key text NOT NULL,
    original_url text NOT NULL,
    content_type text,
    size_bytes bigint,
    is_primary boolean DEFAULT true NOT NULL,
    created_at_utc timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    created_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    verification_token text,
    verification_token_expires_at timestamp without time zone,
    reset_token text,
    reset_token_expires_at timestamp without time zone,
    display_name text
);


--
-- Name: users_old; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users_old (
    id integer NOT NULL,
    name character varying(100),
    email character varying(100),
    password character varying(100),
    role text
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users_old.id;


--
-- Name: view_no1; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.view_no1 AS
 SELECT name
   FROM public."autoServices"
  WHERE ((name)::text <> 'name'::text);


--
-- Name: autoServices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."autoServices" ALTER COLUMN id SET DEFAULT nextval('public."autoServices_id_seq"'::regclass);


--
-- Name: businesses_old id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses_old ALTER COLUMN id SET DEFAULT nextval('public.businesses_id_seq'::regclass);


--
-- Name: homeServices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."homeServices" ALTER COLUMN id SET DEFAULT nextval('public."homeServices_id_seq"'::regclass);


--
-- Name: images id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.images ALTER COLUMN id SET DEFAULT nextval('public.images_id_seq'::regclass);


--
-- Name: more id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.more ALTER COLUMN id SET DEFAULT nextval('public.more_id_seq'::regclass);


--
-- Name: restaurants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurants ALTER COLUMN id SET DEFAULT nextval('public.restaurants_id_seq'::regclass);


--
-- Name: reviews_old id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews_old ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);


--
-- Name: tags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags ALTER COLUMN id SET DEFAULT nextval('public.tags_id_seq'::regclass);


--
-- Name: users_old id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_old ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: ad_campaigns ad_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_campaigns
    ADD CONSTRAINT ad_campaigns_pkey PRIMARY KEY (id);


--
-- Name: ad_clicks ad_clicks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_clicks
    ADD CONSTRAINT ad_clicks_pkey PRIMARY KEY (id);


--
-- Name: ad_impressions ad_impressions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_impressions
    ADD CONSTRAINT ad_impressions_pkey PRIMARY KEY (id);


--
-- Name: ad_placements ad_placements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_placements
    ADD CONSTRAINT ad_placements_pkey PRIMARY KEY (id);


--
-- Name: ad_placements ad_placements_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_placements
    ADD CONSTRAINT ad_placements_slug_key UNIQUE (slug);


--
-- Name: ad_targeting ad_targeting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_targeting
    ADD CONSTRAINT ad_targeting_pkey PRIMARY KEY (id);


--
-- Name: ads ads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ads
    ADD CONSTRAINT ads_pkey PRIMARY KEY (id);


--
-- Name: autoServices autoServices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."autoServices"
    ADD CONSTRAINT "autoServices_pkey" PRIMARY KEY (id);


--
-- Name: business_categories business_categories_business_id_category_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_categories
    ADD CONSTRAINT business_categories_business_id_category_id_key UNIQUE (business_id, category_id);


--
-- Name: business_categories business_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_categories
    ADD CONSTRAINT business_categories_pkey PRIMARY KEY (id);


--
-- Name: business_claims business_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_claims
    ADD CONSTRAINT business_claims_pkey PRIMARY KEY (id);


--
-- Name: business_hours business_hours_business_id_day_of_week_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_hours
    ADD CONSTRAINT business_hours_business_id_day_of_week_key UNIQUE (business_id, day_of_week);


--
-- Name: business_hours business_hours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_hours
    ADD CONSTRAINT business_hours_pkey PRIMARY KEY (id);


--
-- Name: business_memberships business_memberships_business_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_memberships
    ADD CONSTRAINT business_memberships_business_id_user_id_key UNIQUE (business_id, user_id);


--
-- Name: business_memberships business_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_memberships
    ADD CONSTRAINT business_memberships_pkey PRIMARY KEY (id);


--
-- Name: business_photos business_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_photos
    ADD CONSTRAINT business_photos_pkey PRIMARY KEY (id);


--
-- Name: business_seasonal_tags business_seasonal_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_seasonal_tags
    ADD CONSTRAINT business_seasonal_tags_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_new_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_new_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_new_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_new_slug_key UNIQUE (slug);


--
-- Name: businesses_old businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses_old
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);


--
-- Name: campaign_placements campaign_placements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_placements
    ADD CONSTRAINT campaign_placements_pkey PRIMARY KEY (id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: check_ins check_ins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT check_ins_pkey PRIMARY KEY (id);


--
-- Name: homeServices homeServices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."homeServices"
    ADD CONSTRAINT "homeServices_pkey" PRIMARY KEY (id);


--
-- Name: images images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.images
    ADD CONSTRAINT images_pkey PRIMARY KEY (id);


--
-- Name: more more_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.more
    ADD CONSTRAINT more_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: restaurants restaurants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_pkey PRIMARY KEY (id);


--
-- Name: review_flags review_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_flags
    ADD CONSTRAINT review_flags_pkey PRIMARY KEY (id);


--
-- Name: review_flags review_flags_review_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_flags
    ADD CONSTRAINT review_flags_review_id_user_id_key UNIQUE (review_id, user_id);


--
-- Name: review_helpful_votes review_helpful_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_helpful_votes
    ADD CONSTRAINT review_helpful_votes_pkey PRIMARY KEY (id);


--
-- Name: review_helpful_votes review_helpful_votes_review_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_helpful_votes
    ADD CONSTRAINT review_helpful_votes_review_id_user_id_key UNIQUE (review_id, user_id);


--
-- Name: review_photos review_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_photos
    ADD CONSTRAINT review_photos_pkey PRIMARY KEY (id);


--
-- Name: review_positive_tags review_positive_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_positive_tags
    ADD CONSTRAINT review_positive_tags_pkey PRIMARY KEY (id);


--
-- Name: review_responses review_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_responses
    ADD CONSTRAINT review_responses_pkey PRIMARY KEY (id);


--
-- Name: review_responses review_responses_review_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_responses
    ADD CONSTRAINT review_responses_review_id_key UNIQUE (review_id);


--
-- Name: reviews reviews_business_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_business_id_user_id_key UNIQUE (business_id, user_id);


--
-- Name: reviews_old reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews_old
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey1 PRIMARY KEY (id);


--
-- Name: staff_kudos staff_kudos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_kudos
    ADD CONSTRAINT staff_kudos_pkey PRIMARY KEY (id);


--
-- Name: staff_kudos_tags staff_kudos_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_kudos_tags
    ADD CONSTRAINT staff_kudos_tags_pkey PRIMARY KEY (id);


--
-- Name: staff_members staff_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_members
    ADD CONSTRAINT staff_members_pkey PRIMARY KEY (id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: review_positive_tags uq_review_positive_tag; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_positive_tags
    ADD CONSTRAINT uq_review_positive_tag UNIQUE (review_id, tag_name);


--
-- Name: user_badges user_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_pkey PRIMARY KEY (id);


--
-- Name: user_badges user_badges_user_id_badge_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_user_id_badge_key_key UNIQUE (user_id, badge_key);


--
-- Name: user_favorites user_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_pkey PRIMARY KEY (id);


--
-- Name: user_favorites user_favorites_user_id_business_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_user_id_business_id_key UNIQUE (user_id, business_id);


--
-- Name: user_photos user_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_photos
    ADD CONSTRAINT user_photos_pkey PRIMARY KEY (id);


--
-- Name: users users_new_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_new_email_key UNIQUE (email);


--
-- Name: users users_new_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_new_pkey PRIMARY KEY (id);


--
-- Name: users_old users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_old
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: campaign_placements ux_campaign_placements; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_placements
    ADD CONSTRAINT ux_campaign_placements UNIQUE (campaign_id, placement_id);


--
-- Name: idx_business_categories_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_categories_business_id ON public.business_categories USING btree (business_id);


--
-- Name: idx_business_categories_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_categories_category_id ON public.business_categories USING btree (category_id);


--
-- Name: idx_business_claims_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_claims_business_id ON public.business_claims USING btree (business_id);


--
-- Name: idx_business_claims_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_claims_status ON public.business_claims USING btree (status);


--
-- Name: idx_business_hours_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_hours_business_id ON public.business_hours USING btree (business_id);


--
-- Name: idx_business_memberships_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_memberships_business_id ON public.business_memberships USING btree (business_id);


--
-- Name: idx_business_memberships_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_memberships_user_id ON public.business_memberships USING btree (user_id);


--
-- Name: idx_business_photos_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_photos_business_id ON public.business_photos USING btree (business_id);


--
-- Name: idx_business_seasonal_tags_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_seasonal_tags_business_id ON public.business_seasonal_tags USING btree (business_id);


--
-- Name: idx_businesses_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_businesses_city ON public.businesses USING btree (city);


--
-- Name: idx_businesses_lat_lng; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_businesses_lat_lng ON public.businesses USING btree (latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));


--
-- Name: idx_businesses_name_city_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_businesses_name_city_lower ON public.businesses USING btree (lower(TRIM(BOTH FROM name)), lower(COALESCE(city, ''::text)));


--
-- Name: idx_businesses_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_businesses_slug ON public.businesses USING btree (slug);


--
-- Name: idx_businesses_yelp_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_businesses_yelp_id ON public.businesses USING btree (yelp_id) WHERE (yelp_id IS NOT NULL);


--
-- Name: idx_check_ins_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_check_ins_business_id ON public.check_ins USING btree (business_id);


--
-- Name: idx_check_ins_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_check_ins_user_id ON public.check_ins USING btree (user_id);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (user_id, is_read);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_review_flags_review_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_flags_review_id ON public.review_flags USING btree (review_id);


--
-- Name: idx_review_flags_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_flags_status ON public.review_flags USING btree (status);


--
-- Name: idx_review_helpful_votes_review_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_helpful_votes_review_id ON public.review_helpful_votes USING btree (review_id);


--
-- Name: idx_review_responses_review_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_responses_review_id ON public.review_responses USING btree (review_id);


--
-- Name: idx_reviews_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_business_id ON public.reviews USING btree (business_id);


--
-- Name: idx_reviews_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_user_id ON public.reviews USING btree (user_id);


--
-- Name: idx_staff_kudos_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_kudos_business_id ON public.staff_kudos USING btree (business_id);


--
-- Name: idx_staff_kudos_staff_member_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_kudos_staff_member_id ON public.staff_kudos USING btree (staff_member_id);


--
-- Name: idx_staff_kudos_tags_kudos_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_kudos_tags_kudos_id ON public.staff_kudos_tags USING btree (staff_kudos_id);


--
-- Name: idx_staff_members_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_members_business_id ON public.staff_members USING btree (business_id);


--
-- Name: idx_user_badges_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_badges_user_id ON public.user_badges USING btree (user_id);


--
-- Name: idx_user_favorites_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_favorites_user_id ON public.user_favorites USING btree (user_id);


--
-- Name: ix_ad_campaigns_active_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ad_campaigns_active_dates ON public.ad_campaigns USING btree (is_active, start_at_utc, end_at_utc);


--
-- Name: ix_ad_campaigns_ad_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ad_campaigns_ad_id ON public.ad_campaigns USING btree (ad_id);


--
-- Name: ix_ad_clicks_ad_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ad_clicks_ad_id ON public.ad_clicks USING btree (ad_id);


--
-- Name: ix_ad_clicks_clicked_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ad_clicks_clicked_at ON public.ad_clicks USING btree (clicked_at_utc);


--
-- Name: ix_ad_impressions_ad_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ad_impressions_ad_id ON public.ad_impressions USING btree (ad_id);


--
-- Name: ix_ad_impressions_viewed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ad_impressions_viewed_at ON public.ad_impressions USING btree (viewed_at_utc);


--
-- Name: ix_ad_targeting_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ad_targeting_campaign_id ON public.ad_targeting USING btree (campaign_id);


--
-- Name: ix_ad_targeting_category_city_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ad_targeting_category_city_state ON public.ad_targeting USING btree (category_slug, city, state);


--
-- Name: ix_ads_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ads_business_id ON public.ads USING btree (business_id);


--
-- Name: ix_ads_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ads_status ON public.ads USING btree (status);


--
-- Name: ix_review_photos_review_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_review_photos_review_id ON public.review_photos USING btree (review_id);


--
-- Name: ux_user_photos_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_user_photos_primary ON public.user_photos USING btree (user_id) WHERE (is_primary = true);


--
-- Name: ad_campaigns ad_campaigns_ad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_campaigns
    ADD CONSTRAINT ad_campaigns_ad_id_fkey FOREIGN KEY (ad_id) REFERENCES public.ads(id) ON DELETE CASCADE;


--
-- Name: ad_clicks ad_clicks_ad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_clicks
    ADD CONSTRAINT ad_clicks_ad_id_fkey FOREIGN KEY (ad_id) REFERENCES public.ads(id) ON DELETE CASCADE;


--
-- Name: ad_impressions ad_impressions_ad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_impressions
    ADD CONSTRAINT ad_impressions_ad_id_fkey FOREIGN KEY (ad_id) REFERENCES public.ads(id) ON DELETE CASCADE;


--
-- Name: ad_targeting ad_targeting_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_targeting
    ADD CONSTRAINT ad_targeting_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.ad_campaigns(id) ON DELETE CASCADE;


--
-- Name: ads ads_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ads
    ADD CONSTRAINT ads_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_categories business_categories_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_categories
    ADD CONSTRAINT business_categories_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_categories business_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_categories
    ADD CONSTRAINT business_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: business_claims business_claims_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_claims
    ADD CONSTRAINT business_claims_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_claims business_claims_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_claims
    ADD CONSTRAINT business_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: business_hours business_hours_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_hours
    ADD CONSTRAINT business_hours_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_memberships business_memberships_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_memberships
    ADD CONSTRAINT business_memberships_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_memberships business_memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_memberships
    ADD CONSTRAINT business_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: business_photos business_photos_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_photos
    ADD CONSTRAINT business_photos_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_photos business_photos_uploaded_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_photos
    ADD CONSTRAINT business_photos_uploaded_by_user_id_fkey FOREIGN KEY (uploaded_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: business_seasonal_tags business_seasonal_tags_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_seasonal_tags
    ADD CONSTRAINT business_seasonal_tags_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: campaign_placements campaign_placements_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_placements
    ADD CONSTRAINT campaign_placements_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.ad_campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_placements campaign_placements_placement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_placements
    ADD CONSTRAINT campaign_placements_placement_id_fkey FOREIGN KEY (placement_id) REFERENCES public.ad_placements(id) ON DELETE CASCADE;


--
-- Name: check_ins check_ins_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT check_ins_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: check_ins check_ins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT check_ins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: review_flags review_flags_resolved_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_flags
    ADD CONSTRAINT review_flags_resolved_by_user_id_fkey FOREIGN KEY (resolved_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: review_flags review_flags_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_flags
    ADD CONSTRAINT review_flags_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;


--
-- Name: review_flags review_flags_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_flags
    ADD CONSTRAINT review_flags_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: review_helpful_votes review_helpful_votes_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_helpful_votes
    ADD CONSTRAINT review_helpful_votes_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;


--
-- Name: review_helpful_votes review_helpful_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_helpful_votes
    ADD CONSTRAINT review_helpful_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: review_photos review_photos_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_photos
    ADD CONSTRAINT review_photos_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;


--
-- Name: review_positive_tags review_positive_tags_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_positive_tags
    ADD CONSTRAINT review_positive_tags_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;


--
-- Name: review_responses review_responses_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_responses
    ADD CONSTRAINT review_responses_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: review_responses review_responses_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_responses
    ADD CONSTRAINT review_responses_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;


--
-- Name: review_responses review_responses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_responses
    ADD CONSTRAINT review_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: staff_kudos staff_kudos_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_kudos
    ADD CONSTRAINT staff_kudos_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: staff_kudos staff_kudos_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_kudos
    ADD CONSTRAINT staff_kudos_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;


--
-- Name: staff_kudos staff_kudos_staff_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_kudos
    ADD CONSTRAINT staff_kudos_staff_member_id_fkey FOREIGN KEY (staff_member_id) REFERENCES public.staff_members(id) ON DELETE CASCADE;


--
-- Name: staff_kudos_tags staff_kudos_tags_staff_kudos_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_kudos_tags
    ADD CONSTRAINT staff_kudos_tags_staff_kudos_id_fkey FOREIGN KEY (staff_kudos_id) REFERENCES public.staff_kudos(id) ON DELETE CASCADE;


--
-- Name: staff_kudos staff_kudos_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_kudos
    ADD CONSTRAINT staff_kudos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: staff_members staff_members_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_members
    ADD CONSTRAINT staff_members_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: user_badges user_badges_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_favorites user_favorites_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: user_favorites user_favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_photos user_photos_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_photos
    ADD CONSTRAINT user_photos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

