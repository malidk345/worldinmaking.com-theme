# World in Making

This is a Gatsby project inspired by PostHog's website structure with Firebase authentication and database integration.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd worldinmaking-new
   npm install
   ```

2. **Set up Firebase:**

   a. Go to [Firebase Console](https://console.firebase.google.com/)
   b. Create a new project or select an existing one
   c. Enable Authentication and Firestore Database
   d. Go to Project Settings > General > Your apps
   e. Click "Add app" and select Web app
   f. Copy the config values

3. **Configure environment variables:**

   Copy `.env.example` to `.env` and fill in your Firebase config:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your Firebase project values:
   ```
   GATSBY_FIREBASE_API_KEY=your_api_key_here
   GATSBY_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   GATSBY_FIREBASE_PROJECT_ID=your_project_id
   GATSBY_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   GATSBY_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   GATSBY_FIREBASE_APP_ID=your_app_id
   ```

4. **Set up Firestore Security Rules:**

   In Firebase Console > Firestore Database > Rules, set:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Allow authenticated users to read/write their own data
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       // Allow authenticated users to read/write posts
       match /posts/{postId} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

5. **Start the development server:**
   ```bash
   npm run develop
   ```
   The site will be running at `http://localhost:8001`.

## Features

- **Authentication:** Firebase Auth integration with email/password
- **Dynamic Posts:** Posts stored in Firestore + static JSON fallback
- **Create Posts:** Authenticated users can create new posts
- **Window Management:** PostHog-style window interface
- **Search:** Full-text search across posts
- **Responsive Design:** Mobile-friendly interface

## Project Structure

- `src/pages`: Page components (index, login, about, etc.)
- `src/components`: Reusable components (Layout, PostHogWindow, etc.)
- `src/context`: React contexts (AuthContext, ReadingContext)
- `src/data`: Static data and Firebase utilities
- `src/firebase`: Firebase configuration
- `src/styles`: Global styles and Tailwind CSS configuration

## Available Scripts

- `npm run develop`: Start development server
- `npm run build`: Build for production
- `npm run serve`: Serve production build
- `npm run clean`: Clean Gatsby cache
