import React from 'react';

interface ChatMessageContentProps {
  content: string;
  isUser?: boolean;
}

/**
 * Renders chat message content with proper markdown-like formatting.
 * Supports:
 * - **bold text**
 * - *italic text*
 * - `inline code`
 * - - bullet points (dash)
 * - • bullet points (dot)
 * - numbered lists (1. 2. etc.)
 * - Line breaks and paragraphs
 */
const ChatMessageContent: React.FC<ChatMessageContentProps> = ({ content, isUser = false }) => {
  // Parse and render the content
  const renderContent = () => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: { type: 'bullet' | 'numbered'; items: string[] } | null = null;

    const flushList = () => {
      if (currentList) {
        if (currentList.type === 'bullet') {
          elements.push(
            <ul key={`list-${elements.length}`} className="space-y-1.5 my-2">
              {currentList.items.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isUser ? 'bg-white/70' : 'bg-amber-500'}`} />
                  <span className="flex-1">{parseInlineFormatting(item)}</span>
                </li>
              ))}
            </ul>
          );
        } else {
          elements.push(
            <ol key={`list-${elements.length}`} className="space-y-1.5 my-2">
              {currentList.items.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className={`font-semibold flex-shrink-0 min-w-[1.25rem] ${isUser ? 'text-white/80' : 'text-amber-500'}`}>
                    {idx + 1}.
                  </span>
                  <span className="flex-1">{parseInlineFormatting(item)}</span>
                </li>
              ))}
            </ol>
          );
        }
        currentList = null;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Check for bullet points (-, •, *)
      const bulletMatch = trimmedLine.match(/^[-•*]\s+(.+)$/);
      if (bulletMatch) {
        if (currentList?.type !== 'bullet') {
          flushList();
          currentList = { type: 'bullet', items: [] };
        }
        currentList.items.push(bulletMatch[1]);
        continue;
      }

      // Check for numbered lists (1. 2. etc.)
      const numberedMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);
      if (numberedMatch) {
        if (currentList?.type !== 'numbered') {
          flushList();
          currentList = { type: 'numbered', items: [] };
        }
        currentList.items.push(numberedMatch[1]);
        continue;
      }

      // Not a list item, flush any current list
      flushList();

      // Empty line creates spacing
      if (trimmedLine === '') {
        elements.push(<div key={`space-${i}`} className="h-2" />);
        continue;
      }

      // Regular paragraph
      elements.push(
        <p key={`p-${i}`} className="leading-relaxed">
          {parseInlineFormatting(trimmedLine)}
        </p>
      );
    }

    // Flush any remaining list
    flushList();

    return elements;
  };

  // Parse inline formatting like **bold**, *italic*, `code`
  const parseInlineFormatting = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyCounter = 0;

    while (remaining.length > 0) {
      // Look for **bold**
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      // Look for *italic* (but not **)
      const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
      // Look for `code`
      const codeMatch = remaining.match(/`(.+?)`/);
      // Look for "quoted text" to highlight
      const quoteMatch = remaining.match(/"([^"]+)"/);

      // Find the earliest match
      const matches = [
        boldMatch && { match: boldMatch, type: 'bold' as const },
        italicMatch && { match: italicMatch, type: 'italic' as const },
        codeMatch && { match: codeMatch, type: 'code' as const },
        quoteMatch && { match: quoteMatch, type: 'quote' as const }
      ].filter(Boolean).sort((a, b) => (a!.match!.index ?? 0) - (b!.match!.index ?? 0));

      if (matches.length > 0 && matches[0]?.match?.index !== undefined) {
        const firstMatch = matches[0]!;
        const matchIndex = firstMatch.match.index;

        // Add text before the match
        if (matchIndex > 0) {
          parts.push(remaining.substring(0, matchIndex));
        }

        // Add the formatted element
        const matchedText = firstMatch.match[1];
        if (firstMatch.type === 'bold') {
          parts.push(
            <strong key={`bold-${keyCounter++}`} className={`font-semibold ${isUser ? 'text-white' : 'text-white'}`}>
              {matchedText}
            </strong>
          );
          remaining = remaining.substring(matchIndex + firstMatch.match[0].length);
        } else if (firstMatch.type === 'italic') {
          parts.push(
            <em key={`italic-${keyCounter++}`} className="italic">
              {matchedText}
            </em>
          );
          remaining = remaining.substring(matchIndex + firstMatch.match[0].length);
        } else if (firstMatch.type === 'code') {
          parts.push(
            <code key={`code-${keyCounter++}`} className={`px-1.5 py-0.5 rounded text-sm font-mono ${isUser ? 'bg-white/20 text-white' : 'bg-black/30 text-amber-400'}`}>
              {matchedText}
            </code>
          );
          remaining = remaining.substring(matchIndex + firstMatch.match[0].length);
        } else if (firstMatch.type === 'quote') {
          parts.push(
            <span key={`quote-${keyCounter++}`} className={`${isUser ? 'text-white/90' : 'text-amber-400'} font-medium`}>
              "{matchedText}"
            </span>
          );
          remaining = remaining.substring(matchIndex + firstMatch.match[0].length);
        }
      } else {
        // No more matches, add the rest of the text
        parts.push(remaining);
        break;
      }
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="text-[15px] space-y-1">
      {renderContent()}
    </div>
  );
};

export default ChatMessageContent;
