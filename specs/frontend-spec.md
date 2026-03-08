# Repwise — Frontend Spec
> Optimized for execution in Cursor. Follow phases in order. Do not build everything at once — each phase is self-contained and testable before proceeding.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS v3 |
| Routing | React Router v6 |
| State Management | Zustand |
| Server State / Caching | TanStack Query (React Query) v5 |
| Auth | AWS Amplify (Cognito) |
| HTTP Client | Axios |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons | Lucide React |
| Animation | Framer Motion |
| Package Manager | pnpm |

---

## Monorepo Position

The frontend lives at `packages/web/` within the same monorepo as the backend.

```
/
├── packages/
│   ├── cdk/
│   ├── lambdas/
│   │   └── shared/              # ← Shared TypeScript models (source of truth)
│   └── web/                     # ← This spec
│       ├── src/
│       │   ├── api/             # API client layer
│       │   ├── components/      # Shared/reusable components
│       │   ├── features/        # Feature-scoped components and hooks
│       │   ├── hooks/           # Global custom hooks
│       │   ├── pages/           # Route-level page components
│       │   ├── stores/          # Zustand global stores
│       │   ├── types/           # Frontend-only types (re-exports shared models)
│       │   └── utils/           # Pure utility functions
│       ├── package.json
│       └── vite.config.ts
```

---

## Shared Types Strategy

**The backend `packages/lambdas/shared/src/` is the single source of truth for all data models and enums.**

The frontend never duplicates model definitions. Instead, `packages/web/src/types/index.ts` re-exports everything from the shared package:

```typescript
// packages/web/src/types/index.ts
// Re-export all shared models and enums directly.
// Never define data models here — define them in packages/lambdas/shared/src/models.ts

export * from '../../../lambdas/shared/src/models';
export * from '../../../lambdas/shared/src/enums';
export * from '../../../lambdas/shared/src/goalUtils';
```

**`packages/web/package.json`** must include a workspace dependency:
```json
{
  "dependencies": {
    "@repwise/shared": "workspace:../lambdas/shared"
  }
}
```

Frontend-only types (UI state, form shapes, component props that don't map to API models) live in `packages/web/src/types/ui.ts`:

```typescript
// packages/web/src/types/ui.ts
// UI-only types that have no backend equivalent

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface WorkoutDraft {
  exercises: WorkoutExercise[];
  source: WorkoutSource;
  permissionType: PermissionType;
  aiPrompt?: string;
}

export interface ExerciseFilterState {
  muscleGroup?: string;
  equipment?: string;
  modality?: ExerciseModality;
  search?: string;
}

export type PeriodFilter = '30d' | '90d' | '180d' | 'all';
```

---

## Design System

### Color Palette

```css
/* packages/web/src/index.css */
:root {
  --color-primary: #7C3AED;          /* Purple — primary actions, active states */
  --color-primary-light: #8B5CF6;
  --color-primary-dark: #6D28D9;
  --color-accent-orange: #F97316;    /* Streak / timer / burnout indicators */
  --color-accent-green: #22C55E;     /* Complete / PR / success states */
  --color-surface: #FFFFFF;
  --color-surface-secondary: #F8F7FF; /* Light purple tint for card backgrounds */
  --color-surface-dark: #0F0F1A;     /* Workout execution dark mode */
  --color-text-primary: #111827;
  --color-text-secondary: #6B7280;
  --color-border: #E5E7EB;
  --color-border-light: #F3F4F6;
}
```

### Typography

- **Display / headings:** `DM Sans` (Google Fonts)
- **Body / UI text:** `DM Sans`
- **Monospace (timers, weights):** `DM Mono`

### Spacing & Breakpoints

```typescript
// Tailwind breakpoints used throughout:
// Default (mobile-first): 0px+
// sm: 640px+   — tablet adjustments
// lg: 1024px+  — desktop layout (sidebar nav, wider content)
```

### Component Philosophy

1. **Never build a page as a monolith.** Every distinct visual region is its own component.
2. **Shared widgets are always in `src/components/`**, never duplicated in feature folders.
3. **Feature-specific components live in `src/features/<featureName>/`** and are not imported by other features.
4. **Pages are thin orchestrators** — they fetch data via hooks and compose components. No business logic in page files.
5. **Every component gets its own file.** No barrel files with 10 components.

---

## Execution Order for Cursor

### Phase 1 — Project Scaffold & Config
### Phase 2 — API Client Layer
### Phase 3 — Auth (Cognito + Amplify)
### Phase 4 — Global Stores (Zustand)
### Phase 5 — Design System Components (atoms)
### Phase 6 — Shared Widget Components
### Phase 7 — Feature: Dashboard Page
### Phase 8 — Feature: Workout Builder
### Phase 9 — Feature: Workout Execution
### Phase 10 — Feature: Exercise Catalog
### Phase 11 — Feature: Metrics & Exercise Detail
### Phase 12 — Feature: Goals
### Phase 13 — Feature: Feed
### Phase 14 — Feature: Profile & Settings
### Phase 15 — Routing & App Shell
### Phase 16 — Responsive Desktop Layout

---

## Phase 1 — Project Scaffold & Config

```bash
cd packages
pnpm create vite web --template react-ts
cd web
pnpm add react-router-dom zustand @tanstack/react-query axios \
  react-hook-form @hookform/resolvers zod recharts lucide-react \
  framer-motion aws-amplify @aws-amplify/ui-react tailwindcss \
  postcss autoprefixer
pnpm add -D @types/react @types/react-dom
npx tailwindcss init -p
```

**`vite.config.ts`**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../lambdas/shared/src'),
    },
  },
});
```

**`tailwind.config.ts`**
```typescript
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7C3AED',
          light: '#8B5CF6',
          dark: '#6D28D9',
        },
        accent: {
          orange: '#F97316',
          green: '#22C55E',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F8F7FF',
          dark: '#0F0F1A',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
    },
  },
};
```

---

## Phase 2 — API Client Layer

**Location:** `src/api/`

The API layer is the only place in the app that knows about URLs, headers, and request shapes. Components and hooks never call `axios` directly.

### 2a — Base Client

**`src/api/client.ts`**
```typescript
import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// Attach Cognito JWT to every request automatically
apiClient.interceptors.request.use(async (config) => {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 2b — API Modules

One file per resource. Each file exports typed async functions that return the exact model types from the shared package.

**`src/api/users.ts`**
```typescript
import { apiClient } from './client';
import { UserProfile } from '@/types';

export const usersApi = {
  getMe: () =>
    apiClient.get<UserProfile>('/users/me').then(r => r.data),

  patchMe: (updates: Partial<Pick<UserProfile, 'displayName' | 'bio' | 'profilePhoto' | 'weightUnit' | 'defaultPermissionType' | 'isPrivate'>>) =>
    apiClient.patch<UserProfile>('/users/me', updates).then(r => r.data),

  getByUsername: (username: string) =>
    apiClient.get<UserProfile>(`/users/${username}`).then(r => r.data),

  getFollowers: () =>
    apiClient.get<UserProfile[]>('/users/me/followers').then(r => r.data),

  getFollowing: () =>
    apiClient.get<UserProfile[]>('/users/me/following').then(r => r.data),

  follow: (userId: string) =>
    apiClient.post(`/users/${userId}/follow`).then(r => r.data),

  unfollow: (userId: string) =>
    apiClient.delete(`/users/${userId}/follow`).then(r => r.data),

  acceptFollowRequest: (userId: string) =>
    apiClient.post(`/users/me/follow-requests/${userId}/accept`).then(r => r.data),

  declineFollowRequest: (userId: string) =>
    apiClient.delete(`/users/me/follow-requests/${userId}`).then(r => r.data),
};
```

**`src/api/exercises.ts`**
```typescript
import { apiClient } from './client';
import { ExerciseCatalogItem } from '@/types';
import { ExerciseFilterState } from '@/types/ui';

export const exercisesApi = {
  list: (filters?: ExerciseFilterState) =>
    apiClient.get<ExerciseCatalogItem[]>('/exercises', { params: filters }).then(r => r.data),

  getById: (exerciseId: string) =>
    apiClient.get<ExerciseCatalogItem>(`/exercises/${exerciseId}`).then(r => r.data),
};
```

**`src/api/workouts.ts`**
```typescript
import { apiClient } from './client';
import { WorkoutInstance, WorkoutExercise, PermissionType, WorkoutStatus } from '@/types';
import { WorkoutDraft } from '@/types/ui';

interface ListWorkoutsParams {
  status?: WorkoutStatus;
  from?: string;
  to?: string;
  nextToken?: string;
}

interface PatchWorkoutBody {
  exercises?: Partial<WorkoutExercise>[];
  notes?: string;
  permissionType?: PermissionType;
  status?: WorkoutStatus;
}

export const workoutsApi = {
  create: (draft: WorkoutDraft) =>
    apiClient.post<WorkoutInstance>('/workout-instances', draft).then(r => r.data),

  list: (params?: ListWorkoutsParams) =>
    apiClient.get<{ items: WorkoutInstance[]; nextToken?: string }>('/workout-instances', { params }).then(r => r.data),

  getById: (id: string) =>
    apiClient.get<WorkoutInstance>(`/workout-instances/${id}`).then(r => r.data),

  patch: (id: string, body: PatchWorkoutBody) =>
    apiClient.patch<WorkoutInstance>(`/workout-instances/${id}`, body).then(r => r.data),

  complete: (id: string) =>
    apiClient.patch<WorkoutInstance>(`/workout-instances/${id}`, { status: 'completed' }).then(r => r.data),

  cancel: (id: string) =>
    apiClient.patch<WorkoutInstance>(`/workout-instances/${id}`, { status: 'cancelled' }).then(r => r.data),
};
```

**`src/api/metrics.ts`**
```typescript
import { apiClient } from './client';
import { GlobalMetrics, ExerciseMetrics } from '@/types';
import { PeriodFilter } from '@/types/ui';

export const metricsApi = {
  getGlobal: () =>
    apiClient.get<GlobalMetrics>('/metrics/me/global').then(r => r.data),

  listExercises: () =>
    apiClient.get<ExerciseMetrics[]>('/metrics/me/exercises').then(r => r.data),

  getExercise: (exerciseId: string, period?: PeriodFilter) =>
    apiClient.get<ExerciseMetrics>(`/metrics/me/exercises/${exerciseId}`, { params: { period } }).then(r => r.data),
};
```

**`src/api/goals.ts`**
```typescript
import { apiClient } from './client';
import { Goal, GoalStatus, GoalType, GoalTimeframe } from '@/types';

interface CreateGoalBody {
  type: GoalType;
  title: string;
  description?: string;
  timeframe: GoalTimeframe;
  targetValue: number;
  unit?: string;
  exerciseId?: string;
}

export const goalsApi = {
  list: (status?: GoalStatus) =>
    apiClient.get<Goal[]>('/goals/me', { params: { status } }).then(r => r.data),

  create: (body: CreateGoalBody) =>
    apiClient.post<Goal>('/goals/me', body).then(r => r.data),

  delete: (goalId: string) =>
    apiClient.delete(`/goals/me/${goalId}`).then(r => r.data),
};
```

**`src/api/feed.ts`**
```typescript
import { apiClient } from './client';
import { FeedItem } from '@/types';

export const feedApi = {
  list: (limit = 20, lastKey?: string) =>
    apiClient.get<{ items: FeedItem[]; nextToken?: string }>('/feed', {
      params: { limit, lastKey },
    }).then(r => r.data),
};
```

### 2c — SSE Client for AI Workout Generation

**`src/api/ai.ts`**
```typescript
// SSE-based AI workout generation.
// Uses the native EventSource API to receive streaming progress updates.

export interface AIProgressEvent {
  step: string;
  message: string;
}

export const streamWorkoutGeneration = (
  prompt: string,
  onProgress: (event: AIProgressEvent) => void,
  onComplete: (exercises: WorkoutExercise[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  // POST /workout-instances with aiPrompt — the Lambda returns SSE
  // Use fetch with ReadableStream since EventSource doesn't support POST body
  const controller = new AbortController();

  (async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/workout-instances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ aiPrompt: { prompt }, source: 'ai_generated' }),
        signal: controller.signal,
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event: progress')) continue;
          if (line.startsWith('data: ')) {
            const json = JSON.parse(line.slice(6));
            if (json.step) onProgress(json as AIProgressEvent);
            else if (json.exercises) onComplete(json.exercises);
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') onError(err as Error);
    }
  })();

  return () => controller.abort();
};
```

---

## Phase 3 — Auth (Cognito + Amplify)

**`src/lib/amplify.ts`**
```typescript
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    },
  },
});
```

**`src/features/auth/AuthGuard.tsx`**
```typescript
// Wraps protected routes. Redirects to /login if no active session.
// Shows a full-screen loading state while auth is being checked.
```

**`src/features/auth/LoginPage.tsx`**
```typescript
// Uses Amplify's <Authenticator> component for the login/signup UI.
// Styled to match the app design system.
// On successful auth, redirects to /dashboard.
```

---

## Phase 4 — Global Stores (Zustand)

Zustand stores hold global **client-side** state only. Server state (API data) lives in TanStack Query cache, not Zustand.

**`src/stores/authStore.ts`**
```typescript
interface AuthStore {
  userId: string | null;
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  clear: () => void;
}
// Populated once on app load from GET /users/me
// Used by any component that needs userId or displayName without refetching
```

**`src/stores/workoutSessionStore.ts`**
```typescript
// Holds in-progress workout execution state.
// This is the most important store — it must survive page refreshes.
// Persisted to localStorage via zustand/middleware persist.

interface WorkoutSessionStore {
  activeWorkoutId: string | null;
  currentExerciseIndex: number;
  exercises: WorkoutExercise[];        // Live state updated as user fills in values
  startedAt: string | null;
  elapsedSeconds: number;
  isPaused: boolean;

  // Actions
  startSession: (workoutId: string, exercises: WorkoutExercise[]) => void;
  updateExercise: (index: number, updates: Partial<WorkoutExercise>) => void;
  goToExercise: (index: number) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  clearSession: () => void;
}
```

**`src/stores/workoutDraftStore.ts`**
```typescript
// Holds the workout being built before it is confirmed and persisted.
// Cleared after POST /workout-instances succeeds.

interface WorkoutDraftStore {
  draft: WorkoutDraft | null;
  setDraft: (draft: WorkoutDraft) => void;
  updateExerciseInDraft: (index: number, updates: Partial<WorkoutExercise>) => void;
  removeExerciseFromDraft: (index: number) => void;
  clearDraft: () => void;
}
```

**`src/stores/toastStore.ts`**
```typescript
// Global toast notification queue
interface ToastStore {
  toasts: ToastMessage[];
  addToast: (message: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}
```

---

## Phase 5 — Design System Components (Atoms)

**Location:** `src/components/ui/`

These are the lowest-level building blocks. They have no API calls and no business logic. Build all of these before starting any feature.

| Component | File | Description |
|---|---|---|
| `Button` | `Button.tsx` | Primary, secondary, ghost, destructive variants. Size sm/md/lg. Loading state with spinner. |
| `Card` | `Card.tsx` | White card with optional padding and shadow. Used everywhere. |
| `Badge` | `Badge.tsx` | Small status pill. Variants: purple, green, orange, gray. |
| `ProgressBar` | `ProgressBar.tsx` | Horizontal progress bar with percentage label. Animated fill. |
| `Avatar` | `Avatar.tsx` | Circular avatar with initials fallback when no photo URL. Size sm/md/lg. |
| `Spinner` | `Spinner.tsx` | Centered loading spinner. Used in suspense boundaries and loading states. |
| `Modal` | `Modal.tsx` | Full-screen bottom sheet on mobile, centered dialog on desktop. Framer Motion enter/exit. |
| `BottomSheet` | `BottomSheet.tsx` | Drag-to-dismiss bottom sheet for mobile. Used for goal creation and exercise detail. |
| `Input` | `Input.tsx` | Styled text input with label, error state, and helper text. |
| `NumberInput` | `NumberInput.tsx` | Numeric input with +/- increment buttons. Used for sets, reps, weight. |
| `SegmentedControl` | `SegmentedControl.tsx` | Pill-style tab switcher (e.g. Active / Completed on Goals page). |
| `FilterChip` | `FilterChip.tsx` | Rounded filter pill. Active/inactive state. Used in exercise catalog. |
| `EmptyState` | `EmptyState.tsx` | Centered icon + heading + subtext for empty lists. |
| `Skeleton` | `Skeleton.tsx` | Animated loading placeholder. Matches the shape of real content. |
| `Toast` | `Toast.tsx` | Notification toast rendered from `toastStore`. Stacked, auto-dismiss. |

---

## Phase 6 — Shared Widget Components

**Location:** `src/components/widgets/`

These are the reusable widgets that appear on **both the Dashboard and the Profile page**. They accept data as props — they do not fetch their own data. Data fetching happens in the parent page via hooks.

### 6a — StreakWidget

**`src/components/widgets/StreakWidget.tsx`**

```typescript
interface StreakWidgetProps {
  currentStreak: number;
  longestStreak: number;
}
```

Visual: Orange flame icon, large current streak number, "Best: X days" in top right. Matches mockup Image 1 exactly.

### 6b — StatsRow

**`src/components/widgets/StatsRow.tsx`**

```typescript
interface StatsRowProps {
  totalWorkouts: number;
  workoutsThisMonth: number;
  totalVolumeLast30Days: number;
  durationLast30Days: number;
}
```

Visual: Three horizontally scrollable cards — Total Workouts, This Month, Volume + duration. Matches mockup Image 1.

### 6c — PersonalRecordsWidget

**`src/components/widgets/PersonalRecordsWidget.tsx`**

```typescript
interface PersonalRecordsWidgetProps {
  records: Array<{
    exerciseName: string;
    maxWeight: number;
    maxWeightUnit: WeightUnit;
    totalSessions: number;
    percentageChange?: number;  // vs. 90 days ago, for the +5.2% display
  }>;
  onExercisePress?: (exerciseId: string) => void;
}
```

Visual: Trophy icon header. Each row shows exercise name, session count in gray, weight right-aligned, green percentage change. Matches mockup Image 1 and 15.

### 6d — WeekCalendarWidget

**`src/components/widgets/WeekCalendarWidget.tsx`**

```typescript
interface WeekCalendarWidgetProps {
  completedDates: string[];         // ISO date strings from GlobalMetrics
  onWeekPress?: () => void;         // Navigates to full history
}
```

Visual: 7-day strip showing M/T/W/T/F/S/S. Days with completed workouts show a purple icon, others show an empty rounded square. Matches mockup Image 2. Filter `completedDates` to the current week client-side.

### 6e — GoalsWidget

**`src/components/widgets/GoalsWidget.tsx`**

```typescript
interface GoalsWidgetProps {
  goals: Goal[];
  onSeeAll: () => void;
  onAddGoal: () => void;
}
```

Visual: Shows first 2 active goals with progress bars and percentages. "See All >" link. Matches mockup Image 1 bottom section.

### 6f — RecentWorkoutsWidget

**`src/components/widgets/RecentWorkoutsWidget.tsx`**

```typescript
interface RecentWorkoutsWidgetProps {
  workouts: WorkoutInstance[];
  onSeeAll: () => void;
  onWorkoutPress: (workoutId: string) => void;
}
```

Visual: Each item shows equipment names truncated, exercise count, duration, days-ago timestamp, total volume. Matches mockup Image 2.

### 6g — ActivityFeedWidget

**`src/components/widgets/ActivityFeedWidget.tsx`**

```typescript
interface ActivityFeedWidgetProps {
  feedItems: FeedItem[];
  onLoadMore: () => void;
}
```

Visual: Each feed item shows avatar, actor name + event text, timestamp, and a summary line. PR events show a trophy icon. Matches mockup Image 2 bottom section.

---

## Phase 7 — Feature: Dashboard Page

**Location:** `src/features/dashboard/`

### API Calls

The Dashboard page makes **4 parallel API calls on mount** via `Promise.all` — never sequential. Use a single `useQuery` with `queryKey: ['dashboard']` that fetches all four and returns a combined object.

```typescript
// src/features/dashboard/hooks/useDashboardData.ts
const fetchDashboard = async () => {
  const [globalMetrics, recentWorkouts, activeGoals, feedItems] = await Promise.all([
    metricsApi.getGlobal(),                              // GET /metrics/me/global
    workoutsApi.list({ status: WorkoutStatus.COMPLETED, // GET /workout-instances
      from: ninetyDaysAgo }),
    goalsApi.list(GoalStatus.ACTIVE),                    // GET /goals/me?status=active
    feedApi.list(10),                                    // GET /feed?limit=10
  ]);
  return { globalMetrics, recentWorkouts, activeGoals, feedItems };
};

export const useDashboardData = () =>
  useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard, staleTime: 60_000 });
```

### Components

| Component | File | Description |
|---|---|---|
| `DashboardPage` | `DashboardPage.tsx` | Thin orchestrator. Calls `useDashboardData`, passes data to widgets. No JSX beyond layout and widget composition. |
| `DashboardHeader` | `DashboardHeader.tsx` | "Welcome back, [Name]" purple header with avatar button. Navigates to profile on avatar press. |

### Component Tree
```
DashboardPage
├── DashboardHeader
├── StreakWidget                    ← from src/components/widgets/
├── StatsRow                        ← from src/components/widgets/
├── PersonalRecordsWidget           ← from src/components/widgets/
├── GoalsWidget                     ← from src/components/widgets/
├── WeekCalendarWidget              ← from src/components/widgets/
├── RecentWorkoutsWidget            ← from src/components/widgets/
└── ActivityFeedWidget              ← from src/components/widgets/
```

---

## Phase 8 — Feature: Workout Builder

**Location:** `src/features/workoutBuilder/`

### API Calls

| Action | API Call | When |
|---|---|---|
| Load exercise catalog | `GET /exercises` | On mount of `SelectExercisesScreen` |
| Filter by muscle group | `GET /exercises?muscleGroup=chest` | On filter chip press — use query param |
| AI generation (SSE) | `POST /workout-instances` (streaming) | On "Generate Workout" press |
| Swap single exercise (AI) | Invoke same SSE endpoint with swap context | On ↻ icon press on review screen |
| Confirm and start workout | `POST /workout-instances` | On "Start Workout" press after review |

### Screens (sub-routes or modal stacks, not full pages)

| Component | File | Description |
|---|---|---|
| `NewWorkoutScreen` | `NewWorkoutScreen.tsx` | Choice screen: AI Generate vs Manual Build. Matches mockup Image 6. |
| `AIWorkoutScreen` | `AIWorkoutScreen.tsx` | Text input + quick-select chips (Push day, Pull day, etc). Matches mockup Image 8. |
| `AIGeneratingScreen` | `AIGeneratingScreen.tsx` | SSE progress screen. Shows checklist with green checks as events arrive. Matches mockup Image 9. |
| `ReviewWorkoutScreen` | `ReviewWorkoutScreen.tsx` | List of AI-generated exercises. Checkbox select, ↻ swap, 🗑 delete, inline sets/reps edit. Matches mockups Image 10 and 11. |
| `SelectExercisesScreen` | `SelectExercisesScreen.tsx` | Manual exercise picker with search and filter chips. Matches mockup Image 7. |

### Key Components within Builder

| Component | File | Description |
|---|---|---|
| `ExerciseFilterBar` | `ExerciseFilterBar.tsx` | Horizontal scrollable row of `FilterChip` components (All, Chest, Back, Shoulders...). |
| `ExerciseCatalogList` | `ExerciseCatalogList.tsx` | Virtualized list of `ExerciseCatalogItem` rows. Each row has exercise name, muscle groups, default sets×reps, and a + button. |
| `ReviewExerciseRow` | `ReviewExerciseRow.tsx` | Single exercise row on the review screen. Handles inline expand for sets/reps edit. Checkbox, swap icon, delete icon. |
| `AIProgressChecklist` | `AIProgressChecklist.tsx` | Animated checklist of SSE progress steps. Green checkmark animates in as each `progress` event arrives. |
| `QuickPromptChips` | `QuickPromptChips.tsx` | Row of tappable prompt shortcuts ("Push day", "Pull day", "Leg day", "Full body", "30 min quick"). Tapping appends to the text input. |

### State Flow

```
workoutDraftStore (Zustand)
  ↓ populated by AIWorkoutScreen (SSE complete event) or SelectExercisesScreen (manual)
ReviewWorkoutScreen
  ↓ reads draft, allows edits
  ↓ on "Start Workout" → POST /workout-instances → navigate to /workout/execute/:id
workoutSessionStore (Zustand)
  ↓ populated with the new WorkoutInstance
WorkoutExecutionPage
```

---

## Phase 9 — Feature: Workout Execution

**Location:** `src/features/workoutExecution/`

This is the most critical screen. It must be ultra-simple, work offline (local state), and never lose data. The session state lives in `workoutSessionStore` which is persisted to localStorage.

### API Calls

| Action | API Call | When |
|---|---|---|
| Load workout | `GET /workout-instances/:id` | On mount, to hydrate session store |
| Save exercise value | `PATCH /workout-instances/:id` | On "Next" press — debounced, fire-and-forget |
| Complete workout | `PATCH /workout-instances/:id` `{ status: 'completed' }` | On final "Complete" press |
| Cancel workout | `PATCH /workout-instances/:id` `{ status: 'cancelled' }` | On X press → confirm modal |

**Important:** PATCH calls during execution are **debounced fire-and-forget** — they save to the server but the UI never waits for the response. Local state is authoritative during execution. If the user closes the app and returns, the session store is rehydrated from localStorage, then reconciled with a fresh `GET /workout-instances/:id` on mount.

### Components

| Component | File | Description |
|---|---|---|
| `WorkoutExecutionPage` | `WorkoutExecutionPage.tsx` | Dark-mode page. Reads from `workoutSessionStore`. Thin orchestrator. |
| `ExecutionHeader` | `ExecutionHeader.tsx` | X button (cancel), elapsed timer (MM:SS), pause/play button, skip-to-next button. |
| `ExerciseProgressBar` | `ExerciseProgressBar.tsx` | "Exercise N of M" label + purple progress bar. |
| `WeightEntryCard` | `WeightEntryCard.tsx` | For `sets_reps` modality. Shows last used weight as placeholder. Large weight display, +5/+10/+25/+45 increment buttons, "Use previous weight" link. Matches mockup Image 12 and 14. |
| `DurationTimerCard` | `DurationTimerCard.tsx` | For `duration` modality. Large MM:SS countdown, Pause button (orange). Auto-advances on completion. Matches mockup Image 13. |
| `LastPerformedBadge` | `LastPerformedBadge.tsx` | Gray pill showing "Last: 185 lbs (4×8) · today". Reads from `WorkoutExercise.lastUsedWeight`. |
| `ExerciseNavigation` | `ExerciseNavigation.tsx` | "< Previous" and "Next >" or "Complete ✓" button row. Complete button is green on last exercise. |
| `CancelWorkoutModal` | `CancelWorkoutModal.tsx` | Confirmation modal: "Cancel workout? Your progress will be lost." |

### Execution Flow

```
Mount → load workout from workoutSessionStore (or GET /workout-instances/:id if cold start)
  ↓
User on exercise N:
  - WeightEntryCard or DurationTimerCard shown based on exercise.modality
  - LastPerformedBadge shows exercise.lastUsedWeight (already denormalized)
  - User taps +25, weight updates in workoutSessionStore
  - User taps "Next" → updateExercise() in store + debounced PATCH to server
  ↓
On last exercise ("Complete ✓"):
  - PATCH /workout-instances/:id { status: 'completed' }
  - Navigate to WorkoutSummaryPage
  - Clear workoutSessionStore
```

---

## Phase 10 — Feature: Exercise Catalog

**Location:** `src/features/exerciseCatalog/`

Used standalone as a browsing/search experience (separate from the workout builder picker).

### API Calls

| Action | API Call | When |
|---|---|---|
| Load all exercises | `GET /exercises` | On mount |
| Filter by muscle group | `GET /exercises?muscleGroup=X` | On filter chip press |
| Search | `GET /exercises?search=curl` | On search input, 300ms debounced |
| Exercise detail | `GET /exercises/:exerciseId` | On row press |

### Components

| Component | File | Description |
|---|---|---|
| `ExerciseCatalogPage` | `ExerciseCatalogPage.tsx` | Full-page exercise browser. Search bar + filter chips + list. |
| `ExerciseDetailSheet` | `ExerciseDetailSheet.tsx` | Bottom sheet showing exercise name, muscle groups, equipment, instructions, difficulty badge, and the user's personal metrics for that exercise (fetched via `GET /metrics/me/exercises/:id`). |

---

## Phase 11 — Feature: Metrics & Exercise Detail

**Location:** `src/features/metrics/`

### API Calls

| Action | API Call | When |
|---|---|---|
| Load global metrics | `GET /metrics/me/global` | Dashboard (already cached) — reused |
| Load all exercise metrics | `GET /metrics/me/exercises` | On mount of exercise metrics list |
| Load single exercise detail | `GET /metrics/me/exercises/:exerciseId` | On exercise row press |

### Components

| Component | File | Description |
|---|---|---|
| `ExerciseMetricsList` | `ExerciseMetricsList.tsx` | List of all exercises the user has logged. Shows max weight, total sessions, last performed. |
| `ExerciseMetricsDetailPage` | `ExerciseMetricsDetailPage.tsx` | Full page for one exercise. Contains the chart, PR history, and period filter. |
| `WeightTrendChart` | `WeightTrendChart.tsx` | Recharts `LineChart` of weight over time. Accepts `trendData` as props. Period filter (30d/90d/180d/all) slices the data array client-side. |
| `PRHistoryList` | `PRHistoryList.tsx` | Chronological list of personal records with date and weight. |
| `PeriodFilterBar` | `PeriodFilterBar.tsx` | Segmented control for 30d / 90d / 180d / All. Shared across metrics screens. |

---

## Phase 12 — Feature: Goals

**Location:** `src/features/goals/`

### API Calls

| Action | API Call | When |
|---|---|---|
| Load active goals | `GET /goals/me?status=active` | On mount |
| Load completed goals | `GET /goals/me?status=completed` | On "Completed" tab press |
| Create goal | `POST /goals/me` | On "Create Goal" submit |
| Delete goal | `DELETE /goals/me/:goalId` | On trash icon press → confirm |

After `POST` or `DELETE`, invalidate the `['goals']` query key so the list refreshes automatically.

### Components

| Component | File | Description |
|---|---|---|
| `GoalsPage` | `GoalsPage.tsx` | Full-page goals list. `SegmentedControl` for Active/Completed tabs. FAB to add new goal. |
| `GoalCard` | `GoalCard.tsx` | Single goal card with icon, title, description, `ProgressBar`, percentage, timeframe + days remaining, trash icon. Matches mockup Image 3. |
| `GoalTypePickerSheet` | `GoalTypePickerSheet.tsx` | Bottom sheet list of goal types with icon and description. Matches mockup Image 4. |
| `CreateGoalForm` | `CreateGoalForm.tsx` | Form sheet after type selection. Title, description, target value, timeframe selector. Matches mockup Image 5. Uses React Hook Form + Zod validation. |
| `GoalIconMap` | `GoalIconMap.ts` | Maps `GoalType` enum to Lucide icon and color. Used by `GoalCard` and `GoalTypePickerSheet`. |

### GoalIconMap
```typescript
export const GOAL_ICON_MAP: Record<GoalType, { icon: LucideIcon; color: string }> = {
  [GoalType.TOTAL_WORKOUTS]:   { icon: Dumbbell,  color: 'text-primary' },
  [GoalType.WORKOUTS_PER_WEEK]:{ icon: Calendar,  color: 'text-primary' },
  [GoalType.TOTAL_VOLUME]:     { icon: Zap,       color: 'text-primary' },
  [GoalType.ONE_REP_MAX]:      { icon: Trophy,    color: 'text-primary' },
  [GoalType.WORKOUT_STREAK]:   { icon: Flame,     color: 'text-accent-orange' },
  [GoalType.EXERCISE_SESSIONS]:{ icon: Target,    color: 'text-primary' },
};
```

---

## Phase 13 — Feature: Feed

**Location:** `src/features/feed/`

### API Calls

| Action | API Call | When |
|---|---|---|
| Load feed | `GET /feed?limit=20` | On mount |
| Load more | `GET /feed?limit=20&lastKey=<token>` | On scroll to bottom (infinite scroll) |

### Components

| Component | File | Description |
|---|---|---|
| `FeedPage` | `FeedPage.tsx` | Full-page feed with infinite scroll. |
| `FeedItemCard` | `FeedItemCard.tsx` | Single feed item. Actor avatar, name, event text, timestamp, summary. Trophy icon for PR events. Matches mockup Image 2. |
| `FeedItemSkeleton` | `FeedItemSkeleton.tsx` | Loading skeleton that matches `FeedItemCard` shape. |

---

## Phase 14 — Feature: Profile & Settings

**Location:** `src/features/profile/`

### API Calls

| Action | API Call | When |
|---|---|---|
| Load own profile | `GET /users/me` | On mount (likely already cached from auth store) |
| Load global metrics | `GET /metrics/me/global` | On mount (likely cached from dashboard) |
| Load exercise PRs | `GET /metrics/me/exercises` | On mount for PR section |
| Update profile | `PATCH /users/me` | On settings save |
| Load public profile | `GET /users/:username` | When viewing another user |

### Components

| Component | File | Description |
|---|---|---|
| `ProfilePage` | `ProfilePage.tsx` | Own profile. Purple header, avatar, stats row (followers/following/workouts), streak/best-streak cards, member-since card, PR list. Matches mockup Image 15. |
| `ProfileHeader` | `ProfileHeader.tsx` | Purple section with avatar, display name, username, bio, edit button. Gear icon navigates to settings. |
| `ProfileStatsBar` | `ProfileStatsBar.tsx` | Followers | Following | Workouts horizontal stat row. Same layout as mockup Image 15. |
| `SettingsPage` | `SettingsPage.tsx` | List of settings: display name, bio, weight unit, default visibility, privacy toggle, sign out. |
| `EditProfileSheet` | `EditProfileSheet.tsx` | Bottom sheet form for editing displayName, bio, profilePhoto. Calls `PATCH /users/me`. |
| `PublicProfilePage` | `PublicProfilePage.tsx` | View another user's profile. Same layout as `ProfilePage` but with Follow/Unfollow button instead of edit. |

### Component Reuse on Profile Page

The Profile page reuses the same shared widgets as the Dashboard — it does NOT duplicate them:

```
ProfilePage
├── ProfileHeader
├── ProfileStatsBar
├── StreakWidget             ← SAME component as Dashboard
├── PersonalRecordsWidget    ← SAME component as Dashboard
└── WeekCalendarWidget       ← SAME component as Dashboard
```

---

## Phase 15 — Routing & App Shell

**`src/App.tsx`**

```typescript
// Route structure
<Routes>
  {/* Public */}
  <Route path="/login" element={<LoginPage />} />
  <Route path="/u/:username" element={<PublicProfilePage />} />

  {/* Protected — wrapped in AuthGuard */}
  <Route element={<AuthGuard />}>
    <Route element={<AppShell />}>       {/* Bottom nav + layout */}
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/feed" element={<FeedPage />} />
      <Route path="/goals" element={<GoalsPage />} />
      <Route path="/exercises" element={<ExerciseCatalogPage />} />
      <Route path="/exercises/:exerciseId" element={<ExerciseDetailSheet />} />
      <Route path="/metrics/exercises/:exerciseId" element={<ExerciseMetricsDetailPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/workout/new" element={<NewWorkoutScreen />} />
      <Route path="/workout/new/ai" element={<AIWorkoutScreen />} />
      <Route path="/workout/new/manual" element={<SelectExercisesScreen />} />
      <Route path="/workout/review" element={<ReviewWorkoutScreen />} />
      <Route path="/workout/execute/:id" element={<WorkoutExecutionPage />} />
    </Route>
  </Route>
</Routes>
```

**`src/components/layout/AppShell.tsx`**

The AppShell wraps all protected routes and provides the navigation chrome. On mobile it renders a bottom tab bar. On desktop (`lg:` breakpoint) it renders a fixed left sidebar.

```typescript
// Mobile: bottom tab bar with 5 tabs
// Desktop: left sidebar with the same 5 navigation items + app logo at top

const NAV_ITEMS = [
  { path: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/feed',       icon: Users,           label: 'Feed'      },
  { path: '/workout/new',icon: Plus,            label: 'Workout',  isAction: true }, // FAB in center
  { path: '/goals',      icon: Target,          label: 'Goals'     },
  { path: '/profile',    icon: User,            label: 'Profile'   },
];
```

**`src/components/layout/BottomNav.tsx`**
- 5 tabs. Center tab is the purple "+" action button (new workout).
- Active tab shows purple icon + label. Inactive tabs show gray icon only.
- Hidden on the WorkoutExecution page (full-screen mode).

**`src/components/layout/SidebarNav.tsx`**
- Visible only at `lg:` breakpoint and above.
- App logo / name at the top.
- Nav items are full-width rows with icon + label.
- Active item has purple background highlight.

---

## Phase 16 — Responsive Desktop Layout

All pages use a **mobile-first, single-column layout by default**. At the `lg:` breakpoint, the following adjustments apply:

```
AppShell (lg:)
├── SidebarNav (fixed left, 240px wide)
└── Main content area (margin-left: 240px)
    └── Max-width container: max-w-2xl mx-auto   ← keeps content readable on wide screens
```

**Page-specific desktop adaptations:**

| Page | Mobile | Desktop |
|---|---|---|
| Dashboard | Single column, stacked widgets | Two-column grid: left col (streak, stats, PRs, goals), right col (calendar, recent workouts, feed) |
| Goals | Single column list | Two-column card grid |
| Exercise Catalog | Full-width list | List on left, detail panel on right (master-detail) |
| Workout Execution | Full screen, dark mode | Centered card (max-w-md), dark background fills rest of screen |
| Profile | Single column | Centered card (max-w-xl), purple header spans full width |

---

## TanStack Query Key Convention

Consistent query keys prevent stale data and make cache invalidation predictable.

```typescript
export const queryKeys = {
  // Users
  me: ['users', 'me'] as const,
  user: (username: string) => ['users', username] as const,
  followers: ['users', 'me', 'followers'] as const,
  following: ['users', 'me', 'following'] as const,

  // Exercises
  exercises: (filters?: ExerciseFilterState) => ['exercises', filters] as const,
  exercise: (id: string) => ['exercises', id] as const,

  // Workouts
  workouts: (params?: object) => ['workouts', params] as const,
  workout: (id: string) => ['workouts', id] as const,

  // Metrics
  globalMetrics: ['metrics', 'global'] as const,
  exerciseMetrics: ['metrics', 'exercises'] as const,
  exerciseMetric: (id: string) => ['metrics', 'exercises', id] as const,

  // Goals
  goals: (status?: GoalStatus) => ['goals', status] as const,

  // Feed
  feed: ['feed'] as const,

  // Dashboard (composite)
  dashboard: ['dashboard'] as const,
};
```

---

## Cache Invalidation Rules

When a mutation succeeds, invalidate the relevant query keys so the UI stays consistent:

| Mutation | Invalidate |
|---|---|
| Workout completed | `queryKeys.dashboard`, `queryKeys.globalMetrics`, `queryKeys.workouts()`, `queryKeys.goals()` |
| Goal created | `queryKeys.goals()`, `queryKeys.dashboard` |
| Goal deleted | `queryKeys.goals()`, `queryKeys.dashboard` |
| Profile updated | `queryKeys.me` |
| Follow/Unfollow | `queryKeys.user(username)`, `queryKeys.following` |

---

## Environment Variables

**`packages/web/.env.local`**
```
VITE_API_BASE_URL=https://api.yourapp.com/v1
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXX
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## Key Architectural Decisions Reference

| Decision | Choice | Reason |
|---|---|---|
| Server state | TanStack Query | Caching, deduplication, background refetch, pagination |
| Client state | Zustand | Lightweight, no boilerplate, persists to localStorage for session recovery |
| Shared models | Re-export from `lambdas/shared` | Single source of truth, no model drift |
| Dashboard data fetch | Single `Promise.all` for 4 calls | Eliminates waterfall, dashboard loads in one round trip |
| Execution PATCH | Debounced fire-and-forget | UI never waits for server; data is safe from localStorage |
| Widget components | Prop-driven, no internal fetching | Dashboard and Profile reuse identical components without duplication |
| Mobile-first | Default layout is mobile, `lg:` adds desktop | Matches primary use case (gym floor) while supporting desktop |
| Workout execution | Full-screen dark mode, hidden nav | Eliminates distraction; gym environment needs maximum simplicity |
| SSE parsing | fetch + ReadableStream (not EventSource) | EventSource doesn't support POST body; fetch gives full control |