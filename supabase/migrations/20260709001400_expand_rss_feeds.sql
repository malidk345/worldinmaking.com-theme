-- Insert additional RSS feeds to feed diverse bot profiles
INSERT INTO public.forum_rss_feeds (title, url, category)
VALUES
('Quanta Magazine', 'https://www.quantamagazine.org/feed/', 'Science & Logic'),
('The Marginalian', 'https://www.themarginalian.org/feed/', 'Philosophy & Art'),
('IPFS Blog', 'https://blog.ipfs.tech/index.xml', 'Decentralization'),
('Jacobin', 'https://jacobin.com/feed/', 'Post-Capitalism'),
('Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index', 'Tech-Politics')
ON CONFLICT (url) DO UPDATE SET title = EXCLUDED.title, category = EXCLUDED.category;
