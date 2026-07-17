"use client";

import React from "react";

export interface TableOfContentsItem {
  url: string;
  value: string;
  depth: number;
}

interface TableOfContentsProps {
  tableOfContents: TableOfContentsItem[];
  contentRef: React.RefObject<HTMLDivElement | null>;
  title?: string;
  className?: string;
}

interface ElementScrollLinkProps {
  id: string;
  label: string;
  className: string;
  element: React.RefObject<HTMLDivElement | null>;
  style?: React.CSSProperties;
}

const ElementScrollLink = ({
  id,
  label,
  className,
  element,
  style,
  isActive,
}: ElementScrollLinkProps & { isActive?: boolean }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const targetElement = document.getElementById(id.replace("#", ""));
    if (targetElement && element.current) {
      const scrollElement = element.current.closest(
        "[data-radix-scroll-area-viewport]",
      ) as HTMLElement;
      if (scrollElement) {
        const offsetTop =
          targetElement.getBoundingClientRect().top -
          scrollElement.getBoundingClientRect().top +
          scrollElement.scrollTop -
          20;
        scrollElement.scrollTo({
          top: offsetTop,
          behavior: "smooth",
        });
      }
    }
  };

  return (
    <a href={id} onClick={handleClick} className={className} style={style}>
      <div
        className={`w-1.5 h-1.5 rounded-full transition-colors flex-shrink-0 ${isActive ? "bg-black/40 dark:bg-white/40" : "bg-black/10 dark:bg-white/10 group-hover:bg-black/20 dark:group-hover:bg-white/20"}`}
      />
      <span className="truncate">{label}</span>
    </a>
  );
};

export const TableOfContents = ({
  tableOfContents,
  contentRef,
  title = "Content",
  className = "",
}: TableOfContentsProps) => {
  const [activeId, setActiveId] = React.useState<string>("");

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          // Pick the last one if multiple are visible to bias towards the one further down
          setActiveId(
            `#${visibleEntries[visibleEntries.length - 1].target.id}`,
          );
        }
      },
      { rootMargin: "-10% 0px -40% 0px" },
    );

    tableOfContents.forEach((item) => {
      const id = item.url.replace("#", "");
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [tableOfContents]);
  if (!tableOfContents || tableOfContents.length === 0) {
    return null;
  }

  return (
    <div className={`font-nav not-prose ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 mb-3">
        <h4 className="font-bold text-black/40 dark:text-white/40 m-0 text-[10px] uppercase tracking-[0.1em]">
          {title}
        </h4>
      </div>

      {/* TOC Items */}
      <ul className="list-none m-0 p-0 flex flex-col gap-[2px] relative">
        {tableOfContents.map((navItem) => {
          const isTopLevel = navItem.depth === 0;
          return (
            <li className="relative leading-tight m-0" key={navItem.url}>
              <ElementScrollLink
                id={navItem.url}
                label={navItem.value.toLowerCase()}
                className={`
                                    flex items-center gap-2 py-1.5 px-2.5 rounded-[12px] transition-all duration-200 relative
                                    ${isTopLevel ? "text-[12px] font-medium" : "text-[11px] font-normal"}
                                    ${
                                      activeId === navItem.url
                                        ? "text-black dark:text-white bg-white/40 dark:bg-[#1C1C1E]/60 backdrop-blur-[20px] shadow-sm border border-black/5 dark:border-white/5 supports-[backdrop-filter]:backdrop-blur-[20px]"
                                        : "text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
                                    }
                                    active:scale-[0.98]
                                `}
                element={contentRef}
                style={{
                  paddingLeft: `${navItem.depth * 0.75 + 0.75}rem`,
                }}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
};
