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
      <div className="relative w-full pb-[100%]">
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
            <a href={url} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 text-xs ${isDarkMode ? 'hover:text-gray-100' : 'hover:text-gray-900'}`}>
              <ExternalLink className="w-3 h-3" />
              Open
            </a>
            <button onClick={handleDownload} className={`inline-flex items-center gap-1 text-xs ${isDarkMode ? 'hover:text-gray-100' : 'hover:text-gray-900'}`} disabled={downloading}>
              <Download className="w-3 h-3" />
              {downloading ? 'Downloading...' : 'Download'}
            </button>
          </div>
        ) : (
          <div className="text-xs opacity-70">Please wait…</div>
        )}
      </div>
    </div>
  );
}


