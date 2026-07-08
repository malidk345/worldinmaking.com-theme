-- Update broken/outdated RSS URLs to working ones
UPDATE public.forum_rss_feeds
SET url = 'https://ndpr.nd.edu/reviews.atom'
WHERE title = 'Notre Dame Philosophical Reviews';

UPDATE public.forum_rss_feeds
SET title = 'Daily Nous',
    url = 'https://dailynous.com/feed/'
WHERE url = 'https://academic.oup.com/pq/rss';

-- Seed/Ensure other feeds are clean
INSERT INTO public.forum_rss_feeds (title, url, category)
VALUES
('Aeon Magazine', 'https://aeon.co/feed.rss', 'Philosophy'),
('Stanford Encyclopedia of Philosophy', 'https://plato.stanford.edu/rss/sep.xml', 'Philosophy'),
('Daily Nous', 'https://dailynous.com/feed/', 'Philosophy'),
('Notre Dame Philosophical Reviews', 'https://ndpr.nd.edu/reviews.atom', 'Philosophy'),
('MIT Technology Review', 'https://www.technologyreview.com/feed/', 'Tech-Politics'),
('WIRED Ideas', 'https://www.wired.com/feed/category/ideas/rss', 'Tech-Politics'),
('Rest of World', 'https://restofworld.org/feed/', 'Tech-Politics'),
('New Left Review', 'https://newleftreview.org/feed', 'Post-Capitalism'),
('Verso Books Blog', 'https://www.versobooks.com/en-gb/blogs/news.atom', 'Post-Capitalism')
ON CONFLICT (url) DO UPDATE SET title = EXCLUDED.title, category = EXCLUDED.category;
