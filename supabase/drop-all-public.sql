-- ============================================================
-- ARHAT — SUPABASE БҮХ PUBLIC TABLE-ыг УСТГАХ
-- ------------------------------------------------------------
-- `public` схем доторх БҮХ table, view, function, trigger-ыг
-- АВТОМААТАР (динамикаар) устгана. Гараар жагсаах шаардлагагүй —
-- өөр table, view, function байсан ч бүгд устгагдана.
--
-- ⚠️ ЭНЭ ТАБЛЕЙЦУУД БА ТЭДНИЙ БҮХ ӨГӨГДӨЛИЙГ БҮРЭН УСТГАНА!
--    auth.* / storage.* схемүүд УСТГАГДАХГҮЙ (Supabase-д зайлшгүй шаардлагатай)
-- ============================================================

-- ---------- 1. Triggers ----------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT trigger_name, event_object_table
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I CASCADE',
      r.trigger_name, r.event_object_table);
  END LOOP;
END $$;

-- ---------- 2. Functions (мөн aggregates, procedures) ----------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT routine_name
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_type IN ('FUNCTION','PROCEDURE','AGGREGATE')
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I() CASCADE', r.routine_name);
  END LOOP;
END $$;

-- ---------- 3. Views ----------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT table_name
    FROM information_schema.views
    WHERE table_schema = 'public'
  LOOP
    EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', r.table_name);
  END LOOP;
END $$;

-- ---------- 4. Sequences (автоинкремент) ----------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
  LOOP
    EXECUTE format('DROP SEQUENCE IF EXISTS public.%I CASCADE', r.sequence_name);
  END LOOP;
END $$;

-- ---------- 5. БҮХ TABLES ----------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
  END LOOP;
END $$;

-- ---------- 6. Табуудыг бүрэн устгасан эсэхийг шалгах ----------
SELECT
  (SELECT count(*) FROM pg_tables WHERE schemaname = 'public') AS remaining_tables,
  (SELECT count(*) FROM information_schema.routines WHERE routine_schema = 'public') AS remaining_functions;
