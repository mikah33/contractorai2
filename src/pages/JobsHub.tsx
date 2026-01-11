import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calculator,
  Briefcase,
  UserPlus,
  Calendar as CalendarIcon,
  ChevronRight
} from 'lucide-react';

const JobsHub: React.FC = () => {
  const navigate = useNavigate();

  const jobModules = [
    {
      id: 'estimates',
      title: 'Estimates',
      description: 'Create & manage project estimates',
      icon: Calculator,
      href: '/estimates-hub',
      color: 'orange',
      stats: 'Quick estimate tools'
    },
    {
      id: 'projects',
      title: 'Projects',
      description: 'Track active projects & schedules',
      icon: Briefcase,
      href: '/projects-hub',
      color: 'purple',
      stats: 'Project management'
    },
    {
      id: 'clients',
      title: 'Clients',
      description: 'Manage client relationships',
      icon: UserPlus,
      href: '/clients-hub',
      color: 'blue',
      stats: 'CRM & contacts'
    },
    {
      id: 'calendar',
      title: 'Tasks & Calendar',
      description: 'Schedule appointments & jobs',
      icon: CalendarIcon,
      href: '/todo-hub',
      color: 'green',
      stats: 'Time management'
    }
  ];


  const getColorClasses = (color: string) => {
    switch (color) {
      case 'orange':
        return {
          bg: 'bg-orange-500/20',
          border: 'border-orange-500/30',
          hoverBorder: 'hover:border-orange-500/60',
          iconBg: 'bg-orange-500',
          iconText: 'text-white',
          accent: 'text-orange-500'
        };
      case 'purple':
        return {
          bg: 'bg-purple-500/20',
          border: 'border-purple-500/30',
          hoverBorder: 'hover:border-purple-500/60',
          iconBg: 'bg-purple-500',
          iconText: 'text-white',
          accent: 'text-purple-500'
        };
      case 'blue':
        return {
          bg: 'bg-blue-500/20',
          border: 'border-blue-500/30',
          hoverBorder: 'hover:border-blue-500/60',
          iconBg: 'bg-blue-500',
          iconText: 'text-white',
          accent: 'text-blue-500'
        };
      case 'green':
        return {
          bg: 'bg-green-500/20',
          border: 'border-green-500/30',
          hoverBorder: 'hover:border-green-500/60',
          iconBg: 'bg-green-500',
          iconText: 'text-white',
          accent: 'text-green-500'
        };
      default:
        return {
          bg: 'bg-gray-500/20',
          border: 'border-gray-500/30',
          hoverBorder: 'hover:border-gray-500/60',
          iconBg: 'bg-gray-500',
          iconText: 'text-white',
          accent: 'text-gray-500'
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] pb-[calc(120px+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="bg-[#1C1C1E] border-b border-orange-500/30 px-6 py-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
            <Briefcase className="w-7 h-7 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Jobs</h1>
            <p className="text-zinc-400 text-sm">Manage your projects & clients</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Job Modules */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Job Management</h2>
          <div className="grid grid-cols-1 gap-4">
            {jobModules.map((module) => {
              const colors = getColorClasses(module.color);
              return (
                <button
                  key={module.id}
                  onClick={() => navigate(module.href)}
                  className={`flex items-center gap-4 p-6 ${colors.bg} rounded-xl border ${colors.border} ${colors.hoverBorder} active:scale-[0.98] transition-all`}
                >
                  <div className={`w-14 h-14 ${colors.iconBg} rounded-xl flex items-center justify-center`}>
                    <module.icon className={`w-7 h-7 ${colors.iconText}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-bold text-white text-lg">{module.title}</h3>
                    <p className="text-zinc-400 text-sm mb-1">{module.description}</p>
                    <p className={`text-xs font-medium ${colors.accent}`}>{module.stats}</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-zinc-500" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobsHub;