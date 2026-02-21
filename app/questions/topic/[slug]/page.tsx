import type { Metadata } from "next";

export const runtime = 'edge';

type Props = {
    params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;

    const title = `Topic: ${slug}`;
    const description = `Browse discussions in the ${slug} topic on World in Making.`;

    return {
        title,
        description,
        alternates: {
            canonical: `/questions/topic/${slug}/`,
        },
        openGraph: {
            type: "website",
            title: `${title} | World in Making`,
            description,
        },
    };
}

export { default } from "./page-client";
