import { useState } from 'react';
import { 
  CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp, Edit, Trash2, 
  User, Calendar, Flag, Tag, Plus, Filter, Search, MoreVertical, ArrowUp, ArrowDown, MessageSquare
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'completed';
  assignee: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  description?: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

interface TaskListProps {
  tasks: Task[];
  team: TeamMember[];
  onAddTask: () => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask?: (taskId: string) => void;
  onAddComment?: (taskId: string, comment: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, team, onAddTask, onUpdateTask, onDeleteTask, onAddComment }) => {
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [sortField, setSortField] = useState<'dueDate' | 'priority'>('dueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTask, setEditingTask] = useState<string | null>(null);

  const toggleTaskExpand = (taskId: string) => {
    console.log('Toggling task expand for:', taskId, 'Current expanded:', expandedTask);
    setExpandedTask(expandedTask === taskId ? null : taskId);
  };

  const handleSaveTask = (taskId: string) => {
    // Get the form elements
    const titleEl = document.getElementById('edit-title') as HTMLInputElement;
    const statusEl = document.getElementById('edit-status') as HTMLSelectElement;
    const priorityEl = document.getElementById('edit-priority') as HTMLSelectElement;
    const assigneeEl = document.getElementById('edit-assignee') as HTMLSelectElement;
    const dueDateEl = document.getElementById('edit-due-date') as HTMLInputElement;
    const descriptionEl = document.getElementById('edit-description') as HTMLTextAreaElement;
    
    if (onUpdateTask && titleEl) {
      onUpdateTask(taskId, {
        title: titleEl.value,
        status: statusEl.value as any,
        priority: priorityEl.value as any,
        assignee: assigneeEl.value,
        dueDate: dueDateEl.value,
        description: descriptionEl.value
      });
      setEditingTask(null);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      if (onDeleteTask) {
        onDeleteTask(taskId);
      }
    }
  };

  const handleMarkComplete = (taskId: string) => {
    if (onUpdateTask) {
      onUpdateTask(taskId, { status: 'completed' });
      // Visual feedback
      const button = document.getElementById(`complete-btn-${taskId}`);
      if (button) {
        button.style.backgroundColor = '#10b981';
        button.style.color = 'white';
        button.textContent = '✅ Completed!';
        setTimeout(() => {
          button.style.backgroundColor = '';
          button.style.color = '';
          button.textContent = 'Mark Complete';
        }, 2000);
      }
    }
  };

  const handleSort = (field: 'dueDate' | 'priority') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'todo':
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      case 'todo':
        return 'To Do';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityValue = (priority: string) => {
    switch (priority) {
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
        return 1;
      default:
        return 0;
    }
  };

  const filteredTasks = tasks
    .filter(task => {
      if (filterStatus !== 'all' && task.status !== filterStatus) return false;
      if (filterAssignee !== 'all' && task.assignee !== filterAssignee) return false;
      if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortField === 'dueDate') {
        const dateA = new Date(a.dueDate).getTime();
        const dateB = new Date(b.dueDate).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      } else {
        const priorityA = getPriorityValue(a.priority);
        const priorityB = getPriorityValue(b.priority);
        return sortDirection === 'asc' ? priorityA - priorityB : priorityB - priorityA;
      }
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search tasks..."
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Status</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Assignees</option>
            {team.map(member => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
          <button
            onClick={onAddTask}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredTasks.length === 0 ? (
            <li className="px-6 py-4 text-center text-gray-500">
              No tasks match your filters
            </li>
          ) : (
            filteredTasks.map((task) => (
              <li key={task.id}>
                <div className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => toggleTaskExpand(task.id)}>
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {getStatusIcon(task.status)}
                    </div>
                    <div className="ml-4 flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{task.title}</div>
                      <div className="mt-1 flex items-center">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                        <span className="mx-2 text-gray-500">•</span>
                        <div className="flex items-center text-sm text-gray-500">
                          <User className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          <span>{team.find(m => m.id === task.assignee)?.name || 'Unassigned'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskExpand(task.id);
                      }}
                      className="ml-4 text-gray-400 hover:text-gray-500"
                    >
                      {expandedTask === task.id ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                
                {expandedTask === task.id && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    {editingTask === task.id ? (
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700">Title</label>
                          <input
                            type="text"
                            id="edit-title"
                            defaultValue={task.title}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700">Status</label>
                            <select
                              id="edit-status"
                              defaultValue={task.status}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                              <option value="todo">To Do</option>
                              <option value="in-progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>
                          <div>
                            <label htmlFor="edit-priority" className="block text-sm font-medium text-gray-700">Priority</label>
                            <select
                              id="edit-priority"
                              defaultValue={task.priority}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="edit-assignee" className="block text-sm font-medium text-gray-700">Assignee</label>
                            <select
                              id="edit-assignee"
                              defaultValue={task.assignee}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                              <option value="">Unassigned</option>
                              {team.map(member => (
                                <option key={member.id} value={member.id}>{member.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="edit-due-date" className="block text-sm font-medium text-gray-700">Due Date</label>
                            <input
                              type="date"
                              id="edit-due-date"
                              defaultValue={task.dueDate}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">Description</label>
                          <textarea
                            id="edit-description"
                            rows={3}
                            defaultValue={task.description}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          ></textarea>
                        </div>
                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => setEditingTask(null)}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveTask(task.id)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {getStatusText(task.status)}
                            </span>
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Task #{task.id.split('-')[1] || task.id}
                            </span>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingTask(task.id)}
                              className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Assignee</h4>
                            <div className="mt-1 flex items-center">
                              {team.find(m => m.id === task.assignee)?.avatar ? (
                                <img 
                                  src={team.find(m => m.id === task.assignee)?.avatar} 
                                  alt={team.find(m => m.id === task.assignee)?.name} 
                                  className="h-8 w-8 rounded-full"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                  <User className="h-4 w-4 text-gray-500" />
                                </div>
                              )}
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">{team.find(m => m.id === task.assignee)?.name || 'Unassigned'}</p>
                                <p className="text-xs text-gray-500">{team.find(m => m.id === task.assignee)?.role}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</h4>
                            <div className="mt-1 flex items-center">
                              <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-900">{new Date(task.dueDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Description</h4>
                          <p className="mt-1 text-sm text-gray-600">{task.description || 'No description provided.'}</p>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex space-x-2">
                            <button 
                              id={`complete-btn-${task.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkComplete(task.id);
                              }}
                              className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark Complete
                            </button>
                            <button className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Comment
                            </button>
                          </div>
                          <div className="flex items-center">
                            <span className="text-xs text-gray-500">Created on {new Date(task.dueDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default TaskList;