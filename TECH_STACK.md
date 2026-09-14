# 🛠️ Moveup - Technical Stack Specification

This document provides a detailed breakdown of the technologies, libraries, frameworks, and architecture powering the **Moveup** project.

---

## ⚡ Core Framework & Runtime

* **[Next.js 16 (App Router)](https://nextjs.org/)**: React framework utilizing Turbopack, Server Components, and API Routes for fast SSR and static generation.
* **[React 19](https://react.dev/)**: Core UI library for component state management and declarative rendering.
* **[TypeScript 5](https://www.typescriptlang.org/)**: End-to-end type safety across database queries, components, and API routes.

---

## 🗄️ Backend, Database & Authentication

* **[Supabase](https://supabase.com/)**:
  * **PostgreSQL Database**: Relational database storing user profiles, activity logs, quests, squads, badges, and campus locations.
  * **Supabase SSR (`@supabase/ssr`)**: Cookie-based server-side session authentication & Row Level Security (RLS) policies.
  * **Database Migrations**: Declarative SQL migrations managed under `supabase/migrations`.

---

## 🤖 Artificial Intelligence & Machine Learning

* **[Google Gemini AI (`@google/genai`)](https://ai.google.dev/)**:
  * **AI Coach Buddy (`/api/ai-coach`)**: Provides real-time fitness advice, form guidance, and YouTube video recommendations.
  * **Smart Quest Engine (`lib/quest-engine.ts`)**: Generates personalized fitness quests tailored to user schedules and weather conditions.

---

## 🎨 UI, Styling & Design System

* **[Tailwind CSS v4 (`@tailwindcss/postcss`)](https://tailwindcss.com/)**: Modern utility-first CSS engine configured with custom OKLCH color palettes, glassmorphism, dynamic dark/light themes, and custom animations.
* **[Radix UI Primitives](https://www.radix-ui.com/)**: Unstyled, accessible component primitives (`Avatar`, `Dialog`, `Label`, `Progress`, `Select`, `Separator`, `Switch`, `Tabs`).
* **[Lucide React (`lucide-react`)](https://lucide.react.dev/)**: Clean icon set for fitness metrics, navigation, and badges.
* **[Class Variance Authority (`cva`)](https://cva.style/docs)** + `clsx` + `tailwind-merge`: Dynamic, type-safe UI component variants.

---

## 🗺️ Mapping, Weather & Data Visualization

* **[MapLibre GL (`maplibre-gl`)](https://maplibre.org/)**: Open-source vector map rendering for interactive campus walking routes and safe pathway navigation.
* **[Recharts (`recharts`)](https://recharts.org/)**: Composable charting library for rendering weekly step counts, active minutes, and fitness trends on the dashboard.
* **Weather & AQI Integration (`lib/weather.ts`)**: Algorithmic outdoor green window calculator analyzing air quality and weather.

---

## 📂 Project Architecture Map

```text
SIH26196/
├── app/                      # Next.js App Router (Pages & API Routes)
│   ├── (app)/                # Main Application Routes (Dashboard, Quests, FitRoute, Squads)
│   ├── api/                  # Backend API Endpoints (ai-coach, weather, nearby-places)
│   ├── auth/                 # Auth Callbacks & Handlers
│   ├── login/ & signup/      # Authentication Views
│   └── onboarding/           # Student Onboarding Flow
├── components/               # UI Components
│   ├── ai-coach/             # AI Coach Assistant UI
│   ├── dashboard/            # Metrics, Progress Rings, Quick Actions
│   ├── fitroute/             # MapLibre Route Components
│   ├── layout/               # TopBar, BottomNav, Brand Marks
│   └── ui/                   # Shared Reusable Elements (Button, Card, Badge, etc.)
├── lib/                      # Core Business Logic & Helper Services
│   ├── supabase/             # Supabase Client & Server Instances
│   ├── quest-engine.ts       # AI Quest Recommendation Engine
│   └── weather.ts            # Weather & Green Window Calculator
└── supabase/                 # Database Schemas & Migrations
```
