"use client";

interface TocItem {
  level: number;
  text: string;
  id: string;
}

export default function TableOfContents({ headings }: { headings: TocItem[] }) {
  if (headings.length === 0) return null;

  return (
    <nav className="bg-dark-900 border border-dark-800 rounded-xl p-5 mb-8">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
        目次
      </h2>
      <ul className="space-y-2">
        {headings.map((heading, i) => (
          <li
            key={i}
            className={heading.level === 3 ? "ml-4" : ""}
          >
            <a
              href={`#${heading.id}`}
              className="text-sm text-gray-400 hover:text-night-300 transition-colors block py-0.5"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
