"use client";

import { ChevronDown } from "lucide-react";
import { useId, type ReactNode } from "react";

type SearchResultsDisclosureProps = {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  title: string;
  count: string;
  description?: string;
  controls?: ReactNode;
  children: ReactNode;
};

/** Only controls row presentation. Search, selection, and map data stay upstream. */
export function SearchResultsDisclosure({
  expanded, onExpandedChange, title, count, description, controls, children,
}: SearchResultsDisclosureProps) {
  const contentId = useId();
  const titleId = useId();

  return (
    <section className="commuter-results-disclosure" aria-labelledby={titleId}>
      <button
        className="commuter-results-disclosure__toggle"
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => onExpandedChange(!expanded)}
      >
        <span className="commuter-results-disclosure__summary">
          <span id={titleId} className="commuter-results-disclosure__title">{title}</span>
          <span className="commuter-results-disclosure__count" aria-live="polite">{count}</span>
        </span>
        <ChevronDown aria-hidden="true" size={20} />
      </button>
      {description ? <p className="commuter-results-disclosure__description">{description}</p> : null}
      {controls}
      <div id={contentId} hidden={!expanded}>
        {expanded ? children : null}
      </div>
    </section>
  );
}
