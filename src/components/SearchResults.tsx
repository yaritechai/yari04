import React from "react";
import { useTheme } from "../contexts/ThemeContext";

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
}

interface SearchResultsProps {
  data?: {
    query?: string;
    results?: SearchResult[];
  };
  compact?: boolean;
}

export function SearchResults({ data, compact = false }: SearchResultsProps) {
  const { isDarkMode } = useTheme();

  if (!data?.results || data.results.length === 0) {
    return (
      <div className={`flex-1 flex items-center justify-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} p-8`}>
        <div className="text-center">
          <div className="text-4xl mb-4">🔍</div>
          <p>No search results to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-4">
      <div className="space-y-4">
        {data.results.map((result, index) => (
          <div
            key={index}
            className={`${isDarkMode ? 'bg-neutral-800 hover:bg-neutral-700' : 'hover:bg-gray-50'} rounded-lg p-4 transition-colors cursor-pointer`}
            onClick={() => window.open(result.link, '_blank')}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-blue-600'} hover:underline line-clamp-2 mb-1`}>
                  {result.title}
                </h3>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                  {result.displayLink}
                </p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} line-clamp-3`}>
                  {result.snippet}
                </p>
              </div>
              <svg className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} flex-shrink-0 mt-1`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
