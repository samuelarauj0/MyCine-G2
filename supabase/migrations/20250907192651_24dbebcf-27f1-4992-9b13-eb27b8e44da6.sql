-- Create triggers to update XP and challenges automatically
DROP TRIGGER IF EXISTS on_review_created ON public.reviews;
CREATE TRIGGER on_review_created
AFTER INSERT ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_review();

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_profile();

-- Ensure all users have rows for all active challenges
INSERT INTO public.user_challenge_progress (user_id, challenge_id, current_progress, status)
SELECT p.user_id, c.id, 0, 'in_progress'
FROM public.profiles p
CROSS JOIN public.challenges c
WHERE c.is_active = true
ON CONFLICT (user_id, challenge_id) DO NOTHING;

-- Update challenge progress for daily challenges (count reviews today)
UPDATE public.user_challenge_progress
SET 
  current_progress = (
    SELECT COUNT(*)
    FROM public.reviews r
    WHERE r.user_id = user_challenge_progress.user_id
    AND DATE(r.created_at) = CURRENT_DATE
    AND r.is_deleted = false
  ),
  updated_at = now()
WHERE challenge_id IN (
  SELECT id FROM public.challenges 
  WHERE type::text = 'daily' AND is_active = true
);

-- Update challenge progress for weekly challenges (count reviews this week)
UPDATE public.user_challenge_progress
SET 
  current_progress = (
    SELECT COUNT(*)
    FROM public.reviews r
    WHERE r.user_id = user_challenge_progress.user_id
    AND r.created_at >= DATE_TRUNC('week', CURRENT_DATE)
    AND r.is_deleted = false
  ),
  updated_at = now()
WHERE challenge_id IN (
  SELECT id FROM public.challenges 
  WHERE type::text = 'weekly' AND is_active = true
);

-- Update challenge progress for unique challenges (count total reviews)
UPDATE public.user_challenge_progress
SET 
  current_progress = (
    SELECT COUNT(*)
    FROM public.reviews r
    WHERE r.user_id = user_challenge_progress.user_id
    AND r.is_deleted = false
  ),
  updated_at = now()
WHERE challenge_id IN (
  SELECT id FROM public.challenges 
  WHERE type::text = 'unique' AND is_active = true
);

-- Mark completed challenges
UPDATE public.user_challenge_progress ucp
SET 
  status = 'completed',
  completed_at = COALESCE(ucp.completed_at, now())
FROM public.challenges c
WHERE ucp.challenge_id = c.id
  AND ucp.current_progress >= c.target_value
  AND ucp.status <> 'completed';