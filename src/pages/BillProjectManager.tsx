import React from 'react';
import { BillChatbot } from '../components/ai-project-manager/BillChatbot';

const BillProjectManager: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Bill - AI Project Manager
          </h1>
          <p className="text-gray-600">
            Manage your team, coordinate projects, and stay organized
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Employees</p>
                <p className="text-2xl font-bold text-purple-600">-</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                👥
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold text-blue-600">-</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                📋
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-green-600">-</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                📅
              </div>
            </div>
          </div>
        </div>

        {/* Chatbot */}
        <BillChatbot />

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">What Bill Can Do</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• View and manage your employee roster</li>
              <li>• Track project progress and timelines</li>
              <li>• Schedule events and check availability</li>
              <li>• Draft emails to your team (with approval)</li>
              <li>• Assign employees to projects</li>
              <li>• Coordinate multiple projects simultaneously</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Try These Commands</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• "Show me all active employees"</li>
              <li>• "What projects are scheduled for next week?"</li>
              <li>• "Check John's availability on Friday"</li>
              <li>• "Send an email to my team about the meeting"</li>
              <li>• "Create a calendar event for the site visit"</li>
              <li>• "Assign Mike to the Johnson project"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillProjectManager;
