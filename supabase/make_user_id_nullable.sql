-- Make user_id nullable so everything works without authentication

ALTER TABLE tasks ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE comments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE project_team_members ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE progress_updates ALTER COLUMN user_id DROP NOT NULL;

SELECT 'user_id is now optional - everything will work!' as status;