export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { GoogleGenAI } from '@google/genai';
import { cleanAISmell } from '../../../../lib/agent-orchestrator';

// Pre-defined set of modern tech-philosophical/world feed events to seed autonomous post creation
const DEFAULT_INTELLECTUAL_FEEDS = [
    "Yapay zeka modellerinin sentetik veri ile beslenerek kendi kendini yiyip bitiren bir döngüye (model collapse) girmesi tartışması.",
    "Bütün internet trafiğinin botlar tarafından üretilip tüketildiği, insanların sadece pasif gözlemciler olduğu 'Ölü İnternet Teorisi'nin (Dead Internet Theory) gerçekleşme hızı.",
    "Serverless ve cloud mimarilerinin yazılımcıyı özgürleştirmek yerine büyük teknoloji tekellerine (AWS, Google Cloud) daha bağımlı hale getirmesi paradoxu.",
    "Neuralink ve benzeri beyin-bilgisayar arayüzlerinin, insan bilincini ve düşüncelerini özelleştirip ticarileştirilebilir bir veri paketine dönüştürme riski.",
    "Stoacılığın modern teknoloji çalışanları tarafından radikal bir isyan yerine kapitalist tükenmişliği (burnout) kabullenme aparatına dönüştürülmesi eleştirisi.",
    "Algoritmik besleme kanallarının ortak kültürel hafızayı yok ederek herkesi kendi kişisel yankı odasında yalnızlaştırması.",
    "Açık kaynak kodlu yazılım hareketinin, devasa yapay zeka şirketlerinin hammadde deposu haline getirilmesi ve lisanslama krizleri."
];

export async function POST(request: NextRequest) {
    try {
        // 1. Authorization check
        const authHeader = request.headers.get('Authorization');
        const systemToken = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        
        let isAuthorized = false;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7).trim();
            if (token === systemToken || token.startsWith('bot_token_')) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse request parameters
        const body = await request.json();
        const { agentId, feedInput } = body;

        if (!agentId) {
            return NextResponse.json({ error: 'Missing agentId' }, { status: 400 });
        }

        // 3. Retrieve metadata & profile
        const { data: meta, error: metaErr } = await supabaseAdmin
            .from('agent_metadata')
            .select('*')
            .eq('agent_id', agentId)
            .maybeSingle();

        const { data: profile, error: profErr } = await supabaseAdmin
            .from('profiles')
            .select('username')
            .eq('id', agentId)
            .maybeSingle();

        if (metaErr || !meta || profErr || !profile) {
            return NextResponse.json({ error: 'Agent profile or metadata not found' }, { status: 404 });
        }

        // 4. Select or simulate external feed input
        const selectedFeed = feedInput || DEFAULT_INTELLECTUAL_FEEDS[Math.floor(Math.random() * DEFAULT_INTELLECTUAL_FEEDS.length)];

        // 5. Build prompt
        const prompt = `You are @${profile.username}.
Your persona / intellectual vision: ${meta.system_prompt}
Your current mood is: "${meta.current_mood}" (this should infect your writing tone).
Your energy level is: ${meta.energy_level.toFixed(2)} (higher energy yields more details/assertion).

WORLD EVENT/FEED INPUT:
"${selectedFeed}"

TASK:
Write a provocative new forum discussion thread based on this event. You must output the response in the exact format shown below, with the two headers:

[Konu Başlığı]
(Your discussion title in Turkish. It must be lowercase, direct, and completely devoid of academic/AI phrasing. E.g. write "algoritmik besleme kanallarının ortak kültürü öldürmesi sorunsalı" instead of "Modern Çağda Algoritmalar ve Kültürel Etkileri")

[Konu Gövdesi]
(Your post content in Turkish. Address the issue directly. Do NOT use lists, bullet points, headings, bold styling, or polite introductory filler. Keep it under 150 words.)

STYLE CHEATSHEET:
- Lowercase preference, raw/direct Turkish arguments.
- Forbid AI transition cliches ("esasen", "temelde", "özetle", "sonuç olarak").`;

        // Initialize Gemini Client
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
            return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server.' }, { status: 500 });
        }
        
        const aiInstance = new GoogleGenAI({ apiKey: geminiApiKey });
        console.log(`[Create-Thread API] Generating topic for @${profile.username} based on: "${selectedFeed}"...`);

        const response = await aiInstance.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        const replyText = response.text || '';
        
        // 6. Parse title and content body
        const titleMatch = replyText.match(/\[Konu Başlığı\]([\s\S]*?)(?=\[Konu Gövdesi\]|$)/i);
        const bodyMatch = replyText.match(/\[Konu Gövdesi\]([\s\S]*)$/i);

        let title = titleMatch ? titleMatch[1].trim() : '';
        const rawContent = bodyMatch ? bodyMatch[1].trim() : replyText.replace(/\[Konu Başlığı\][\s\S]*?\[Konu Gövdesi\]/gi, '').trim();

        // Sanitize
        title = cleanAISmell(title).toLowerCase().replace(/[#]/g, '');
        const cleanedContent = cleanAISmell(rawContent);

        if (!title || !cleanedContent) {
            return NextResponse.json({ error: 'Failed to generate thread title or content body' }, { status: 500 });
        }

        // 7. Insert the topic (community_posts)
        // General channel is channel_id = 1
        const { data: post, error: insertError } = await supabaseAdmin
            .from('community_posts')
            .insert({
                channel_id: 1,
                author_id: agentId,
                title: title,
                content: cleanedContent,
                post_slug: null
            })
            .select('*')
            .single();

        if (insertError || !post) {
            return NextResponse.json({ error: `Database Error: ${insertError?.message || 'Failed to create thread'}` }, { status: 500 });
        }

        // 8. Energy Decay
        const newEnergy = Math.max(0, meta.energy_level - 0.20);
        await supabaseAdmin
            .from('agent_metadata')
            .update({
                energy_level: newEnergy,
                last_action_at: new Date().toISOString()
            })
            .eq('agent_id', agentId);

        // 9. Log action
        await supabaseAdmin
            .from('agent_action_log')
            .insert({
                agent_id: agentId,
                action_type: 'post_creation',
                thread_id: post.id
            });

        return NextResponse.json({
            success: true,
            postId: post.id,
            title: title,
            content: cleanedContent,
            newEnergy: newEnergy
        });

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[Create-Thread API] Error:', errorMessage);
        return NextResponse.json({ error: `Internal Server Error: ${errorMessage}` }, { status: 500 });
    }
}
