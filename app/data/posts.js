export const posts = [
    {
        id: 'meet-logs-beta',
        title: 'Meet Logs (beta) – logs with all the tools you’re already using',
        category: 'Logs',
        date: '23 Dec 2025',
        authorName: 'Sara Miteva',
        description: 'PostHog Logs brings backend logs into the same place as error tracking, session replay, and product analytics, so debugging keeps its context instead of losing it.',
        ribbon: 'orange',
        authorAvatar: 'https://i.pravatar.cc/150?u=sara',
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop",
        content: `
## Why context gets messy

Every developer's debugging journey ends at the same destination. You can start with an error and get context with a session replay, but eventually, you'll need logs to see what's actually happening in your system. This progression is so familiar, we barely think of it anymore.

We built Logs (now in beta) for this debugging journey. Not as a new tool to adopt, but as the part of the investigation you were doing anyway. Now you can get the backend context behind your errors and session replays next to your favorite tools in PostHog, without having to leave the platform and open another tab.

## Debug faster with Logs next to Session Replays and Error Tracking

The power of PostHog Logs isn't just in the logs themselves, but in how they connect to everything else. 

- **Trace errors to logs**: Click an error in Error Tracking and see exactly what was happening in your backend at that moment.
- **Connect replays to backend events**: Watch a session replay and see the corresponding server-side logs in real-time.
- **Universal search**: Search across all your debugging data in one place.

## What's next for Logs and the debugging journey

We're just getting started with Logs. In the coming months, we'll be adding:

- **Log-based alerting**: Get notified when specific patterns appear in your logs.
- **Advanced filtering**: More powerful ways to slice and dice your log data.
- **Deep integrations**: Even tighter loops between logs, errors, and replays.

Join our community and let us know what you want to see next!
        `
    },
    {
        id: 'understanding-user-retention',
        title: 'Understanding User Retention',
        category: 'Retention',
        date: '20 Jan 2025',
        authorName: 'Wim Author',
        description: 'Retention is the lifeblood of any SaaS application. Explore key metrics driving user engagement and optimize your product to keep users coming back.',
        ribbon: 'blue',
        authorAvatar: 'https://i.pravatar.cc/150?u=wim',
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop",
        content: `
## Why Retention Matters

Retention is arguably the most important metric for any SaaS business. While acquisition gets users through the door, retention is what keeps them coming back and ultimately determines the long-term success of your product.
        `
    },
    {
        id: 'scaling-your-infrastructure',
        title: 'Scaling Your Infrastructure',
        category: 'Engineering',
        date: '18 Jan 2025',
        authorName: 'Jane Dev',
        description: 'As your user base grows, so do infrastructure demands. Learn to scale backend systems efficiently and manage database loads.',
        ribbon: 'green',
        authorAvatar: 'https://i.pravatar.cc/150?u=jane',
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop",
        content: `
## The Scaling Journey

When your startup begins to grow, infrastructure becomes a critical concern. What worked for 100 users won't work for 100,000.
        `
    }
];

export const getPostById = (id) => posts.find(post => post.id === id);
