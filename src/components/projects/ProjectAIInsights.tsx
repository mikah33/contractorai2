import { useState } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, Calendar, RefreshCw, Clock, DollarSign, Users } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  client: string;
  startDate: string;
  endDate: string;
  status: string;
  team: any[];
  progress: number;
  budget: number;
  spent: number;
  tasks: any[];
}

interface ProjectAIInsightsProps {
  project: Project;
}

const ProjectAIInsights: React.FC<ProjectAIInsightsProps> = ({ project }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'resources' | 'risks'>('schedule');

  const handleGenerateInsights = () => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };

  // Calculate project metrics
  const daysElapsed = Math.floor((new Date().getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24));
  const totalDays = Math.floor((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, totalDays - daysElapsed);
  const expectedProgress = Math.min(100, Math.round((daysElapsed / totalDays) * 100));
  const progressDifference = project.progress - expectedProgress;
  
  const completedTasks = project.tasks.filter(task => task.status === 'completed').length;
  const totalTasks = project.tasks.length;
  const taskCompletionRate = Math.round((completedTasks / totalTasks) * 100);
  
  const budgetUsedPercentage = Math.round((project.spent / project.budget) * 100);
  const budgetStatus = budgetUsedPercentage <= project.progress ? 'under' : 'over';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Sparkles className="h-5 w-5 text-blue-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">AI Project Insights</h3>
        </div>
        <button
          onClick={handleGenerateInsights}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Analysis
            </>
          )}
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'schedule'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Analysis
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'resources'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Resource Optimization
            </button>
            <button
              onClick={() => setActiveTab('risks')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'risks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Risk Assessment
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                        <Clock className="h-6 w-6 text-white" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Days Remaining</dt>
                          <dd className="text-2xl font-semibold text-gray-900">{daysRemaining}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                        <TrendingUp className="h-6 w-6 text-white" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Expected Progress</dt>
                          <dd className="text-2xl font-semibold text-gray-900">{expectedProgress}%</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 ${progressDifference >= 0 ? 'bg-green-500' : 'bg-red-500'} rounded-md p-3`}>
                        {progressDifference >= 0 ? (
                          <TrendingUp className="h-6 w-6 text-white" />
                        ) : (
                          <TrendingUp className="h-6 w-6 text-white transform rotate-180" />
                        )}
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Schedule Variance</dt>
                          <dd className={`text-2xl font-semibold ${progressDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {progressDifference >= 0 ? '+' : ''}{progressDifference}%
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Schedule Analysis</h3>
                  <div className="mt-4 space-y-4">
                    <div className={`p-4 rounded-md ${progressDifference >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                      <div className="flex">
                        <div className="flex-shrink-0">
                          {progressDifference >= 0 ? (
                            <TrendingUp className={`h-5 w-5 text-green-400`} />
                          ) : (
                            <AlertTriangle className={`h-5 w-5 text-red-400`} />
                          )}
                        </div>
                        <div className="ml-3">
                          <h3 className={`text-sm font-medium ${progressDifference >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                            {progressDifference >= 0 ? 'Ahead of Schedule' : 'Behind Schedule'}
                          </h3>
                          <div className="mt-2 text-sm text-gray-700">
                            <p>
                              {progressDifference >= 0 
                                ? `This project is currently ${progressDifference}% ahead of schedule. At this rate, you may finish ${Math.abs(Math.round(progressDifference * totalDays / 100))} days early.`
                                : `This project is currently ${Math.abs(progressDifference)}% behind schedule. At this rate, you may finish ${Math.abs(Math.round(progressDifference * totalDays / 100))} days late.`
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-md bg-blue-50">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <Lightbulb className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-blue-800">Schedule Optimization</h3>
                          <div className="mt-2 text-sm text-blue-700">
                            <p>
                              Based on historical data and current progress, we recommend:
                            </p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                              <li>Prioritize "Framing" task which is currently in progress</li>
                              <li>Consider starting "Decking Installation" 2 days earlier than planned</li>
                              <li>Allocate additional resources to complete the project 3 days ahead of schedule</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-md bg-yellow-50">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertTriangle className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">Weather Alert</h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>
                              There is a 70% chance of rain forecasted for October 10-11, which may impact outdoor work. Consider adjusting the schedule for weather-sensitive tasks.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Team Utilization</dt>
                          <dd className="text-2xl font-semibold text-gray-900">85%</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                        <TrendingUp className="h-6 w-6 text-white" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Task Completion Rate</dt>
                          <dd className="text-2xl font-semibold text-gray-900">{taskCompletionRate}%</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 ${budgetStatus === 'under' ? 'bg-green-500' : 'bg-red-500'} rounded-md p-3`}>
                        <DollarSign className="h-6 w-6 text-white" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Budget Used</dt>
                          <dd className="text-2xl font-semibold text-gray-900">{budgetUsedPercentage}%</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Resource Optimization</h3>
                  <div className="mt-4 space-y-4">
                    <div className="p-4 rounded-md bg-blue-50">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <Lightbulb className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-blue-800">Team Allocation Recommendations</h3>
                          <div className="mt-2 text-sm text-blue-700">
                            <p>
                              Based on current workload and skills, we recommend:
                            </p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                              <li>Assign "Decking Installation" to Sarah L. who has 30% availability next week</li>
                              <li>Consider bringing in an additional carpenter for "Railing Installation" to stay on schedule</li>
                              <li>Dave R. is overallocated by 20% - consider redistributing some of his tasks</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-md bg-green-50">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <DollarSign className="h-5 w-5 text-green-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-green-800">Cost Optimization</h3>
                          <div className="mt-2 text-sm text-green-700">
                            <p>
                              Potential cost savings identified:
                            </p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                              <li>Consolidate equipment rentals to save approximately $250</li>
                              <li>Order remaining materials in bulk to receive a 10% discount</li>
                              <li>Schedule deliveries to minimize transportation costs</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-md bg-purple-50">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <Users className="h-5 w-5 text-purple-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-purple-800">Skill Matching</h3>
                          <div className="mt-2 text-sm text-purple-700">
                            <p>
                              Team members are well-matched to their assigned tasks based on their skills and experience. Sarah L. has completed 12 similar carpentry projects with high quality ratings.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'risks' && (
            <div className="space-y-6">
              <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Project Risk Assessment</h3>
                  <div className="mt-4 space-y-4">
                    <div className="p-4 rounded-md bg-red-50">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertTriangle className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">High Risk: Weather Delays</h3>
                          <div className="mt-2 text-sm text-red-700">
                            <p>
                              Forecasted rain for October 10-11 could delay outdoor work by 2-3 days. This may impact the framing and decking installation tasks.
                            </p>
                            <div className="mt-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Probability: High
                              </span>
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Impact: Medium
                              </span>
                            </div>
                            <div className="mt-2">
                              <p className="font-medium">Mitigation Strategy:</p>
                              <ul className="list-disc pl-5 mt-1 space-y-1">
                                <li>Rent temporary shelters or tarps to protect work areas</li>
                                <li>Adjust schedule to work on indoor/protected tasks during rain</li>
                                <li>Add buffer days to the schedule for weather delays</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-md bg-yellow-50">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertTriangle className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">Medium Risk: Material Delays</h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>
                              Current supply chain issues may delay delivery of composite decking materials by up to 1 week.
                            </p>
                            <div className="mt-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Probability: Medium
                              </span>
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Impact: High
                              </span>
                            </div>
                            <div className="mt-2">
                              <p className="font-medium">Mitigation Strategy:</p>
                              <ul className="list-disc pl-5 mt-1 space-y-1">
                                <li>Order materials immediately with expedited shipping</li>
                                <li>Identify alternative suppliers or materials</li>
                                <li>Adjust project schedule to work on other tasks while waiting for materials</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-md bg-yellow-50">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertTriangle className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">Medium Risk: Budget Overrun</h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>
                              Based on current spending patterns, there's a 40% chance of exceeding the budget by 5-10%.
                            </p>
                            <div className="mt-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Probability: Medium
                              </span>
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Impact: Medium
                              </span>
                            </div>
                            <div className="mt-2">
                              <p className="font-medium">Mitigation Strategy:</p>
                              <ul className="list-disc pl-5 mt-1 space-y-1">
                                <li>Review all upcoming expenses and identify potential savings</li>
                                <li>Implement stricter approval process for additional expenses</li>
                                <li>Consider adjusting scope to stay within budget constraints</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-md bg-green-50">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <Lightbulb className="h-5 w-5 text-green-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-green-800">Risk Monitoring Recommendations</h3>
                          <div className="mt-2 text-sm text-green-700">
                            <p>
                              To effectively monitor and manage these risks:
                            </p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                              <li>Check weather forecasts daily and adjust schedule as needed</li>
                              <li>Contact material suppliers weekly for delivery updates</li>
                              <li>Review budget vs. actual costs after each major project phase</li>
                              <li>Schedule weekly team meetings to discuss potential risks and mitigation strategies</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectAIInsights;