This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Movie metadata

The admin movie form reads the video title and thumbnail from a YouTube link.
To automatically fetch IMDb ratings, add a server-side `OMDB_API_KEY` from
[OMDb API](https://www.omdbapi.com/apikey.aspx) to `.env.local` and configure
the same variable in your deployment environment. Keep this key private and
do not prefix it with `NEXT_PUBLIC_`.

## Passkey sign-in

Users can register a passkey after creating an account and sign in with it
later. If email confirmation is enabled in Supabase, they first confirm their
email and sign in with their password, then register the passkey. The device
prompts for its available verification method, such as Face ID, Windows Hello,
fingerprint, or device PIN. ColdStar does not access or store biometric data.
Passkeys require a supported browser and a secure origin (HTTPS in production;
localhost is allowed for development); email and password remain available as
a fallback.

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
