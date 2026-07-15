import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export const CommandList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        selectItem(selectedIndex);
        return true;
      }

      return false;
    },
  }));

  if (props.items.length === 0) {
    return null;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="z-50 glass-panel rounded-xl overflow-hidden min-w-[280px] p-1.5 flex flex-col gap-0.5"
    >
      {props.items.map((item: any, index: number) => (
        <button
          className={cn(
            "flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg transition-colors text-sm",
            index === selectedIndex 
              ? "bg-black/5 dark:bg-white/10 text-foreground" 
              : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground"
          )}
          key={index}
          onClick={() => selectItem(index)}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded bg-background shadow-sm border border-border/50 text-foreground">
            {item.icon}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{item.title}</span>
            <span className="text-xs opacity-70">{item.description}</span>
          </div>
        </button>
      ))}
    </motion.div>
  );
});

CommandList.displayName = 'CommandList';
