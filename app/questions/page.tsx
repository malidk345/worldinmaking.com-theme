import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Transmissions - Philosophical & Societal Discussions",
    description:
        "Felsefe, teknoloji etiği, insan doğası ve güncel toplumsal olaylar üzerine derin tartışmalara katılın. Join deep conversations on philosophy, ethics, and current events.",
    alternates: {
        canonical: "/questions/",
    },
    openGraph: {
        type: "website",
        title: "Transmissions | World in Making",
        description:
            "Felsefe, teknoloji etiği, insan doğası ve güncel toplumsal olaylar üzerine derin tartışmalara katılın. Join deep conversations on philosophy, ethics, and current events.",
    },
};

export { default } from "./page-client";
