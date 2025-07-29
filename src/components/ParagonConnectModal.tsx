import { useEffect, useRef, useState } from "react";
import { paragon } from "@useparagon/connect";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useTheme } from "../contexts/ThemeContext";

interface ParagonConnectModalProps {
  onClose: () => void;
  user: any;
}

export function ParagonConnectModal({ onClose, user }: ParagonConnectModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialized = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isDarkMode } = useTheme();
  
  const generateUserToken = useAction(api.paragon.generateUserToken);

  useEffect(() => {
    const initializeParagon = async () => {
      if (isInitialized.current) return;
      
      try {
        setIsLoading(true);
        setError(null);

        // Get the project ID from environment variables
        const projectId = import.meta.env.VITE_PARAGON_PROJECT_ID;
        if (!projectId) {
          throw new Error("VITE_PARAGON_PROJECT_ID not configured. Please add it to your .env.local file.");
        }

        // Generate a user token from the backend
        const { token } = await generateUserToken();
        
        // Authenticate with Paragon
        await paragon.authenticate(projectId, token);

        // Open the connect portal
        paragon.connect("", {});
        
        isInitialized.current = true;
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to initialize Paragon:", error);
        setError(error instanceof Error ? error.message : "Failed to initialize Paragon Connect");
        setIsLoading(false);
      }
    };

    initializeParagon();

    return () => {
      isInitialized.current = false;
    };
  }, [user, onClose, generateUserToken]);

  if (error) {
    return (
      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-red-600">Connection Error</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Failed to Connect</h4>
            <p className="text-gray-600 text-sm mb-4">{error}</p>
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Connect Your Apps</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {isLoading ? (
          <div className="text-center py-8">
            <div className={`w-16 h-16 ${isDarkMode ? 'bg-primary-900/20' : 'bg-primary-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <svg className={`w-8 h-8 ${isDarkMode ? 'text-primary-400' : 'text-primary-600'} animate-spin`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Initializing Paragon Connect</h4>
            <p className="text-gray-600">
              Setting up your integration portal...
            </p>
          </div>
        ) : (
          <div className="h-96 w-full" ref={containerRef}>
            {/* Paragon Connect Portal will be rendered here */}
            <div className="text-center py-8 text-gray-600">
              <p>Paragon Connect portal is now active.</p>
              <p className="text-sm mt-2">Choose from available integrations to connect your apps.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
