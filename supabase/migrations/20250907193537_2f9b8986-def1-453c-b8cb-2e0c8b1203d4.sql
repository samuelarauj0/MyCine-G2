-- First, let's check if our functions exist and recreate the triggers
DROP TRIGGER IF EXISTS on_review_created ON public.reviews;
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

-- Create the trigger for reviews to update XP and challenges
CREATE TRIGGER on_review_created
AFTER INSERT ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_review();

-- Create the trigger for profiles to initialize challenges
CREATE TRIGGER on_profile_created
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_profile();

-- Now let's recalculate all challenge progress based on actual review data
-- Clear current progress and recalculate
UPDATE public.user_challenge_progress
SET current_progress = 0, status = 'in_progress', completed_at = NULL, updated_at = now();

-- Update progress for each challenge type based on actual reviews
-- Daily challenges: reviews today
UPDATE public.user_challenge_progress ucp
SET 
  current_progress = (
    SELECT COUNT(*)
    FROM public.reviews r
    WHERE r.user_id = ucp.user_id
    AND DATE(r.created_at) = CURRENT_DATE
    AND r.is_deleted = false
  ),
  updated_at = now()
FROM public.challenges c
WHERE ucp.challenge_id = c.id
  AND c.type::text = 'daily' 
  AND c.is_active = true;

-- Weekly challenges: reviews this week
UPDATE public.user_challenge_progress ucp
SET 
  current_progress = (
    SELECT COUNT(*)
    FROM public.reviews r
    WHERE r.user_id = ucp.user_id
    AND r.created_at >= DATE_TRUNC('week', CURRENT_DATE)
    AND r.is_deleted = false
  ),
  updated_at = now()
FROM public.challenges c
WHERE ucp.challenge_id = c.id
  AND c.type::text = 'weekly' 
  AND c.is_active = true;

-- Unique challenges: total reviews
UPDATE public.user_challenge_progress ucp
SET 
  current_progress = (
    SELECT COUNT(*)
    FROM public.reviews r
    WHERE r.user_id = ucp.user_id
    AND r.is_deleted = false
  ),
  updated_at = now()
FROM public.challenges c
WHERE ucp.challenge_id = c.id
  AND c.type::text = 'unique' 
  AND c.is_active = true;

-- Mark completed challenges and ensure XP is awarded
UPDATE public.user_challenge_progress ucp
SET 
  status = 'completed',
  completed_at = now(),
  updated_at = now()
FROM public.challenges c
WHERE ucp.challenge_id = c.id
  AND ucp.current_progress >= c.target_value
  AND ucp.status != 'completed';

-- Award XP for newly completed challenges (avoid duplicates)
INSERT INTO public.xp_events (user_id, xp_amount, event_type, reference_id)
SELECT ucp.user_id, c.xp_reward, 'challenge_complete', c.id
FROM public.user_challenge_progress ucp
JOIN public.challenges c ON ucp.challenge_id = c.id
WHERE ucp.status = 'completed'
  AND ucp.completed_at >= now() - interval '1 minute'
  AND NOT EXISTS (
    SELECT 1 FROM public.xp_events xe 
    WHERE xe.user_id = ucp.user_id 
    AND xe.event_type = 'challenge_complete' 
    AND xe.reference_id = c.id
  );

-- Update user XP totals
UPDATE public.user_xp ux
SET 
  total_xp = (
    SELECT COALESCE(SUM(xe.xp_amount), 0)
    FROM public.xp_events xe
    WHERE xe.user_id = ux.user_id
  ),
  level = CASE 
    WHEN (SELECT COALESCE(SUM(xe.xp_amount), 0) FROM public.xp_events xe WHERE xe.user_id = ux.user_id) >= 10000 THEN 10
    WHEN (SELECT COALESCE(SUM(xe.xp_amount), 0) FROM public.xp_events xe WHERE xe.user_id = ux.user_id) >= 5000 THEN 9
    WHEN (SELECT COALESCE(SUM(xe.xp_amount), 0) FROM public.xp_events xe WHERE xe.user_id = ux.user_id) >= 2500 THEN 8
    WHEN (SELECT COALESCE(SUM(xe.xp_amount), 0) FROM public.xp_events xe WHERE xe.user_id = ux.user_id) >= 1500 THEN 7
    WHEN (SELECT COALESCE(SUM(xe.xp_amount), 0) FROM public.xp_events xe WHERE xe.user_id = ux.user_id) >= 1000 THEN 6
    WHEN (SELECT COALESCE(SUM(xe.xp_amount), 0) FROM public.xp_events xe WHERE xe.user_id = ux.user_id) >= 700 THEN 5
    WHEN (SELECT COALESCE(SUM(xe.xp_amount), 0) FROM public.xp_events xe WHERE xe.user_id = ux.user_id) >= 500 THEN 4
    WHEN (SELECT COALESCE(SUM(xe.xp_amount), 0) FROM public.xp_events xe WHERE xe.user_id = ux.user_id) >= 300 THEN 3
    WHEN (SELECT COALESCE(SUM(xe.xp_amount), 0) FROM public.xp_events xe WHERE xe.user_id = ux.user_id) >= 150 THEN 2
    ELSE 1
  END,
  updated_at = now();