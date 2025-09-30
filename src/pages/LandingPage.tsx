import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Shield, Zap, PenTool as Tool, BarChart2, Users, Clock, Award, Star, ChevronRight } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/auth/signup');
  };

  const handleLogin = () => {
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Tool className="w-8 h-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">ContractorAI</span>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleLogin}
                className="text-gray-700 hover:text-gray-900"
              >
                Login
              </button>
              <button
                onClick={handleGetStarted}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Sign Up Free
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/3760529/pexels-photo-3760529.jpeg')] bg-cover bg-center">
          <div className="absolute inset-0 bg-blue-900/80 mix-blend-multiply" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="text-center">
            <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl">
              <span className="block">Transform Your</span>
              <span className="block text-blue-400">Contracting Business</span>
            </h1>
            <p className="mt-6 max-w-lg mx-auto text-xl text-blue-100 sm:max-w-3xl">
              Streamline your operations with AI-powered pricing, project management, and financial tracking tools designed specifically for contractors.
            </p>
            <div className="mt-10 max-w-md mx-auto sm:flex sm:justify-center md:mt-12">
              <button
                onClick={handleGetStarted}
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-900 bg-blue-100 hover:bg-blue-200 sm:w-auto"
              >
                Start Free Trial <ArrowRight className="ml-2 w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              How ContractorAI Works
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Get started in minutes and transform how you manage your contracting business
            </p>
          </div>

          <div className="mt-20">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
              <div className="relative">
                <div className="absolute left-0 top-0 -ml-4 mt-2 hidden lg:block">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-blue-600 bg-white text-blue-600 font-semibold">1</span>
                </div>
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-600 text-white">
                    <Users className="h-6 w-6" />
                  </div>
                  <h3 className="mt-6 text-lg font-medium text-gray-900">Create Your Account</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Sign up in seconds with just your email. No credit card required for your 14-day trial.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute left-0 top-0 -ml-4 mt-2 hidden lg:block">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-blue-600 bg-white text-blue-600 font-semibold">2</span>
                </div>
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-600 text-white">
                    <Zap className="h-6 w-6" />
                  </div>
                  <h3 className="mt-6 text-lg font-medium text-gray-900">Input Project Details</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Enter your project specifications and let our AI generate accurate pricing estimates.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute left-0 top-0 -ml-4 mt-2 hidden lg:block">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-blue-600 bg-white text-blue-600 font-semibold">3</span>
                </div>
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-600 text-white">
                    <BarChart2 className="h-6 w-6" />
                  </div>
                  <h3 className="mt-6 text-lg font-medium text-gray-900">Get Instant Results</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Receive detailed estimates, manage projects, and track finances all in one place.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-20">
            <div className="relative rounded-2xl overflow-hidden">
              <img
                src="https://images.pexels.com/photos/3183183/pexels-photo-3183183.jpeg"
                alt="Team working on project"
                className="w-full h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-blue-600/50 flex items-center">
                <div className="px-8 sm:px-12">
                  <h3 className="text-2xl font-bold text-white sm:text-3xl">Ready to grow your business?</h3>
                  <p className="mt-2 text-lg text-blue-100 max-w-2xl">
                    Join thousands of contractors who are streamlining their operations and increasing profits with ContractorAI.
                  </p>
                  <button 
                    onClick={handleGetStarted}
                    className="mt-8 bg-white px-6 py-3 rounded-md text-blue-600 font-medium hover:bg-blue-50 inline-flex items-center"
                  >
                    Start Your Free Trial <ChevronRight className="ml-2 h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Trusted by Leading Contractors
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Here's what our customers are saying about ContractorAI
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="bg-gray-50 rounded-xl p-8">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <img
                    className="h-12 w-12 rounded-full object-cover"
                    src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg"
                    alt="Mike Wilson"
                  />
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-medium text-gray-900">Mike Wilson</h4>
                  <p className="text-gray-600">Wilson Construction</p>
                </div>
              </div>
              <div className="flex text-yellow-400 mb-2">
                <Star className="h-5 w-5 fill-current" />
                <Star className="h-5 w-5 fill-current" />
                <Star className="h-5 w-5 fill-current" />
                <Star className="h-5 w-5 fill-current" />
                <Star className="h-5 w-5 fill-current" />
              </div>
              <p className="text-gray-600">
                "ContractorAI has revolutionized how we price our projects. The AI-powered estimates are incredibly accurate, and we've seen a 30% increase in our win rate."
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-8">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <img
                    className="h-12 w-12 rounded-full object-cover"
                    src="https://images.pexels.com/photos/3769021/pexels-photo-3769021.jpeg"
                    alt="Sarah Martinez"
                  />
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-medium text-gray-900">Sarah Martinez</h4>
                  <p className="text-gray-600">Elite Renovations</p>
                </div>
              </div>
              <div className="flex text-yellow-400 mb-2">
                <Star className="h-5 w-5 fill-current" />
                <Star className="h-5 w-5 fill-current" />
                <Star className="h-5 w-5 fill-current" />
                <Star className="h-5 w-5 fill-current" />
                <Star className="h-5 w-5 fill-current" />
              </div>
              <p className="text-gray-600">
                "The project management features have streamlined our operations completely. We're saving hours each week on administrative tasks."
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-8">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <img
                    className="h-12 w-12 rounded-full object-cover"
                    src="https://images.pexels.com/photos/2381069/pexels-photo-2381069.jpeg"
                    alt="David Chen"
                  />
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-medium text-gray-900">David Chen</h4>
                  <p className="text-gray-600">Modern Builders Co.</p>
                </div>
              </div>
              <div className="flex text-yellow-400 mb-2">
                <Star className="h-5 w-5 fill-current" />
                <Star className="h-5 w-5 fill-current" />
                <Star className="h-5 w-5 fill-current" />
                <Star className="h-5 w-5 fill-current" />
                <Star className="h-5 w-5 fill-current" />
              </div>
              <p className="text-gray-600">
                "The financial tracking tools have given us unprecedented insight into our business performance. It's like having a CFO in your pocket."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="bg-blue-700">
        <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            <span className="block">Ready to transform your business?</span>
            <span className="block">Start your free trial today.</span>
          </h2>
          <p className="mt-4 text-lg leading-6 text-blue-200">
            Join thousands of contractors who are growing their business with ContractorAI.
          </p>
          <button
            onClick={handleGetStarted}
            className="mt-8 w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 sm:w-auto"
          >
            Start your free trial
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;