import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Craft Editor | World in Making",
    description: "Write, organize, and publish rich-text posts.",
};

export default function WritePostLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
