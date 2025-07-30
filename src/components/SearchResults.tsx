import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
}

interface SearchResultsProps {
  query?: string;
  results?: SearchResult[];
  isLoading?: boolean;
}

function SearchSkeleton({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className={`p-4 rounded-lg border ${isDarkMode ? 'border-neutral-800 bg-neutral-900/50' : 'border-neutral-200 bg-neutral-50'}`}>
          {/* Title skeleton */}
          <div className={`h-5 rounded mb-2 animate-pulse ${isDarkMode ? 'bg-neutral-700' : 'bg-neutral-300'}`} style={{ width: `${Math.random() * 40 + 60}%` }} />
          
          {/* URL skeleton */}
          <div className={`h-3 rounded mb-3 animate-pulse ${isDarkMode ? 'bg-neutral-800' : 'bg-neutral-200'}`} style={{ width: '45%' }} />
          
          {/* Content skeleton */}
          <div className="space-y-2">
            <div className={`h-3 rounded animate-pulse ${isDarkMode ? 'bg-neutral-700' : 'bg-neutral-300'}`} style={{ width: '95%' }} />
            <div className={`h-3 rounded animate-pulse ${isDarkMode ? 'bg-neutral-700' : 'bg-neutral-300'}`} style={{ width: '85%' }} />
            <div className={`h-3 rounded animate-pulse ${isDarkMode ? 'bg-neutral-700' : 'bg-neutral-300'}`} style={{ width: '70%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SearchResults({ query, results, isLoading }: SearchResultsProps) {
  const { isDarkMode } = useTheme();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-2 rounded-xl animate-pulse ${isDarkMode ? 'bg-neutral-800' : 'bg-neutral-200'}`}>
            <div className={`w-5 h-5 rounded ${isDarkMode ? 'bg-neutral-700' : 'bg-neutral-300'}`} />
          </div>
          <div className={`h-6 rounded animate-pulse ${isDarkMode ? 'bg-neutral-700' : 'bg-neutral-300'}`} style={{ width: '40%' }} />
        </div>
        <SearchSkeleton isDarkMode={isDarkMode} />
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className={`p-4 rounded-xl mb-4 ${isDarkMode ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
          <svg className={`w-8 h-8 mx-auto mb-2 ${isDarkMode ? 'text-neutral-600' : 'text-neutral-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
            No search results found
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
          <svg className={`w-5 h-5 ${isDarkMode ? 'text-[#f9c313]' : 'text-[#f9c313]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div>
          <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Search Results
          </h3>
          {query && (
            <p className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
              Found {results.length} results for "{query}"
            </p>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {results.map((result, index) => (
          <div 
            key={index} 
            className={`p-4 rounded-lg border transition-all hover:shadow-md ${
              isDarkMode 
                ? 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 hover:bg-neutral-900' 
                : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-white'
            }`}
          >
            {/* Title */}
            <h4 className={`font-medium text-base mb-1 line-clamp-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <a 
                href={result.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`hover:underline ${isDarkMode ? 'text-[#f9c313]' : 'text-blue-600'} hover:${isDarkMode ? 'text-[#f9c313]/80' : 'text-blue-800'}`}
              >
                {result.title}
              </a>
            </h4>
            
            {/* URL */}
            <p className={`text-xs mb-3 ${isDarkMode ? 'text-neutral-500' : 'text-neutral-500'} truncate`}>
              {result.url}
            </p>
            
            {/* Snippet */}
            <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
              {result.snippet}
            </p>
            
            {/* Visit link */}
            <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
              <a 
                href={result.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 text-xs font-medium transition-colors ${
                  isDarkMode 
                    ? 'text-[#f9c313] hover:text-[#f9c313]/80' 
                    : 'text-blue-600 hover:text-blue-800'
                }`}
              >
                Visit site
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
