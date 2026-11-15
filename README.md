This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Supabase

The project uses the Supabase JavaScript SDK with separate browser and server clients. Copy `.env.example` to `.env.local` and fill in the project URL and a **publishable** key from the Supabase dashboard. Never put a secret/service-role key in `NEXT_PUBLIC_*` variables.

The current demo UI remains usable without environment values. The schema, local demo seed, typed query helpers, and booking writes are ready for a connected project; booking queries require a real authenticated user and are protected by RLS.

For local database development, install Docker Desktop (or another Docker-compatible runtime), then run:

```bash
npx supabase start
npx supabase db reset
```

To deploy to an existing hosted project, authenticate and link that project's ref, inspect pending changes, then apply them:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --dry-run --remote
npx supabase db push --remote
```

The hosted push applies schema migrations only. Demo rows are seeded into the local database by `db reset`; do not push seed rows to production.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
