import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface MCPQualityInfoProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MCPQualityInfo: React.FC<MCPQualityInfoProps> = ({ isOpen, onClose }) => {
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
                MCP Quality Standards
              </h2>
              <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                How we ensure safe, reliable integrations
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
          {/* Quality Badges */}
          <div>
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              Quality Badges
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                  isDarkMode 
                    ? 'bg-green-950/50 text-green-300 border-green-800/50' 
                    : 'bg-green-50 text-green-700 border-green-200'
                }`}>
                  Verified
                </span>
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    Official Verification
                  </p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Officially verified by Smithery team for quality and reliability
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                  isDarkMode 
                    ? 'bg-blue-950/50 text-blue-300 border-blue-800/50' 
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  Secure
                </span>
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    Security Scanned
                  </p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Passed security checks for tool poisoning, rug pulls, cross-origin escalations, and prompt injection attacks
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                  isDarkMode 
                    ? 'bg-purple-950/50 text-purple-300 border-purple-800/50' 
                    : 'bg-purple-50 text-purple-700 border-purple-200'
                }`}>
                  Deployed
                </span>
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    Active & Working
                  </p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Currently deployed and actively working, not just a code repository
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                  isDarkMode 
                    ? 'bg-orange-950/50 text-orange-300 border-orange-800/50' 
                    : 'bg-orange-50 text-orange-700 border-orange-200'
                }`}>
                  Well-Used
                </span>
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    Community Tested
                  </p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Has a proven track record with real community usage and feedback
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Security Measures */}
          <div>
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              Security Measures
            </h3>
            <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-neutral-800' : 'bg-neutral-50'}`}>
              <ul className="space-y-2 text-sm">
                <li className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className="text-green-500">•</span>
                  <strong>Tool Poisoning Protection:</strong> Prevents malicious tool modifications
                </li>
                <li className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className="text-green-500">•</span>
                  <strong>Rug Pull Detection:</strong> Identifies suddenly malicious or abandoned projects
                </li>
                <li className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className="text-green-500">•</span>
                  <strong>Cross-Origin Safety:</strong> Prevents unauthorized cross-domain access
                </li>
                <li className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className="text-green-500">•</span>
                  <strong>Prompt Injection Defense:</strong> Blocks attempts to manipulate AI behavior
                </li>
              </ul>
            </div>
          </div>

          {/* Why This Matters */}
          <div>
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              Why This Matters
            </h3>
            <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} space-y-2`}>
              <p>
                When your AI agent connects to external services, you're trusting those services with your data and workflows. 
                Our quality standards ensure that only reliable, secure, and well-tested integrations are suggested to you.
              </p>
              <p>
                This filtering means you can confidently add powerful capabilities to your agent without worrying about 
                security vulnerabilities, unreliable connections, or malicious behavior.
              </p>
            </div>
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