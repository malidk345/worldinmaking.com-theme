import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Transmissions",
    description:
        "Join the conversation on product, engineering, and making. Ask questions, share insights, and connect with the community.",
    alternates: {
        canonical: "/questions/",
    },
    openGraph: {
        type: "website",
        title: "Transmissions | World in Making",
        description:
            "Join the conversation on product, engineering, and making. Ask questions, share insights, and connect with the community.",
    },
};

export { default } from "./page-client";
