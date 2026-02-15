"use client"
import Wrapper from "components/Wrapper";

export const runtime = 'edge';

export default function PostPage() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-light dark:bg-dark">
      <Wrapper />
    </main>
  );
}
