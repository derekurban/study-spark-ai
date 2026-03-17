
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

CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";

CREATE OR REPLACE FUNCTION "public"."can_modify_class"("in_user_id" "uuid", "in_class_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    isOwner BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM study_class 
        WHERE id=in_class_id AND owner_id=in_user_id
    ) INTO isOwner;

    RETURN isOwner;
END;
$$;

ALTER FUNCTION "public"."can_modify_class"("in_user_id" "uuid", "in_class_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."can_select_class"("in_user_id" "uuid", "in_class_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    isOwner BOOLEAN;
    isFriend BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM study_class 
        WHERE id=in_class_id AND owner_id=in_user_id
    ) INTO isOwner;

    SELECT EXISTS (
        SELECT 1 
        FROM friend_in_class
        WHERE class_id=in_class_id AND friend_id=in_user_id
    ) INTO isFriend;

    RETURN isOwner OR isFriend;
END;
$$;

ALTER FUNCTION "public"."can_select_class"("in_user_id" "uuid", "in_class_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."chapter_in_valid_class"("in_user_id" "uuid", "in_chapter_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    in_class_id UUID;
BEGIN
    SELECT study_material.class_id
    FROM study_material
    JOIN study_chapter ON study_chapter.material_id = study_material.id
    WHERE study_chapter.id = in_chapter_id
    INTO in_class_id;
    
    IF in_class_id IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN can_select_class(in_user_id, in_class_id);
END;
$$;

ALTER FUNCTION "public"."chapter_in_valid_class"("in_user_id" "uuid", "in_chapter_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."chunk_in_valid_class"("in_user_id" "uuid", "in_chunk_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    in_class_id UUID;
BEGIN
    SELECT study_material.class_id
    FROM study_material
    JOIN study_chapter ON study_chapter.material_id = study_material.id
    JOIN study_chunk ON study_chunk.chapter_id = study_chapter.id
    WHERE study_chunk.id = in_chunk_id
    INTO in_class_id;
    
    IF in_class_id IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN can_select_class(in_user_id, in_class_id);
END;
$$;

ALTER FUNCTION "public"."chunk_in_valid_class"("in_user_id" "uuid", "in_chunk_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."create_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  BEGIN
    INSERT INTO public.profile (id, username) VALUES (NEW.id, NEW.email);
    RETURN NEW;
  END;
$$;

ALTER FUNCTION "public"."create_profile"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."match_chunk"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "material_id" "uuid" DEFAULT NULL::"uuid", "class_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "content" "text", "similarity" double precision)
    LANGUAGE "sql" STABLE
    AS $$
  select
    "study_chunk".id,
    "study_chunk".content,
    1 - ("study_chunk".embedding <=> query_embedding) as similarity
  from "study_chunk"
  join "study_chapter" on "study_chunk".chapter_id = "study_chapter".id
  join "study_material" on "study_chapter".material_id = "study_material".id
  join "study_class" on "study_material".class_id = "study_class".id
  where (1 - ("study_chunk".embedding <=> query_embedding) > match_threshold) AND
        (("study_material".id = material_id AND material_id is not null) OR 
         ("study_class".id = class_id AND class_id is not null))
  order by similarity desc
  limit match_count;
$$;

ALTER FUNCTION "public"."match_chunk"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "material_id" "uuid", "class_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."match_chunk_kw"("query_text" "text", "match_count" integer, "material_id" "uuid" DEFAULT NULL::"uuid", "class_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "content" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $_$
begin
return query execute
format('select "study_chunk".id, content, (1 - ts_rank(to_tsvector(content), plainto_tsquery(%1$L))) as similarity
from "study_chunk"
inner join "study_chapter" on "study_chunk".chapter_id = "study_chapter".id
inner join "study_material" on "study_chapter".material_id = "study_material".id
inner join "study_class" on "study_material".class_id = "study_class".id
where to_tsvector(content) @@ plainto_tsquery(%1$L) and 
      (("study_material".id = %2$L and %2$L is not null) or
      ("study_class".id = %3$L and %3$L is not null))
order by similarity desc
limit %4$L', query_text, material_id, class_id, match_count)
using query_text, material_id, class_id, match_count;
end;
$_$;

ALTER FUNCTION "public"."match_chunk_kw"("query_text" "text", "match_count" integer, "material_id" "uuid", "class_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."debug_logs" (
    "message" "text"
);

ALTER TABLE "public"."debug_logs" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."friend_in_class" (
    "class_id" "uuid" NOT NULL,
    "friend_id" "uuid" NOT NULL
);

ALTER TABLE "public"."friend_in_class" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."friends_with" (
    "owner_id" "uuid" NOT NULL,
    "friend_id" "uuid" NOT NULL
);

ALTER TABLE "public"."friends_with" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."invite_link" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "type" "text" NOT NULL
);

ALTER TABLE "public"."invite_link" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."profile" (
    "id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "username" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."profile" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."sharing_material" (
    "from_user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "to_user_id" "uuid" NOT NULL,
    "material_id" "uuid" NOT NULL
);

ALTER TABLE "public"."sharing_material" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."study_chapter" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "material_id" "uuid" NOT NULL,
    "page_num" bigint NOT NULL,
    "owner_id" "uuid" DEFAULT "auth"."uid"() NOT NULL
);

ALTER TABLE "public"."study_chapter" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."study_chunk" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "public"."vector"(384),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "chapter_id" "uuid" NOT NULL,
    "chunk_order" bigint NOT NULL,
    "owner_id" "uuid" DEFAULT "auth"."uid"() NOT NULL
);

ALTER TABLE "public"."study_chunk" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."study_class" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "title" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."study_class" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."study_material" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "title" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "file_path" "text" NOT NULL,
    "public" boolean DEFAULT false NOT NULL
);

ALTER TABLE "public"."study_material" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."study_tag" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "title" "text" NOT NULL,
    "color" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "class_id" "uuid" NOT NULL
);

ALTER TABLE "public"."study_tag" OWNER TO "postgres";

ALTER TABLE ONLY "public"."study_chunk"
    ADD CONSTRAINT "chunk_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."study_class"
    ADD CONSTRAINT "class_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."friend_in_class"
    ADD CONSTRAINT "friend_in_class_pkey" PRIMARY KEY ("class_id", "friend_id");

ALTER TABLE ONLY "public"."friends_with"
    ADD CONSTRAINT "friends_with_pkey" PRIMARY KEY ("owner_id", "friend_id");

ALTER TABLE ONLY "public"."invite_link"
    ADD CONSTRAINT "invite_link_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."study_material"
    ADD CONSTRAINT "lecture_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."study_chapter"
    ADD CONSTRAINT "page_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."profile"
    ADD CONSTRAINT "profile_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."sharing_material"
    ADD CONSTRAINT "sharing_material_pkey" PRIMARY KEY ("from_user_id", "to_user_id", "material_id");

ALTER TABLE ONLY "public"."study_tag"
    ADD CONSTRAINT "tag_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."friend_in_class"
    ADD CONSTRAINT "friend_in_class_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."study_class"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."friend_in_class"
    ADD CONSTRAINT "friend_in_class_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."friends_with"
    ADD CONSTRAINT "friends_with_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "public"."profile"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."friends_with"
    ADD CONSTRAINT "friends_with_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."invite_link"
    ADD CONSTRAINT "invite_link_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."profile"
    ADD CONSTRAINT "profile_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."sharing_material"
    ADD CONSTRAINT "sharing_material_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."sharing_material"
    ADD CONSTRAINT "sharing_material_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."study_material"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."sharing_material"
    ADD CONSTRAINT "sharing_material_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."study_chapter"
    ADD CONSTRAINT "study_chapter_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."study_material"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."study_chapter"
    ADD CONSTRAINT "study_chapter_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."study_chunk"
    ADD CONSTRAINT "study_chunk_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."study_chapter"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."study_chunk"
    ADD CONSTRAINT "study_chunk_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."study_class"
    ADD CONSTRAINT "study_class_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."study_material"
    ADD CONSTRAINT "study_material_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."study_class"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."study_material"
    ADD CONSTRAINT "study_material_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."study_tag"
    ADD CONSTRAINT "study_tag_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."study_class"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."study_tag"
    ADD CONSTRAINT "study_tag_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;

CREATE POLICY "Enable all for class owners" ON "public"."friend_in_class" TO "authenticated" USING ("public"."can_modify_class"("auth"."uid"(), "class_id")) WITH CHECK ("public"."can_modify_class"("auth"."uid"(), "class_id"));

CREATE POLICY "Enable delete for authenticated users only" ON "public"."invite_link" FOR DELETE TO "authenticated" USING (true);

CREATE POLICY "Enable delete for users based on owner_id" ON "public"."study_class" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "owner_id"));

CREATE POLICY "Enable delete for users based on owner_id" ON "public"."study_material" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "owner_id"));

CREATE POLICY "Enable delete for users based on owner_id" ON "public"."study_tag" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "owner_id"));

CREATE POLICY "Enable insert for authenticated users only" ON "public"."friends_with" FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."invite_link" FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."profile" FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."study_chapter" FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."study_chunk" FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."study_class" FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."study_material" FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."study_tag" FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Enable read access for all authenticated users" ON "public"."invite_link" FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Enable read access for authenticated users" ON "public"."profile" FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Enable select for class owners and friends in class" ON "public"."friend_in_class" FOR SELECT TO "authenticated" USING ("public"."can_select_class"("auth"."uid"(), "class_id"));

CREATE POLICY "Enable select for users based on owner_id" ON "public"."friends_with" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "owner_id"));

CREATE POLICY "Enable select for users based on owner_id" ON "public"."study_chapter" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "owner_id") OR "public"."chapter_in_valid_class"("auth"."uid"(), "id")));

CREATE POLICY "Enable select for users based on owner_id" ON "public"."study_chunk" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "owner_id") OR "public"."chunk_in_valid_class"("auth"."uid"(), "id")));

CREATE POLICY "Enable select for users based on owner_id" ON "public"."study_material" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "owner_id") OR "public"."can_select_class"("auth"."uid"(), "class_id")));

CREATE POLICY "Enable select for users based on owner_id" ON "public"."study_tag" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "owner_id"));

CREATE POLICY "Enable select for users based on owner_id or friend_in_class" ON "public"."study_class" FOR SELECT TO "authenticated" USING ((("owner_id" = "auth"."uid"()) OR "public"."can_select_class"("auth"."uid"(), "id")));

CREATE POLICY "Enable update for authenticated users only" ON "public"."friends_with" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);

CREATE POLICY "Enable update for users based on owner_id" ON "public"."study_class" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "owner_id")) WITH CHECK (true);

CREATE POLICY "Enable update for users based on owner_id" ON "public"."study_material" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "owner_id")) WITH CHECK (true);

CREATE POLICY "Enable update for users based on owner_id" ON "public"."study_tag" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "owner_id")) WITH CHECK (true);

ALTER TABLE "public"."friend_in_class" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."friends_with" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."invite_link" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."profile" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."sharing_material" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."study_chapter" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."study_chunk" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."study_class" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."study_material" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."study_tag" ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";

GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";

GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";

GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";

GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";

GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";

GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";

GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";

GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";

GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";

GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";

GRANT ALL ON FUNCTION "public"."can_modify_class"("in_user_id" "uuid", "in_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_modify_class"("in_user_id" "uuid", "in_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_modify_class"("in_user_id" "uuid", "in_class_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."can_select_class"("in_user_id" "uuid", "in_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_select_class"("in_user_id" "uuid", "in_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_select_class"("in_user_id" "uuid", "in_class_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."chapter_in_valid_class"("in_user_id" "uuid", "in_chapter_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."chapter_in_valid_class"("in_user_id" "uuid", "in_chapter_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."chapter_in_valid_class"("in_user_id" "uuid", "in_chapter_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."chunk_in_valid_class"("in_user_id" "uuid", "in_chunk_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."chunk_in_valid_class"("in_user_id" "uuid", "in_chunk_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."chunk_in_valid_class"("in_user_id" "uuid", "in_chunk_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";

GRANT ALL ON FUNCTION "public"."create_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_profile"() TO "service_role";

GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";

GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";

GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";

GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";

GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";

GRANT ALL ON FUNCTION "public"."match_chunk"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "material_id" "uuid", "class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."match_chunk"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "material_id" "uuid", "class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_chunk"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "material_id" "uuid", "class_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."match_chunk_kw"("query_text" "text", "match_count" integer, "material_id" "uuid", "class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."match_chunk_kw"("query_text" "text", "match_count" integer, "material_id" "uuid", "class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_chunk_kw"("query_text" "text", "match_count" integer, "material_id" "uuid", "class_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";

GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";

GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";

GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";

GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";

GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";

GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";

GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";

GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";

GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";

GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";

GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";

GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";

GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";

GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";

GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";

GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";

GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";

GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";

GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";

GRANT ALL ON TABLE "public"."debug_logs" TO "anon";
GRANT ALL ON TABLE "public"."debug_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."debug_logs" TO "service_role";

GRANT ALL ON TABLE "public"."friend_in_class" TO "anon";
GRANT ALL ON TABLE "public"."friend_in_class" TO "authenticated";
GRANT ALL ON TABLE "public"."friend_in_class" TO "service_role";

GRANT ALL ON TABLE "public"."friends_with" TO "anon";
GRANT ALL ON TABLE "public"."friends_with" TO "authenticated";
GRANT ALL ON TABLE "public"."friends_with" TO "service_role";

GRANT ALL ON TABLE "public"."invite_link" TO "anon";
GRANT ALL ON TABLE "public"."invite_link" TO "authenticated";
GRANT ALL ON TABLE "public"."invite_link" TO "service_role";

GRANT ALL ON TABLE "public"."profile" TO "anon";
GRANT ALL ON TABLE "public"."profile" TO "authenticated";
GRANT ALL ON TABLE "public"."profile" TO "service_role";

GRANT ALL ON TABLE "public"."sharing_material" TO "anon";
GRANT ALL ON TABLE "public"."sharing_material" TO "authenticated";
GRANT ALL ON TABLE "public"."sharing_material" TO "service_role";

GRANT ALL ON TABLE "public"."study_chapter" TO "anon";
GRANT ALL ON TABLE "public"."study_chapter" TO "authenticated";
GRANT ALL ON TABLE "public"."study_chapter" TO "service_role";

GRANT ALL ON TABLE "public"."study_chunk" TO "anon";
GRANT ALL ON TABLE "public"."study_chunk" TO "authenticated";
GRANT ALL ON TABLE "public"."study_chunk" TO "service_role";

GRANT ALL ON TABLE "public"."study_class" TO "anon";
GRANT ALL ON TABLE "public"."study_class" TO "authenticated";
GRANT ALL ON TABLE "public"."study_class" TO "service_role";

GRANT ALL ON TABLE "public"."study_material" TO "anon";
GRANT ALL ON TABLE "public"."study_material" TO "authenticated";
GRANT ALL ON TABLE "public"."study_material" TO "service_role";

GRANT ALL ON TABLE "public"."study_tag" TO "anon";
GRANT ALL ON TABLE "public"."study_tag" TO "authenticated";
GRANT ALL ON TABLE "public"."study_tag" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";

RESET ALL;
