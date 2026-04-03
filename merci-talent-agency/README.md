# Merci Talent Agency - Deployment Guide

This project is a full-stack application built with React (Vite), Supabase, and Cloudflare R2
It is designed to be deployed to **Cloudflare Pages**.

## 1. Prerequisites

- A [Supabase](https://supabase.com/) project.
- A [Cloudflare](https://www.cloudflare.com/) account with an R2 bucket.
- A GitHub repository.

## 2. Local Setup

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your credentials:
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project.
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` from your Cloudflare R2 bucket.
   - `VITE_R2_PUBLIC_URL` (the public URL of your R2 bucket).

## 3. Database Setup (Supabase)

Run the following SQL in your Supabase SQL Editor to create the necessary tables:

```sql
-- Site Settings Table
CREATE TABLE site_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  hero_image TEXT,
  about_image TEXT,
  artists_image TEXT,
  event_partners_image TEXT,
  models_image TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  instagram_url TEXT,
  x_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Models Table
CREATE TABLE models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  japaneseName TEXT,
  category TEXT NOT NULL,
  height TEXT,
  bust TEXT,
  waist TEXT,
  hips TEXT,
  shoes TEXT,
  hair TEXT,
  eyes TEXT,
  images TEXT[] DEFAULT '{}',
  mainImage TEXT,
  isGrayscale BOOLEAN DEFAULT FALSE,
  slug TEXT UNIQUE NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  instagram TEXT,
  x_url TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  profilePdf TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- News Table
CREATE TABLE news (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT,
  date DATE,
  image TEXT,
  isGrayscale BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Works Table
CREATE TABLE works (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  date DATE,
  image TEXT,
  category TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 4. Deployment to Cloudflare Pages

1. Push your code to a GitHub repository.
2. Go to the [Cloudflare Pages dashboard](https://dash.cloudflare.com/?to=/:account/pages).
3. Create a new project and connect your GitHub repository.
4. **Build settings**:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
5. **Environment variables**:
   Add all variables from your `.env` file to the Cloudflare Pages project settings (Settings > Functions > Environment variables).
6. **R2 Bucket Binding**:
   - Go to **Settings > Functions > R2 bucket bindings**.
   - Add a binding with the variable name `MY_BUCKET` and select your R2 bucket.
7. **Deploy!**

## 5. Admin Access

The admin dashboard is located at `/admin/login`.
You can manage users and roles directly in the Supabase dashboard (Authentication).
