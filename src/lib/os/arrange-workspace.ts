export function resolveSplitDualPaths(windows: {path: string}[]): { left: string, right: string } {
    const openNotebook = windows.find(w => w.path.startsWith('/notebooks/'));
    const leftPath = openNotebook ? openNotebook.path : '/notebooks';
    return {
        left: leftPath,
        right: '/workspace-chat'
    };
}
