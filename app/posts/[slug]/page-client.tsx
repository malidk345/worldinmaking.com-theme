"use client"
import Wrapper from "components/Wrapper";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function PostPageClient({ initialPost }: { initialPost?: any }) {
    // Note: We'll eventually hydrate the window state with initialPost 
    // to ensure the Blog view opens immediately with pre-fetched data.
    console.log('initialPost', initialPost);
    return (
        <main className="h-screen w-screen overflow-hidden bg-light dark:bg-dark">
            <Wrapper />
        </main>
    );
}
