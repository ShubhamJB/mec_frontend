# Find Your Mechanic — Frontend

React single-page app for the Find Your Mechanic platform. Customers discover garages on a map and list, call them and leave reviews. Garage owners register and manage a workshop. Administrators approve and moderate.

The API contract, requirements and UI rules live in `../Find_Your_Mechanic_MVP_Handoff/` (see `Find_Your_Mechanic_Frontend_UI_Spec.md`). The backend is in `../backend`.

## Stack
- React 18, TypeScript (strict), Vite 5
- React Router 6
- Leaflet + react-leaflet with OpenStreetMap tiles (no API key)
- OSRM public routing service for driving routes (no API key)
- Design tokens in `src/styles/tokens.css`

## Getting started

Requirements: Node 22+, and the backend running on `http://localhost:8000` (see `../backend` — `docker compose up -d` from there starts the API and database).

```bash
npm install
npm run dev
```

The app is served at `http://localhost:5173`. The dev server proxies `/api` to `http://localhost:8000`, so no CORS setup or environment file is needed.

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Type-check (`tsc -b`) and production build into `dist/` |
| `npm run preview` | Serve the production build locally |

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `/api/v1` | API base. Leave unset to use the same-origin proxy; set it only to call a backend on another origin (which then needs CORS). |

Variables are baked in at build time. Create a `.env.local` for local overrides; it is git-ignored.

## Docker

The image builds the app and serves it with nginx, which also proxies `/api` to the backend and falls back to `index.html` for client-side routes.

```bash
docker build -t find-your-mechanic-web .
docker run --rm -p 8080:80 -e API_UPSTREAM=http://host.docker.internal:8000 find-your-mechanic-web
```

`API_UPSTREAM` is the backend URL nginx proxies to (default `http://api:8000`, the service name in the compose file). The backend's `docker-compose.yml` already defines a `web` service, so from `../backend`:

```bash
docker compose up -d --build
```

serves the whole stack, with the app on `http://localhost:8080`.

## Routes

| Path | Access |
|---|---|
| `/`, `/garages`, `/garages/:id` | Public |
| `/login`, `/register`, `/verify-email` | Public |
| `/admin/login` | Public (rejects non-admin accounts) |
| `/notifications`, `/account` | Any signed-in user |
| `/owner`, `/owner/registration`, `/owner/hours` | Garage owners only |
| `/admin`, `/admin/registrations` | Administrators only |

Route guards live in `src/auth/RoleGuard.tsx`. They only decide what the UI shows; the backend enforces the same roles on every endpoint. A signed-in user with the wrong role is redirected to their own home.

## Project structure

```
src/
  api/          fetch client (token refresh, error envelope) and API types
  auth/         session context and role guard
  components/   app shell, public layout, error boundary, map components
  features/     discovery, garage-profile, auth, owner, admin, notifications
  lib/          small helpers (saved user location)
  styles/       design tokens
```

## Maps and routes
- Map tiles come from the public OpenStreetMap servers, which are fine for development but not meant for heavy production traffic. Switch to a tile provider before launch; the URL is one constant in `src/components/map/mapConfig.ts`.
- Driving routes come from the public OSRM demo server in `src/components/map/routing.ts`. It has fair-use limits and no live traffic. For production, self-host OSRM or use a provider such as OpenRouteService.
- A visitor's location is kept in `sessionStorage` for the browser session only and is never sent to the backend.

## Signing in locally

After seeding the backend (`docker compose exec api python -m app.db.seed` from `../backend`), the admin is `admin@seed.example.com`, and owners and customers are `owner0001`…`owner0500` and `customer0001`…`customer0200` at `@seed.example.com`. The shared password is printed once at the end of the seed output. Admins sign in at `/admin/login`; everyone else at `/login`.

Verification emails are stubbed: the link is printed in the API log (`docker compose logs api | grep -A8 "STUB EMAIL"`).

## Known gaps
- Owner pages for garage profile, services and vehicle types, photos, reviews and analytics are not built yet (the backend endpoints exist).
- Customer account page is a placeholder; review editing and reporting UI is not built.
- No automated tests yet.
