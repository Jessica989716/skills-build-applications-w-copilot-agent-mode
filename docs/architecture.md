# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Keep presentation, API logic, and persistence separate: React components use the shared API client, Express routes/services own request validation and business rules, and Mongoose models own persistence constraints. Preserve the documented ports and do not add authentication.

- Presentation tier decision: Keep pages and reusable UI in `frontend/src`; use the shared API client for relative `/api` requests. Render loading, empty, and accessible error states as well as successful responses.
- Logic tier decision: Implement the documented REST contract in Express routes/services. Validate request shapes and IDs before database operations, return deliberate 4xx responses for invalid or missing resources, and avoid leaking Mongoose cast failures as 500 responses.
- Data tier decision: Define required fields, types, and appropriate defaults in Mongoose schemas. Keep seed data representative and idempotent, and do not remove unrelated existing records when seeding.
- Activity tracking approach: Validate that the referenced user and team exist, then persist the submitted user, team, type, and minutes with computed points and an occurrence timestamp. Return created records from POST and persisted records from GET.
- Team management approach: Require a name, preserve the submitted name and mascot, default members to an empty array, and return created and listed teams with their member IDs.
- Leaderboard approach: Aggregate activity points by team, sort by total points descending, and return team names, totals, and 1-based ranks.
- Workout suggestions approach: Find the requested user by email, use their fitness goal and recent activities to rank existing workouts, and explain the first recommendation in its reason. Return a deliberate 4xx response when the email has no matching user.

## Test plan

Run focused contract tests for each tier, then both builds:

- Data-tier: `npm run test:data --prefix octofit-tracker/backend` — 4 failed, 1 passed. The missing user/team/activity/workout validation constraints fail; the seed idempotency and preservation test passes.
- API: `npm run test:api --prefix octofit-tracker/backend` — 4 failed. Invalid activity/team requests return 501 rather than deliberate 4xx responses, leaderboard aggregation returns no entries, and workout recommendations do not match the user's activity pattern.
- Frontend: `npm test --prefix octofit-tracker/frontend` — 15 failed. Expected API content and the user-specific suggestions request are missing, as are the required loading, empty, and accessible error states for each capability.
- Backend build: `npm run build --prefix octofit-tracker/backend` — passed; TypeScript type-check succeeds.
- Frontend build: `npm run build --prefix octofit-tracker/frontend` — passed; TypeScript type-check and Vite production build succeed.

The contract failures identify behavior still to implement; passing builds confirm the current starter code type-checks and bundles but do not establish that the API or UI contracts work.
