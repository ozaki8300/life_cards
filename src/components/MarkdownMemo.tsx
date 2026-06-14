import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import type {
  Content,
  PhrasingContent,
  Root,
  Strong,
} from "mdast";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import type { Plugin } from "unified";

type MarkdownMemoProps = {
  children: string;
  emptyText?: string;
  compact?: boolean;
  readingDensity?: "default" | "detailBack";
};
type MarkdownParent = (Content | Root) & {
  children: Content[];
};

function splitHighlightText(value: string): PhrasingContent[] {
  const nodes: PhrasingContent[] = [];
  const highlightPattern = /==([^=\n][^\n]*?[^=\n]|[^=\n])==/g;
  let currentIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = highlightPattern.exec(value)) !== null) {
    if (match.index > currentIndex) {
      nodes.push({
        type: "text",
        value: value.slice(currentIndex, match.index),
      });
    }

    const highlightedText = match[1] ?? "";
    const markNode: Strong = {
      type: "strong",
      data: {
        hName: "mark",
      },
      children: [{ type: "text", value: highlightedText }],
    };

    nodes.push(markNode);
    currentIndex = match.index + match[0].length;
  }

  if (currentIndex < value.length) {
    nodes.push({ type: "text", value: value.slice(currentIndex) });
  }

  return nodes.length > 0 ? nodes : [{ type: "text", value }];
}

function hasChildren(node: Content | Root): node is MarkdownParent {
  return "children" in node && Array.isArray(node.children);
}

const remarkHighlightSyntax: Plugin<[], Root> = () => {
  function visit(node: Content | Root) {
    if (!hasChildren(node)) {
      return;
    }

    const nextChildren: Array<Content> = [];

    for (const child of node.children) {
      if (child.type === "text" && child.value.includes("==")) {
        nextChildren.push(...(splitHighlightText(child.value) as Content[]));
      } else {
        visit(child);
        nextChildren.push(child);
      }
    }

    node.children = nextChildren;
  }

  return (tree) => {
    visit(tree);
  };
};

function createMarkdownComponents(
  compact: boolean,
  readingDensity: MarkdownMemoProps["readingDensity"],
): Components {
  const isDetailBack = readingDensity === "detailBack";
  const paragraphClass = compact
    ? "my-1.5 leading-5 text-[#5f5346] first:mt-0 last:mb-0 sm:leading-6"
    : isDetailBack
      ? "my-2 leading-[1.7] text-[#5f5346] first:mt-0 last:mb-0 sm:my-3 sm:leading-7"
      : "my-3 leading-7 text-[#5f5346] first:mt-0 last:mb-0 sm:my-4 sm:leading-8";
  const listClass = compact
    ? "my-2 list-disc space-y-1.5 pl-5 text-[#5f5346] marker:text-[#b5a184]"
    : isDetailBack
      ? "my-2 list-disc space-y-1.5 pl-5 text-[#5f5346] marker:text-[#c2ad8e] sm:my-3"
      : "my-3 list-disc space-y-2 pl-5 text-[#5f5346] marker:text-[#c2ad8e] sm:my-4";
  const orderedListClass = compact
    ? "my-2 list-decimal space-y-1.5 pl-5 text-[#5f5346] marker:text-[#b5a184]"
    : isDetailBack
      ? "my-2 list-decimal space-y-1.5 pl-5 text-[#5f5346] marker:text-[#c2ad8e] sm:my-3"
      : "my-3 list-decimal space-y-2 pl-5 text-[#5f5346] marker:text-[#c2ad8e] sm:my-4";
  const listItemClass = compact
    ? "pl-1 leading-5 sm:leading-6"
    : isDetailBack
      ? "pl-1 leading-[1.65] sm:leading-7"
      : "pl-1 leading-6 sm:leading-7";

  return {
    h1: ({ children }) => (
      <h1 className="mb-3 mt-6 text-2xl font-semibold leading-tight text-[#332d25] first:mt-0">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-2.5 mt-5 border-b border-[#eadfce]/75 pb-1.5 text-xl font-semibold leading-tight text-[#3f362d] first:mt-0">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-2 mt-4 text-lg font-semibold leading-tight text-[#4a4034] first:mt-0">
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
    table: ({ children }) => (
      <div className="my-4 max-w-full overflow-x-auto">
        <table className="w-max min-w-full border-collapse text-left text-[0.92em] leading-6 text-[#5f5346]">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="border-b border-[#d8c8aa] bg-[#fffaf0] text-[#3f362d]">
        {children}
      </thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-[#eadfce]">{children}</tbody>
    ),
    tr: ({ children }) => (
      <tr className="align-top">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="min-w-24 whitespace-nowrap border border-[#e0d3c0] px-3 py-2 font-semibold">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="min-w-24 whitespace-nowrap border border-[#eadfce] px-3 py-2">
        {children}
      </td>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-4 rounded-r-[12px] border-l-4 border-[#d8c8aa] bg-[#fffaf0]/64 py-2.5 pl-4 pr-3 italic text-[#6d5f4f]">
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
    mark: ({ children }) => (
      <mark className="rounded-[0.35em] bg-[#fff0b8]/70 px-1 py-0.5 text-[#4a4034]">
        {children}
      </mark>
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
  readingDensity = "default",
}: MarkdownMemoProps) {
  const source = children.trim() || emptyText;
  const components = createMarkdownComponents(compact, readingDensity);

  return (
    <div
      className={
        compact
          ? "text-[15px] leading-5 text-[#5f5346] sm:text-sm sm:leading-6"
          : readingDensity === "detailBack"
            ? "text-[15px] leading-[1.7] text-[#5f5346] sm:text-base sm:leading-7"
          : "text-base leading-7 text-[#5f5346] sm:text-lg sm:leading-8"
      }
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkHighlightSyntax]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
