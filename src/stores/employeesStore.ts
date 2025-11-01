import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  hourlyRate: number;
  notes?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  userId: string;
}

interface EmployeesState {
  employees: Employee[];
  isLoading: boolean;
  error: string | null;
  searchTerm: string;
  statusFilter: 'all' | 'active' | 'inactive';

  // Actions
  fetchEmployees: () => Promise<void>;
  addEmployee: (employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  updateEmployee: (id: string, employee: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  setSearchTerm: (term: string) => void;
  setStatusFilter: (status: 'all' | 'active' | 'inactive') => void;
}

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

  return '00000000-0000-0000-0000-000000000000';
};

export const useEmployeesStore = create<EmployeesState>((set, get) => ({
  employees: [],
  isLoading: false,
  error: null,
  searchTerm: '',
  statusFilter: 'all',

  fetchEmployees: async () => {
    set({ isLoading: true, error: null });
    try {
      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({
        employees: data?.map(emp => ({
          id: emp.id,
          name: emp.name,
          email: emp.email || '',
          phone: emp.phone || '',
          jobTitle: emp.job_title || '',
          hourlyRate: emp.hourly_rate || 0,
          notes: emp.notes || '',
          status: emp.status || 'active',
          createdAt: emp.created_at,
          updatedAt: emp.updated_at,
          userId: emp.user_id
        })) || [],
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching employees:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch employees',
        isLoading: false
      });
    }
  },

  addEmployee: async (employeeData) => {
    set({ isLoading: true, error: null });
    try {
      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from('employees')
        .insert({
          name: employeeData.name,
          email: employeeData.email || null,
          phone: employeeData.phone || null,
          job_title: employeeData.jobTitle,
          hourly_rate: employeeData.hourlyRate || 0,
          notes: employeeData.notes || null,
          status: employeeData.status || 'active',
          user_id: userId
        })
        .select()
        .single();

      if (error) throw error;

      const newEmployee: Employee = {
        id: data.id,
        name: data.name,
        email: data.email || '',
        phone: data.phone || '',
        jobTitle: data.job_title || '',
        hourlyRate: data.hourly_rate || 0,
        notes: data.notes || '',
        status: data.status || 'active',
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        userId: data.user_id
      };

      set((state) => ({
        employees: [newEmployee, ...state.employees],
        isLoading: false
      }));
    } catch (error) {
      console.error('Error adding employee:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to add employee',
        isLoading: false
      });
    }
  },

  updateEmployee: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const userId = await getCurrentUserId();

      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.jobTitle !== undefined) dbUpdates.job_title = updates.jobTitle;
      if (updates.hourlyRate !== undefined) dbUpdates.hourly_rate = updates.hourlyRate;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      dbUpdates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('employees')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedEmployee: Employee = {
        id: data.id,
        name: data.name,
        email: data.email || '',
        phone: data.phone || '',
        jobTitle: data.job_title || '',
        hourlyRate: data.hourly_rate || 0,
        notes: data.notes || '',
        status: data.status || 'active',
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        userId: data.user_id
      };

      set((state) => ({
        employees: state.employees.map(emp =>
          emp.id === id ? updatedEmployee : emp
        ),
        isLoading: false
      }));
    } catch (error) {
      console.error('Error updating employee:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to update employee',
        isLoading: false
      });
    }
  },

  deleteEmployee: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const userId = await getCurrentUserId();

      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        employees: state.employees.filter(emp => emp.id !== id),
        isLoading: false
      }));
    } catch (error) {
      console.error('Error deleting employee:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to delete employee',
        isLoading: false
      });
    }
  },

  setSearchTerm: (term) => set({ searchTerm: term }),
  setStatusFilter: (status) => set({ statusFilter: status })
}));

export default useEmployeesStore;
