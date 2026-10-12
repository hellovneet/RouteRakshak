# RouteRakshak

**Smart school and college transport tracking.**

RouteRakshak is a standalone transport-management project with a crystal-clear Frost Glass UI, simulated GPS, manual student journey attendance, and guardian-facing journey status concepts.

## Current prototype

This first version is a frontend prototype with demo data and browser-local persistence. It is not yet a production system: real authentication, server-side role enforcement, cross-device real-time updates, and push/SMS notifications must be implemented in a trusted backend before use with real students.

## Journey events

- Board bus → `IN THE BUS`
- Confirm school arrival → `IN SCHOOL`
- Return boarding → `IN THE BUS` (new event; previous history retained)
- Confirm home drop → `HOME DROPPED`

Events should include server-generated timestamps, actor identity, trip and bus identifiers, guardian-scoped notifications, authorization checks, idempotency, and append-only audit history in production.

## Run

Open `index.html` in a modern browser. No build tools are required for this prototype.

## Safety and privacy

Use fictional demo data only. Do not enter real children's personal information. Browser-local demo records are not shared between users or devices and are not a substitute for secure server storage.

## Future integration

The simulated GPS adapter can later be replaced by an authenticated GPS/ESP32 telemetry service without treating location alone as proof of student boarding.
