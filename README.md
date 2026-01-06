# WorkChief

<p align="center">
  <img src="src/assets/logo.png" alt="WorkChief Logo" width="120" height="120">
</p>

<h3 align="center">Your AI Chief Operating Officer</h3>

<p align="center">
  Transform daily team updates into actionable insights with AI-powered performance analysis.
</p>

<p align="center">
  <a href="https://workchief.ai">Website</a> •
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#documentation">Documentation</a>
</p>

---

## Overview

WorkChief is an AI-powered operations management platform that helps executives, HR managers, and team leaders track team performance, detect blockers, and make data-driven decisions.

## Features

- 👥 **Team Management** - Add and manage team members with customizable target metrics
- 📊 **Daily Metrics Tracking** - Automated check-ins with real-time status updates
- 🤖 **AI-Powered Analysis** - Smart performance scoring (🟢/🟡/🔴) with blocker detection
- 📈 **Executive Dashboards** - CEO-level overviews with actionable insights
- 📋 **Report Management** - Team member report submissions and processing
- 📉 **Analytics** - Performance trends and data visualization
- 🔐 **Role-Based Access** - CEO, HR, Executive Assistant, and Team Member roles
- 💳 **Subscription Management** - Stripe-powered billing and plans
- 📧 **Email Notifications** - Automated reminders and updates

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI primitives
- **Backend**: Lovable Cloud (PostgreSQL, Auth, Edge Functions)
- **AI**: OpenAI GPT for performance analysis
- **Payments**: Stripe
- **Deployment**: Vercel / Apache compatible

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/workchief.git
cd workchief
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

### Environment Variables

The following variables are automatically configured:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

## Project Structure

```
workchief/
├── docs/                      # Documentation
│   ├── USER_GUIDE.md          # End-user guide
│   └── TECHNICAL_DOCUMENTATION.md  # Developer docs
├── public/                    # Static assets
├── src/
│   ├── assets/                # Images, fonts
│   ├── components/            # React components
│   │   └── ui/                # shadcn/ui components
│   ├── contexts/              # React contexts
│   ├── hooks/                 # Custom hooks
│   ├── integrations/          # External integrations
│   ├── lib/                   # Utility functions
│   └── pages/                 # Page components
├── supabase/
│   └── functions/             # Edge functions
└── ...config files
```

## Documentation

- [User Guide](docs/USER_GUIDE.md) - Comprehensive guide for end users
- [Technical Documentation](docs/TECHNICAL_DOCUMENTATION.md) - Developer reference

## User Roles

| Role | Description |
|------|-------------|
| **CEO** | Full access to all features including permissions management |
| **HR** | Access to team management, check-ins, analytics |
| **Executive Assistant** | Same as HR - supports CEO operations |
| **Team Member** | Submit metrics and reports, view own data |

## Key Pages

| Page | Path | Access |
|------|------|--------|
| Landing | `/` | Public |
| Dashboard | `/dashboard` | CEO, HR, EA |
| Team Management | `/team` | CEO, HR, EA |
| Check-ins | `/check-ins` | CEO, HR, EA |
| Metrics | `/metrics` | All authenticated |
| Reports | `/reports` | All authenticated |
| Analysis | `/analysis` | CEO, HR, EA |
| Analytics | `/analytics` | CEO, HR, EA |
| Permissions | `/permissions` | CEO, HR, EA |
| Settings | `/settings` | All authenticated |

## Scripts

```bash
# Development
npm run dev          # Start dev server

# Build
npm run build        # Production build
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript check
```

## Deployment

### Vercel

1. Connect your GitHub repository to Vercel
2. Vercel will auto-detect the Vite configuration
3. Deploy automatically on push

### Manual (Apache/cPanel)

1. Run `npm run build`
2. Upload the `dist/` folder contents
3. Configure `.htaccess` for SPA routing

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

- 📧 Email: support@workchief.ai
- 🌐 Website: [workchief.ai](https://workchief.ai)

---
