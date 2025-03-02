# AI Calendar Assistant

An AI-powered calendar and task management assistant that transforms user inputs into structured, actionable tasks through intelligent scheduling and natural language processing.

## Features

- React TypeScript frontend
- Next.js 14 App Router
- OpenAI function calling
- Google Calendar API integration
- Dark mode responsive design
- Timezone-aware event scheduling
- Drag and drop task management
- Zero-duration task filtering
- Adaptive UI with calendar/list view toggle

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in the environment variables
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

- `NEXT_PUBLIC_APP_URL`: Your application URL
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `OPENAI_API_KEY`: OpenAI API key
- `NEXTAUTH_URL`: Auth.js URL (same as app URL)
- `NEXTAUTH_SECRET`: Random string for session encryption

## Deployment

The easiest way to deploy your Next.js app is to use [Vercel](https://vercel.com/new).

1. Push your code to a Git repository
2. Import the project to Vercel
3. Add the required environment variables
4. Deploy!

## License

MIT