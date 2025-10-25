import { useState, useEffect } from 'react';
import { User, Plus, Edit, Trash2, Mail, Phone, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { useEmployeesStore } from '../../stores/employeesStore';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  email?: string;
  phone?: string;
  permissions?: string[];
}

interface TeamMemberSelectorProps {
  team: TeamMember[];
  projectId: string;
  addTeamMember: (projectId: string, memberName: string, email?: string, role?: string) => Promise<void>;
  removeTeamMember: (projectId: string, memberName: string) => Promise<void>;
}

const TeamMemberSelector: React.FC<TeamMemberSelectorProps> = ({ team, projectId, addTeamMember, removeTeamMember }) => {
  const { employees, fetchEmployees } = useEmployeesStore();
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const toggleMemberExpand = (memberId: string) => {
    setExpandedMember(expandedMember === memberId ? null : memberId);
  };

  const handleAddMember = () => {
    setShowAddMemberModal(true);
  };

  const handleEditPermissions = (member: TeamMember) => {
    setSelectedMember(member);
    setShowPermissionsModal(true);
  };

  const availableRoles = [
    'Project Manager',
    'Foreman',
    'Carpenter',
    'Electrician',
    'Plumber',
    'Laborer',
    'Interior Designer',
    'Architect',
    'Engineer',
    'Subcontractor'
  ];

  const availablePermissions = [
    { id: 'view_project', name: 'View Project', description: 'Can view project details' },
    { id: 'edit_project', name: 'Edit Project', description: 'Can edit project details' },
    { id: 'add_tasks', name: 'Add Tasks', description: 'Can add new tasks' },
    { id: 'edit_tasks', name: 'Edit Tasks', description: 'Can edit existing tasks' },
    { id: 'delete_tasks', name: 'Delete Tasks', description: 'Can delete tasks' },
    { id: 'upload_progress', name: 'Upload Progress', description: 'Can upload progress updates' },
    { id: 'view_finances', name: 'View Finances', description: 'Can view financial information' },
    { id: 'edit_finances', name: 'Edit Finances', description: 'Can edit financial information' },
    { id: 'manage_team', name: 'Manage Team', description: 'Can add/remove team members' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Project Team</h3>
        <button
          onClick={handleAddMember}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Team Member
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {team.map((member) => (
            <li key={member.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-12 w-12 rounded-full overflow-hidden bg-gray-100">
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <User className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{member.name}</div>
                      <div className="text-sm text-gray-500">{member.role}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditPermissions(member)}
                      className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Shield className="h-4 w-4 mr-1" />
                      Permissions
                    </button>
                    <button
                      onClick={() => toggleMemberExpand(member.id)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      {expandedMember === member.id ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                
                {expandedMember === member.id && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Information</h4>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600">{member.email || 'No email provided'}</span>
                          </div>
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600">{member.phone || 'No phone provided'}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</h4>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {member.permissions ? (
                            member.permissions.map((permission, index) => (
                              <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {permission}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">Default permissions</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end space-x-2">
                      <button className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                      <button 
                        onClick={async () => {
                          await removeTeamMember(projectId, member.name);
                        }}
                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Add Team Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Add Team Member</h3>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label htmlFor="employee-select" className="block text-sm font-medium text-gray-700">Select Employee</label>
                        <select
                          id="employee-select"
                          value={selectedEmployeeId}
                          onChange={(e) => {
                            setSelectedEmployeeId(e.target.value);
                            const employee = employees.find(emp => emp.id === e.target.value);
                            if (employee) {
                              setNewMemberRole(employee.jobTitle);
                            }
                          }}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                        >
                          <option value="">Select an employee...</option>
                          {employees.filter(emp => emp.status === 'active').map(emp => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} - {emp.jobTitle}
                            </option>
                          ))}
                        </select>
                        {employees.length === 0 && (
                          <p className="mt-2 text-sm text-gray-500">
                            No employees found. <a href="/employees" className="text-blue-600 hover:underline">Add employees</a> first.
                          </p>
                        )}
                      </div>
                      {selectedEmployeeId && (
                        <div className="bg-gray-50 p-3 rounded-md">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Employee Details</h4>
                          {(() => {
                            const employee = employees.find(emp => emp.id === selectedEmployeeId);
                            if (!employee) return null;
                            return (
                              <div className="space-y-1 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <Mail className="h-4 w-4 mr-2" />
                                  {employee.email}
                                </div>
                                <div className="flex items-center">
                                  <Phone className="h-4 w-4 mr-2" />
                                  {employee.phone}
                                </div>
                                <div className="flex items-center">
                                  <User className="h-4 w-4 mr-2" />
                                  {employee.jobTitle} - ${employee.hourlyRate}/hr
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Permissions</label>
                        <div className="mt-2 space-y-2">
                          {availablePermissions.slice(0, 3).map(permission => (
                            <div key={permission.id} className="flex items-center">
                              <input
                                id={`permission-${permission.id}`}
                                name={`permission-${permission.id}`}
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label htmlFor={`permission-${permission.id}`} className="ml-2 block text-sm text-gray-900">
                                {permission.name}
                              </label>
                            </div>
                          ))}
                          <button className="text-sm text-blue-600 hover:text-blue-800">
                            Show all permissions...
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={async () => {
                    if (selectedEmployeeId) {
                      const employee = employees.find(emp => emp.id === selectedEmployeeId);
                      if (employee) {
                        await addTeamMember(projectId, employee.name, employee.email, employee.jobTitle);
                        setSelectedEmployeeId('');
                        setNewMemberRole('');
                        setShowAddMemberModal(false);
                      }
                    }
                  }}
                  disabled={!selectedEmployeeId}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Member
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && selectedMember && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Edit Permissions for {selectedMember.name}</h3>
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 mb-4">Select which actions this team member can perform on this project.</p>
                      <div className="space-y-3">
                        {availablePermissions.map(permission => (
                          <div key={permission.id} className="flex items-start">
                            <div className="flex items-center h-5">
                              <input
                                id={`permission-${permission.id}`}
                                name={`permission-${permission.id}`}
                                type="checkbox"
                                defaultChecked={selectedMember.permissions?.includes(permission.id)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            </div>
                            <div className="ml-3 text-sm">
                              <label htmlFor={`permission-${permission.id}`} className="font-medium text-gray-700">{permission.name}</label>
                              <p className="text-gray-500">{permission.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Save Permissions
                </button>
                <button
                  type="button"
                  onClick={() => setShowPermissionsModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMemberSelector;