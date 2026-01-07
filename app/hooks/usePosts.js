// Dummy data removal or minimization to reduce bundle size
// const dummyLongString = "";
import { supabase } from '../lib/supabase';

// Helper to process content: Extract headings AND inject IDs for TOC
const processContent = (html) => {
    const headings = [];
    // Regex to find h2 and h3 tags
    const processedHtml = html ? html.replace(/<(h[2-3])([^>]*)>(.*?)<\/\1>/gi, (match, tag, attrs, text) => {
        // Clean text for slug (remove inner HTML tags if any)
        const cleanText = text.replace(/<[^>]*>/g, '').trim();
        const id = cleanText
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
            .replace(/(^-|-$)+/g, '');   // Remove leading/trailing hyphens

        headings.push({ id, text: cleanText, level: parseInt(tag.replace('h', '')) });
        // Inject ID into the tag
        return `<${tag} id="${id}"${attrs}>${text}</${tag}>`;
    }) : '';
    return { headings, content: processedHtml };
};

// Helper to convert DB Post format to App format
const adaptPost = (p) => {
    const { headings, content } = processContent(p.content || '');

    return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        date: new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        category: p.category,
        description: p.excerpt || '',
        excerpt: p.excerpt || '',
        content: content,
        author: p.author || 'Unknown',
        authorName: p.author || 'Unknown', // Mapped for DashboardGrid
        authorAvatar: p.author_avatar || undefined,
        wordCount: (content || '').split(' ').length,
        headings: headings,
        comments: [], // Comments are fetched separately usually
        image: null, // Placeholder if needed
        ribbon: '#3546AB' // Default color
    };
};

export const usePosts = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const { data, error } = await supabase
                    .from('posts')
                    .select('*')
                    .eq('published', true)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Error fetching posts:', error);
                } else if (data) {
                    setPosts(data.map(adaptPost));
                }
            } catch (e) {
                console.error('Failed to fetch posts:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    return { posts, loading };
};

export const getPostBySlug = async (slug) => {
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .single();

    if (error || !data) return null;
    return adaptPost(data);
};

export const getPostById = async (id) => {
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) return null;
    return adaptPost(data);
};
