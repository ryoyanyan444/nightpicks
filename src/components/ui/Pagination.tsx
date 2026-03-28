import Link from "next/link";
import clsx from "clsx";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

export default function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  const getHref = (page: number) => {
    if (page === 1) return basePath;
    return `${basePath}?page=${page}`;
  };

  return (
    <nav className="flex items-center justify-center gap-1 mt-10">
      {currentPage > 1 && (
        <Link
          href={getHref(currentPage - 1)}
          className="px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
        >
          前へ
        </Link>
      )}

      {pages.map((page, i) =>
        page === "..." ? (
          <span key={`dots-${i}`} className="px-2 text-gray-600">...</span>
        ) : (
          <Link
            key={page}
            href={getHref(page)}
            className={clsx(
              "px-3 py-2 text-sm rounded-lg transition-colors",
              page === currentPage
                ? "bg-night-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-dark-800"
            )}
          >
            {page}
          </Link>
        )
      )}

      {currentPage < totalPages && (
        <Link
          href={getHref(currentPage + 1)}
          className="px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
        >
          次へ
        </Link>
      )}
    </nav>
  );
}
