import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

type MarkdownMemoProps = {
  children: string;
  emptyText?: string;
  compact?: boolean;
};

const markdownComponents: Components = {
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
    <p className="my-3 leading-8 text-[#5f5346] first:mt-0 last:mb-0">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-2 pl-5 text-[#5f5346] marker:text-[#b5a184]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-2 pl-5 text-[#5f5346] marker:text-[#b5a184]">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1 leading-7">{children}</li>,
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

export default function MarkdownMemo({
  children,
  emptyText = "No back text",
  compact = false,
}: MarkdownMemoProps) {
  const source = children.trim() || emptyText;

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
        components={markdownComponents}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
