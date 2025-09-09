-- Create function to award XP and update level
CREATE OR REPLACE FUNCTION award_xp(user_id_param UUID, xp_amount INTEGER, event_type_param xp_event_type, reference_id_param UUID DEFAULT NULL, metadata_param JSONB DEFAULT NULL)
RETURNS void AS $$
BEGIN
  -- Insert XP event
  INSERT INTO xp_events (user_id, xp_amount, event_type, reference_id, metadata)
  VALUES (user_id_param, xp_amount, event_type_param, reference_id_param, metadata_param);
  
  -- Update user's total XP and level
  UPDATE user_xp 
  SET 
    total_xp = total_xp + xp_amount,
    level = CASE 
      WHEN (total_xp + xp_amount) >= 10000 THEN 10
      WHEN (total_xp + xp_amount) >= 5000 THEN 9
      WHEN (total_xp + xp_amount) >= 2500 THEN 8
      WHEN (total_xp + xp_amount) >= 1500 THEN 7
      WHEN (total_xp + xp_amount) >= 1000 THEN 6
      WHEN (total_xp + xp_amount) >= 700 THEN 5
      WHEN (total_xp + xp_amount) >= 500 THEN 4
      WHEN (total_xp + xp_amount) >= 300 THEN 3
      WHEN (total_xp + xp_amount) >= 150 THEN 2
      ELSE 1
    END,
    updated_at = now()
  WHERE user_id = user_id_param;
  
  -- If user_xp doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO user_xp (user_id, total_xp, level)
    VALUES (user_id_param, xp_amount, 1);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update challenge progress
CREATE OR REPLACE FUNCTION update_challenge_progress(user_id_param UUID, challenge_type_param text, increment_amount INTEGER DEFAULT 1)
RETURNS void AS $$
DECLARE
  challenge_record RECORD;
  current_progress INTEGER;
  is_completed BOOLEAN;
BEGIN
  -- Get all active challenges of the specified type
  FOR challenge_record IN 
    SELECT * FROM challenges 
    WHERE type::text = challenge_type_param AND is_active = true
  LOOP
    -- Get or create user progress for this challenge
    SELECT current_progress, status = 'completed' INTO current_progress, is_completed
    FROM user_challenge_progress 
    WHERE user_id = user_id_param AND challenge_id = challenge_record.id;
    
    -- If no progress exists, create it
    IF current_progress IS NULL THEN
      INSERT INTO user_challenge_progress (user_id, challenge_id, current_progress, status)
      VALUES (user_id_param, challenge_record.id, 0, 'in_progress');
      current_progress := 0;
      is_completed := false;
    END IF;
    
    -- Update progress if not already completed
    IF NOT is_completed THEN
      current_progress := current_progress + increment_amount;
      
      -- Check if challenge is completed
      IF current_progress >= challenge_record.target_value THEN
        UPDATE user_challenge_progress 
        SET 
          current_progress = challenge_record.target_value,
          status = 'completed',
          completed_at = now(),
          updated_at = now()
        WHERE user_id = user_id_param AND challenge_id = challenge_record.id;
        
        -- Award XP for completing the challenge
        PERFORM award_xp(user_id_param, challenge_record.xp_reward, 'challenge_completion', challenge_record.id);
      ELSE
        UPDATE user_challenge_progress 
        SET 
          current_progress = current_progress,
          updated_at = now()
        WHERE user_id = user_id_param AND challenge_id = challenge_record.id;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to initialize challenges for new users
CREATE OR REPLACE FUNCTION initialize_user_challenges(user_id_param UUID)
RETURNS void AS $$
BEGIN
  -- Initialize progress for all active challenges
  INSERT INTO user_challenge_progress (user_id, challenge_id, current_progress, status)
  SELECT user_id_param, id, 0, 'in_progress'
  FROM challenges 
  WHERE is_active = true
  ON CONFLICT (user_id, challenge_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function for new reviews
CREATE OR REPLACE FUNCTION handle_new_review()
RETURNS TRIGGER AS $$
BEGIN
  -- Award XP for creating a review
  PERFORM award_xp(NEW.user_id, 10, 'review_created', NEW.id);
  
  -- Update challenge progress
  PERFORM update_challenge_progress(NEW.user_id, 'daily', 1);
  PERFORM update_challenge_progress(NEW.user_id, 'weekly', 1);
  PERFORM update_challenge_progress(NEW.user_id, 'unique', 1);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for reviews
DROP TRIGGER IF EXISTS trigger_new_review ON reviews;
CREATE TRIGGER trigger_new_review
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_review();

-- Create trigger function for new user profiles
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Initialize user XP
  INSERT INTO user_xp (user_id, total_xp, level)
  VALUES (NEW.user_id, 0, 1)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Initialize user challenges
  PERFORM initialize_user_challenges(NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for profiles
DROP TRIGGER IF EXISTS trigger_new_profile ON profiles;
CREATE TRIGGER trigger_new_profile
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_profile();