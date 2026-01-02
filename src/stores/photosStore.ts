import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface ProjectPhoto {
  id: string;
  userId: string;
  projectId: string | null;
  imageUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  category: string;
  isProgressPhoto: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  // Joined data
  projectName?: string;
}

interface PhotosStore {
  photos: ProjectPhoto[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchPhotos: (projectId?: string) => Promise<void>;
  fetchAllPhotos: () => Promise<void>;
  addPhoto: (photo: Omit<ProjectPhoto, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ProjectPhoto | null>;
  addPhotos: (photos: Omit<ProjectPhoto, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<ProjectPhoto[]>;
  updatePhoto: (id: string, updates: Partial<ProjectPhoto>) => Promise<void>;
  deletePhoto: (id: string) => Promise<void>;
  uploadPhoto: (file: File, projectId?: string, caption?: string) => Promise<string | null>;
}

const usePhotosStore = create<PhotosStore>((set, get) => ({
  photos: [],
  isLoading: false,
  error: null,

  fetchPhotos: async (projectId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('project_photos')
        .select(`
          *,
          projects:project_id (name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const photos: ProjectPhoto[] = (data || []).map((p: any) => ({
        id: p.id,
        userId: p.user_id,
        projectId: p.project_id,
        imageUrl: p.image_url,
        thumbnailUrl: p.thumbnail_url,
        caption: p.caption,
        category: p.category || 'general',
        isProgressPhoto: p.is_progress_photo || false,
        metadata: p.metadata,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        projectName: p.projects?.name
      }));

      set({ photos, isLoading: false });
    } catch (error: any) {
      console.error('Error fetching photos:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  fetchAllPhotos: async () => {
    await get().fetchPhotos();
  },

  addPhoto: async (photo) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('project_photos')
        .insert({
          user_id: user.id,
          project_id: photo.projectId,
          image_url: photo.imageUrl,
          thumbnail_url: photo.thumbnailUrl,
          caption: photo.caption,
          category: photo.category || 'general',
          is_progress_photo: photo.isProgressPhoto || false,
          metadata: photo.metadata || {}
        })
        .select()
        .single();

      if (error) throw error;

      const newPhoto: ProjectPhoto = {
        id: data.id,
        userId: data.user_id,
        projectId: data.project_id,
        imageUrl: data.image_url,
        thumbnailUrl: data.thumbnail_url,
        caption: data.caption,
        category: data.category,
        isProgressPhoto: data.is_progress_photo,
        metadata: data.metadata,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      set(state => ({
        photos: [newPhoto, ...state.photos],
        isLoading: false
      }));

      return newPhoto;
    } catch (error: any) {
      console.error('Error adding photo:', error);
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  addPhotos: async (photos) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const photoRecords = photos.map(photo => ({
        user_id: user.id,
        project_id: photo.projectId,
        image_url: photo.imageUrl,
        thumbnail_url: photo.thumbnailUrl,
        caption: photo.caption,
        category: photo.category || 'general',
        is_progress_photo: photo.isProgressPhoto || false,
        metadata: photo.metadata || {}
      }));

      const { data, error } = await supabase
        .from('project_photos')
        .insert(photoRecords)
        .select();

      if (error) throw error;

      const newPhotos: ProjectPhoto[] = (data || []).map((p: any) => ({
        id: p.id,
        userId: p.user_id,
        projectId: p.project_id,
        imageUrl: p.image_url,
        thumbnailUrl: p.thumbnail_url,
        caption: p.caption,
        category: p.category,
        isProgressPhoto: p.is_progress_photo,
        metadata: p.metadata,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }));

      set(state => ({
        photos: [...newPhotos, ...state.photos],
        isLoading: false
      }));

      return newPhotos;
    } catch (error: any) {
      console.error('Error adding photos:', error);
      set({ error: error.message, isLoading: false });
      return [];
    }
  },

  updatePhoto: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('project_photos')
        .update({
          caption: updates.caption,
          category: updates.category,
          is_progress_photo: updates.isProgressPhoto,
          project_id: updates.projectId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        photos: state.photos.map(p =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        ),
        isLoading: false
      }));
    } catch (error: any) {
      console.error('Error updating photo:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  deletePhoto: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const photo = get().photos.find(p => p.id === id);

      // Delete from database
      const { error } = await supabase
        .from('project_photos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Try to delete from storage if we have the URL
      if (photo?.imageUrl) {
        try {
          const urlParts = photo.imageUrl.split('/');
          const fileName = urlParts.slice(-2).join('/');
          await supabase.storage.from('project-photos').remove([fileName]);
        } catch (storageError) {
          console.log('Could not delete from storage:', storageError);
        }
      }

      set(state => ({
        photos: state.photos.filter(p => p.id !== id),
        isLoading: false
      }));
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  uploadPhoto: async (file, projectId, caption) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '00000000-0000-0000-0000-000000000000';

      const sanitizedFileName = file.name
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '');
      const fileName = `${userId}/${projectId || 'general'}/${Date.now()}_${sanitizedFileName}`;

      // Try project-photos bucket first
      let bucketName = 'project-photos';
      let { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file);

      // Fallback to receipt-images if project-photos doesn't exist
      if (uploadError?.message?.includes('not found')) {
        bucketName = 'receipt-images';
        const result = await supabase.storage
          .from(bucketName)
          .upload(fileName, file);
        uploadError = result.error;
      }

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      // Save to database
      await get().addPhoto({
        userId,
        projectId: projectId || null,
        imageUrl: publicUrl,
        caption,
        category: projectId ? 'project' : 'general',
        isProgressPhoto: !!projectId,
        metadata: { originalFileName: file.name, size: file.size }
      });

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  }
}));

export default usePhotosStore;
