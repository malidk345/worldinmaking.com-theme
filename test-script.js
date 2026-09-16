const prev = { xs: true, sm: true, md: true, lg: false, xl: false, xxl: false };
const next = { xs: true, sm: true, md: true, lg: false, xl: false, xxl: false };

const isSame = prev.xs === next.xs &&
               prev.sm === next.sm &&
               prev.md === next.md &&
               prev.lg === next.lg &&
               prev.xl === next.xl &&
               prev.xxl === next.xxl;

console.log('isSame:', isSame);
