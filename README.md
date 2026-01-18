# WorldInMaking.com Theme

A modern, PostHog-inspired blog platform built with Next.js 16, React 19, and Supabase.

## 🚀 Features

- **Window-based UI**: Browser-like window management system
- **Real-time Data**: Supabase integration for posts, comments, and community
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Dark Mode**: Full dark mode support
- **Authentication**: Magic link authentication via Supabase
- **Community**: Discussion forums with channels and replies
- **Voting System**: Multi-vote support for posts

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.3 | React framework |
| React | 19.2.3 | UI library |
| Tailwind CSS | 4 | Styling |
| Supabase | 2.89.0 | Backend/Database |
| Framer Motion | 12.24.7 | Animations |
| SWR | 2.3.8 | Data fetching |

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/malidk345/worldinmaking.com-theme.git

# Navigate to project directory
cd worldinmaking.com-theme

# Install dependencies
npm install
```

## ⚙️ Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🏃 Running the Project

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📁 Project Structure

```
app/
├── components/       # React components
│   ├── Window.jsx   # Base window component
│   ├── WindowManager.jsx
│   ├── DashboardHeader.jsx
│   └── ...
├── contexts/        # React Context providers
│   ├── AuthContext.jsx
│   ├── WindowContext.jsx
│   ├── TabContext.jsx
│   └── ...
├── hooks/           # Custom React hooks
│   ├── usePosts.js
│   ├── useCommunity.js
│   └── ...
├── lib/             # Utilities and config
│   ├── supabase.js
│   ├── constants.js
│   └── markdown.js
├── utils/           # Helper utilities
│   ├── logger.js
│   ├── security.js
│   └── iconUtils.js
├── __tests__/       # Jest tests
└── [pages]/         # Next.js pages
```

## 🧪 Testing

The project uses Jest and React Testing Library for testing.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Files Location

- `app/__tests__/` - Unit and integration tests
- `jest.config.mjs` - Jest configuration
- `jest.setup.js` - Test setup and mocks

## 🔒 Security

The project includes security utilities in `app/utils/security.js`:

- **Input Sanitization**: XSS protection
- **Email Validation**: RFC-compliant validation
- **URL Validation**: Protocol checking
- **Rate Limiting**: Client-side request limiting
- **File Validation**: Upload size and type checking

## 📝 API / Database

### Supabase Tables

| Table | Purpose |
|-------|---------|
| `posts` | Blog posts |
| `comments` | Post comments |
| `profiles` | User profiles |
| `community_posts` | Community discussions |
| `community_replies` | Discussion replies |
| `community_channels` | Discussion channels |
| `community_likes` | Post likes |
| `post_votes` | Post voting |

## 🎨 Styling

- Uses Tailwind CSS 4 with custom PostHog-inspired design tokens
- CSS variables defined in `app/globals.css`
- Dark mode via `.dark` class

## 🚢 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables
3. Deploy

### Manual

```bash
npm run build
npm start
```

## 📄 License

All rights reserved.

## 👤 Author

WorldInMaking.com
