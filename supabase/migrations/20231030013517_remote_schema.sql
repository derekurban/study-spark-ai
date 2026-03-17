set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.can_modify_class(in_user_id uuid, in_class_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.can_select_class(in_user_id uuid, in_class_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.chapter_in_valid_class(in_user_id uuid, in_chapter_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.chunk_in_valid_class(in_user_id uuid, in_chunk_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.create_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  BEGIN
    INSERT INTO public.profile (id, username) VALUES (NEW.id, NEW.email);
    RETURN NEW;
  END;
$function$
;

CREATE OR REPLACE FUNCTION public.match_chunk(query_embedding vector, match_threshold double precision, match_count integer, material_id uuid DEFAULT NULL::uuid, class_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, content text, similarity double precision)
 LANGUAGE sql
 STABLE
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.match_chunk_kw(query_text text, match_count integer, material_id uuid DEFAULT NULL::uuid, class_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, content text, similarity double precision)
 LANGUAGE plpgsql
AS $function$
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
$function$
;


