import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { IntegrationsPanel } from "./IntegrationsPanel";
import { useTheme } from "../contexts/ThemeContext";

export function IntegrationsButton() {
  const [showPanel, setShowPanel] = useState(false);
  const integrations = useQuery(api.integrations.getEnabledIntegrations, {}) || [];
  const { isDarkMode } = useTheme();

  return (
    <>
      <button
        onClick={() => setShowPanel(true)}
        className={`relative p-2 ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'} rounded-lg transition-colors`}
        title="Integrations"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        
        {integrations.length > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
            {integrations.length}
          </div>
        )}
      </button>

      {showPanel && (
        <IntegrationsPanel onClose={() => setShowPanel(false)} />
      )}
    </>
  );
}
