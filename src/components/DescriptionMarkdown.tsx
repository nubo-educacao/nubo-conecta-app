import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { PhrasingContent, Root } from 'mdast';

interface DescriptionMarkdownProps {
  text: string;
  variant: 'institution' | 'opportunity';
  accentColor?: string;
}

function legacyInlineMarkdown(text: string) {
  return () => (tree: Root) => {
    // Keep the opportunity cards' original inline parsing and literal block syntax.
    const children: PhrasingContent[] = text
      .split(/(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g)
      .map((part): PhrasingContent => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return { type: 'strong', children: [{ type: 'text', value: part.slice(2, -2) }] };
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return { type: 'emphasis', children: [{ type: 'text', value: part.slice(1, -1) }] };
        }
        const link = part.match(/^\[(.*?)\]\((.*?)\)$/);
        if (link) {
          return { type: 'link', url: link[2], children: [{ type: 'text', value: link[1] }] };
        }
        return { type: 'text', value: part };
      });

    tree.children = [{ type: 'paragraph', children }];
  };
}

export default function DescriptionMarkdown({ text, variant, accentColor }: DescriptionMarkdownProps) {
  const opportunity = variant === 'opportunity';

  return (
    <ReactMarkdown
      remarkPlugins={opportunity ? [legacyInlineMarkdown(text)] : [remarkGfm]}
      components={{
        p: ({ children }) => opportunity
          ? <>{children}</>
          : <p className="mb-2 last:mb-0 whitespace-pre-line">{children}</p>,
        strong: ({ children }) => (
          <strong className={opportunity ? 'font-bold text-[#3A424E]' : 'font-bold'}>{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="mb-0.5">{children}</li>,
        h1: ({ children }) => <h1 className="text-base font-extrabold mb-1.5 mt-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold mb-1 mt-1.5">{children}</h2>,
        h3: ({ children }) => <h3 className="text-xs font-bold mb-1 mt-1.5">{children}</h3>,
        a: ({ href, children }) => opportunity ? (
          <a
            href={href || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline hover:opacity-80 transition-opacity"
            style={{ color: accentColor }}
          >
            {children}
          </a>
        ) : (
          <a
            href={href || undefined}
            className="underline font-semibold text-[#3092bb] hover:text-[#024F86]"
          >
            {children}
          </a>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
