import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Posts",
    description:
        "Read articles on product, engineering, and community — stories, tools, and insights from World in Making.",
    alternates: {
        canonical: "/posts/",
    },
    openGraph: {
        type: "website",
        title: "Posts | World in Making",
        description:
            "Read articles on product, engineering, and community — stories, tools, and insights from World in Making.",
    },
};

export { default } from "./page-client";
