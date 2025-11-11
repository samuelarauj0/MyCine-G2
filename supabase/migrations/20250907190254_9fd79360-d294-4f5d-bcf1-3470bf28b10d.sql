-- Initialize challenges for current user and process existing review  
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