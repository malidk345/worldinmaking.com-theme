import * as Icons from '../components/SidebarIcons';
import { Document as DocumentIcon } from '../components/Icons';

// Mapping of paths to icons
const iconMap = {
    '/': Icons.Home,
    '/search': Icons.Search,
    '/community': Icons.Community,
    '/services': Icons.Services,
    '/contact': Icons.Contact,
    '/about': Icons.About,
    '/write-for-wim': Icons.WriteForWim,
    '/instagram': Icons.Instagram,
    '/x': Icons.X,
    '/login': Icons.AccessControl
};

/**
 * Returns the appropriate icon component for a given path.
 * @param {string} path - The URL path
 * @returns {React.ComponentType} - The icon component
 */
export const getIconByPath = (path) => {
    if (path.startsWith('/post')) {
        return DocumentIcon;
    }
    if (path.startsWith('/profile')) {
        return Icons.About;
    }
    return iconMap[path] || Icons.Home; // Default to Home if no match
};

export { Icons, DocumentIcon };
