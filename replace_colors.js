const fs = require('fs');

const files = [
  'D:/all works/posthog.com/src/components/ClaudeWorkspaceChat/index.tsx',
  'D:/all works/posthog.com/src/components/ClaudeWorkspaceChat/components/Header.tsx',
  'D:/all works/posthog.com/src/components/ClaudeWorkspaceChat/components/ChatInput.tsx',
  'D:/all works/posthog.com/src/components/ClaudeWorkspaceChat/components/ChatMessage.tsx',
  'D:/all works/posthog.com/src/components/ClaudeWorkspaceChat/components/Sidebar.tsx',
  'D:/all works/posthog.com/src/components/ClaudeWorkspaceChat/components/ArtifactsPanel.tsx',
  'D:/all works/posthog.com/src/components/ClaudeWorkspaceChat/components/ThinkingBlock.tsx'
];

const map = {
  'bg-stone-50/80': 'bg-bg-primary/80',
  'bg-stone-50/95': 'bg-bg-primary/95',
  'bg-stone-50': 'bg-bg-primary',
  'bg-stone-100/90': 'bg-accent/90',
  'bg-stone-100': 'bg-accent',
  'bg-stone-200/80': 'bg-light-3',
  'bg-stone-200/90': 'bg-light-3',
  'bg-stone-200/60': 'bg-light-3',
  'bg-stone-200/70': 'bg-light-3',
  'bg-stone-200/50': 'bg-light-3',
  'bg-stone-200/40': 'bg-light-3',
  'bg-stone-200': 'bg-light-3',
  'text-stone-900': 'text-primary',
  'text-stone-800': 'text-primary',
  'text-stone-700': 'text-secondary',
  'text-stone-600': 'text-secondary',
  'text-stone-500': 'text-muted',
  'text-stone-400': 'text-muted',
  'border-stone-200/90': 'border-primary',
  'border-stone-200/80': 'border-primary',
  'border-stone-200/60': 'border-primary',
  'border-stone-300/80': 'border-primary',
  'border-stone-300/60': 'border-primary',
  'border-stone-200': 'border-primary',
  'border-stone-300': 'border-primary',
  'border-stone-400': 'border-primary',
  'hover:bg-stone-50': 'hover:bg-bg-primary',
  'hover:bg-stone-100/60': 'hover:bg-accent/60',
  'hover:bg-stone-100': 'hover:bg-accent',
  'hover:bg-stone-200/60': 'hover:bg-light-3',
  'hover:bg-stone-200/50': 'hover:bg-light-3',
  'hover:bg-stone-200/40': 'hover:bg-light-3',
  'hover:bg-stone-200': 'hover:bg-light-3',
  'hover:border-stone-300': 'hover:border-primary',
  'hover:border-stone-400': 'hover:border-primary',
  'hover:text-stone-950': 'hover:text-primary',
  'hover:text-stone-900': 'hover:text-primary',
  'hover:text-stone-800': 'hover:text-primary',
  'hover:text-stone-700': 'hover:text-secondary',
  'hover:text-stone-600': 'hover:text-secondary',
  'text-[#1F1E1B]': 'text-primary',
  'text-[#1A1816]': 'text-primary',
  'text-[#6D6B67]': 'text-secondary',
  'text-[#8C877D]': 'text-muted',
  'text-[#9C9A96]': 'text-muted',
  'text-[#5A5752]': 'text-secondary',
  'text-[#898781]': 'text-muted',
  'text-[#932E1B]': 'text-rose-600',
  'bg-[#FAF9F6]': 'bg-bg-primary',
  'bg-[#FCFCFB]': 'bg-bg-primary',
  'bg-[#EFECE6]': 'bg-light-2',
  'bg-[#F5F2EC]': 'bg-light-1',
  'bg-[#F6EBE6]': 'bg-accent',
  'bg-[#1F1E1B]': 'bg-primary',
  'text-[#EFECE6]': 'text-light-2',
  'border-[#E5E2D9]': 'border-primary',
  'border-[#D3CFCE]': 'border-primary',
  'hover:bg-[#EFECE6]': 'hover:bg-light-2',
  'hover:bg-[#F5F2EC]': 'hover:bg-light-1',
  'hover:text-[#1A1816]': 'hover:text-primary',
  'hover:text-[#1F1E1B]': 'hover:text-primary'
};

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  
  // Hide code block dark classes in ChatMessage.tsx
  let isChatMessage = f.includes('ChatMessage.tsx');
  if (isChatMessage) {
    content = content.replace('border border-stone-800 bg-stone-950 overflow-hidden text-stone-100', '___BLOCK1___');
    content = content.replace('bg-stone-900 border-b border-stone-800 text-[11px] text-stone-400 font-mono', '___BLOCK2___');
  }

  // Sort keys by length descending to match longest first
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  
  keys.forEach(k => {
    // Escape brackets
    const regexStr = k.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
    const regex = new RegExp(regexStr, 'g');
    content = content.replace(regex, map[k]);
  });
  
  if (isChatMessage) {
    content = content.replace('___BLOCK1___', 'border border-stone-800 bg-stone-950 overflow-hidden text-stone-100');
    content = content.replace('___BLOCK2___', 'bg-stone-900 border-b border-stone-800 text-[11px] text-stone-400 font-mono');
  }

  fs.writeFileSync(f, content, 'utf8');
});

