import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

type MarkdownMemoProps = {
  children: string;
  emptyText?: string;
  compact?: boolean;
};

function createMarkdownComponents(compact: boolean): Components {
  const paragraphClass = compact
    ? "my-1.5 leading-6 text-[#5f5346] first:mt-0 last:mb-0"
    : "my-2 leading-6 text-[#5f5346] first:mt-0 last:mb-0 sm:my-3 sm:leading-8";
  const listClass = compact
    ? "my-2 list-disc space-y-1.5 pl-5 text-[#5f5346] marker:text-[#b5a184]"
    : "my-2 list-disc space-y-1.5 pl-5 text-[#5f5346] marker:text-[#b5a184] sm:my-3 sm:space-y-2";
  const orderedListClass = compact
    ? "my-2 list-decimal space-y-1.5 pl-5 text-[#5f5346] marker:text-[#b5a184]"
    : "my-2 list-decimal space-y-1.5 pl-5 text-[#5f5346] marker:text-[#b5a184] sm:my-3 sm:space-y-2";
  const listItemClass = compact ? "pl-1 leading-6" : "pl-1 leading-6 sm:leading-7";

  return {
  h1: ({ children }) => (
    <h1 className="mb-3 mt-5 text-2xl font-bold leading-tight text-[#332d25] first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-5 text-xl font-bold leading-tight text-[#332d25] first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-4 text-lg font-semibold leading-tight text-[#332d25] first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className={paragraphClass}>
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className={listClass}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className={orderedListClass}>
      {children}
    </ol>
  ),
  li: ({ children }) => <li className={listItemClass}>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-4 border-[#d8c8aa] bg-[#fffaf0]/72 py-2 pl-4 pr-3 italic text-[#6d5f4f]">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-[#332d25]">{children}</strong>
  ),
  code: ({ children }) => (
    <code className="rounded-md border border-[#e0d3c0] bg-[#fffaf0] px-1.5 py-0.5 text-[0.9em] font-semibold text-[#6d5f4f]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-[12px] border border-[#e0d3c0] bg-[#332d25] p-4 text-sm leading-6 text-[#fffaf0]">
      {children}
    </pre>
  ),
  input: (props) => (
    <input
      {...props}
      readOnly
      className="mr-2 h-4 w-4 rounded border-[#d8c8aa] accent-[#7d705f]"
    />
  ),
  };
}

export default function MarkdownMemo({
  children,
  emptyText = "No back text",
  compact = false,
}: MarkdownMemoProps) {
  const source = children.trim() || emptyText;
  const components = createMarkdownComponents(compact);

  return (
    <div
      className={
        compact
          ? "text-sm leading-6 text-[#5f5346]"
          : "text-base leading-7 text-[#5f5346] sm:text-lg sm:leading-8"
      }
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
