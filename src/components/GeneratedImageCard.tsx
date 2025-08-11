import React, { useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

interface GeneratedImageCardProps {
  url?: string; // if undefined, show loading placeholder
}

export function GeneratedImageCard({ url }: GeneratedImageCardProps) {
  const { isDarkMode } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      if (!url) return;
      const response = await fetch(url, { mode: "cors" });
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = "generated-image.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      // Fallback to opening in new tab if direct fetch is blocked
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={`rounded-xl border overflow-hidden shadow-sm ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
      <div
        className={`relative w-full pb-[100%] ${url ? 'cursor-zoom-in' : ''}`}
        onClick={() => url && setIsOpen(true)}
        role={url ? 'button' : undefined}
        aria-label={url ? 'Open image' : undefined}
        tabIndex={url ? 0 : -1}
        onKeyDown={(e) => {
          if (url && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        {!loaded && (
          <div className="absolute inset-0">
            <div className={`h-full w-full animate-pulse ${isDarkMode ? 'bg-neutral-800' : 'bg-neutral-200'}`} />
            <div className="absolute inset-0 blur-md opacity-50" />
          </div>
        )}
        {url && (
          <img
            src={url}
            alt="Generated image"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
          />
        )}
      </div>
      <div className={`flex items-center justify-between px-3 py-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        <span className="text-xs font-medium truncate">{url ? 'Image generated' : 'Generating image...'}</span>
        {url ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOpen(true)}
              className={`inline-flex items-center gap-1 text-xs ${isDarkMode ? 'hover:text-gray-100' : 'hover:text-gray-900'}`}
            >
              <ExternalLink className="w-3 h-3" />
              View
            </button>
            <button onClick={handleDownload} className={`inline-flex items-center gap-1 text-xs ${isDarkMode ? 'hover:text-gray-100' : 'hover:text-gray-900'}`} disabled={downloading}>
              <Download className="w-3 h-3" />
              {downloading ? 'Downloading...' : 'Download'}
            </button>
          </div>
        ) : (
          <div className="text-xs opacity-70">Please wait…</div>
        )}
      </div>

      {/* Focus View Modal */}
      {isOpen && url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className={`relative max-w-[95vw] max-h-[90vh] ${isDarkMode ? 'bg-neutral-900' : 'bg-white'} rounded-xl shadow-2xl border ${isDarkMode ? 'border-neutral-700' : 'border-neutral-200'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={url}
              alt="Generated image"
              className="block max-h-[90vh] max-w-[95vw] object-contain rounded-xl"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                onClick={handleDownload}
                className={`rounded-md px-2 py-1 text-xs ${isDarkMode ? 'bg-neutral-800 text-gray-200 hover:bg-neutral-700' : 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50'} shadow`}
                disabled={downloading}
              >
                <span className="inline-flex items-center gap-1">
                  <Download className="w-3 h-3" /> {downloading ? 'Downloading…' : 'Download'}
                </span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className={`rounded-md px-2 py-1 text-xs ${isDarkMode ? 'bg-neutral-800 text-gray-200 hover:bg-neutral-700' : 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50'} shadow`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


