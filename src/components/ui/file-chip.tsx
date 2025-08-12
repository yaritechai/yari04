import React from "react";
import { X } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";

type FileChipProps = {
  name: string;
  size: number; // bytes
  type: string;
  previewUrl?: string | null;
  uploading?: boolean;
  onRemove?: () => void;
};

export const FileChip: React.FC<FileChipProps> = ({ name, size, type, previewUrl, uploading = false, onRemove }) => {
  const { isDarkMode } = useTheme();
  const isImage = type.startsWith("image/");
  const isPdf = type === "application/pdf" || name.toLowerCase().endsWith(".pdf");
  const isData = !isImage && !isPdf;

  const bg = isDarkMode ? "bg-neutral-800/60" : "bg-gray-100/80";
  const border = isDarkMode ? "border-neutral-700/70" : "border-gray-300/70";
  const text = isDarkMode ? "text-gray-200" : "text-gray-800";
  const subtext = isDarkMode ? "text-gray-400" : "text-gray-500";

  const humanSize = `${Math.max(1, Math.round(size / 1024))}KB`;

  return (
    <div className={`relative inline-flex items-center gap-2 rounded-xl border ${border} ${bg} px-2 py-1.5`} role="status" aria-live="polite">
      {/* Thumbnail / Icon */}
      <div className="w-8 h-8 rounded-md overflow-hidden flex items-center justify-center flex-shrink-0">
        {isImage && previewUrl ? (
          <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'bg-neutral-900' : 'bg-white'}`}>
            <span className="text-sm" aria-hidden>
              {isPdf ? '📄' : '📊'}
            </span>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="min-w-0">
        <div className={`text-sm ${text} truncate max-w-[160px]`} title={name}>{name}</div>
        <div className={`text-xs ${subtext}`}>{humanSize}</div>
      </div>

      {/* Uploading spinner */}
      {uploading && (
        <div className="flex items-center gap-1 ml-1 text-xs">
          <span className={`inline-block w-3 h-3 rounded-full border-2 border-t-transparent ${isDarkMode ? 'border-gray-400' : 'border-gray-500'} animate-spin`} aria-label="Uploading" />
          <span className={`${subtext}`}>Uploading</span>
        </div>
      )}

      {/* Remove */}
      {onRemove && !uploading && (
        <button
          type="button"
          onClick={onRemove}
          className={`ml-1 rounded-full p-1 ${isDarkMode ? 'hover:bg-neutral-900 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'}`}
          aria-label="Remove file"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};


