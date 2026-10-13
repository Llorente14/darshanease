import { motion } from "motion/react";
import { tap } from "../utils/motionPresets";

function ChevronIcon({ direction }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

// 1 … 4 [5] 6 … 8: first, last and current ±1 always show. A gap of one page shows that page, a bigger gap shows an ellipsis.
function pageItems(page, totalPages) {
  const wanted = new Set([1, totalPages, page - 1, page, page + 1]);
  const pages = [...wanted].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const items = [];
  pages.forEach((n, index) => {
    const prev = pages[index - 1];
    if (prev !== undefined && n - prev === 2) items.push(prev + 1);
    else if (prev !== undefined && n - prev > 2) items.push("gap-" + n);
    items.push(n);
  });
  return items;
}

// Presentational: the parent owns the page number (it lives in the URL). Hidden when there is a single page.
export default function Pagination({ page, totalPages, total, pageSize, onChange }) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav className="pagination" aria-label="Pagination">
      <p className="pagination-summary">
        {from}-{to} of {total}
      </p>
      <div className="pagination-controls">
        <motion.button
          {...tap}
          type="button"
          className="page-button page-nav"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronIcon direction="left" />
          <span>Prev</span>
        </motion.button>
        <ol className="page-list">
          {pageItems(page, totalPages).map((item) =>
            typeof item === "string" ? (
              <li key={item} className="page-gap" aria-hidden="true">
                …
              </li>
            ) : (
              <li key={item}>
                <motion.button
                  {...tap}
                  type="button"
                  className={`page-button${item === page ? " active" : ""}`}
                  aria-current={item === page ? "page" : undefined}
                  aria-label={`Page ${item}`}
                  onClick={() => item !== page && onChange(item)}
                >
                  {item}
                </motion.button>
              </li>
            )
          )}
        </ol>
        <span className="page-compact" aria-live="polite">
          {page} / {totalPages}
        </span>
        <motion.button
          {...tap}
          type="button"
          className="page-button page-nav"
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
        >
          <span>Next</span>
          <ChevronIcon direction="right" />
        </motion.button>
      </div>
    </nav>
  );
}
