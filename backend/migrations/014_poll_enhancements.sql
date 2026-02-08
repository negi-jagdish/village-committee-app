-- Add new columns to polls table
ALTER TABLE polls
ADD COLUMN allow_custom_answer BOOLEAN DEFAULT FALSE,
ADD COLUMN show_results BOOLEAN DEFAULT TRUE;

-- No changes needed for poll_votes table if we use text_response for custom answers
-- even if option_id is NULL.
