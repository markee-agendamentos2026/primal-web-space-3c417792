--
-- PostgreSQL database dump
--

\restrict qeH2L2Gwg7ZANTO6oyedh06KvBjabrfB473HUAZ2rTvmnYhNPBJ8DWt0MWMp1yo

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "public";


--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."app_role" AS ENUM (
    'owner',
    'professional',
    'client',
    'admin'
);


--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."booking_status" AS ENUM (
    'pending',
    'confirmed',
    'cancelled',
    'done'
);


--
-- Name: campaign_channel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."campaign_channel" AS ENUM (
    'whatsapp',
    'email'
);


--
-- Name: plan_tier; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."plan_tier" AS ENUM (
    'basic',
    'intermediate',
    'premium'
);


--
-- Name: bookings_block_when_tenant_blocked(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."bookings_block_when_tenant_blocked"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF public.tenant_effective_status(NEW.tenant_id) = 'blocked' THEN
    RAISE EXCEPTION 'TENANT_BLOCKED' USING HINT = 'Assinatura pendente. Regularize para voltar a utilizar a plataforma.';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: bookings_ensure_profile(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."bookings_ensure_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.whatsapp IS NOT NULL AND length(public.normalize_phone(NEW.whatsapp)) >= 10 THEN
    PERFORM public.ensure_client_profile(
      NEW.whatsapp,
      COALESCE(NEW.client_name, 'Cliente'),
      COALESCE(NEW.email, ''),
      NEW.tenant_id
    );
  END IF;
  RETURN NEW;
END; $$;


--
-- Name: cancel_booking("uuid", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."cancel_booking"("_id" "uuid", "_whatsapp" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _wa text := public.normalize_phone(_whatsapp);
  _rows int;
  _av record;
  _b record;
  _booking_ts timestamptz;
  _limit int;
BEGIN
  IF _wa IS NULL OR length(_wa) < 10 THEN
    RETURN false;
  END IF;

  SELECT * INTO _b FROM public.bookings
   WHERE id = _id AND whatsapp = _wa AND status IN ('pending','confirmed')
   LIMIT 1;
  IF _b IS NULL THEN
    RETURN false;
  END IF;

  SELECT cancel_min_lead_enabled, cancel_min_lead_min INTO _av
    FROM public.availability WHERE tenant_id = _b.tenant_id
    LIMIT 1;

  _limit := COALESCE(_av.cancel_min_lead_min, 0);

  IF COALESCE(_av.cancel_min_lead_enabled, true) AND _limit > 0 THEN
    _booking_ts := (_b.date::timestamp + _b.time) AT TIME ZONE 'America/Sao_Paulo';
    IF _booking_ts - now() < make_interval(mins => _limit) THEN
      RAISE EXCEPTION 'CANCEL_TOO_LATE';
    END IF;
  END IF;

  UPDATE public.bookings SET status = 'cancelled' WHERE id = _id;
  GET DIAGNOSTICS _rows = ROW_COUNT;
  RETURN _rows > 0;
END;
$$;


--
-- Name: confirm_payment("uuid", numeric, "text", "text", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."confirm_payment"("_tenant_id" "uuid", "_amount" numeric, "_method" "text" DEFAULT 'manual'::"text", "_reference" "text" DEFAULT NULL::"text", "_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _pid uuid;
  _new_due date;
  _uid uuid := auth.uid();
BEGIN
  IF NOT public.is_admin(_uid) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.payments (tenant_id, amount, method, reference, notes, created_by)
  VALUES (_tenant_id, _amount, _method, _reference, _notes, _uid)
  RETURNING id INTO _pid;

  SELECT GREATEST(COALESCE(due_date, CURRENT_DATE), CURRENT_DATE) + INTERVAL '30 days'
    INTO _new_due
    FROM public.tenants WHERE id = _tenant_id;

  UPDATE public.tenants
    SET last_payment_at = now(),
        due_date = _new_due::date,
        status = 'active'
    WHERE id = _tenant_id;

  INSERT INTO public.audit_logs (actor_id, tenant_id, action, details)
  VALUES (_uid, _tenant_id, 'payment_confirmed',
          jsonb_build_object('payment_id', _pid, 'amount', _amount, 'method', _method));

  RETURN _pid;
END;
$$;


--
-- Name: ensure_client_profile("text", "text", "text", "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."ensure_client_profile"("_whatsapp" "text", "_name" "text", "_email" "text", "_tenant_id" "uuid" DEFAULT '00000000-0000-0000-0000-000000000001'::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _wa text := public.normalize_phone(_whatsapp);
  _id uuid;
BEGIN
  IF _wa IS NULL OR length(_wa) < 10 THEN RAISE EXCEPTION 'whatsapp invalido'; END IF;
  SELECT id INTO _id FROM public.profiles WHERE whatsapp = _wa AND tenant_id = _tenant_id LIMIT 1;
  IF _id IS NULL THEN
    INSERT INTO public.profiles (id, name, email, whatsapp, active, tenant_id)
    VALUES (gen_random_uuid(), _name, _email, _wa, true, _tenant_id)
    RETURNING id INTO _id;
  END IF;
  RETURN _id;
END; $$;


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_name" "text" NOT NULL,
    "whatsapp" "text" NOT NULL,
    "email" "text",
    "professional_id" "uuid",
    "service_id" "uuid",
    "service_name" "text" NOT NULL,
    "professional_name" "text",
    "date" "date" NOT NULL,
    "time" time without time zone NOT NULL,
    "duration_min" integer NOT NULL,
    "price" numeric(10,2) DEFAULT 0 NOT NULL,
    "status" "public"."booking_status" DEFAULT 'confirmed'::"public"."booking_status" NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "client_name_snapshot" "text",
    "tenant_id" "uuid" DEFAULT '00000000-0000-0000-0000-000000000001'::"uuid" NOT NULL
);

ALTER TABLE ONLY "public"."bookings" REPLICA IDENTITY FULL;


--
-- Name: get_booking_by_id("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_booking_by_id"("_id" "uuid") RETURNS "public"."bookings"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT * FROM public.bookings WHERE id = _id;
$$;


--
-- Name: get_bookings_by_whatsapp("text", "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_bookings_by_whatsapp"("_whatsapp" "text", "_tenant_id" "uuid" DEFAULT '00000000-0000-0000-0000-000000000001'::"uuid") RETURNS SETOF "public"."bookings"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT * FROM public.bookings
   WHERE whatsapp = public.normalize_phone(_whatsapp)
     AND tenant_id = _tenant_id
     AND length(public.normalize_phone(_whatsapp)) >= 10
   ORDER BY date DESC, time DESC;
$$;


--
-- Name: get_taken_slots("date", "uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_taken_slots"("_date" "date", "_professional_id" "uuid" DEFAULT NULL::"uuid", "_tenant_id" "uuid" DEFAULT '00000000-0000-0000-0000-000000000001'::"uuid") RETURNS TABLE("time" time without time zone, "duration_min" integer, "professional_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT b.time, b.duration_min, b.professional_id
  FROM public.bookings b
  WHERE b.date = _date
    AND b.tenant_id = _tenant_id
    AND b.status IN ('pending','confirmed')
    AND (_professional_id IS NULL OR b.professional_id = _professional_id);
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;


--
-- Name: has_role("uuid", "public"."app_role"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;


--
-- Name: is_admin("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."is_admin"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = 'admin'
  )
$$;


--
-- Name: is_client_active("text", "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."is_client_active"("_whatsapp" "text", "_tenant_id" "uuid" DEFAULT '00000000-0000-0000-0000-000000000001'::"uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(
    (SELECT active FROM public.profiles WHERE whatsapp = public.normalize_phone(_whatsapp) AND tenant_id = _tenant_id LIMIT 1),
    true)
$$;


--
-- Name: normalize_phone("text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."normalize_phone"("p" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT regexp_replace(coalesce(p, ''), '\D', '', 'g')
$$;


--
-- Name: refresh_all_tenant_statuses(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."refresh_all_tenant_statuses"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.tenants t
  SET status = CASE
    WHEN t.status = 'blocked' AND t.due_date IS NOT NULL
         AND CURRENT_DATE <= t.due_date THEN 'active'  -- pago e regularizado
    WHEN t.due_date IS NULL THEN t.status
    WHEN CURRENT_DATE > t.due_date + (t.blocked_grace_days || ' days')::interval THEN 'blocked'
    WHEN CURRENT_DATE > t.due_date THEN 'late'
    ELSE 'active'
  END
  WHERE t.due_date IS NOT NULL;
END;
$$;


--
-- Name: tenant_effective_status("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."tenant_effective_status"("_tenant_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    CASE
      WHEN t.status = 'blocked' THEN 'blocked'
      WHEN t.due_date IS NULL THEN 'active'
      WHEN CURRENT_DATE > t.due_date + (t.blocked_grace_days || ' days')::interval THEN 'blocked'
      WHEN CURRENT_DATE > t.due_date THEN 'late'
      ELSE 'active'
    END
  FROM public.tenants t WHERE t.id = _tenant_id
$$;


--
-- Name: tenant_public_status("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."tenant_public_status"("_tenant_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "slug" "text", "status" "text", "effective_status" "text", "due_date" "date", "monthly_price" numeric, "owner_phone" "text", "primary_color" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    t.id, t.name, t.slug,
    t.status,
    public.tenant_effective_status(t.id) AS effective_status,
    t.due_date, t.monthly_price, t.owner_phone, t.primary_color
  FROM public.tenants t
  WHERE t.id = _tenant_id
$$;


--
-- Name: user_belongs_to_tenant("uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."user_belongs_to_tenant"("_user_id" "uuid", "_tenant_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND tenant_id = _tenant_id)
$$;


--
-- Name: user_has_tenant_role("uuid", "uuid", "public"."app_role"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."user_has_tenant_role"("_user_id" "uuid", "_tenant_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and tenant_id = _tenant_id
      and role = _role
  )
$$;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid",
    "actor_email" "text",
    "tenant_id" "uuid",
    "action" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: availability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."availability" (
    "id" integer NOT NULL,
    "open_time" time without time zone DEFAULT '08:00:00'::time without time zone NOT NULL,
    "close_time" time without time zone DEFAULT '20:00:00'::time without time zone NOT NULL,
    "days_enabled" boolean[] DEFAULT ARRAY[false, true, true, true, true, true, true] NOT NULL,
    "lunch_start" time without time zone,
    "lunch_end" time without time zone,
    "min_lead_min" integer DEFAULT 30 NOT NULL,
    "max_future_days" integer DEFAULT 60 NOT NULL,
    "require_pro_selection" boolean DEFAULT true NOT NULL,
    "business_name" "text" DEFAULT 'Ronielson Hair'::"text",
    "address" "text",
    "maps_url" "text",
    "whatsapp_url" "text",
    "instagram_url" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "lunch_enabled" boolean DEFAULT false NOT NULL,
    "min_lead_enabled" boolean DEFAULT true NOT NULL,
    "cancel_min_lead_enabled" boolean DEFAULT true NOT NULL,
    "cancel_min_lead_min" integer DEFAULT 60 NOT NULL,
    "facebook_url" "text",
    "logo_url" "text",
    "tenant_id" "uuid" DEFAULT '00000000-0000-0000-0000-000000000001'::"uuid" NOT NULL
);


--
-- Name: availability_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."availability_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: availability_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."availability_id_seq" OWNED BY "public"."availability"."id";


--
-- Name: blocked_dates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."blocked_dates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "reason" "text",
    "tenant_id" "uuid" DEFAULT '00000000-0000-0000-0000-000000000001'::"uuid" NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "paid_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "method" "text" DEFAULT 'manual'::"text" NOT NULL,
    "reference" "text",
    "provider" "text",
    "provider_ref" "text",
    "created_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: professionals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."professionals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "role" "text",
    "photo_url" "text",
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" DEFAULT '00000000-0000-0000-0000-000000000001'::"uuid" NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."profiles" (
    "id" "uuid" NOT NULL,
    "name" "text",
    "whatsapp" "text",
    "email" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" DEFAULT '00000000-0000-0000-0000-000000000001'::"uuid" NOT NULL
);


--
-- Name: recurrence_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."recurrence_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "channel" "public"."campaign_channel" NOT NULL,
    "target_filter" "text" DEFAULT 'all_active'::"text" NOT NULL,
    "template" "text" NOT NULL,
    "scheduled_at" timestamp with time zone,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "plan_tier" "public"."plan_tier" DEFAULT 'basic'::"public"."plan_tier" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" DEFAULT '00000000-0000-0000-0000-000000000001'::"uuid" NOT NULL
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid",
    "professional_id" "uuid",
    "stars" integer NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" DEFAULT '00000000-0000-0000-0000-000000000001'::"uuid" NOT NULL,
    CONSTRAINT "reviews_stars_check" CHECK ((("stars" >= 1) AND ("stars" <= 5)))
);


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "duration_min" integer NOT NULL,
    "price" numeric(10,2) DEFAULT 0 NOT NULL,
    "emoji" "text",
    "photo_url" "text",
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "promo_pct" integer,
    "promo_starts_at" timestamp with time zone,
    "promo_ends_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text",
    "tenant_id" "uuid" DEFAULT '00000000-0000-0000-0000-000000000001'::"uuid" NOT NULL
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "plan" "text" DEFAULT 'basic'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "primary_color" "text",
    "primary_glow_color" "text",
    "secondary_color" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "due_date" "date",
    "last_payment_at" timestamp with time zone,
    "monthly_price" numeric DEFAULT 99 NOT NULL,
    "owner_name" "text",
    "owner_phone" "text",
    "owner_email" "text",
    "blocked_grace_days" integer DEFAULT 7 NOT NULL,
    CONSTRAINT "tenants_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'late'::"text", 'blocked'::"text"])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "tenant_id" "uuid" DEFAULT '00000000-0000-0000-0000-000000000001'::"uuid" NOT NULL
);


--
-- Name: availability id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."availability" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."availability_id_seq"'::"regclass");


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");


--
-- Name: availability availability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."availability"
    ADD CONSTRAINT "availability_pkey" PRIMARY KEY ("id");


--
-- Name: blocked_dates blocked_dates_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."blocked_dates"
    ADD CONSTRAINT "blocked_dates_date_key" UNIQUE ("date");


--
-- Name: blocked_dates blocked_dates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."blocked_dates"
    ADD CONSTRAINT "blocked_dates_pkey" PRIMARY KEY ("id");


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");


--
-- Name: professionals professionals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."professionals"
    ADD CONSTRAINT "professionals_pkey" PRIMARY KEY ("id");


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");


--
-- Name: recurrence_campaigns recurrence_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."recurrence_campaigns"
    ADD CONSTRAINT "recurrence_campaigns_pkey" PRIMARY KEY ("id");


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_slug_key" UNIQUE ("slug");


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");


--
-- Name: bookings_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bookings_date_idx" ON "public"."bookings" USING "btree" ("date");


--
-- Name: bookings_unique_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "bookings_unique_slot" ON "public"."bookings" USING "btree" ("professional_id", "date", "time") WHERE ("status" = ANY (ARRAY['pending'::"public"."booking_status", 'confirmed'::"public"."booking_status"]));


--
-- Name: idx_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_audit_created" ON "public"."audit_logs" USING "btree" ("created_at" DESC);


--
-- Name: idx_audit_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_audit_tenant" ON "public"."audit_logs" USING "btree" ("tenant_id", "created_at" DESC);


--
-- Name: idx_availability_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "idx_availability_tenant" ON "public"."availability" USING "btree" ("tenant_id");


--
-- Name: idx_blocked_dates_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_blocked_dates_tenant" ON "public"."blocked_dates" USING "btree" ("tenant_id", "date");


--
-- Name: idx_bookings_tenant_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_bookings_tenant_date" ON "public"."bookings" USING "btree" ("tenant_id", "date");


--
-- Name: idx_payments_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_payments_tenant" ON "public"."payments" USING "btree" ("tenant_id", "paid_at" DESC);


--
-- Name: idx_professionals_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_professionals_tenant" ON "public"."professionals" USING "btree" ("tenant_id", "sort_order");


--
-- Name: idx_profiles_tenant_whatsapp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_profiles_tenant_whatsapp" ON "public"."profiles" USING "btree" ("tenant_id", "whatsapp");


--
-- Name: idx_recurrence_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_recurrence_tenant" ON "public"."recurrence_campaigns" USING "btree" ("tenant_id");


--
-- Name: idx_reviews_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_reviews_tenant" ON "public"."reviews" USING "btree" ("tenant_id");


--
-- Name: idx_services_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_services_tenant" ON "public"."services" USING "btree" ("tenant_id", "sort_order");


--
-- Name: idx_user_roles_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_user_roles_tenant" ON "public"."user_roles" USING "btree" ("tenant_id", "user_id");


--
-- Name: profiles_tenant_whatsapp_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "profiles_tenant_whatsapp_unique" ON "public"."profiles" USING "btree" ("tenant_id", "whatsapp") WHERE ("whatsapp" IS NOT NULL);


--
-- Name: reviews_booking_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "reviews_booking_id_unique" ON "public"."reviews" USING "btree" ("booking_id") WHERE ("booking_id" IS NOT NULL);


--
-- Name: bookings trg_bookings_block_when_tenant_blocked; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trg_bookings_block_when_tenant_blocked" BEFORE INSERT ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."bookings_block_when_tenant_blocked"();


--
-- Name: bookings trg_bookings_ensure_profile; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trg_bookings_ensure_profile" BEFORE INSERT ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."bookings_ensure_profile"();


--
-- Name: audit_logs audit_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;


--
-- Name: availability availability_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."availability"
    ADD CONSTRAINT "availability_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");


--
-- Name: blocked_dates blocked_dates_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."blocked_dates"
    ADD CONSTRAINT "blocked_dates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");


--
-- Name: bookings bookings_professional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE SET NULL;


--
-- Name: bookings bookings_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE SET NULL;


--
-- Name: bookings bookings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");


--
-- Name: bookings bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: payments payments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;


--
-- Name: professionals professionals_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."professionals"
    ADD CONSTRAINT "professionals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");


--
-- Name: professionals professionals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."professionals"
    ADD CONSTRAINT "professionals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: profiles profiles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");


--
-- Name: recurrence_campaigns recurrence_campaigns_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."recurrence_campaigns"
    ADD CONSTRAINT "recurrence_campaigns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");


--
-- Name: reviews reviews_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;


--
-- Name: reviews reviews_professional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE SET NULL;


--
-- Name: reviews reviews_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");


--
-- Name: services services_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");


--
-- Name: user_roles user_roles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: audit_logs admin manages audit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin manages audit" ON "public"."audit_logs" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));


--
-- Name: payments admin manages payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin manages payments" ON "public"."payments" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));


--
-- Name: tenants admin writes tenants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin writes tenants" ON "public"."tenants" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));


--
-- Name: bookings anyone creates booking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone creates booking" ON "public"."bookings" FOR INSERT WITH CHECK (true);


--
-- Name: professionals anyone reads active pros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone reads active pros" ON "public"."professionals" FOR SELECT USING (true);


--
-- Name: availability anyone reads availability; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone reads availability" ON "public"."availability" FOR SELECT USING (true);


--
-- Name: blocked_dates anyone reads blocked; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone reads blocked" ON "public"."blocked_dates" FOR SELECT USING (true);


--
-- Name: reviews anyone reads reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone reads reviews" ON "public"."reviews" FOR SELECT USING (true);


--
-- Name: services anyone reads services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone reads services" ON "public"."services" FOR SELECT USING (true);


--
-- Name: tenants anyone reads tenants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone reads tenants" ON "public"."tenants" FOR SELECT USING (true);


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: availability; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."availability" ENABLE ROW LEVEL SECURITY;

--
-- Name: blocked_dates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."blocked_dates" ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings owner deletes bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owner deletes bookings" ON "public"."bookings" FOR DELETE USING ("public"."user_has_tenant_role"("auth"."uid"(), "tenant_id", 'owner'::"public"."app_role"));


--
-- Name: profiles owner inserts profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owner inserts profiles" ON "public"."profiles" FOR INSERT WITH CHECK ((("auth"."uid"() = "id") OR "public"."user_has_tenant_role"("auth"."uid"(), "tenant_id", 'owner'::"public"."app_role")));


--
-- Name: recurrence_campaigns owner manages campaigns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owner manages campaigns" ON "public"."recurrence_campaigns" USING ("public"."user_has_tenant_role"("auth"."uid"(), "tenant_id", 'owner'::"public"."app_role")) WITH CHECK ("public"."user_has_tenant_role"("auth"."uid"(), "tenant_id", 'owner'::"public"."app_role"));


--
-- Name: user_roles owner manages roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owner manages roles" ON "public"."user_roles" USING ("public"."user_has_tenant_role"("auth"."uid"(), "tenant_id", 'owner'::"public"."app_role")) WITH CHECK ("public"."user_has_tenant_role"("auth"."uid"(), "tenant_id", 'owner'::"public"."app_role"));


--
-- Name: bookings owner reads all bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owner reads all bookings" ON "public"."bookings" FOR SELECT USING ("public"."user_has_tenant_role"("auth"."uid"(), "tenant_id", 'owner'::"public"."app_role"));


--
-- Name: payments owner reads own tenant payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owner reads own tenant payments" ON "public"."payments" FOR SELECT TO "authenticated" USING ("public"."user_has_tenant_role"("auth"."uid"(), "tenant_id", 'owner'::"public"."app_role"));


--
-- Name: bookings owner updates bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owner updates bookings" ON "public"."bookings" FOR UPDATE USING ("public"."user_has_tenant_role"("auth"."uid"(), "tenant_id", 'owner'::"public"."app_role"));


--
-- Name: availability owner writes availability; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owner writes availability" ON "public"."availability" USING ("public"."user_has_tenant_role"("auth"."uid"(), "tenant_id", 'owner'::"public"."app_role")) WITH CHECK ("public"."user_has_tenant_role"("auth"."uid"(), "tenant_id", 'owner'::"public"."app_role"));


--
-- Name: blocked_dates owner writes blocked; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owner writes blocked" ON "public"."blocked_dates" USING ("public"."user_has_tenant_role"("auth"."uid"(), "tenant_id", 'owner'::"public"."app_role")) WITH CHECK ("public"."user_has_tenant_role"("auth"."uid"(), "tenant_id", 'owner'::"public"."app_role"));


--
-- Name: professionals owner writes pros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owner writes pros" ON "public"."professionals" USING ("public"."user_has_tenant_role"("auth"."uid"(), "tenant_id", 'owner'::"public"."app_role")) WITH CHECK ("public"."user_has_tenant_role"("auth"."uid"(), "tenant_id", 'owner'::"public"."app_role"));


--
-- Name: tenants owner writes tenants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owner writes tenants" ON "public"."tenants" USING ("public"."user_has_tenant_role"("auth"."uid"(), "id", 'owner'::"public"."app_role")) WITH CHECK ("public"."user_has_tenant_role"("auth"."uid"(), "id", 'owner'::"public"."app_role"));


--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings pro reads own bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "pro reads own bookings" ON "public"."bookings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."professionals" "p"
  WHERE (("p"."id" = "bookings"."professional_id") AND ("p"."user_id" = "auth"."uid"())))));


--
-- Name: professionals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."professionals" ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: recurrence_campaigns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."recurrence_campaigns" ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews review for existing booking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "review for existing booking" ON "public"."reviews" FOR INSERT WITH CHECK ((("booking_id" IS NOT NULL) AND (("stars" >= 1) AND ("stars" <= 5)) AND (EXISTS ( SELECT 1
   FROM "public"."bookings" "b"
  WHERE (("b"."id" = "reviews"."booking_id") AND ("b"."status" = ANY (ARRAY['confirmed'::"public"."booking_status", 'done'::"public"."booking_status"])))))));


--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;

--
-- Name: services; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;

--
-- Name: services staff writes services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff writes services" ON "public"."services" USING (("public"."user_has_tenant_role"("auth"."uid"(), "tenant_id", 'owner'::"public"."app_role") OR "public"."user_has_tenant_role"("auth"."uid"(), "tenant_id", 'professional'::"public"."app_role"))) WITH CHECK (("public"."user_has_tenant_role"("auth"."uid"(), "tenant_id", 'owner'::"public"."app_role") OR "public"."user_has_tenant_role"("auth"."uid"(), "tenant_id", 'professional'::"public"."app_role")));


--
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings user reads own bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "user reads own bookings" ON "public"."bookings" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles users read own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users read own profile" ON "public"."profiles" FOR SELECT USING ((("auth"."uid"() = "id") OR "public"."user_has_tenant_role"("auth"."uid"(), "tenant_id", 'owner'::"public"."app_role")));


--
-- Name: user_roles users read own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users read own roles" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: profiles users update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users update own profile" ON "public"."profiles" FOR UPDATE USING ((("auth"."uid"() = "id") OR "public"."user_has_tenant_role"("auth"."uid"(), "tenant_id", 'owner'::"public"."app_role")));


--
-- PostgreSQL database dump complete
--

\unrestrict qeH2L2Gwg7ZANTO6oyedh06KvBjabrfB473HUAZ2rTvmnYhNPBJ8DWt0MWMp1yo

