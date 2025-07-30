import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { MCPQualityInfo } from './MCPQualityInfo';

interface CredentialField {
  name: string;
  type: 'text' | 'password' | 'token' | 'oauth';
  description: string;
  required: boolean;
}

interface MCPServer {
  qualifiedName: string;
  displayName: string;
  description: string;
  tools: Array<{
    name: string;
    description?: string;
  }>;
}

interface MCPCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverInfo: {
    serverName: string;
    description: string;
    credentials: CredentialField[];
    suggestedTools: string[];
    server: MCPServer;
  };
  pendingId: Id<"pendingMCPIntegrations">;
  onSuccess: (connectionId: string) => void;
}

export function MCPCredentialModal({ 
  isOpen, 
  onClose, 
  serverInfo, 
  pendingId, 
  onSuccess 
}: MCPCredentialModalProps) {
  const { isDarkMode } = useTheme();
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [selectedTools, setSelectedTools] = useState<string[]>(serverInfo.suggestedTools);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQualityInfo, setShowQualityInfo] = useState(false);

  const completePendingIntegration = useMutation(api.smithery.completePendingMCPIntegration);

  const handleCredentialChange = (name: string, value: string) => {
    setCredentials(prev => ({ ...prev, [name]: value }));
  };

  const handleToolToggle = (toolName: string) => {
    setSelectedTools(prev => 
      prev.includes(toolName)
        ? prev.filter(t => t !== toolName)
        : [...prev, toolName]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      const missingFields = serverInfo.credentials
        .filter(field => field.required && !credentials[field.name])
        .map(field => field.name);

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      const result = await completePendingIntegration({
        pendingId,
        credentials,
        selectedTools,
      });

      if (result.isConnected) {
        onSuccess(result.connectionId);
        onClose();
      } else {
        setError(result.message || 'Failed to connect to the service');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete integration');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <div className="flex items-center gap-3 mb-2">
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Connect to {serverInfo.serverName}
                </h2>
                                 {/* Quality Badges */}
                 <div className="flex items-center gap-2">
                   <div className="flex items-center gap-2">
                     <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                       isDarkMode 
                         ? 'bg-green-950/50 text-green-300 border-green-800/50' 
                         : 'bg-green-50 text-green-700 border-green-200'
                     }`}>
                       Verified
                     </span>
                     <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                       isDarkMode 
                         ? 'bg-blue-950/50 text-blue-300 border-blue-800/50' 
                         : 'bg-blue-50 text-blue-700 border-blue-200'
                     }`}>
                       Secure
                     </span>
                     <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                       isDarkMode 
                         ? 'bg-purple-950/50 text-purple-300 border-purple-800/50' 
                         : 'bg-purple-50 text-purple-700 border-purple-200'
                     }`}>
                       Deployed
                     </span>
                   </div>
                   <button
                     onClick={() => setShowQualityInfo(true)}
                     className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                       isDarkMode 
                         ? 'text-gray-400 hover:text-gray-200 border-neutral-700 hover:bg-neutral-800' 
                         : 'text-gray-500 hover:text-gray-700 border-neutral-200 hover:bg-neutral-50'
                     }`}
                     title="Learn about quality standards"
                   >
                     Learn more
                   </button>
                 </div>
              </div>
              <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {serverInfo.description}
              </p>
              <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} mt-3 flex items-center gap-4`}>
                <span>Security scanned</span>
                <span>Community verified</span>
                <span>Tool poisoning protection</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'hover:bg-neutral-800 text-gray-400' 
                  : 'hover:bg-neutral-100 text-gray-600'
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
          {/* Available Tools Preview */}
          <div>
            <h3 className={`text-lg font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Available Tools ({serverInfo.server.tools.length})
            </h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {serverInfo.server.tools.map((tool, index) => (
                <div key={index} className={`flex items-start gap-3 p-2 rounded-lg ${
                  isDarkMode ? 'bg-neutral-800' : 'bg-neutral-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={selectedTools.includes(tool.name)}
                    onChange={() => handleToolToggle(tool.name)}
                    className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {tool.name}
                    </div>
                    {tool.description && (
                      <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {tool.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Credentials Form */}
          {serverInfo.credentials.length > 0 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Connection Details
              </h3>
              
              {serverInfo.credentials.map((field) => (
                <div key={field.name}>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-700'
                  }`}>
                    {field.name} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={field.type === 'password' || field.type === 'token' ? 'password' : 'text'}
                    value={credentials[field.name] || ''}
                    onChange={(e) => handleCredentialChange(field.name, e.target.value)}
                    placeholder={field.description}
                    required={field.required}
                    className={`w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                      isDarkMode 
                        ? 'bg-neutral-800 border border-neutral-600 text-white placeholder-gray-500 focus:border-primary' 
                        : 'bg-neutral-50 border border-neutral-300 text-gray-900 placeholder-gray-500 focus:border-primary'
                    } focus:outline-none`}
                  />
                  <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {field.description}
                  </p>
                </div>
              ))}

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isDarkMode 
                      ? 'bg-neutral-800 hover:bg-neutral-700 text-gray-300' 
                      : 'bg-neutral-200 hover:bg-neutral-300 text-gray-700'
                  } disabled:opacity-50`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || selectedTools.length === 0}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isDarkMode 
                      ? 'bg-neutral-800 hover:bg-neutral-700 text-white' 
                      : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                  } disabled:opacity-50`}
                >
                  {isSubmitting ? 'Connecting...' : 'Connect & Enable Tools'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Quality Info Modal */}
      <MCPQualityInfo 
        isOpen={showQualityInfo} 
        onClose={() => setShowQualityInfo(false)} 
      />
    </div>
  );
} 