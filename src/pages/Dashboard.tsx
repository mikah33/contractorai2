import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { BarChart, Activity, Users, DollarSign, TrendingUp, CalendarRange, FileText } from 'lucide-react';
import ProjectSummaryCard from '../components/dashboard/ProjectSummaryCard';
import StatCard from '../components/dashboard/StatCard';
import RecentEstimatesTable from '../components/dashboard/RecentEstimatesTable';
import FinanceSummaryChart from '../components/dashboard/FinanceSummaryChart';
import ConnectionTest from '../components/ConnectionTest';
import useProjectStore from '../stores/projectStore';
import useEstimateStore from '../stores/estimateStore';

const Dashboard = () => {
  const navigate = useNavigate();
  const { projects, fetchProjects } = useProjectStore();
  const { estimates, fetchEstimates } = useEstimateStore();

  // Fetch data on component mount
  useEffect(() => {
    fetchProjects();
    fetchEstimates();
  }, [fetchProjects, fetchEstimates]);

  // Calculate dashboard statistics
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const pendingEstimates = estimates.filter(e => e.status === 'draft' || e.status === 'sent').length;
  const monthlyRevenue = projects
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.budget, 0);
  const newClients = new Set(projects.map(p => p.client)).size;

  const handleNewProject = () => {
    navigate('/projects');
  };

  const handleNewEstimate = () => {
    navigate('/estimates');
  };

  const handleViewAllDeadlines = () => {
    navigate('/calendar');
  };

  const handleViewAllEstimates = () => {
    navigate('/estimates');
  };

  const handleViewAllProjects = () => {
    navigate('/projects');
  };

  return (
    <div className="space-y-6">
      <ConnectionTest />
      
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex space-x-3">
          <button 
            onClick={handleNewProject}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            New Project
          </button>
          <button 
            onClick={handleNewEstimate}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            New Estimate
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Projects"
          value={activeProjects.toString()}
          change={`+${activeProjects}`}
          positive={true}
          icon={<Activity className="w-6 h-6 text-blue-600" />}
        />
        <StatCard
          title="Pending Estimates"
          value={pendingEstimates.toString()}
          change={`+${pendingEstimates}`}
          positive={true}
          icon={<FileText className="w-6 h-6 text-amber-500" />}
        />
        <StatCard
          title="Total Revenue"
          value={`$${monthlyRevenue.toLocaleString()}`}
          change="+0%"
          positive={true}
          icon={<DollarSign className="w-6 h-6 text-green-600" />}
        />
        <StatCard
          title="Total Clients"
          value={newClients.toString()}
          change={`+${newClients}`}
          positive={true}
          icon={<Users className="w-6 h-6 text-purple-600" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Financial Overview</h2>
              <select className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>This Year</option>
              </select>
            </div>
            <FinanceSummaryChart />
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h2>
              <button 
                onClick={handleViewAllDeadlines}
                className="text-blue-600 hover:text-blue-800"
              >
                View All
              </button>
            </div>
            <div className="space-y-4">
              {[].map((deadline) => (
                <div key={deadline.id} className="flex items-start p-3 border-l-4 border-blue-500 bg-blue-50 rounded-r-md">
                  <CalendarRange className="w-5 h-5 mr-3 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{deadline.project}</p>
                    <p className="text-sm text-gray-600">{deadline.client}</p>
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-gray-500">{deadline.date}</span>
                      <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                        deadline.status === "On Track" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {deadline.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Estimates</h2>
            <button 
              onClick={handleViewAllEstimates}
              className="text-blue-600 hover:text-blue-800"
            >
              View All
            </button>
          </div>
          <RecentEstimatesTable />
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Project Status</h2>
            <button 
              onClick={handleViewAllProjects}
              className="text-blue-600 hover:text-blue-800"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {projects.slice(0, 3).map((project) => (
              <ProjectSummaryCard key={project.id} project={{
                id: parseInt(project.id) || 0,
                name: project.name,
                client: project.client,
                progress: project.progress,
                status: project.status === 'active' ? 'In Progress' : 
                       project.status === 'completed' ? 'Completed' : 
                       project.status === 'on_hold' ? 'On Hold' : 'Cancelled'
              }} />
            ))}
            {projects.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No projects yet. Create your first project to get started!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;