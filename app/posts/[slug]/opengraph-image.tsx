import { ImageResponse } from 'next/og';



export const alt = 'World in Making';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function getPost(slug: string) {
  if (!supabaseUrl || !supabaseKey || !slug) return null;

  const url = new URL("/rest/v1/posts", supabaseUrl);
  url.searchParams.set("select", "title,excerpt,content,image_url,author,category,translations");
  url.searchParams.set("published", "eq.true");
  url.searchParams.set("or", `(slug.eq.${slug},translations->en->>slug.eq.${slug},translations->tr->>slug.eq.${slug},translations->de->>slug.eq.${slug},translations->es->>slug.eq.${slug})`);
  url.searchParams.set("limit", "1");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;
    const data = await res.json();
    let postData = data?.[0] || null;

    if (postData && postData.translations) {
        // Basic translation check (simplified for OG)
        const transKeys = Object.keys(postData.translations);
        for (const lang of transKeys) {
            if (postData.translations[lang]?.slug === slug) {
                postData = {
                    ...postData,
                    title: postData.translations[lang].title || postData.title,
                    excerpt: postData.translations[lang].excerpt || postData.excerpt,
                };
                break;
            }
        }
    }
    return postData;
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default async function Image({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  const post = await getPost(slug);

  const title = post?.title || 'world in making';
  const description = post?.excerpt 
    ? stripHtml(post.excerpt).slice(0, 150) 
    : (post?.content ? stripHtml(post.content).slice(0, 150) : 'exploring product, engineering, and community through the interrogation of constructed realities.');
  
  const category = post?.category || 'article';
  const author = post?.author || 'world in making';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          backgroundColor: '#FFFFFF', // light-1
          backgroundImage: 'radial-gradient(circle at 25px 25px, #D2D3CC 2%, transparent 0%), radial-gradient(circle at 75px 75px, #D2D3CC 2%, transparent 0%)',
          backgroundSize: '100px 100px',
          padding: '80px',
          border: '24px solid #E5E5E5', // light-3
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            maxWidth: '900px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '24px',
              fontWeight: 600,
              color: '#73756B', // light-9
              textTransform: 'lowercase',
              letterSpacing: '-0.02em',
            }}
          >
            <span>{category}</span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#D2D3CC' }} />
            <span>{author}</span>
          </div>

          <h1
            style={{
              fontSize: '84px',
              fontWeight: 800,
              lineHeight: 1.1,
              color: '#23251D', // light-12
              margin: 0,
              padding: 0,
              letterSpacing: '-0.04em',
              textTransform: 'lowercase',
            }}
          >
            {title}
          </h1>

          <p
            style={{
              fontSize: '32px',
              lineHeight: 1.4,
              color: '#4D4F46', // light-11
              margin: 0,
              marginTop: '12px',
              maxWidth: '800px',
              textTransform: 'lowercase',
            }}
          >
            {description}
          </p>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '80px',
            left: '80px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#23251D',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
             </svg>
          </div>
          <span
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#23251D',
              letterSpacing: '-0.02em',
              textTransform: 'lowercase',
            }}
          >
            world in making
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
