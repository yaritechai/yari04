import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface ModelRoutingInfoProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModelRoutingInfo: React.FC<ModelRoutingInfoProps> = ({ isOpen, onClose }) => {
  const { isDarkMode } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
        isDarkMode ? 'bg-black border border-neutral-700' : 'bg-white border border-neutral-200'
      }`}>
        {/* Header */}
        <div className={`p-6 border-b ${isDarkMode ? 'border-neutral-700' : 'border-neutral-200'}`}>
          <div className="flex justify-between items-start">
            <div>
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Intelligent Model Routing
              </h2>
              <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                The right AI for the right task
              </p>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'text-gray-400 hover:text-white hover:bg-neutral-800' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-neutral-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* How It Works */}
          <div>
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              How It Works
            </h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-4`}>
              Your AI assistant automatically selects the best model for each task, ensuring optimal performance and efficiency. You no longer need to manually choose models!
            </p>
          </div>

          {/* Model Routing Table */}
          <div>
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              Task-Based Model Selection
            </h3>
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-neutral-800/50 border-neutral-700' : 'bg-neutral-50 border-neutral-200'}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${isDarkMode ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
                  <div>
                    <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      GLM-4.5 Air
                    </h4>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                      Advanced thinking and reasoning for complex discussions
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <span className={`px-2 py-1 text-xs rounded-md border ${isDarkMode ? 'bg-blue-950/50 text-blue-300 border-blue-800/50' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>Conversations</span>
                      <span className={`px-2 py-1 text-xs rounded-md border ${isDarkMode ? 'bg-blue-950/50 text-blue-300 border-blue-800/50' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>Thinking</span>
                      <span className={`px-2 py-1 text-xs rounded-md border ${isDarkMode ? 'bg-blue-950/50 text-blue-300 border-blue-800/50' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>Reasoning</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-neutral-800/50 border-neutral-700' : 'bg-neutral-50 border-neutral-200'}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${isDarkMode ? 'bg-green-400' : 'bg-green-500'}`}></div>
                  <div>
                    <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      GLM-4 32B
                    </h4>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                      Deep research, analysis, and long-context understanding
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <span className={`px-2 py-1 text-xs rounded-md border ${isDarkMode ? 'bg-green-950/50 text-green-300 border-green-800/50' : 'bg-green-50 text-green-700 border-green-200'}`}>Research</span>
                      <span className={`px-2 py-1 text-xs rounded-md border ${isDarkMode ? 'bg-green-950/50 text-green-300 border-green-800/50' : 'bg-green-50 text-green-700 border-green-200'}`}>Analysis</span>
                      <span className={`px-2 py-1 text-xs rounded-md border ${isDarkMode ? 'bg-green-950/50 text-green-300 border-green-800/50' : 'bg-green-50 text-green-700 border-green-200'}`}>Study</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-neutral-800/50 border-neutral-700' : 'bg-neutral-50 border-neutral-200'}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${isDarkMode ? 'bg-purple-400' : 'bg-purple-500'}`}></div>
                  <div>
                    <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      GLM-4.5
                    </h4>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                      Programming, web development, and landing pages
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <span className={`px-2 py-1 text-xs rounded-md border ${isDarkMode ? 'bg-purple-950/50 text-purple-300 border-purple-800/50' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>Code</span>
                      <span className={`px-2 py-1 text-xs rounded-md border ${isDarkMode ? 'bg-purple-950/50 text-purple-300 border-purple-800/50' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>Programming</span>
                      <span className={`px-2 py-1 text-xs rounded-md border ${isDarkMode ? 'bg-purple-950/50 text-purple-300 border-purple-800/50' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>Websites</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-neutral-800/50 border-neutral-700' : 'bg-neutral-50 border-neutral-200'}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${isDarkMode ? 'bg-orange-400' : 'bg-orange-500'}`}></div>
                  <div>
                    <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      GPT-4.1 Nano
                    </h4>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                      Fast summarization, titles, and brief overviews
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <span className={`px-2 py-1 text-xs rounded-md border ${isDarkMode ? 'bg-orange-950/50 text-orange-300 border-orange-800/50' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>Summary</span>
                      <span className={`px-2 py-1 text-xs rounded-md border ${isDarkMode ? 'bg-orange-950/50 text-orange-300 border-orange-800/50' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>Titles</span>
                      <span className={`px-2 py-1 text-xs rounded-md border ${isDarkMode ? 'bg-orange-950/50 text-orange-300 border-orange-800/50' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>Brief</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div>
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              Benefits
            </h3>
            <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-neutral-800' : 'bg-neutral-50'}`}>
              <ul className="space-y-2 text-sm">
                <li className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className="text-green-500">✓</span>
                  <strong>Better Performance:</strong> Each model is optimized for specific tasks
                </li>
                <li className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className="text-green-500">✓</span>
                  <strong>Cost Efficient:</strong> Uses fast models for simple tasks, powerful models for complex ones
                </li>
                <li className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className="text-green-500">✓</span>
                  <strong>Automatic Selection:</strong> No need to manually choose models
                </li>
                <li className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className="text-green-500">✓</span>
                  <strong>Optimal Results:</strong> The right AI expertise for every task
                </li>
              </ul>
            </div>
          </div>

          {/* Manual Override */}
          <div>
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              Manual Override
            </h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Want to use a specific model? You can still manually select any model from the dropdown. 
              The intelligent routing works as a smart default, but you're always in control.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-6 border-t ${isDarkMode ? 'border-neutral-700' : 'border-neutral-200'}`}>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}; 