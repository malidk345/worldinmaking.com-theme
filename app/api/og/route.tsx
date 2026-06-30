import { ImageResponse } from '@vercel/og'

export const runtime = 'edge'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // Fallback values
    const title = searchParams.get('title') || 'World in Making'
    const author = searchParams.get('author') || ''

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
            fontFamily: 'sans-serif',
            padding: '40px',
            border: '20px solid #E5E7E0',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h1
              style={{
                fontSize: '60px',
                fontWeight: 'bold',
                color: '#111',
                textAlign: 'center',
                marginBottom: '20px',
                lineHeight: 1.2,
              }}
            >
              {title}
            </h1>
            {author && (
              <p
                style={{
                  fontSize: '30px',
                  color: '#666',
                  margin: 0,
                }}
              >
                by {author}
              </p>
            )}
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              display: 'flex',
              alignItems: 'center',
              fontSize: '24px',
              color: '#333',
              fontWeight: 'bold',
            }}
          >
            world in making
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e: unknown) {
    console.log(e instanceof Error ? e.message : String(e))
    return new Response(`Failed to generate the image`, {
      status: 500,
    })
  }
}
