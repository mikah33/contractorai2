import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, DollarSign, Users, Briefcase, Construction } from 'lucide-react';
import hankLogo from '../assets/icons/hank-logo.svg';
import saulLogo from '../assets/icons/saul-logo.svg';
import cindyLogo from '../assets/icons/cindy-logo.svg';
import billLogo from '../assets/icons/bill-logo.svg';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  available: boolean;
  route?: string;
}

const AITeamHub: React.FC = () => {
  const navigate = useNavigate();

  const teamMembers: TeamMember[] = [
    {
      id: 'hank',
      name: 'Hank',
      role: 'AI Estimator',
      description: 'Creates accurate construction estimates through conversation. Calculates materials, pricing, and generates professional estimates.',
      icon: <img src={hankLogo} alt="Hank" className="w-16 h-16" />,
      color: 'from-orange-500 to-orange-600',
      available: true,
      route: '/ai-calculator'
    },
    {
      id: 'saul',
      name: 'Saul',
      role: 'Finance Tracker',
      description: 'Manages invoices, tracks payments, monitors cash flow, and provides financial insights for your business.',
      icon: <img src={saulLogo} alt="Saul" className="w-16 h-16" />,
      color: 'from-green-500 to-green-600',
      available: true,
      route: '/saul-finance'
    },
    {
      id: 'cindy',
      name: 'Cindy',
      role: 'Customer Concierge',
      description: 'Keeps clients updated on project progress, handles questions, and ensures exceptional customer satisfaction.',
      icon: <img src={cindyLogo} alt="Cindy" className="w-16 h-16" />,
      color: 'from-purple-500 to-purple-600',
      available: false
    },
    {
      id: 'bill',
      name: 'Bill',
      role: 'Project Manager',
      description: 'Coordinates employees, manages project timelines, schedules tasks, and keeps everything running smoothly.',
      icon: <img src={billLogo} alt="Bill" className="w-16 h-16" />,
      color: 'from-blue-500 to-blue-600',
      available: false
    }
  ];

  const handleMemberClick = (member: TeamMember) => {
    if (member.available && member.route) {
      navigate(member.route);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Bot className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">AI Team Hub</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Meet your AI-powered team members ready to help grow your contracting business
          </p>
        </div>

        {/* Team Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              onClick={() => handleMemberClick(member)}
              className={`relative bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 ${
                member.available
                  ? 'cursor-pointer hover:shadow-2xl hover:scale-105'
                  : 'opacity-75'
              }`}
            >
              {/* Header with gradient */}
              <div className={`bg-gradient-to-r ${member.color} p-6 text-white relative`}>
                <div className="flex items-center justify-center mb-4">
                  {member.icon}
                </div>
                <h3 className="text-2xl font-bold text-center">{member.name}</h3>
                <p className="text-center text-sm opacity-90 mt-1">{member.role}</p>

                {/* Under Construction Badge */}
                {!member.available && (
                  <div className="absolute top-4 right-4">
                    <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <Construction className="w-3 h-3" />
                      Coming Soon
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  {member.description}
                </p>

                {member.available ? (
                  <button
                    onClick={() => handleMemberClick(member)}
                    className={`w-full py-3 bg-gradient-to-r ${member.color} text-white rounded-lg font-semibold hover:opacity-90 transition-opacity`}
                  >
                    Talk to {member.name}
                  </button>
                ) : (
                  <div className="w-full py-3 bg-gray-100 text-gray-500 rounded-lg font-semibold text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Construction className="w-4 h-4" />
                      <span>Under Construction</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Strikethrough overlay for unavailable members */}
              {!member.available && (
                <div className="absolute inset-0 pointer-events-none">
                  <svg className="w-full h-full" style={{ opacity: 0.1 }}>
                    <line
                      x1="0"
                      y1="0"
                      x2="100%"
                      y2="100%"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="text-gray-400"
                    />
                    <line
                      x1="100%"
                      y1="0"
                      x2="0"
                      y2="100%"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="text-gray-400"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Coming Soon Notice */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-8 text-center">
          <Construction className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">More AI Team Members Coming Soon!</h3>
          <p className="text-gray-600 max-w-2xl mx-auto">
            We're actively developing Saul, Cindy, and Bill to help automate even more of your business operations.
            Stay tuned for updates!
          </p>
        </div>
      </div>
    </div>
  );
};

export default AITeamHub;
