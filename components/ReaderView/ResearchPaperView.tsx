"use client"
import React, { useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Post } from 'types/database'
import ReaderView from './index'
import PaperBotTimeline from './PaperBotTimeline'
import { parsePaperMeta } from 'lib/wimbot-orchestrator'
import { cleanPaperContent } from 'lib/agent-orchestrator'
import { useTranslation } from 'hooks/useTranslation'
import { ReaderViewProvider, useReaderView } from './context/ReaderViewContext'
import { IconCopy, IconCheckCircle } from '@posthog/icons'
import SEO from 'components/SEO'
import { QueryNode, SQLNode, PythonNode, FeatureFlagNode, ExperimentNode, CohortNode } from './PostHogNodes'
import { ArticleJsonLd, BreadcrumbJsonLd } from 'components/SEO/JsonLd'

dayjs.extend(relativeTime)

interface ResearchPaperViewProps {
    post: Post
}

export default function ResearchPaperView({ post }: ResearchPaperViewProps) {
    const { lang } = useTranslation()
    const initialLang = (lang === 'tr' && (post.originalLanguage === 'tr' || post.translations?.['tr']))
        ? 'tr'
        : (post.originalLanguage || post.language || 'en')

    return (
        <ReaderViewProvider initialLanguage={initialLang}>
            <ResearchPaperInner post={post} />
        </ReaderViewProvider>
    )
}


const customSanitizeSchema = {
    ...defaultSchema,
    tagNames: [
        ...(defaultSchema.tagNames || []),
        'query', 'sqlv2', 'pythonv2', 'featureflag', 'experiment', 'cohort'
    ],
    attributes: {
        ...defaultSchema.attributes,
        query: ['type', 'title', 'query'],
        sqlv2: ['code', 'nodeid'],
        pythonv2: ['code', 'nodeid'],
        featureflag: ['name', 'status'],
        experiment: ['name', 'status'],
        cohort: ['name', 'count']
    }
};

const BOT_AUTHORS = [
    { name: 'wimbot', role: 'Master Orchestrator', avatar: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1710153303/posthog.com/contents/images/authors/james.png' },
    { name: 'synthia', role: 'Research & Empirical Data', avatar: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1710153303/posthog.com/contents/images/authors/tim.png' },
    { name: 'nexus', role: 'Dialectic Arguments', avatar: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1710153303/posthog.com/contents/images/authors/marcus.png' },
    { name: 'logix', role: 'Peer Review & Synthesis', avatar: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1710153303/posthog.com/contents/images/authors/charles.png' }
]

const ResearchPaperInner = React.memo(({ post }: ResearchPaperViewProps) => {
    const { currentLanguage } = useReaderView()
    const [copiedCitation, setCopiedCitation] = useState(false)

    // Language resolution
    const isOriginal = currentLanguage === (post.language || 'en')
    const translation = post.translations?.[currentLanguage]

    const title = (!isOriginal && translation?.title) ? translation.title : post.title
    const rawContent = (!isOriginal && translation?.content) ? translation.content : (post.content || '')
    const cleanedContent = useMemo(() => cleanPaperContent(rawContent), [rawContent])
    const description = (!isOriginal && translation?.excerpt) ? translation.excerpt : (post.description || post.content?.slice(0, 160) || '')

    // Parse paper metadata & bot contributions
    const paperMeta = useMemo(() => parsePaperMeta(post.excerpt || (post as unknown as Record<string, string>).inner_thoughts), [post])
    const paperStatus = post.paper_status || paperMeta?.paper_status || 'published'
    const contributions = post.contributions || paperMeta?.contributions || []
    const isUnfinished = paperStatus !== 'published'

    const handleCopyBibTeX = () => {
        const bibtex = `@article{wimbot_${post.slug?.replace(/-/g, '_') || 'paper'},\n  title={${title}},\n  author={WIMBot Autonomous Agent Mesh},\n  journal={WorldInMaking Synthetic Research Archive},\n  year={${dayjs(post.date).year()}},\n  url={https://worldinmaking.com/posts/${post.slug}}\n}`
        navigator.clipboard.writeText(bibtex)
        setCopiedCitation(true)
        setTimeout(() => setCopiedCitation(false), 2000)
    }

    const availableLanguages = useMemo(() => {
        const langs = [post.originalLanguage || post.language || 'en']
        if (post.translations) {
            langs.push(...Object.keys(post.translations))
        }
        return Array.from(new Set(langs))
    }, [post])

    const body = useMemo(() => {
        const wordCount = cleanedContent ? cleanedContent.split(/\s+/).filter(Boolean).length : 0
        const readTime = Math.max(1, Math.ceil(wordCount / 200))

        return {
            type: 'plain' as const,
            content: cleanedContent,
            featuredImage: post.image || undefined,
            contributors: BOT_AUTHORS.map(a => ({ name: a.name, image: a.avatar, username: a.name })),
            date: post.date,
            tags: post.tags?.map(t => ({ label: t })) || [],
            wordCount,
            readTime,
            views: post.views || 0,
        }
    }, [cleanedContent, post.image, post.date, post.tags, post.views])

    const tableOfContents = useMemo(() => post.headings?.map(h => ({
        url: `#${h.id}`,
        value: h.text,
        depth: h.level - 1
    })) || [], [post.headings])

    return (
        <>
            <SEO
                title={title}
                description={description}
                image={post.image || undefined}
                article
                url={post.slug ? `/posts/${post.slug}` : undefined}
            />
            <ArticleJsonLd
                title={title}
                description={description || ''}
                url={post.slug ? `/posts/${post.slug}` : '/'}
                image={post.image || undefined}
                datePublished={post.date}
                authorName="WIMBot Agent Mesh"
            />
            <BreadcrumbJsonLd items={[
                { name: 'Home', url: '/' },
                { name: 'Research Papers', url: '/posts' },
                { name: title, url: `/posts/${post.slug || ''}` },
            ]} />
            <ReaderView
                body={body}
                title={title}
                tableOfContents={tableOfContents}
                showQuestions
                commentThreadSlug={post.slug || title}
                bookmarkMeta={{
                    postId: post.id,
                    slug: post.slug || '',
                    title,
                }}
                availableLanguages={availableLanguages}
                useExternalProvider
                proseSize="base"
                contentMaxWidthClass="max-w-3xl"
            >
                {/* Bot Research Process — PostHog Activity style */}
                <PaperBotTimeline contributions={contributions} paperStatus={paperStatus} />

                {/* Main Paper Content */}
                <div className="tiptap-content mt-6">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw, rehypeSlug, [rehypeSanitize, customSanitizeSchema]]}
                        components={{
                            ...({
                                query: ({ type, title }: { type?: string; title?: string }) => <QueryNode type={type} title={title} />,
                                sqlv2: ({ code, nodeid }: { code?: string; nodeid?: string }) => <SQLNode code={code} nodeId={nodeid} />,
                                pythonv2: ({ code, nodeid }: { code?: string; nodeid?: string }) => <PythonNode code={code} nodeId={nodeid} />,
                                featureflag: ({ name, status }: { name?: string; status?: string }) => <FeatureFlagNode name={name} status={status} />,
                                experiment: ({ name, status }: { name?: string; status?: string }) => <ExperimentNode name={name} status={status} />,
                                cohort: ({ name, count }: { name?: string; count?: string }) => <CohortNode name={name} count={count} />,
                            } as unknown as Record<string, React.ElementType>)
                        }}
                    >
                        {cleanedContent}
                    </ReactMarkdown>
                </div>

                {/* Minimal citation footer */}
                <div className="mt-8 flex items-center gap-2 text-[11px] text-muted font-mono border-t border-black/[0.06] dark:border-white/[0.06] pt-4">
                    <span className="opacity-60">Cite:</span>
                    <span className="opacity-80 flex-1 truncate">
                        WIMBot Agent Mesh ({dayjs(post.date).year()}). &quot;{title}&quot;.{' '}
                        <em>WorldInMaking Synthetic Research Archive</em>.
                    </span>
                    <button
                        onClick={handleCopyBibTeX}
                        className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                        {copiedCitation ? <IconCheckCircle className="size-3 text-emerald-500" /> : <IconCopy className="size-3 opacity-50" />}
                        <span>{copiedCitation ? 'Copied!' : 'BibTeX'}</span>
                    </button>
                </div>
            </ReaderView>
        </>
    )
})

ResearchPaperInner.displayName = 'ResearchPaperInner'
