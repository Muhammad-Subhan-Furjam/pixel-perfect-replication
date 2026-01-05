# WorkChief Technical Documentation

This document provides technical details for developers working with or extending the WorkChief platform.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [Authentication & Authorization](#authentication--authorization)
6. [API Reference](#api-reference)
7. [Edge Functions](#edge-functions)
8. [Real-time Features](#real-time-features)
9. [Environment Variables](#environment-variables)
10. [Deployment](#deployment)
11. [SEO Implementation](#seo-implementation)
12. [Contributing](#contributing)

---

## Architecture Overview

WorkChief follows a modern JAMstack architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│                    (React + TypeScript)                     │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Lovable Cloud                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │   Database  │ │    Auth     │ │   Edge Functions    │   │
│  │ (PostgreSQL)│ │  (Supabase) │ │       (Deno)        │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │   OpenAI    │ │   Stripe    │ │    Email (SMTP)     │   │
│  │     API     │ │  Payments   │ │      Service        │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui | latest | Component library |
| React Router | 6.x | Routing |
| TanStack Query | 5.x | Data fetching |
| React Hook Form | 7.x | Form handling |
| Zod | 3.x | Schema validation |

### Backend (Lovable Cloud)

| Technology | Purpose |
|------------|---------|
| PostgreSQL | Database |
| Supabase Auth | Authentication |
| Edge Functions (Deno) | Serverless functions |
| Supabase Realtime | WebSocket connections |

### External Integrations

| Service | Purpose |
|---------|---------|
| OpenAI GPT | AI performance analysis |
| Stripe | Payment processing |
| SMTP | Email notifications |

---

## Project Structure

```
workchief/
├── docs/                      # Documentation
│   ├── USER_GUIDE.md
│   └── TECHNICAL_DOCUMENTATION.md
├── public/                    # Static assets
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── og-image.png
│   └── favicon.ico
├── src/
│   ├── assets/                # Images, fonts
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── SEO.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── RoleProtectedRoute.tsx
│   │   └── ...
│   ├── contexts/
│   │   └── AuthContext.tsx    # Authentication state
│   ├── hooks/
│   │   ├── useUserRole.ts
│   │   ├── useSubscription.ts
│   │   ├── useRealtimeNotifications.ts
│   │   └── useRoleRedirect.ts
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts      # Supabase client (auto-generated)
│   │       └── types.ts       # Database types (auto-generated)
│   ├── lib/
│   │   └── utils.ts           # Utility functions
│   ├── pages/
│   │   ├── Index.tsx          # Landing page
│   │   ├── Auth.tsx           # Authentication
│   │   ├── Dashboard.tsx      # CEO dashboard
│   │   ├── Team.tsx           # Team management
│   │   ├── CheckIns.tsx       # Process check-ins
│   │   ├── Metrics.tsx        # Metrics tracking
│   │   ├── Reports.tsx        # Report submission
│   │   ├── Analysis.tsx       # AI analysis results
│   │   ├── Analytics.tsx      # Data visualization
│   │   ├── Permissions.tsx    # Role management
│   │   ├── Settings.tsx       # User settings
│   │   ├── Subscription.tsx   # Billing
│   │   └── ...
│   ├── App.tsx                # Main app component
│   ├── main.tsx               # Entry point
│   └── index.css              # Global styles
├── supabase/
│   ├── config.toml            # Supabase configuration
│   └── functions/             # Edge functions
│       ├── analyze-performance/
│       ├── create-checkout/
│       ├── customer-portal/
│       ├── send-notification-email/
│       └── ...
├── index.html                 # HTML template
├── tailwind.config.ts         # Tailwind configuration
├── vite.config.ts             # Vite configuration
└── vercel.json                # Vercel deployment config
```

---

## Database Schema

### Tables

#### `profiles`
Stores additional user information beyond auth.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `user_roles`
Maps users to application roles.

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL, -- 'ceo' | 'team_member' | 'executive_assistant' | 'hr'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `team_members`
Team member profiles created by managers.

```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,           -- Owner (CEO)
  auth_user_id UUID,               -- Linked auth account
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL,              -- Job title
  department TEXT,
  department_type TEXT,
  target_metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `check_ins`
Daily check-in submissions.

```sql
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  team_member_id UUID NOT NULL REFERENCES team_members(id),
  date DATE DEFAULT CURRENT_DATE,
  metrics JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `analyses`
AI-generated performance analyses.

```sql
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  check_in_id UUID NOT NULL REFERENCES check_ins(id),
  score TEXT NOT NULL,            -- 'green' | 'yellow' | 'red'
  message TEXT NOT NULL,
  reason TEXT NOT NULL,
  blocker TEXT NOT NULL,
  next_step TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `daily_metrics`
Team member submitted daily metrics.

```sql
CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  team_member_id UUID NOT NULL REFERENCES team_members(id),
  date DATE DEFAULT CURRENT_DATE,
  metrics JSONB DEFAULT '{}',
  notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `team_member_reports`
Text reports submitted by team members.

```sql
CREATE TABLE team_member_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES team_members(id),
  recipient_team_member_id UUID REFERENCES team_members(id),
  report_text TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  is_read BOOLEAN DEFAULT false,
  is_from_ceo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Enums

```sql
CREATE TYPE app_role AS ENUM ('ceo', 'team_member', 'executive_assistant', 'hr');
```

### Row Level Security (RLS)

All tables have RLS enabled with policies ensuring:
- Users can only access their own data
- CEO/HR/EA can access team-wide data
- Proper isolation between organizations

---

## Authentication & Authorization

### Authentication Flow

```
User → Auth Page → Supabase Auth → JWT Token → Protected Routes
```

### Auth Methods Supported

1. **Email/Password** - Standard signup with email confirmation
2. **Google OAuth** - Sign in with Google account

### Authorization Layers

1. **ProtectedRoute** - Requires authenticated user
2. **RoleProtectedRoute** - Requires specific role(s)

```tsx
// Example usage
<Route 
  path="/team" 
  element={
    <RoleProtectedRoute 
      allowedRoles={["ceo", "hr", "executive_assistant"]}
      requireTeamManagement
    >
      <Team />
    </RoleProtectedRoute>
  } 
/>
```

### Role Checking

```typescript
// Using useUserRole hook
const { role, loading } = useUserRole();

// Database function for RLS
CREATE FUNCTION has_role(_role app_role, _user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role = _role
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## API Reference

### Supabase Client Usage

```typescript
import { supabase } from "@/integrations/supabase/client";

// Query example
const { data, error } = await supabase
  .from('team_members')
  .select('*')
  .eq('user_id', userId);

// Insert example
const { data, error } = await supabase
  .from('check_ins')
  .insert({ team_member_id, metrics, notes, user_id });
```

---

## Edge Functions

### analyze-performance

Analyzes team member performance using OpenAI.

**Endpoint:** `POST /functions/v1/analyze-performance`

**Request:**
```json
{
  "checkInId": "uuid",
  "teamMemberName": "string",
  "role": "string",
  "metrics": {},
  "notes": "string",
  "language": "en"
}
```

**Response:**
```json
{
  "id": "uuid",
  "score": "green",
  "message": "Performance summary",
  "reason": "Explanation",
  "blocker": "Identified blockers",
  "next_step": "Recommended actions"
}
```

### create-checkout

Creates Stripe checkout session for subscription.

### customer-portal

Returns Stripe customer portal URL for billing management.

### send-notification-email

Sends email notifications for various events.

---

## Real-time Features

### Enabling Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.check_ins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_metrics;
```

### Subscribing to Changes

```typescript
const channel = supabase
  .channel('check-ins-changes')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'check_ins' },
    (payload) => {
      // Handle real-time update
    }
  )
  .subscribe();
```

---

## Environment Variables

### Required Variables (Auto-configured)

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=xxx
```

### Edge Function Secrets

| Secret | Purpose |
|--------|---------|
| `OPENAI_API_KEY` | AI analysis |
| `STRIPE_SECRET_KEY` | Payment processing |
| `SMTP_*` | Email sending |

---

## Deployment

### Vercel Deployment

The project includes `vercel.json` for automatic SPA routing:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

### Apache/cPanel Deployment

Use the `.htaccess` file for SPA routing and HTTPS enforcement.

### Build Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

---

## SEO Implementation

### Components

- **SEO.tsx** - Dynamic meta tag management using react-helmet-async
- **Structured Data** - JSON-LD schemas for Organization and SoftwareApplication

### Technical Files

- `public/robots.txt` - Crawler instructions
- `public/sitemap.xml` - Site structure for search engines
- `public/og-image.png` - Open Graph preview image

### Per-Page Meta Tags

Each page uses the SEO component with unique:
- Title tags
- Meta descriptions
- Canonical URLs
- noindex for protected pages

---

## Contributing

### Code Style

- Use TypeScript for all new code
- Follow existing component patterns
- Use shadcn/ui components where applicable
- Implement proper error handling
- Add loading states for async operations

### Pull Request Process

1. Create a feature branch
2. Implement changes
3. Test thoroughly
4. Submit PR with description

---

*Last updated: January 2025*
