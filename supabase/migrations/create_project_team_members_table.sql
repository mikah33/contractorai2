-- Create project_team_members table for managing team assignments
CREATE TABLE IF NOT EXISTS public.project_team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  member_name TEXT NOT NULL,
  member_email TEXT,
  member_role TEXT,
  member_phone TEXT,
  permissions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate members on same project
  UNIQUE(project_id, member_name)
);

-- Create index on project_id for faster queries
CREATE INDEX IF NOT EXISTS idx_project_team_members_project_id ON public.project_team_members(project_id);

-- Enable Row Level Security
ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - users can manage team members for their own projects
CREATE POLICY "Users can view team members for their projects"
  ON public.project_team_members
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add team members to their projects"
  ON public.project_team_members
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update team members on their projects"
  ON public.project_team_members
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove team members from their projects"
  ON public.project_team_members
  FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

-- Create trigger to auto-update updated_at timestamp
CREATE TRIGGER update_project_team_members_updated_at
  BEFORE UPDATE ON public.project_team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.project_team_members TO authenticated;
GRANT ALL ON public.project_team_members TO service_role;
