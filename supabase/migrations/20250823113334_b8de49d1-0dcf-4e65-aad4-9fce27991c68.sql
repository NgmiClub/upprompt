-- Fix security issues by updating functions with proper search_path

-- Update the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, bio)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'bio', '')
  );
  RETURN NEW;
END;
$$;

-- Recreate the view without SECURITY DEFINER (views shouldn't have this property)
DROP VIEW public.prompts_with_stats;

CREATE VIEW public.prompts_with_stats AS
SELECT 
  p.*,
  pr.username,
  pr.avatar_url,
  COALESCE(up_count.count, 0) as upvotes,
  COALESCE(bookmark_count.count, 0) as bookmarks
FROM public.prompts p
LEFT JOIN public.profiles pr ON p.user_id = pr.user_id
LEFT JOIN (
  SELECT prompt_id, COUNT(*) as count
  FROM public.up_prompts
  GROUP BY prompt_id
) up_count ON p.id = up_count.prompt_id
LEFT JOIN (
  SELECT prompt_id, COUNT(*) as count
  FROM public.bookmarks
  GROUP BY prompt_id
) bookmark_count ON p.id = bookmark_count.prompt_id
ORDER BY p.created_at DESC;