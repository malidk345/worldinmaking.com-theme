"use client";

import React, { useEffect, useState } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { IconChevronRight } from "@posthog/icons";
import { motion, AnimatePresence } from "framer-motion";
import Link from "components/Link";

interface MenuItem {
  name: string;
  url?: string;
  children?: MenuItem[];
  icon?: React.ReactNode;
}

interface TreeMenuProps {
  items: MenuItem[];
  activeItem?: MenuItem;
  watchPath?: boolean;
}

// Helper to check if a menu branch should be open
const isOpen = (
  children: MenuItem[],
  activeItem: MenuItem | undefined,
): boolean => {
  if (!activeItem) return false;
  return (
    children &&
    children.some((child: MenuItem) => {
      return (
        child === activeItem ||
        (child.children && isOpen(child.children, activeItem))
      );
    })
  );
};

export function TreeMenu({
  items = [],
  activeItem: propsActiveItem,
}: TreeMenuProps) {
  const [activeItem, setActiveItem] = useState<MenuItem | undefined>(
    propsActiveItem,
  );

  const handleClick = (item: MenuItem) => {
    setActiveItem(item);
  };

  return (
    <ul className="font-nav list-none m-0 p-0 flex flex-col gap-[1px]">
      {items.length > 0 ? (
        items.map((item, index) => {
          const key = `${item.name}-${index}-${item.url}`;
          return (
            <TreeMenuItem
              key={key}
              item={item}
              activeItem={activeItem}
              onClick={handleClick}
              depth={0}
            />
          );
        })
      ) : (
        <p className="text-[10px] font-bold opacity-40 px-4 lowercase text-black dark:text-white">
          no items available
        </p>
      )}
    </ul>
  );
}

function TreeMenuItem({
  item,
  activeItem,
  onClick,
  depth = 0,
}: {
  item: MenuItem;
  activeItem: MenuItem | undefined;
  onClick: (item: MenuItem) => void;
  depth: number;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const active = activeItem === item;

  useEffect(() => {
    if (item.children && !open && activeItem) {
      setOpen(isOpen(item.children, activeItem));
    }
  }, [activeItem, item.children, open]);

  const handleOpenChange = (open: boolean) => {
    setOpen(open);
  };

  // Padding calculation based on depth
  const paddingLeftStyle = {
    paddingLeft: `${depth * 0.75 + 0.5}rem`,
    paddingRight: "0.5rem",
  };

  // Premium styling for the item container with accent indicator
  const itemClass = `
        group flex w-full justify-between items-center relative py-1.5 px-2.5
        text-[12px] leading-tight font-medium rounded-[12px] transition-all duration-200 cursor-pointer
        ${
          active
            ? "text-black dark:text-white bg-white/40 dark:bg-[#1C1C1E]/60 backdrop-blur-[20px] shadow-sm border border-black/5 dark:border-white/5 supports-[backdrop-filter]:backdrop-blur-[20px]"
            : "text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
        }
        active:scale-[0.98]
    `;

  if (hasChildren) {
    return (
      <Collapsible.Root open={open} onOpenChange={handleOpenChange} asChild>
        <li className="list-none">
          <div className="flex flex-col">
            <Collapsible.Trigger asChild>
              <button
                className={itemClass}
                style={paddingLeftStyle}
                onClick={() => {
                  if (item.url) onClick(item);
                }}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  {hasChildren && (
                    <motion.div
                      animate={{ rotate: open ? 90 : 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex-shrink-0"
                    >
                      <IconChevronRight className="size-3 opacity-40" />
                    </motion.div>
                  )}
                  <span
                    className={`break-words ${open ? "font-semibold text-black dark:text-white" : ""}`}
                  >
                    {item.name.toLowerCase()}
                  </span>
                </span>
              </button>
            </Collapsible.Trigger>

            <Collapsible.Content>
              <AnimatePresence>
                {open && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="list-none m-0 p-0 overflow-hidden flex flex-col gap-[1px] mt-[2px] relative"
                  >
                    {item.children?.map((child, childIndex) => (
                      <TreeMenuItem
                        key={`${child.name}-${childIndex}`}
                        item={child}
                        activeItem={activeItem}
                        onClick={onClick}
                        depth={depth + 1}
                      />
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </Collapsible.Content>
          </div>
        </li>
      </Collapsible.Root>
    );
  }

  // Leaf node
  return (
    <li className="list-none">
      {item.url ? (
        <Link
          to={item.url}
          className={itemClass}
          style={paddingLeftStyle}
          onClick={() => onClick(item)}
        >
          <span className="flex items-center gap-2 min-w-0">
            {item.icon ? (
              <span className="opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0">
                {item.icon}
              </span>
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-black/20 dark:bg-white/20 group-hover:bg-black/40 dark:group-hover:bg-white/40 transition-colors flex-shrink-0" />
            )}
            <span className="truncate">{item.name}</span>
          </span>
        </Link>
      ) : (
        <div className={`${itemClass} cursor-default`} style={paddingLeftStyle}>
          <span className="break-words">{item.name.toLowerCase()}</span>
        </div>
      )}
    </li>
  );
}
