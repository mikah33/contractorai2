import { useState } from 'react';
import { Download, FileText, BarChart2, PieChart, Calendar, Filter, RefreshCw } from 'lucide-react';
import { useFinanceStore } from '../../stores/financeStoreSupabase';

interface ReportGeneratorProps {
  onGenerateReport: (options: ReportOptions) => void;
}

interface ReportOptions {
  type: 'whole' | 'project'; // whole = all expenses, project = specific project
  dateRange: {
    start: string;
    end: string;
  };
  projectId?: string;
  clientId?: string;
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  format: 'pdf' | 'csv';
  includeCharts: boolean;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ onGenerateReport }) => {
  const { projects } = useFinanceStore();

  const [options, setOptions] = useState<ReportOptions>({
    type: 'whole',
    dateRange: {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    groupBy: 'month',
    format: 'pdf',
    includeCharts: true
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    
    // Simulate report generation
    setTimeout(() => {
      onGenerateReport(options);
      setIsGenerating(false);
    }, 1500);
  };

  // Report type descriptions
  const reportTypes = {
    whole: {
      title: 'Whole Company Report',
      icon: <BarChart2 className="h-5 w-5" />,
      description: 'All expenses from Finance tab',
      sections: [
        'All Receipts & Expenses',
        'Budget Items & Tracking',
        'Recurring Expenses',
        'Payments & Income',
        'Expense Summary by Category',
        'Project Profitability'
      ]
    },
    project: {
      title: 'Project-Based Report',
      icon: <FileText className="h-5 w-5" />,
      description: 'Expenses filtered by specific project',
      sections: [
        'Project Expenses Only',
        'Project Budget vs Actual',
        'Project Profitability',
        'Project Timeline',
        'Project Payments',
        'Project Cost Breakdown'
      ]
    }
  };

  const currentReport = reportTypes[options.type];

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Generate Financial Reports</h3>
      </div>
      
      <div className="p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(reportTypes).map(([key, report]) => (
                <div
                  key={key}
                  onClick={() => setOptions({...options, type: key as 'whole' | 'project'})}
                  className={`cursor-pointer border rounded-lg p-4 transition-all ${
                    options.type === key
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center mb-2">
                    <div className={`p-2 rounded-full mr-3 ${
                      options.type === key ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      {report.icon}
                    </div>
                    <h3 className="text-base font-medium text-gray-900">{report.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                  <ul className="space-y-1 text-xs text-gray-700">
                    {report.sections.slice(0, 3).map((section, idx) => (
                      <li key={idx} className="flex items-center">
                        <svg className="w-3 h-3 text-green-500 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {section}
                      </li>
                    ))}
                    <li className="text-gray-500 italic ml-4">...and {report.sections.length - 3} more</li>
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {options.type === 'project' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Project</label>
              <select
                value={options.projectId || ''}
                onChange={(e) => setOptions({...options, projectId: e.target.value})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">-- Select a Project --</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              {projects.length === 0 && (
                <p className="mt-2 text-sm text-gray-500">No projects available. Create a project first.</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    value={options.dateRange.start}
                    onChange={(e) => setOptions({
                      ...options, 
                      dateRange: {...options.dateRange, start: e.target.value}
                    })}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    value={options.dateRange.end}
                    onChange={(e) => setOptions({
                      ...options, 
                      dateRange: {...options.dateRange, end: e.target.value}
                    })}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="mt-2 flex space-x-2">
                <button 
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    setOptions({
                      ...options,
                      dateRange: {
                        start: startOfMonth.toISOString().split('T')[0],
                        end: today.toISOString().split('T')[0]
                      }
                    });
                  }}
                  className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  This Month
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    const threeMonthsAgo = new Date(today);
                    threeMonthsAgo.setMonth(today.getMonth() - 3);
                    setOptions({
                      ...options,
                      dateRange: {
                        start: threeMonthsAgo.toISOString().split('T')[0],
                        end: today.toISOString().split('T')[0]
                      }
                    });
                  }}
                  className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Last 3 Months
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    const startOfYear = new Date(today.getFullYear(), 0, 1);
                    setOptions({
                      ...options,
                      dateRange: {
                        start: startOfYear.toISOString().split('T')[0],
                        end: today.toISOString().split('T')[0]
                      }
                    });
                  }}
                  className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Year to Date
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Group By</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  value={options.groupBy}
                  onChange={(e) => setOptions({...options, groupBy: e.target.value as ReportOptions['groupBy']})}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="quarter">Quarter</option>
                  <option value="year">Year</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
              <div className="flex space-x-4">
                <div className="flex items-center">
                  <input
                    id="format-pdf"
                    name="format"
                    type="radio"
                    checked={options.format === 'pdf'}
                    onChange={() => setOptions({...options, format: 'pdf'})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="format-pdf" className="ml-2 block text-sm text-gray-700">
                    PDF (Full Report)
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="format-csv"
                    name="format"
                    type="radio"
                    checked={options.format === 'csv'}
                    onChange={() => setOptions({...options, format: 'csv'})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="format-csv" className="ml-2 block text-sm text-gray-700">
                    CSV (Spreadsheet Data)
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
              <div className="flex items-center">
                <input
                  id="include-charts"
                  name="include-charts"
                  type="checkbox"
                  checked={options.includeCharts}
                  onChange={(e) => setOptions({...options, includeCharts: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="include-charts" className="ml-2 block text-sm text-gray-700">
                  Include charts and visualizations
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 bg-gray-50 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Recently Generated Reports</h4>
        <div className="text-center py-8">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">
            No reports generated yet. Generate your first report using the form above.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;