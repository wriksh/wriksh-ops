import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { LibraryEntry } from "@/lib/library/index";
import { WRIKSH_BRAND } from "@/lib/brand";

/**
 * DocReader — renders a repo-tracked markdown file.
 *
 * Layout:
 *   - top bar: back, source badge, title, meta (word count + read time)
 *   - 2-column body
 *     - main: rendered markdown (Spectral serif, brand palette)
 *     - right rail: sticky TOC built from H1/H2/H3 headings
 */
export default function DocReader({
  entry,
  body,
}: {
  entry: LibraryEntry;
  body: string;
}) {
  const C = WRIKSH_BRAND.colors;
  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/library"
        className="inline-block font-body text-xs uppercase tracking-[0.24em] text-gold hover:text-gold-bright"
      >
        ← Library
      </Link>

      <div className="mt-3 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_240px]">
        <article className="rounded-2xl border border-stone/40 bg-parchment p-8 shadow-card">
          <header className="border-b border-stone/40 pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-moss/20 px-2 py-0.5 font-body text-[10px] uppercase tracking-wider text-moss">
                repo · markdown
              </span>
              <span className="rounded-full bg-stone/40 px-2 py-0.5 font-body text-[10px] uppercase tracking-wider text-umber">
                📁 {entry.bucket ?? "general"}
              </span>
              {entry.tags
                .filter((t) => t !== "docs" && t !== entry.bucket)
                .map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-stone/40 px-2 py-0.5 font-body text-[10px] text-umber"
                  >
                    #{t}
                  </span>
                ))}
            </div>
            <h1 className="mt-3 font-display text-4xl leading-tight text-ink">{entry.title}</h1>
            <p className="mt-2 font-body text-xs text-umber">
              {entry.readMinutes ?? 1} min read · {entry.wordCount ?? 0} words · last modified{" "}
              {new Date(entry.updatedAt).toLocaleDateString()}
            </p>
          </header>

          <div className="prose-wriksh mt-6 font-body text-ink">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h2 className="mt-8 mb-3 font-display text-2xl text-ink">{children}</h2>,
                h2: ({ children, id }) => (
                  <h2
                    id={id}
                    className="mt-8 mb-3 border-b border-stone/40 pb-1 font-display text-2xl text-ink"
                  >
                    {children}
                  </h2>
                ),
                h3: ({ children, id }) => (
                  <h3 id={id} className="mt-6 mb-2 font-display text-xl text-ink-soft">
                    {children}
                  </h3>
                ),
                p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
                ul: ({ children }) => (
                  <ul className="my-3 ml-6 list-disc space-y-1 marker:text-gold">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-3 ml-6 list-decimal space-y-1 marker:text-gold">{children}</ol>
                ),
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote
                    className="my-4 border-l-4 pl-4 italic"
                    style={{ borderColor: C.gold, color: C.inkSoft }}
                  >
                    {children}
                  </blockquote>
                ),
                code: ({ className, children }) => {
                  const isBlock = className?.includes("language-");
                  if (isBlock) {
                    return (
                      <code className={className}>{children}</code>
                    );
                  }
                  return (
                    <code
                      className="rounded px-1.5 py-0.5 font-mono text-[0.9em]"
                      style={{ background: C.parchment2, color: C.umber }}
                    >
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre
                    className="my-4 overflow-x-auto rounded-lg p-4 font-mono text-xs"
                    style={{ background: C.forest, color: C.linen }}
                  >
                    {children}
                  </pre>
                ),
                table: ({ children }) => (
                  <table className="my-4 w-full border-collapse font-body text-sm">{children}</table>
                ),
                th: ({ children }) => (
                  <th
                    className="border-b px-3 py-2 text-left font-body text-[11px] uppercase tracking-wider"
                    style={{ borderColor: C.stone, color: C.umber }}
                  >
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td
                    className="border-b px-3 py-2"
                    style={{ borderColor: C.stone }}
                  >
                    {children}
                  </td>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    className="text-gold underline decoration-clay/40 underline-offset-2 hover:text-gold-bright"
                    target={href?.startsWith("http") ? "_blank" : undefined}
                    rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
                  >
                    {children}
                  </a>
                ),
                hr: () => <hr className="my-6 border-stone/40" />,
                strong: ({ children }) => (
                  <strong className="font-display text-ink">{children}</strong>
                ),
                em: ({ children }) => (
                  <em style={{ color: C.gold }} className="italic">
                    {children}
                  </em>
                ),
              }}
            >
              {body}
            </ReactMarkdown>
          </div>
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-8 space-y-4">
            <div className="rounded-2xl border border-stone/40 bg-parchment p-4">
              <h2 className="font-body text-[10px] uppercase tracking-[0.28em] text-umber">
                On this page
              </h2>
              <ul className="mt-3 space-y-1.5 font-body text-xs">
                {(entry.headings ?? []).map((h) => (
                  <li
                    key={h.slug}
                    style={{
                      paddingLeft: `${(h.depth - 1) * 12}px`,
                      color: h.depth === 1 ? C.ink : C.inkSoft,
                    }}
                  >
                    <a
                      href={`#${h.slug}`}
                      className="block truncate hover:text-gold"
                      title={h.text}
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
                {(entry.headings ?? []).length === 0 ? (
                  <li className="italic text-umber">No headings yet.</li>
                ) : null}
              </ul>
            </div>
            <div className="rounded-2xl border border-stone/40 bg-parchment p-4">
              <h2 className="font-body text-[10px] uppercase tracking-[0.28em] text-umber">
                File info
              </h2>
              <dl className="mt-3 space-y-1 font-body text-xs text-ink-soft">
                <div className="flex justify-between">
                  <dt>Path</dt>
                  <dd className="font-mono text-[10px] text-umber">docs/{entry.slug}.md</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Words</dt>
                  <dd>{entry.wordCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Read</dt>
                  <dd>{entry.readMinutes} min</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Modified</dt>
                  <dd>{new Date(entry.updatedAt).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
