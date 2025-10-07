-- Update handle_new_review function to use correct enum value
CREATE OR REPLACE FUNCTION handle_new_review()
RETURNS TRIGGER AS $$
BEGIN
  -- Award XP for creating a review (using correct enum value)
  PERFORM public.award_xp(NEW.user_id, 10, 'daily_review', NEW.id);
  
  -- Update challenge progress
  PERFORM public.update_challenge_progress(NEW.user_id, 'daily', 1);
  PERFORM public.update_challenge_progress(NEW.user_id, 'weekly', 1);
  PERFORM public.update_challenge_progress(NEW.user_id, 'unique', 1);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;