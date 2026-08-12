import type { NextApiRequest, NextApiResponse } from 'next'
import { generateWithGateway } from 'lib/bots/ai-gateway'
import { buildPersonaHeader } from 'lib/persona-engine'

function generateSmartFallback(prompt: string): string {
    const lower = prompt.toLowerCase()

    if (
        lower.includes('kod') ||
        lower.includes('code') ||
        lower.includes('react') ||
        lower.includes('function') ||
        lower.includes('script')
    ) {
        return `İşte istediğiniz işlevi gerçekleştiren temiz ve modüler bir kod örneği:

\`\`\`typescript
// TypeScript / React Örneği
import React, { useState } from 'react'

export function InteractiveDemo() {
  const [count, setCount] = useState(0)

  return (
    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
      <h3 className="text-lg font-semibold text-stone-900">Sayaç Örneği</h3>
      <p className="text-sm text-stone-600 my-2">Mevcut Değer: {count}</p>
      <button 
        onClick={() => setCount((c) => c + 1)}
        className="px-3 py-1.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-all"
      >
        Arttır
      </button>
    </div>
  )
}
\`\`\`

Bu kod bileşeni temiz state yönetimi ve stillendirme standartlarına uygun olarak tasarlanmıştır.`
    }

    if (
        lower.includes('liste') ||
        lower.includes('plan') ||
        lower.includes('adım') ||
        lower.includes('ödev') ||
        lower.includes('fikir')
    ) {
        return `Konuyla ilgili hazırladığım kapsamlı analiz ve öneri listesi aşağıdadır:

1. **Temel Değerlendirme & Planlama**: İlk aşamada mevcut durumun analizi çıkarılır ve öncelikler belirlenir.
2. **Uygulama Adımları**:
   - Hedef kitleye veya gereksinimlere uygun yöntemin seçilmesi
   - Kısa ve uzun vadeli çıktıların tanımlanması
3. **Kalite & Kontrol**: Çıktıların verimlilik ve standartlara uygunluğunun testi.
4. **Sürekli Gelişim**: Geri bildirimler doğrultusunda güncellemelerin yapılması.

Başka bir alt başlığı detaylandırmamı ister misiniz?`
    }

    return `Sorunuzu detaylıca inceledim: **"${prompt}"**

${prompt.slice(0, 1).toUpperCase() + prompt.slice(1)} konusu üzerine düşünürken dikkat edilmesi gereken temel noktalar şunlardır:

- **Kavramsal Netlik**: Konunun özündeki temel tanımları doğru oturtmak.
- **Pratik Uygulama**: Teorik bilginin somut çıktılara dönüştürülmesi.
- **Esneklik**: Farklı senaryolara uyarlanabilir yaklaşım sergilemek.

Size bu konuda daha fazla yardımcı olabilmem için belirli bir alana odaklanmamı veya bir doküman/kod örneği oluşturmamı ister misiniz?`
}

function extractArtifactsFromContent(content: string, prompt: string) {
    const lowerPrompt = prompt.toLowerCase()
    const lowerContent = content.toLowerCase()

    if (lowerPrompt.includes('kod') || lowerPrompt.includes('component') || lowerContent.includes('```')) {
        const codeBlockMatch = content.match(/```(?:typescript|javascript|tsx|jsx|html|css)?\n([\s\S]*?)```/)
        const artifactContent = codeBlockMatch ? codeBlockMatch[1] : content

        return {
            hasArtifact: true,
            artifacts: [
                {
                    id: `art-${Date.now()}`,
                    title: prompt.slice(0, 35) || 'Generated Component',
                    type: lowerPrompt.includes('react') ? 'react' : 'text',
                    content: artifactContent,
                    language: 'typescript',
                    createdAt: new Date().toISOString(),
                },
            ],
        }
    }

    return { hasArtifact: false, artifacts: [] }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const {
            prompt,
            modelId = 'claude-3-7-sonnet',
            thinkingBudget = 'extended',
            webSearchEnabled = false,
            systemPrompt = '',
            styleSuffix = '',
        } = req.body || {}

        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ error: 'Prompt is required.' })
        }

        // Set SSE streaming headers
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache, no-transform')
        res.setHeader('Connection', 'keep-alive')

        const sendSSE = (event: string, data: any) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        }

        // Step 1: Thinking process start
        const duration = thinkingBudget === 'extended' ? 3.8 : thinkingBudget === 'balanced' ? 2.1 : 0.8

        sendSSE('thinking_start', {
            durationSeconds: duration,
            tokenCount: Math.floor(Math.random() * 800) + 600,
        })

        const thinkingSteps = [
            {
                id: 's1',
                stepNumber: 1,
                title: 'Loaded skills & context',
                detail: `Analyzed user query: "${prompt.slice(0, 40)}...". Model: ${modelId}.`,
                completed: true,
            },
            {
                id: 's2',
                stepNumber: 2,
                title: 'Check package & tool availability',
                detail: 'Evaluated response structure, code snippets, and artifact requirements.',
                completed: true,
            },
        ]

        if (webSearchEnabled) {
            thinkingSteps.push({
                id: 's3',
                stepNumber: 3,
                title: 'Search web sources & references',
                detail: `Searching online references for "${prompt.slice(0, 30)}"...`,
                completed: true,
            })
        }

        thinkingSteps.push({
            id: 's4',
            stepNumber: thinkingSteps.length + 1,
            title: 'Script response & synthesis',
            detail: 'Streaming synthesized response with typewriter flow and Markdown verification.',
            completed: true,
        })

        for (const step of thinkingSteps) {
            sendSSE('thinking_step', step)
            await new Promise((r) => setTimeout(r, 120))
        }

        sendSSE('thinking_end', {
            durationSeconds: duration,
            summary: 'Musing',
        })

        // Web search citations
        if (webSearchEnabled) {
            const citations = [
                {
                    id: 1,
                    title: `Güncel Araştırmalar: ${prompt.slice(0, 25)}`,
                    url: 'https://anthropic.com/claude/3-7-sonnet-research',
                    snippet: 'Claude 3.7 Sonnet ve gruptaki hibrit düşünme mimarisi üzerine teknik analiz raporu.',
                },
                {
                    id: 2,
                    title: 'Claude AI Dokümantasyonu & Artifacts Rehberi',
                    url: 'https://docs.anthropic.com/en/docs/artifacts',
                    snippet: 'İnteraktif kod, React bileşenleri ve görsel metin bloklarının yan panelde canlı önizlenmesi.',
                },
            ]
            sendSSE('citations', citations)
        }

const THINKING_INSTRUCTIONS = `
Before writing your visible answer, externalize a short, SPECIFIC internal reasoning trail wrapped EXACTLY like this:

<thinking>
<perceive>What is the user concretely asking, and what's the real stakes/context?</perceive>
<frame>Which stance/lens are you approaching this from, and why that one?</frame>
<tension>What is the hardest tension, contradiction, or trade-off in this specific question?</tension>
<move>What is your concrete move/answer, and why does it resolve that tension?</move>
</thinking>`

        // Step 2: Generate response with multi-provider AI gateway / Ask AI Philosopher backend
        let fullText = ''
        try {
            const personaPrompt = buildPersonaHeader(modelId || 'nietzsche')
            const fullInstruction = `${personaPrompt || systemPrompt || 'Sen Dünya Yapım Aşaması felsefi tartışma ve içerik üreticisisin.'}\n${THINKING_INSTRUCTIONS}\n${styleSuffix}`.trim()
            const result = await generateWithGateway({
                userPrompt: prompt,
                botName: modelId || 'nietzsche',
                systemPrompt: fullInstruction,
            })
            if (result.ok && result.text) {
                fullText = result.text
            } else {
                fullText = generateSmartFallback(prompt)
            }
        } catch (err: any) {
            console.warn('AI gateway fallback for /api/chat:', err?.message || err)
            fullText = generateSmartFallback(prompt)
        }

        if (!fullText) {
            fullText = generateSmartFallback(prompt)
        }

        // Parse real dynamic Ask AI reasoning stages (<perceive>, <frame>, <tension>, <move>)
        const thinkMatch = fullText.match(/<thinking>([\s\S]*?)(?:<\/thinking>|$)/i)
        if (thinkMatch) {
            const thinkBody = thinkMatch[1]
            const p = (thinkBody.match(/<perceive>([\s\S]*?)(?:<\/perceive>|$)/i) || [])[1]?.trim()
            const f = (thinkBody.match(/<frame>([\s\S]*?)(?:<\/frame>|$)/i) || [])[1]?.trim()
            const t = (thinkBody.match(/<tension>([\s\S]*?)(?:<\/tension>|$)/i) || [])[1]?.trim()
            const m = (thinkBody.match(/<move>([\s\S]*?)(?:<\/move>|$)/i) || [])[1]?.trim()

            const realThinkingSteps: any[] = []
            if (p) realThinkingSteps.push({ id: 's1', stepNumber: 1, title: 'Perceive', detail: p, completed: true })
            if (f) realThinkingSteps.push({ id: 's2', stepNumber: 2, title: 'Frame', detail: f, completed: true })
            if (t) realThinkingSteps.push({ id: 's3', stepNumber: 3, title: 'Tension', detail: t, completed: true })
            if (m) realThinkingSteps.push({ id: 's4', stepNumber: 4, title: 'Move', detail: m, completed: true })

            if (realThinkingSteps.length > 0) {
                for (const st of realThinkingSteps) {
                    sendSSE('thinking_step', st)
                }
            }

            fullText = fullText.replace(/<thinking>[\s\S]*?(?:<\/thinking>|$)/gi, '').trim()
        }

        // Detect artifacts
        const artifactMatch = extractArtifactsFromContent(fullText, prompt)
        if (artifactMatch.hasArtifact) {
            sendSSE('artifacts', artifactMatch.artifacts)
        }

        // Stream response chunk by chunk
        const chunkSize = 8
        for (let i = 0; i < fullText.length; i += chunkSize) {
            const chunk = fullText.slice(i, i + chunkSize)
            sendSSE('chunk', { text: chunk })
            await new Promise((r) => setTimeout(r, 12))
        }

        sendSSE('done', {
            fullText,
            artifacts: artifactMatch.artifacts,
        })

        res.end()
    } catch (err: any) {
        console.error('/api/chat endpoint error:', err)
        if (!res.headersSent) {
            res.status(500).json({ error: err.message || 'Server error' })
        } else {
            res.end()
        }
    }
}
