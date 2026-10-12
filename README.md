# RouteRakshak

**Smart school and college transport tracking.**

RouteRakshak is a standalone transport-management project with a crystal-clear Frost Glass UI, simulated GPS, manual student journey attendance, and guardian-facing journey status concepts.

## Current prototype

The frontend now includes a demo workspace entry screen and role-specific views for school admins, school staff, drivers/conductors, and parents/guardians. The demo role picker and access-code field are **not real authentication**; any non-empty code opens the selected preview. Parent and assigned-bus filtering are illustrative frontend behavior only, not secure data isolation.

The app uses fictional demo data and browser-local persistence. It is not yet a production system: real authentication, server-side role enforcement, database-backed record scoping, cross-device real-time updates, and push/SMS notifications must be implemented in a trusted backend before use with real students.

## Journey events

- Board bus → `IN THE BUS`
- Confirm school arrival → `IN SCHOOL`
- Return boarding → `IN THE BUS` (new event; previous history retained)
- Confirm home drop → `HOME DROPPED`

Events should include server-generated timestamps, actor identity, trip and bus identifiers, guardian-scoped notifications, authorization checks, idempotency, and append-only audit history in production.

## Run locally

Open `index.html` in a modern browser. No build tools are required for this prototype.

## Deploy to Vercel

1. Import `hellovneet/RouteRakshak` from GitHub in the Vercel dashboard.
2. Choose **Other** as the framework preset if Vercel asks for one.
3. Leave the Build Command empty and set the Output Directory to `.` (the repository root).
4. Keep the Root Directory as `./` and deploy.

The repository includes a minimal `vercel.json` for clean URLs; Vercel's native static-file handling serves `index.html`, `styles.css`, and `app.js`. No Node.js build step is needed.

## Safety and privacy

Use fictional demo data only. Do not enter real children's personal information. Browser-local demo records are not shared between users or devices and are not a substitute for secure server storage.

## Future integration

The simulated GPS adapter can later be replaced by an authenticated GPS/ESP32 telemetry service without treating location alone as proof of student boarding.


## Map and location-data status
- The dashboard map uses OpenStreetMap's public tile service through Leaflet and displays real geographic map tiles with attribution.
- The Route A bus marker, speed, and progress are still **simulated demo telemetry** that updates every 4.5 seconds. No live vehicle hardware/GPS feed or cross-device realtime backend is connected yet.
- The sample route is in central New Delhi and is illustrative only; it is not a configured school route.
- For real vehicle tracking, connect an authenticated GPS device/app to a backend that validates device identity and timestamps, then stream updates to authorized users. Never treat GPS location alone as proof that a student boarded or was handed off.
- Map tiles require an internet connection. If Leaflet/map tiles are unavailable, the app shows a fallback message; the demo's journey workflow remains separate.
