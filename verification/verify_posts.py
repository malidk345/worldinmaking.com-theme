from playwright.sync_api import sync_playwright, expect

def test_posts_and_search(page):
    # 1. Verify Dashboard loads (default usePosts)
    print("Navigating to home...")
    page.goto("http://localhost:3000")

    # Wait for loading to finish (Skeleton should disappear)
    # or just wait for either content or empty state
    print("Waiting for dashboard...")

    # Check for empty state OR posts
    # Empty state: "No posts found"
    # Posts: .InsightCard

    try:
        expect(page.locator(".InsightCard").first).to_be_visible(timeout=5000)
        print("Posts found.")
    except:
        print("No posts found (likely mock mode). Checking for empty state text...")
        expect(page.get_by_text("No posts found")).to_be_visible()
        print("Empty state verified.")

    # Take screenshot of dashboard
    page.screenshot(path="verification/dashboard.png")
    print("Dashboard verified.")

    # 2. Verify Search (usePosts with content)
    print("Navigating to search...")
    try:
        page.goto("http://localhost:3000/search")
        expect(page.get_by_placeholder("Search for anything...")).to_be_visible()

        # Type something
        page.get_by_placeholder("Search for anything...").fill("post")

        # Wait for results or empty state
        # Empty state: "no results found"
        # Results: "DocIcon" or link

        # Since we have no posts, we expect "no results found"
        try:
             expect(page.get_by_text("no results found")).to_be_visible(timeout=5000)
             print("Search empty state verified.")
        except:
             # If we had posts, we would see results
             expect(page.locator("a[href*='/post?id=']").first).to_be_visible()
             print("Search results verified.")

        page.screenshot(path="verification/search_results.png")
        print("Search verified.")

    except Exception as e:
        print(f"Search verification failed: {e}")
        page.screenshot(path="verification/search_failed.png")
        raise e

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_posts_and_search(page)
        finally:
            browser.close()
