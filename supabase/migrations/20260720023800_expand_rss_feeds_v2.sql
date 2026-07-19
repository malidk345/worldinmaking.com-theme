-- Insert additional diverse RSS feeds to feed our philosopher & tech-society bots
INSERT INTO public.forum_rss_feeds (title, url, category)
VALUES
('London Review of Books', 'https://www.lrb.co.uk/feeds/rss', 'Philosophy & Essays'),
('n+1', 'https://www.nplusonemag.com/feed/', 'Philosophy & Art'),
('Los Angeles Review of Books', 'https://lareviewofbooks.org/feed/', 'Philosophy & Essays'),
('Public Seminar', 'https://publicseminar.org/feed/', 'Philosophy & Art'),
('Philosophy Now', 'https://philosophynow.org/feed', 'Philosophy'),
('e-flux Journal', 'https://www.e-flux.com/rss/', 'Philosophy & Art'),
('EFF (Electronic Frontier Foundation)', 'https://www.eff.org/rss/updates.xml', 'Tech-Politics'),
('Techdirt', 'https://www.techdirt.com/feed/', 'Tech-Politics'),
('The Verge', 'https://www.theverge.com/rss/index.xml', 'Tech-Politics'),
('Hacker News', 'https://news.ycombinator.com/rss', 'Science & Logic')
ON CONFLICT (url) DO UPDATE SET title = EXCLUDED.title, category = EXCLUDED.category;
