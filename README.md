This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Environment Variables

#### Local Development

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` with your local configuration:

```env
# API Base URL
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000

# Domain URL (for subdomain detection)
# Used to extract hospital_id from subdomain (e.g., demo-hospital.cura.com)
# If DOMAIN_URL=cura.com and login URL is demo-hospital.cura.com, hospital_id will be "demo-hospital"
# If not set, the app will attempt to auto-detect subdomain from hostname
# Examples:
# NEXT_PUBLIC_DOMAIN_URL=cura.com
NEXT_PUBLIC_DOMAIN_URL=
```

#### Production Build (GitHub Pages)

For GitHub Pages deployment, environment variables are set via GitHub Actions workflow and GitHub Secrets:

1. **Set GitHub Secrets** (Repository Settings → Secrets and variables → Actions):
   - `NEXT_PUBLIC_API_BASE_URL`: Your production API URL (e.g., `https://api.yourdomain.com`)
   - `NEXT_PUBLIC_DOMAIN_URL`: (Optional) Your base domain for subdomain detection

2. **Base Path**: Automatically set to `/hospital-ui` for GitHub Pages deployment

**Note:** `NEXT_PUBLIC_DOMAIN_URL` is optional. If not set, the application will attempt to extract subdomains automatically. For production with subdomain-based routing, set this to your base domain (e.g., `cura.com`). When set, the subdomain will be extracted from URLs like `demo-hospital.cura.com` → `demo-hospital`.

For local production builds, copy `.env.production.example` to `.env.production` and configure accordingly.

### Running the Development Server

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
