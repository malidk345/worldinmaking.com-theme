const fs = require('fs');
const path = require('path');

// Simple XML parser for WordPress export
function parseWordPressXML(xmlContent) {
  const posts = [];
  const pages = [];
  const categories = [];
  const tags = [];
  
  // Extract categories
  const categoryMatches = xmlContent.matchAll(/<wp:category>[\s\S]*?<wp:category_nicename><!\[CDATA\[(.*?)\]\]><\/wp:category_nicename>[\s\S]*?<wp:cat_name><!\[CDATA\[(.*?)\]\]><\/wp:cat_name>[\s\S]*?<\/wp:category>/g);
  for (const match of categoryMatches) {
    categories.push({
      slug: match[1],
      name: match[2]
    });
  }
  
  // Extract tags
  const tagMatches = xmlContent.matchAll(/<wp:tag>[\s\S]*?<wp:tag_slug><!\[CDATA\[(.*?)\]\]><\/wp:tag_slug>[\s\S]*?<wp:tag_name><!\[CDATA\[(.*?)\]\]><\/wp:tag_name>[\s\S]*?<\/wp:tag>/g);
  for (const match of tagMatches) {
    tags.push({
      slug: match[1],
      name: match[2]
    });
  }
  
  // Extract items (posts, pages, attachments)
  const itemMatches = xmlContent.matchAll(/<item>([\s\S]*?)<\/item>/g);
  
  for (const match of itemMatches) {
    const itemContent = match[1];
    
    // Get post type
    const postTypeMatch = itemContent.match(/<wp:post_type><!\[CDATA\[(.*?)\]\]><\/wp:post_type>/);
    const postType = postTypeMatch ? postTypeMatch[1] : 'unknown';
    
    // Skip attachments and other non-content types
    if (postType !== 'post' && postType !== 'page') continue;
    
    // Get status
    const statusMatch = itemContent.match(/<wp:status><!\[CDATA\[(.*?)\]\]><\/wp:status>/);
    const status = statusMatch ? statusMatch[1] : 'draft';
    
    // Skip non-published content
    if (status !== 'publish') continue;
    
    // Extract basic fields
    const titleMatch = itemContent.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || 
                       itemContent.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled';
    
    const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
    const link = linkMatch ? linkMatch[1] : '';
    
    const pubDateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);
    const pubDate = pubDateMatch ? pubDateMatch[1] : '';
    
    const creatorMatch = itemContent.match(/<dc:creator><!\[CDATA\[(.*?)\]\]><\/dc:creator>/);
    const author = creatorMatch ? creatorMatch[1] : 'worldinmaking';
    
    // Get post name (slug)
    const postNameMatch = itemContent.match(/<wp:post_name><!\[CDATA\[(.*?)\]\]><\/wp:post_name>/);
    const slug = postNameMatch ? postNameMatch[1] : title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Get content
    const contentMatch = itemContent.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/);
    let content = contentMatch ? contentMatch[1] : '';
    
    // Get excerpt
    const excerptMatch = itemContent.match(/<excerpt:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/excerpt:encoded>/);
    const excerpt = excerptMatch ? excerptMatch[1].trim() : '';
    
    // Get post date
    const postDateMatch = itemContent.match(/<wp:post_date><!\[CDATA\[(.*?)\]\]><\/wp:post_date>/);
    const postDate = postDateMatch ? postDateMatch[1] : '';
    
    // Get categories for this post
    const postCategories = [];
    const postTags = [];
    const categoryTagMatches = itemContent.matchAll(/<category domain="(category|post_tag)" nicename="([^"]+)"><!\[CDATA\[(.*?)\]\]><\/category>/g);
    for (const catMatch of categoryTagMatches) {
      if (catMatch[1] === 'category') {
        postCategories.push({ slug: catMatch[2], name: catMatch[3] });
      } else {
        postTags.push({ slug: catMatch[2], name: catMatch[3] });
      }
    }
    
    // Get featured image
    const thumbnailMatch = itemContent.match(/<wp:postmeta>[\s\S]*?<wp:meta_key><!\[CDATA\[_thumbnail_id\]\]><\/wp:meta_key>[\s\S]*?<wp:meta_value><!\[CDATA\[(\d+)\]\]><\/wp:meta_value>[\s\S]*?<\/wp:postmeta>/);
    const thumbnailId = thumbnailMatch ? thumbnailMatch[1] : null;
    
    const item = {
      id: itemContent.match(/<wp:post_id>(\d+)<\/wp:post_id>/)?.[1] || '0',
      title,
      slug,
      link,
      pubDate,
      postDate,
      author,
      content,
      excerpt,
      categories: postCategories,
      tags: postTags,
      thumbnailId,
      status,
      type: postType
    };
    
    if (postType === 'post') {
      posts.push(item);
    } else if (postType === 'page') {
      pages.push(item);
    }
  }
  
  // Extract attachments to map thumbnail IDs to URLs
  const attachments = {};
  const attachmentMatches = xmlContent.matchAll(/<item>([\s\S]*?)<\/item>/g);
  
  // Reset regex
  const xmlForAttachments = xmlContent;
  const attachmentItemMatches = xmlForAttachments.matchAll(/<item>([\s\S]*?)<\/item>/g);
  
  for (const match of attachmentItemMatches) {
    const itemContent = match[1];
    const postTypeMatch = itemContent.match(/<wp:post_type><!\[CDATA\[(.*?)\]\]><\/wp:post_type>/);
    if (postTypeMatch && postTypeMatch[1] === 'attachment') {
      const idMatch = itemContent.match(/<wp:post_id>(\d+)<\/wp:post_id>/);
      const urlMatch = itemContent.match(/<wp:attachment_url><!\[CDATA\[(.*?)\]\]><\/wp:attachment_url>/) ||
                       itemContent.match(/<wp:attachment_url>(.*?)<\/wp:attachment_url>/);
      if (idMatch && urlMatch) {
        attachments[idMatch[1]] = urlMatch[1];
      }
    }
  }
  
  // Add thumbnail URLs to posts
  posts.forEach(post => {
    if (post.thumbnailId && attachments[post.thumbnailId]) {
      post.featuredImage = attachments[post.thumbnailId];
    }
  });
  
  pages.forEach(page => {
    if (page.thumbnailId && attachments[page.thumbnailId]) {
      page.featuredImage = attachments[page.thumbnailId];
    }
  });
  
  return { posts, pages, categories, tags, attachments };
}

// Convert HTML content to cleaner format
function cleanContent(html) {
  if (!html) return '';
  
  // Remove WordPress specific stuff
  let clean = html
    // Remove wp: blocks
    .replace(/<!-- wp:[^>]*-->/g, '')
    .replace(/<!-- \/wp:[^>]*-->/g, '')
    // Clean up empty paragraphs
    .replace(/<p>\s*<\/p>/g, '')
    // Convert figure/figcaption
    .replace(/<figure[^>]*>/g, '<div class="figure">')
    .replace(/<\/figure>/g, '</div>')
    // Keep images but clean up classes
    .replace(/<img([^>]*)class="[^"]*"([^>]*)>/g, '<img$1$2>')
    // Remove empty attributes
    .replace(/\s+>/g, '>')
    .trim();
  
  return clean;
}

// Main execution
const xmlPath = process.argv[2] || 'C:\\Users\\firat\\Downloads\\worldinmaking.WordPress.2025-12-01.xml';
const outputDir = process.argv[3] || path.join(__dirname, '..', 'src', 'data');

console.log('Reading WordPress XML export...');
const xmlContent = fs.readFileSync(xmlPath, 'utf-8');

console.log('Parsing content...');
const { posts, pages, categories, tags, attachments } = parseWordPressXML(xmlContent);

console.log(`Found ${posts.length} posts`);
console.log(`Found ${pages.length} pages`);
console.log(`Found ${categories.length} categories`);
console.log(`Found ${tags.length} tags`);
console.log(`Found ${Object.keys(attachments).length} attachments`);

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Sort posts by date (newest first)
posts.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));

// Clean content
posts.forEach(post => {
  post.content = cleanContent(post.content);
  post.excerpt = cleanContent(post.excerpt);
});

pages.forEach(page => {
  page.content = cleanContent(page.content);
});

// Save as JSON files
fs.writeFileSync(
  path.join(outputDir, 'posts.json'),
  JSON.stringify(posts, null, 2),
  'utf-8'
);

fs.writeFileSync(
  path.join(outputDir, 'pages.json'),
  JSON.stringify(pages, null, 2),
  'utf-8'
);

fs.writeFileSync(
  path.join(outputDir, 'categories.json'),
  JSON.stringify(categories, null, 2),
  'utf-8'
);

fs.writeFileSync(
  path.join(outputDir, 'tags.json'),
  JSON.stringify(tags, null, 2),
  'utf-8'
);

console.log('\n✅ Export completed!');
console.log(`Posts saved to: ${path.join(outputDir, 'posts.json')}`);
console.log(`Pages saved to: ${path.join(outputDir, 'pages.json')}`);
console.log(`Categories saved to: ${path.join(outputDir, 'categories.json')}`);
console.log(`Tags saved to: ${path.join(outputDir, 'tags.json')}`);

// Show sample post
if (posts.length > 0) {
  console.log('\n📝 Sample post:');
  console.log(`Title: ${posts[0].title}`);
  console.log(`Slug: ${posts[0].slug}`);
  console.log(`Date: ${posts[0].postDate}`);
  console.log(`Categories: ${posts[0].categories.map(c => c.name).join(', ')}`);
  console.log(`Tags: ${posts[0].tags.map(t => t.name).join(', ')}`);
  console.log(`Featured Image: ${posts[0].featuredImage || 'None'}`);
  console.log(`Content Preview: ${posts[0].content.substring(0, 200)}...`);
}
