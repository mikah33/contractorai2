import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { CalendarService } from '../services/calendarService';
import { getCachedProjects } from '../lib/storeQueryBridge';

// Helper function to get current user ID
const getCurrentUserId = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      return user.id;
    }
  } catch (error) {
    console.log('Auth not available, using development mode');
  }
  
  // For development - return a consistent UUID
  return '00000000-0000-0000-0000-000000000000';
};

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'completed';
  assignee: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  projectId: string;
}

interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  attachments?: string[];
  projectId: string;
}

interface Project {
  id: string;
  name: string;
  client: string;
  clientId?: string;
  address?: string;
  status: 'active' | 'completed' | 'on_hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  progress: number;
  team: string[];
  description: string;
  tasks: Task[];
  comments: Comment[];
  userId?: string;
}

interface ProgressUpdate {
  id: string;
  projectId: string;
  taskId?: string;
  description: string;
  photos: string[];
  postedBy: string;
  date: string;
}

interface ProjectStore {
  projects: Project[];
  progressUpdates: ProgressUpdate[];
  loading: boolean;
  error: string | null;
  hasLoadedOnce: boolean;

  // Actions
  fetchProjects: (force?: boolean) => Promise<void>;
  addProject: (project: Omit<Project, 'id' | 'tasks' | 'comments' | 'progress' | 'spent' | 'team'>) => Promise<void>;
  updateProject: (id: string, project: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  
  // Task actions
  addTask: (projectId: string, task: Omit<Task, 'id' | 'projectId'>) => Promise<void>;
  updateTask: (projectId: string, taskId: string, task: Partial<Task>) => Promise<void>;
  deleteTask: (projectId: string, taskId: string) => Promise<void>;
  
  // Comment actions
  addComment: (projectId: string, comment: Omit<Comment, 'id' | 'projectId' | 'timestamp'>, attachmentFiles?: File[]) => Promise<void>;
  deleteComment: (projectId: string, commentId: string) => Promise<void>;
  
  // Team member actions
  addTeamMember: (projectId: string, memberName: string, email?: string, role?: string) => Promise<void>;
  removeTeamMember: (projectId: string, memberName: string) => Promise<void>;
  
  // Progress update actions
  fetchProgressUpdates: (projectId: string) => Promise<void>;
  addProgressUpdate: (update: Omit<ProgressUpdate, 'id'>, imageFiles?: File[]) => Promise<void>;
  deleteProgressUpdate: (updateId: string) => Promise<void>;
}

// No authentication needed - removed user requirements

const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  progressUpdates: [],
  loading: false,
  error: null,
  hasLoadedOnce: false,

  fetchProjects: async (force = false) => {
    console.log('🔵 fetchProjects called, force:', force);

    // Skip cache for now to debug - always fetch fresh data
    // TODO: Re-enable cache after debugging
    /*
    const cachedProjects = getCachedProjects();
    if (cachedProjects && cachedProjects.length > 0 && !force) {
      console.log('📦 Using cached projects:', cachedProjects.length);
      set({
        projects: cachedProjects,
        loading: false,
        hasLoadedOnce: true,
        error: null
      });
      return;
    }
    */

    set({ loading: true, error: null });
    try {
      console.log('📡 Fetching projects from Supabase...');
      // Fetch ALL projects - no user filter
      const { data: projects, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📊 Projects response:', { count: projects?.length || 0, projects, error: projectError });
      if (projectError) throw projectError;

      // No need to fetch clients - client_name is stored directly in projects table

      // Fetch tasks for all projects
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📋 Fetched tasks from database:', tasks?.length || 0, tasks);
      if (tasksError) console.error('❌ Error fetching tasks:', tasksError);

      // Fetch comments for all projects
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('💬 Fetched comments from database:', comments?.length || 0, comments);
      if (commentsError) console.error('❌ Error fetching comments:', commentsError);

      // Fetch team members for all projects
      const { data: teamMembers, error: teamError } = await supabase
        .from('project_team_members')
        .select('*');

      if (teamError) console.error('Error fetching team members:', teamError);

      // Convert database format to component format
      const formattedProjects: Project[] = (projects || []).map(p => {
        const projectTasks = (tasks || []).filter(t => t.project_id === p.id).map(t => {
          console.log(`  ✓ Task for project ${p.id}:`, t.title);
          // Parse assignee: if it contains comma, split into array
          const assigneeData = t.assignee
            ? (t.assignee.includes(',') ? t.assignee.split(',') : t.assignee)
            : '';

          return {
            id: t.id,
            title: t.title,
            status: t.status as 'todo' | 'in-progress' | 'completed',
            assignee: assigneeData,
            dueDate: t.due_date || '',
            priority: t.priority as 'low' | 'medium' | 'high',
            projectId: t.project_id
          };
        });

        const projectComments = (comments || []).filter(c => c.project_id === p.id).map(c => ({
          id: c.id,
          author: c.author,
          content: c.content,
          timestamp: c.created_at,
          attachments: c.attachments || [],
          projectId: c.project_id
        }));

        const projectTeam = (teamMembers || [])
          .filter(tm => tm.project_id === p.id)
          .map(tm => tm.member_name);

        // Calculate progress based on tasks
        const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
        const totalTasks = projectTasks.length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Get client name directly from the projects table
        const clientName = p.client_name || 'Direct Client';

        return {
          id: p.id,
          name: p.name,
          client: clientName, // Client name is stored directly in projects table
          clientId: p.client_id || null, // Load client_id from database
          address: p.address || '',
          status: p.status || 'active',
          priority: p.priority || 'medium',
          startDate: p.start_date || new Date().toISOString(),
          endDate: p.end_date || new Date().toISOString(),
          budget: parseFloat(p.budget) || 0,
          spent: parseFloat(p.spent) || 0,
          progress,
          team: projectTeam,
          description: p.description || '',
          tasks: projectTasks,
          comments: projectComments,
          userId: p.user_id || null
        };
      });

      set({ projects: formattedProjects, loading: false, hasLoadedOnce: true });
    } catch (error) {
      console.error('Error fetching projects:', error);
      set({ error: error.message || 'Failed to fetch projects', loading: false });
    }
  },

  addProject: async (projectData) => {
    set({ loading: true, error: null });
    try {
      // Get current user ID
      const userId = await getCurrentUserId();
      
      console.log('Adding project with user_id:', userId);
      
      // Prepare data matching exact SQL structure
      const insertData: any = {
        name: projectData.name,
        client_name: projectData.client || null,
        address: projectData.address || null,
        status: projectData.status || 'active',
        priority: projectData.priority || 'medium',
        start_date: projectData.startDate || null,
        end_date: projectData.endDate || null,
        budget: projectData.budget || 0,
        spent: 0,
        progress: 0,
        description: projectData.description || null,
        user_id: userId
      };

      // Add client_id if provided
      if (projectData.clientId) {
        insertData.client_id = projectData.clientId;
      }

      const { data, error } = await supabase
        .from('projects')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating project:', error);
        console.error('Project data being sent:', {
          name: projectData.name,
          client_name: projectData.client || null,
          status: projectData.status,
          start_date: projectData.startDate,
          end_date: projectData.endDate,
          budget: projectData.budget,
          description: projectData.description
        });
        throw error;
      }

      // Add to local state
      const newProject: Project = {
        id: data.id,
        name: data.name,
        client: data.client_name || projectData.client || 'Direct Client',
        clientId: data.client_id || null, // Load client_id from database response
        address: data.address || projectData.address || '',
        status: data.status,
        priority: projectData.priority || 'medium',
        startDate: data.start_date,
        endDate: data.end_date,
        budget: parseFloat(data.budget),
        spent: 0,
        progress: 0,
        team: [],
        description: data.description || '',
        tasks: [],
        comments: [],
        userId: null
      };

      // Sync project dates to calendar
      if (data.start_date || data.end_date) {
        await CalendarService.syncProjectDates(data.id, {
          name: data.name,
          start_date: data.start_date,
          end_date: data.end_date
        });
        console.log('Project dates synced to calendar');
      }
      
      set(state => ({
        projects: [newProject, ...state.projects],
        loading: false
      }));
    } catch (error: any) {
      console.error('Error adding project:', error);
      const errorMessage = error.message || 'Failed to add project';
      set({ error: errorMessage, loading: false });
      alert(`Error creating project: ${errorMessage}`);
      throw error;
    }
  },

  updateProject: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      
      // Get current user ID for RLS
      const userId = await getCurrentUserId();
      
      // Prepare updates for Supabase
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.client !== undefined) dbUpdates.client_name = updates.client;
      if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
      if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
      if (updates.budget !== undefined) dbUpdates.budget = updates.budget;
      if (updates.spent !== undefined) dbUpdates.spent = updates.spent;
      if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      dbUpdates.updated_at = new Date().toISOString();

      console.log('Updating project with:', dbUpdates);

      const { error } = await supabase
        .from('projects')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      // Sync updated project dates to calendar if dates changed
      if (updates.startDate || updates.endDate) {
        const project = get().projects.find(p => p.id === id);
        if (project) {
          await CalendarService.syncProjectDates(id, {
            name: project.name,
            start_date: updates.startDate || project.startDate,
            end_date: updates.endDate || project.endDate
          });
          console.log('Updated project dates synced to calendar');
        }
      }

      // Update local state
      set(state => ({
        projects: state.projects.map(p => 
          p.id === id ? { ...p, ...updates } : p
        ),
        loading: false
      }));
    } catch (error) {
      console.error('Error updating project:', error);
      set({ error: error.message || 'Failed to update project', loading: false });
    }
  },

  deleteProject: async (id) => {
    set({ loading: true, error: null });
    try {
      // Get current user ID for RLS
      const userId = await getCurrentUserId();
      
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        projects: state.projects.filter(p => p.id !== id),
        loading: false
      }));
    } catch (error) {
      console.error('Error deleting project:', error);
      set({ error: error.message || 'Failed to delete project', loading: false });
    }
  },

  // Task management with Supabase
  addTask: async (projectId, task) => {
    console.log('🔵 addTask called with:', { projectId, task });
    try {
      const userId = await getCurrentUserId();
      
      // Convert assignee array to comma-separated string for database storage
      const assigneeValue = Array.isArray(task.assignee)
        ? (task.assignee.length > 0 ? task.assignee.join(',') : null)
        : (task.assignee || null);

      const taskData: any = {
        project_id: projectId,
        title: task.title,
        status: task.status,
        assignee: assigneeValue,
        due_date: task.dueDate || null,  // Send null instead of empty string
        priority: task.priority
      };
      
      // Only add user_id if we have a valid one
      if (userId && userId !== '00000000-0000-0000-0000-000000000000') {
        taskData.user_id = userId;
      }
      console.log('📤 Sending to Supabase:', taskData);

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase error:', error);
        console.error('Full error:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('✅ Task saved to database:', data);
      alert('Task saved successfully!');

      // Parse assignee back to array if it's a comma-separated string
      const assigneeData = data.assignee
        ? (data.assignee.includes(',') ? data.assignee.split(',') : data.assignee)
        : '';

      const newTask: Task = {
        id: data.id,
        title: data.title,
        status: data.status as 'todo' | 'in-progress' | 'completed',
        assignee: assigneeData,
        dueDate: data.due_date || '',
        priority: data.priority as 'low' | 'medium' | 'high',
        projectId: data.project_id
      };

      set(state => ({
        projects: state.projects.map(p =>
          p.id === projectId
            ? { ...p, tasks: [...(p.tasks || []), newTask] }
            : p
        )
      }));
      console.log('✅ Task added to local state');
    } catch (error) {
      console.error('❌ Error adding task:', error);
      alert(`Failed to save task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  updateTask: async (projectId, taskId, updates) => {
    try {
      const userId = await getCurrentUserId();
      
      const dbUpdates: any = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.assignee !== undefined) dbUpdates.assignee = updates.assignee || null;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate || null;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      dbUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('tasks')
        .update(dbUpdates)
        .eq('id', taskId);

      if (error) throw error;

      set(state => ({
        projects: state.projects.map(p =>
          p.id === projectId
            ? {
                ...p,
                tasks: (p.tasks || []).map(t =>
                  t.id === taskId ? { ...t, ...updates } : t
                )
              }
            : p
        )
      }));
    } catch (error) {
      console.error('Error updating task:', error);
      alert(`Error updating task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  deleteTask: async (projectId, taskId) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      set(state => ({
        projects: state.projects.map(p =>
          p.id === projectId
            ? { ...p, tasks: (p.tasks || []).filter(t => t.id !== taskId) }
            : p
        )
      }));
    } catch (error) {
      console.error('Error deleting task:', error);
      alert(`Error deleting task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Comment management with Supabase
  addComment: async (projectId, comment, attachmentFiles) => {
    console.log('🔵 addComment called with:', { projectId, comment, filesCount: attachmentFiles?.length || 0 });
    try {
      // Upload attachments to Supabase Storage if provided
      let attachmentUrls: string[] = [];
      if (attachmentFiles && attachmentFiles.length > 0) {
        console.log('📤 Uploading', attachmentFiles.length, 'comment attachments to Supabase Storage...');
        
        for (const file of attachmentFiles) {
          const fileName = `comments/${projectId}/${Date.now()}_${file.name}`;
          console.log('📸 Uploading file:', fileName);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('progress-photos') // Using same bucket for all attachments
            .upload(fileName, file);

          if (uploadError) {
            console.error('❌ Error uploading attachment:', uploadError);
            if (uploadError.message?.includes('not found')) {
              alert('Storage bucket "progress-photos" not found. Please create it in Supabase Dashboard.');
            }
            continue;
          }

          // Get public URL for the uploaded file
          const { data: { publicUrl } } = supabase.storage
            .from('progress-photos')
            .getPublicUrl(fileName);

          attachmentUrls.push(publicUrl);
          console.log('✅ Uploaded successfully, URL:', publicUrl);
        }
        
        console.log('📸 All uploaded attachment URLs:', attachmentUrls);
      }

      const userId = await getCurrentUserId();
      console.log('🔐 Current user ID for comment:', userId);
      
      const commentData: any = {
        project_id: projectId,
        author: comment.author,
        content: comment.content,
        attachments: attachmentUrls.length > 0 ? attachmentUrls : (comment.attachments || [])
      };
      
      // Only add user_id if we have a valid one
      if (userId && userId !== '00000000-0000-0000-0000-000000000000') {
        commentData.user_id = userId;
      }
      console.log('📤 Sending comment to Supabase:', commentData);

      const { data, error } = await supabase
        .from('comments')
        .insert(commentData)
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase error:', error);
        console.error('Full error:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('✅ Comment saved to database:', data);

      const newComment: Comment = {
        id: data.id,
        author: data.author,
        content: data.content,
        timestamp: data.created_at,
        attachments: data.attachments || [],
        projectId: data.project_id
      };

      set(state => ({
        projects: state.projects.map(p =>
          p.id === projectId
            ? { ...p, comments: [...(p.comments || []), newComment] }
            : p
        )
      }));
      console.log('✅ Comment added to local state');
      alert('Comment saved successfully!');
    } catch (error: any) {
      console.error('❌ Error adding comment:', error);
      const errorMessage = error.message || 'Failed to save comment';
      alert(`Error saving comment: ${errorMessage}`);
      throw error; // Re-throw to let the component handle it
    }
  },

  deleteComment: async (projectId, commentId) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      set(state => ({
        projects: state.projects.map(p =>
          p.id === projectId
            ? { ...p, comments: (p.comments || []).filter(c => c.id !== commentId) }
            : p
        )
      }));
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert(`Error deleting comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Team member management with Supabase
  addTeamMember: async (projectId, memberName, email?, role?) => {
    console.log('🔵 addTeamMember called with:', { projectId, memberName, email, role });
    try {
      const userId = await getCurrentUserId();
      
      const memberData: any = {
        project_id: projectId,
        member_name: memberName,
        member_email: email || null
      };
      
      // Only add user_id if we have a valid one
      if (userId && userId !== '00000000-0000-0000-0000-000000000000') {
        memberData.user_id = userId;
      }
      
      const { data, error } = await supabase
        .from('project_team_members')
        .insert(memberData)
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase error adding team member:', error);
        if (error.code === '23505') {
          alert('This team member is already on the project');
        } else {
          alert('Failed to add team member. Check console for details.');
        }
        throw error;
      }

      console.log('✅ Team member added to database:', data);

      // Update local state
      set(state => ({
        projects: state.projects.map(p => 
          p.id === projectId 
            ? { ...p, team: [...p.team, memberName] }
            : p
        )
      }));
      console.log('✅ Team member added to local state');
    } catch (error) {
      console.error('❌ Error adding team member:', error);
    }
  },

  removeTeamMember: async (projectId, memberName) => {
    console.log('🔵 removeTeamMember called with:', { projectId, memberName });
    try {
      const { error } = await supabase
        .from('project_team_members')
        .delete()
        .eq('project_id', projectId)
        .eq('member_name', memberName);

      if (error) {
        console.error('❌ Supabase error removing team member:', error);
        throw error;
      }

      console.log('✅ Team member removed from database');

      // Update local state
      set(state => ({
        projects: state.projects.map(p => 
          p.id === projectId 
            ? { ...p, team: p.team.filter(name => name !== memberName) }
            : p
        )
      }));
      console.log('✅ Team member removed from local state');
    } catch (error) {
      console.error('❌ Error removing team member:', error);
      alert('Failed to remove team member. Check console for details.');
    }
  },

  // Progress update actions
  fetchProgressUpdates: async (projectId) => {
    console.log('🔍 fetchProgressUpdates called for project:', projectId);
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('progress_updates')
        .select('*')
        .eq('project_id', projectId)
        .order('date', { ascending: false });

      if (error) {
        console.error('❌ Supabase error fetching progress updates:', error);
        if (error.code === '42P01') {
          alert('Progress updates table does not exist. Please run the database migration script.');
        }
        throw error;
      }

      console.log('✅ Fetched progress updates from database:', data);

      const updates: ProgressUpdate[] = (data || []).map(u => ({
        id: u.id,
        projectId: u.project_id,
        taskId: u.task_id,
        description: u.description,
        photos: u.photos || [],
        postedBy: u.posted_by,
        date: u.date
      }));

      console.log('📦 Processed progress updates:', updates);
      set({ progressUpdates: updates, loading: false });
    } catch (error: any) {
      console.error('❌ Error fetching progress updates:', error);
      set({ error: error.message || 'Failed to fetch progress updates', loading: false });
    }
  },

  addProgressUpdate: async (update, imageFiles?: File[]) => {
    console.log('💾 addProgressUpdate called with:', { update, filesCount: imageFiles?.length || 0 });
    set({ loading: true, error: null });
    try {
      const userId = await getCurrentUserId();

      // Upload images to Supabase Storage if provided
      let photoUrls: string[] = [];
      if (imageFiles && imageFiles.length > 0) {
        console.log('📤 Uploading', imageFiles.length, 'images to Supabase Storage...');
        
        for (const file of imageFiles) {
          const fileName = `${update.projectId}/${Date.now()}_${file.name}`;
          console.log('📸 Uploading file:', fileName);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('progress-photos')
            .upload(fileName, file);

          if (uploadError) {
            console.error('❌ Error uploading image:', uploadError);
            if (uploadError.message?.includes('not found')) {
              alert('Storage bucket "progress-photos" not found. Please create it in Supabase Dashboard.');
            }
            continue;
          }

          // Get public URL for the uploaded image
          const { data: { publicUrl } } = supabase.storage
            .from('progress-photos')
            .getPublicUrl(fileName);

          photoUrls.push(publicUrl);
          console.log('✅ Uploaded successfully, URL:', publicUrl);
        }
        
        console.log('📸 All uploaded photo URLs:', photoUrls);
      } else {
        // If no files provided, use the URLs from update (for backwards compatibility)
        photoUrls = update.photos;
      }

      const insertData = {
        project_id: update.projectId,
        task_id: update.taskId || null,
        description: update.description,
        photos: photoUrls,
        posted_by: update.postedBy,
        date: update.date,
        user_id: userId
      };
      
      console.log('💾 Inserting into database:', insertData);

      const { data, error } = await supabase
        .from('progress_updates')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('❌ Database insert error:', error);
        if (error.code === '42P01') {
          alert('Progress updates table does not exist. Please run the database migration script.');
        }
        throw error;
      }

      console.log('✅ Successfully saved to database:', data);

      const newUpdate: ProgressUpdate = {
        id: data.id,
        projectId: data.project_id,
        taskId: data.task_id,
        description: data.description,
        photos: data.photos || [],
        postedBy: data.posted_by,
        date: data.date
      };

      set(state => ({
        progressUpdates: [newUpdate, ...state.progressUpdates],
        loading: false
      }));
      
      console.log('✅ Progress update added successfully!');
    } catch (error: any) {
      console.error('❌ Error adding progress update:', error);
      alert(`Failed to save progress update: ${error.message}`);
      set({ error: error.message || 'Failed to add progress update', loading: false });
    }
  },

  deleteProgressUpdate: async (updateId) => {
    console.log('🗑️ deleteProgressUpdate called for:', updateId);
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('progress_updates')
        .delete()
        .eq('id', updateId);

      if (error) {
        console.error('❌ Database delete error:', error);
        throw error;
      }

      console.log('✅ Successfully deleted from database');

      // Remove from local state
      set(state => ({
        progressUpdates: state.progressUpdates.filter(u => u.id !== updateId),
        loading: false
      }));
      
      console.log('✅ Progress update deleted successfully!');
      alert('Progress update deleted successfully!');
    } catch (error: any) {
      console.error('❌ Error deleting progress update:', error);
      alert(`Failed to delete progress update: ${error.message}`);
      set({ error: error.message || 'Failed to delete progress update', loading: false });
    }
  }
}));

export default useProjectStore;