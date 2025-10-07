-- Create triggers to update XP and challenges automatically
-- 1) After a new review
DROP TRIGGER IF EXISTS on_review_created ON public.reviews;
CREATE TRIGGER on_review_created
AFTER INSERT ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_review();

-- 2) After a new profile (initialize XP and challenges)
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

-- Backfill: mark 'Primeira Avaliação' as completed for users with at least 1 review
WITH primeira AS (
  SELECT id AS challenge_id, target_value, xp_reward
  FROM public.challenges
  WHERE is_active = true AND type::text = 'unique' AND name ILIKE 'primeira%'
  ORDER BY created_at
  LIMIT 1
), eligible AS (
  SELECT r.user_id
  FROM public.reviews r
  WHERE r.is_deleted = false
  GROUP BY r.user_id
  HAVING COUNT(*) >= 1
), updated AS (
  UPDATE public.user_challenge_progress ucp
  SET 
    current_progress = GREATEST(ucp.current_progress, 1),
    status = 'completed',
    completed_at = COALESCE(ucp.completed_at, now()),
    updated_at = now()
  FROM primeira p
  JOIN eligible e ON e.user_id = ucp.user_id
  WHERE ucp.challenge_id = p.challenge_id
    AND ucp.status <> 'completed'
  RETURNING ucp.user_id
), inserted_events AS (
  INSERT INTO public.xp_events (user_id, xp_amount, event_type, reference_id)
  SELECT u.user_id, p.xp_reward, 'challenge_complete', p.challenge_id
  FROM updated u
  JOIN primeira p ON TRUE
  LEFT JOIN public.xp_events xe 
    ON xe.user_id = u.user_id 
   AND xe.event_type = 'challenge_complete' 
   AND xe.reference_id = p.challenge_id
  WHERE xe.id IS NULL
  RETURNING user_id, xp_amount
)
-- Update user_xp for those we just inserted an event for
UPDATE public.user_xp ux
SET 
  total_xp = ux.total_xp + ie.xp_amount,
  level = CASE 
    WHEN (ux.total_xp + ie.xp_amount) >= 10000 THEN 10
    WHEN (ux.total_xp + ie.xp_amount) >= 5000 THEN 9
    WHEN (ux.total_xp + ie.xp_amount) >= 2500 THEN 8
    WHEN (ux.total_xp + ie.xp_amount) >= 1500 THEN 7
    WHEN (ux.total_xp + ie.xp_amount) >= 1000 THEN 6
    WHEN (ux.total_xp + ie.xp_amount) >= 700 THEN 5
    WHEN (ux.total_xp + ie.xp_amount) >= 500 THEN 4
    WHEN (ux.total_xp + ie.xp_amount) >= 300 THEN 3
    WHEN (ux.total_xp + ie.xp_amount) >= 150 THEN 2
    ELSE 1
  END,
  updated_at = now()
FROM inserted_events ie
WHERE ux.user_id = ie.user_id;

-- If user_xp row didn't exist, create it now with the awarded amount
INSERT INTO public.user_xp (user_id, total_xp, level)
SELECT ie.user_id, ie.xp_amount, 1
FROM inserted_events ie
LEFT JOIN public.user_xp ux ON ux.user_id = ie.user_id
WHERE ux.user_id IS NULL;