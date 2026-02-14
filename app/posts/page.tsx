"use client";

import React from "react";
import PostsView from "components/Posts";

export default function PostsPage() {
  return (
    <main className="min-h-screen bg-light dark:bg-dark">
      <div className="h-screen w-screen overflow-hidden">
        <PostsView />
      </div>
    </main>
  );
}
