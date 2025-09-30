import { useState, useRef } from 'react';
import { Upload, Camera, Search, Filter, Grid, List, Calendar, Tag, User, Trash2, Download, Eye } from 'lucide-react';

interface ProgressUpdate {
  id: string;
  date: string;
  description: string;
  photos: string[];
  taskId: string;
  postedBy: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

interface ProjectProgressGalleryProps {
  progressUpdates: ProgressUpdate[];
  tasks: Task[];
  team: TeamMember[];
  onUploadProgress: () => void;
  onDeleteProgress?: (updateId: string) => void;
}

const ProjectProgressGallery: React.FC<ProjectProgressGalleryProps> = ({
  progressUpdates,
  tasks,
  team,
  onUploadProgress,
  onDeleteProgress
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterTask, setFilterTask] = useState<string>('all');
  const [filterMember, setFilterMember] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUpdate, setSelectedUpdate] = useState<ProgressUpdate | null>(null);
  
  const lightboxRef = useRef<HTMLDivElement>(null);

  const filteredUpdates = progressUpdates
    .filter(update => {
      if (filterTask !== 'all' && update.taskId !== filterTask) return false;
      if (filterMember !== 'all' && update.postedBy !== filterMember) return false;
      if (searchTerm && !update.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleOpenLightbox = (update: ProgressUpdate) => {
    setSelectedUpdate(update);
    document.body.style.overflow = 'hidden';
  };

  const handleCloseLightbox = () => {
    setSelectedUpdate(null);
    document.body.style.overflow = 'auto';
  };

  const handleLightboxClick = (e: React.MouseEvent) => {
    if (lightboxRef.current && e.target === lightboxRef.current) {
      handleCloseLightbox();
    }
  };

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
              placeholder="Search progress updates..."
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={filterTask}
            onChange={(e) => setFilterTask(e.target.value)}
            className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Tasks</option>
            {tasks.map(task => (
              <option key={task.id} value={task.id}>{task.title}</option>
            ))}
          </select>
          <select
            value={filterMember}
            onChange={(e) => setFilterMember(e.target.value)}
            className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Team Members</option>
            {team.map(member => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
          <div className="flex border border-gray-300 rounded-md">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={onUploadProgress}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Progress
          </button>
        </div>
      </div>

      {filteredUpdates.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <Camera className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No progress updates</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by uploading your first progress update.</p>
          <div className="mt-6">
            <button
              onClick={onUploadProgress}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Progress
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUpdates.map(update => (
            <div key={update.id} className="bg-white rounded-lg shadow overflow-hidden">
              {update.photos && update.photos.length > 0 && (
                <div 
                  className="h-48 overflow-hidden cursor-pointer"
                  onClick={() => handleOpenLightbox(update)}
                >
                  <img 
                    src={update.photos[0]} 
                    alt="Progress" 
                    className="w-full h-full object-cover transition-transform hover:scale-105"
                  />
                  {update.photos.length > 1 && (
                    <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                      +{update.photos.length - 1} more
                    </div>
                  )}
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="text-sm font-medium text-gray-900">{new Date(update.date).toLocaleDateString()}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {tasks.find(t => t.id === update.taskId)?.title}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{update.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {team.find(m => m.id === update.postedBy)?.avatar ? (
                      <img 
                        src={team.find(m => m.id === update.postedBy)?.avatar} 
                        alt="Posted by" 
                        className="h-6 w-6 rounded-full"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-3 w-3 text-gray-500" />
                      </div>
                    )}
                    <p className="ml-2 text-xs text-gray-500">
                      {team.find(m => m.id === update.postedBy)?.name || 'Unknown'}
                    </p>
                  </div>
                  <div className="flex space-x-1">
                    <button className="text-gray-400 hover:text-gray-500">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-500">
                      <Download className="h-4 w-4" />
                    </button>
                    {onDeleteProgress && (
                      <button 
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this progress update?')) {
                            onDeleteProgress(update.id);
                          }
                        }}
                        className="text-red-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredUpdates.map(update => (
              <li key={update.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-blue-600 truncate">{update.description}</p>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {tasks.find(t => t.id === update.taskId)?.title}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        <User className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {team.find(m => m.id === update.postedBy)?.name || 'Unknown'}
                      </p>
                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {new Date(update.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <div className="flex space-x-2">
                        {update.photos && update.photos.length > 0 && (
                          <button 
                            onClick={() => handleOpenLightbox(update)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Photos ({update.photos.length})
                          </button>
                        )}
                        <button className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </button>
                        {onDeleteProgress && (
                          <button 
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this progress update?')) {
                                onDeleteProgress(update.id);
                              }
                            }}
                            className="inline-flex items-center px-2.5 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Lightbox for viewing photos */}
      {selectedUpdate && (
        <div 
          ref={lightboxRef}
          className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4"
          onClick={handleLightboxClick}
        >
          <div className="relative bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Progress Update</h3>
              <button
                onClick={handleCloseLightbox}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 max-h-[calc(90vh-8rem)] overflow-y-auto">
              <div className="mb-4">
                <p className="text-sm text-gray-600">{selectedUpdate.description}</p>
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                  <span>{new Date(selectedUpdate.date).toLocaleDateString()}</span>
                  <span className="mx-2">•</span>
                  <Tag className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                  <span>{tasks.find(t => t.id === selectedUpdate.taskId)?.title}</span>
                  <span className="mx-2">•</span>
                  <User className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                  <span>{team.find(m => m.id === selectedUpdate.postedBy)?.name}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedUpdate.photos.map((photo, index) => (
                  <div key={index} className="relative rounded-lg overflow-hidden">
                    <img 
                      src={photo} 
                      alt={`Progress ${index + 1}`} 
                      className="w-full h-auto object-cover"
                    />
                    <div className="absolute bottom-2 right-2 flex space-x-1">
                      <button className="p-1 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75">
                        <Download className="h-4 w-4" />
                      </button>
                      {onDeleteProgress && (
                        <button 
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this photo?')) {
                              // This would delete individual photo - not implemented yet
                            }
                          }}
                          className="p-1 bg-red-600 bg-opacity-50 rounded-full text-white hover:bg-opacity-75"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleCloseLightbox}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectProgressGallery;