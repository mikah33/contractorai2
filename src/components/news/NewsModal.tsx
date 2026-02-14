import React from 'react';
import { X, ExternalLink, Calendar, Newspaper } from 'lucide-react';
import type { NewsArticle } from '../../stores/newsStore';

interface NewsModalProps {
  article: NewsArticle | null;
  isOpen: boolean;
  onClose: () => void;
}

const NewsModal: React.FC<NewsModalProps> = ({ article, isOpen, onClose }) => {
  if (!isOpen || !article) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleReadMore = () => {
    window.open(article.source_url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b-2 border-blue-400 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Newspaper className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-zinc-600">Industry News</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Thumbnail */}
          {article.thumbnail_url && (
            <div className="w-full h-40 rounded-xl overflow-hidden bg-zinc-100">
              <img
                src={article.thumbnail_url}
                alt={article.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Title */}
          <h2 className="text-xl font-bold text-black leading-tight">
            {article.title}
          </h2>

          {/* Meta info */}
          <div className="flex items-center gap-4 text-sm text-zinc-500">
            <div className="flex items-center gap-1">
              <Newspaper className="w-4 h-4" />
              <span>{article.source_name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(article.published_at)}</span>
            </div>
          </div>

          {/* AI Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">AI</span>
              </div>
              <span className="text-xs font-medium text-blue-700">Summary</span>
            </div>
            <p className="text-zinc-700 leading-relaxed">
              {article.summary}
            </p>
          </div>

          {/* Why it matters (static helper text) */}
          <div className="text-sm text-zinc-500 italic">
            Stay informed on industry trends to make better business decisions.
          </div>
        </div>

        {/* Footer with CTA */}
        <div className="sticky bottom-0 bg-white border-t border-zinc-200 p-4">
          <button
            onClick={handleReadMore}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
          >
            <span>Read Full Article</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewsModal;
