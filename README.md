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

## Landing page

`/` is a scroll-driven 3D experience built with Three.js (code in `src/features/landing3d/`). One fixed canvas holds five scenes and a camera that flies between them as you scroll:

1. A bolt threaded through a nut that unscrews as you scroll (the hexagon from our logo).
2. A 3D hex-plate city map. Garage pins are hex nuts that rise up with their rating on top; hover for details, click to draw a route.
3. A car that drives down a street, turns into a garage and is raised on a lift. Click the OPEN sign to close the garage; the door shuts and the car waits.
4. Review bars as hex columns, plus a low-poly inspector in a cap who ticks a clipboard checklist point by point as you scroll, after which a seal stamps the listing "Approved".
5. A glossy 3D map pin with a hex mark floats over a hex plate, orbited by small nuts. Hovering the call-to-action drops it onto the plate with a bounce and ripples.

Notes:
- Scenes are built from code, with no model files. Colours come from the active theme tokens, except the nut and bolt, which are fixed zinc steel and black oxide (`src/features/landing3d/fixedColors.ts`). Large colour fields use the `--field` and `--field-ink` tokens.
- Three.js loads lazily. The scene pauses when the tab is hidden and uses a flat fallback without WebGL. With "reduce motion" on, the camera snaps between scenes and pointer tilt is off.
- The page shows none of the app's UI by design, so the app can change freely.
- All garages, reviews and numbers are sample data. Edit them, the contact email and the investor lists in `src/features/landing3d/content.ts`. The contact email is a placeholder.
- The photos in `public/landing/` are not used by this page.

## Themes

All colours, fonts, type sizes, radii and the map tile style come from CSS variables, so the look is swappable. Two themes ship:

| Theme | What it is |
|---|---|
| `harbor` (default) | Light. Warm Moon cream ground, white cards, deep Midnight navy ink and a soft blue `#4867B9` accent, with Dawn and Sky blues for tints, borders and the pale Sky field used for the landing finale. |
| `modern` | Light. Neutral `#F5F5F7` ground, white cards, `#1D1D1F` ink and a vivid blue accent. Text-bearing blue is `#0066CC` for contrast; the map route uses the pure `#007AFF`. |
| `sky` | Light. Pale sky-blue ground with white cards, deep navy ink, and a steel-blue accent.  Built from the supplied `#49769F`, `#4E8EA2`, `#6EA2B3`, `#7BBDE8`, `#BDD8E9` swatches. |
| `slate` | Dark. Deep teal-navy ground (`#06141B`, `#11212D`), blue-grey surfaces, pale grey ink (`#CCD0CF`) and a single grey accent.  |
| `cobalt` | Light. Cool grey ground, tyre-black ink, one cobalt accent.  |
| `original` | The first design: warm stone ground, olive accent, Clash Grotesk and IBM Plex Sans, OpenStreetMap tiles. |

Switch from the "Theme:" links in the footer or the owner/admin sidebar, or add `?theme=original` (or `?theme=cobalt`, `?theme=slate`, `?theme=sky`, `?theme=modern`, `?theme=harbor`) to any URL. The choice is remembered in `localStorage`.

To add a theme, copy `src/styles/themes/cobalt.css`, change the selector to `:root[data-theme='yourname']`, edit the values, import it in `src/styles/tokens.css`, and add the name to `src/lib/theme.ts`. Components never hard-code colours; use the tokens (`var(--accent)`, `var(--card)`, `var(--on-dark)` and so on).

To change the default theme for everyone: give the new default theme's selector a leading `:root,` (for example `:root, :root[data-theme='cobalt']`), remove that from the old default's file, and set `DEFAULT_THEME` in `src/lib/theme.ts`.

Colour, font, size and radius differences are theme-bound. A few structural changes apply to both themes: the hexagon logo mark and map pins, and plain words instead of symbols like the star.

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
| `/` | Public 3D landing page for customers and investors |
| `/find`, `/garages`, `/garages/:id` | Public (`/find` is the app's location-based home) |
| `/login`, `/register`, `/verify-email` | Public |
| `/admin/login` | Public (rejects non-admin accounts) |
| `/notifications`, `/account` | Any signed-in user |
| `/owner`, `/owner/photos`, `/owner/services`, `/owner/hours`, `/owner/staff`, `/owner/registration` | Garage owners only |
| `/admin`, `/admin/registrations` | Administrators only |

`/owner/staff` manages the garage's private staff roster. Staff are optional; the owner may operate alone. Only the garage owner can see staff records, and public/customer responses do not include them.

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
- Map tiles are OpenStreetMap's public tiles (no API key) in their natural colours; themes do not recolour them. A theme can still tint them by setting `--map-tile-filter` to a CSS filter, but all themes leave it at `none`. OSM's servers are fine for development but not meant for heavy production traffic, and the CARTO basemaps now need an API key. Before launch, move to a keyed or self-hosted tile provider; sources are listed in `src/components/map/mapConfig.ts`.
- Pins are hexagons showing the garage's rating, the route has a casing line, and scroll-zoom only turns on after you click the map. Map colours come from the theme tokens (`--map-route` and friends).
- Driving routes come from the public OSRM demo server in `src/components/map/routing.ts`. It has fair-use limits and no live traffic. For production, self-host OSRM or use a provider such as OpenRouteService.
- A visitor's location is kept in `sessionStorage` for the browser session only and is never sent to the backend.

## Signing in locally

After seeding the backend (`docker compose exec api python -m app.db.seed` from `../backend`), the admin is `admin@seed.example.com`, and owners and customers are `owner0001`…`owner0500` and `customer0001`…`customer0200` at `@seed.example.com`. The shared password is printed once at the end of the seed output. Admins sign in at `/admin/login`; everyone else at `/login`.

Photo uploads need the backend's local storage provider (`STORAGE_PROVIDER=local`, already set in the backend `docker-compose.yml`); with the default stub provider uploads succeed but the images cannot be displayed.

Verification emails are stubbed: the link is printed in the API log (`docker compose logs api | grep -A8 "STUB EMAIL"`).

## Known gaps
- Owner pages for garage profile, reviews and analytics are not built yet (the backend endpoints exist).
- Customer account page is a placeholder; review editing and reporting UI is not built.
- No automated frontend tests yet; `npm run build` runs TypeScript checks and the Vite production build.
