-- Fix the ambiguous column reference in update_challenge_progress function
CREATE OR REPLACE FUNCTION update_challenge_progress(user_id_param UUID, challenge_type_param text, increment_amount INTEGER DEFAULT 1)
RETURNS void AS $$
DECLARE
  challenge_record RECORD;
  user_current_progress INTEGER;
  is_completed BOOLEAN;
BEGIN
  -- Get all active challenges of the specified type
  FOR challenge_record IN 
    SELECT * FROM public.challenges 
    WHERE type::text = challenge_type_param AND is_active = true
  LOOP
    -- Get or create user progress for this challenge
    SELECT ucp.current_progress, ucp.status = 'completed' INTO user_current_progress, is_completed
    FROM public.user_challenge_progress ucp
    WHERE ucp.user_id = user_id_param AND ucp.challenge_id = challenge_record.id;
    
    -- If no progress exists, create it
    IF user_current_progress IS NULL THEN
      INSERT INTO public.user_challenge_progress (user_id, challenge_id, current_progress, status)
      VALUES (user_id_param, challenge_record.id, 0, 'in_progress');
      user_current_progress := 0;
      is_completed := false;
    END IF;
    
    -- Update progress if not already completed
    IF NOT is_completed THEN
      user_current_progress := user_current_progress + increment_amount;
      
      -- Check if challenge is completed
      IF user_current_progress >= challenge_record.target_value THEN
        UPDATE public.user_challenge_progress 
        SET 
          current_progress = challenge_record.target_value,
          status = 'completed',
          completed_at = now(),
          updated_at = now()
        WHERE user_id = user_id_param AND challenge_id = challenge_record.id;
        
        -- Award XP for completing the challenge
        PERFORM public.award_xp(user_id_param, challenge_record.xp_reward, 'challenge_complete', challenge_record.id);
      ELSE
        UPDATE public.user_challenge_progress 
        SET 
          current_progress = user_current_progress,
          updated_at = now()
        WHERE user_id = user_id_param AND challenge_id = challenge_record.id;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Now run the initialization for the current user
DO $$
BEGIN
  -- Initialize challenges for the current user
  PERFORM initialize_user_challenges('3c6f3751-95cf-4b6b-9f6d-c526944ccb16');
  
  -- Award XP for the existing review using correct enum value
  PERFORM award_xp('3c6f3751-95cf-4b6b-9f6d-c526944ccb16', 10, 'daily_review', '751253b1-789d-4aaf-9937-d3273dfb3770');
  
  -- Update challenge progress for the existing review
  PERFORM update_challenge_progress('3c6f3751-95cf-4b6b-9f6d-c526944ccb16', 'daily', 1);
  PERFORM update_challenge_progress('3c6f3751-95cf-4b6b-9f6d-c526944ccb16', 'weekly', 1);
  PERFORM update_challenge_progress('3c6f3751-95cf-4b6b-9f6d-c526944ccb16', 'unique', 1);
END $$;