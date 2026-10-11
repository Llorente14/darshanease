# AGENTS.md - DarshanEase persistent context

Read this file FIRST in every session, before coding. Keep it updated (see "Maintenance rules").

## 1. Project
- DarshanEase: temple darshan ticket booking platform. Devotees browse temples and darshan slots, see real-time availability, book tickets, and get a booking confirmation (booking ID, e-ticket QR, email).
- Roles: Devotee, Organizer, Admin. Team: AXEL (solo developer).
- Sprint 1 (10-12 Oct 2026, 20 pts): core booking flow, USN-1 to USN-7, all High priority.
- Sprint 2 (13-15 Oct 2026, 20 pts): history, temple details, donation + payment, map, organizer/admin dashboards, reports. DO NOT build Sprint 2 features during Sprint 1.
- Never add features outside the story currently being implemented.

## 2. Tech stack (MERN, free tier, no credit card)
- Frontend: React (Vite), React Router, Axios, Socket.IO client. Host: Vercel. (Leaflet comes in Sprint 2.)
- Backend: Node.js + Express as API gateway. Security: JWT, bcrypt, Helmet, CORS, express-rate-limit, express-validator. Realtime: Socket.IO (USN-4). Host: Render.
- Database: MongoDB Atlas M0 + Mongoose.
- External: Brevo SMTP + Nodemailer (USN-7). Sprint 2: Midtrans Sandbox, Cloudinary, OpenStreetMap.

## 3. Repo structure
darshanease/
  .agent/skills/      (git-ignored)
  .gitignore          (the ONLY .gitignore, at root)
  AGENTS.md
  app/references/     (design reference for the frontend)
  backend/  config/ controllers/ middleware/ models/ routes/ services/ utils/ + server.js, .env, .env.example, package.json
  frontend/ public/ src/ + .env, index.html, package.json, vite.config.js
Rules: only one .gitignore (root). Never commit .env files. Check "git status" before every commit.

## 4. Database (exactly 4 collections, NO Donation collection)
- User: UserID(PK), Name, Email, Phone, Address (+ password hash, role)
- Temple: TempleID(PK), TempleName, Location, DarshanStartTime, DarshanEndTime
- DarshanSlot: SlotID(PK), TempleID(FK), Date, StartTime, EndTime, AvailableSeats, Price
- Booking: BookingID(PK), UserID(FK), SlotID(FK), BookingDate, TotalAmount (+ numberOfDevotees, status default "confirmed"; donationAmount comes in Sprint 2 as a field inside Booking)
- Relations: User 1-N Booking, Temple 1-N DarshanSlot, DarshanSlot 1-N Booking.
- Sprint 1 temple and slot data is seeded manually (organizer dashboard is Sprint 2).

## 5. Sprint 1 status (update after each story)
Legend: [ ] pending  [~] in progress  [x] done
- [x] USN-1 Registration (3 pts)
- [x] USN-2 Login + role-based access (2 pts)
- [ ] USN-3 Darshan slot list (3 pts)
- [ ] USN-4 Real-time availability: Socket.IO + atomic $inc (3 pts)
- [ ] USN-5 Slot selection and booking (4 pts)
- [ ] USN-6 Booking confirmation page + QR e-ticket (3 pts)
- [ ] USN-7 Confirmation email via Brevo (2 pts)
Planned order: USN-1, 2, 3, 5, 4, 6, 7, deploy. USN-4 is built after USN-5 because the atomic seat logic lives in the Seat Service called by Booking.

## 6. Implemented contracts (do not break these)
API base: {VITE_API_URL} = http://localhost:5000/api (local).
Response shapes:
- Success: { success:true, message, data }
- Error: { success:false, message, errors?:[{field,message}] }
- Status codes: 201 created, 401 unauthenticated, 403 forbidden, 409 conflict (duplicate), 422 validation, 429 rate limited.
Endpoints done:
- GET  /api/health
- POST /api/auth/register  body {name,email,phone,address,password} -> 201 {data:{user,token}}. Role is always "devotee" (never read from body). Password: min 8, at least 1 letter and 1 number. Phone regex ^\+?[0-9]{9,15}$.
- POST /api/auth/login  body {email,password} -> 200 {data:{user,token}}. Generic 401 "Invalid email or password" on unknown email or wrong password with dummy bcrypt compare to prevent timing enumeration. Rate limited by loginLimiter (10 failed attempts / 15 min per IP, skipSuccessfulRequests: true).
- GET  /api/auth/me  header Authorization: Bearer <token> -> 200 {data:{user}}. Protected by protect middleware (TokenExpiredError -> 401 "Session expired, please log in again", JsonWebTokenError -> 401 "Invalid token").
Auth & Middleware:
- JWT payload { id, role }, secret JWT_SECRET, expiry JWT_EXPIRES_IN (7d).
- Header: Authorization: Bearer <token>. Token stored in localStorage (keys: "darshanease_token", "darshanease_user").
- Backend helpers: utils/generateToken.js, utils/asyncHandler.js, middleware/errorHandler.js, middleware/rateLimiter.js (global 100/15min, authLimiter 20/15min, loginLimiter 10/15min with skipSuccessfulRequests), validators + validate middleware (422 with field errors).
- Auth middleware: middleware/authMiddleware.js exporting `protect` (verifies Bearer token, attaches req.user without password) and `authorize(...roles)` (verifies req.user.role, 403 if forbidden).
- User.password has select:false. toJSON strips password and __v. User.prototype.comparePassword(candidate) instance method for bcrypt comparison.
Frontend:
- localStorage keys: "darshanease_token", "darshanease_user".
- Files: services/api.js (axios instance with request Bearer interceptor, response 401 interceptor with setUnauthorizedHandler), services/authService.js (register, login, getMe), context/AuthContext.jsx (+ useAuth, session verification on start via getMe, isAuthenticated derived), components/ProtectedRoute.jsx (session loader, redirect to /login with state.from, allowedRoles support with 403 page), pages/Register.jsx, pages/Login.jsx, pages/Dashboard.jsx.
- Design: follow app/references exactly in structure; the ONLY change is the primary color = ORANGE tokens: primary #F97316, hover #EA580C, dark #C2410C, light #FFEDD5, soft #FFF7ED. Defined once centrally, never hardcoded in components. Keep UI copy language consistent with the reference.

## 7. Engineering rules
- Backend module style: follow backend/package.json ("type": "module" -> ESM, otherwise CommonJS).
- Wrap controllers with asyncHandler. Never return or log passwords or hashes. Compute prices/totals on the server only. Validate every input with express-validator.
- Frontend: handle idle/loading/error/success states, disable submit while loading, wrap localStorage in try/catch, no libraries beyond those in the stack.
- Prices and seats must never be trusted from the client. Seat changes must be atomic (findOneAndUpdate with availableSeats >= n and $inc).
- Email sending must never break the booking flow (non-blocking, log failures).
- Known risk: Render free tier may block outbound SMTP ports; verify email on production, fallback is Brevo HTTP API.

## 8. Workflow and git
- Work in small steps; ONE step = ONE atomic commit with the exact message given in the task prompt.
- Commit format: type(scope): short imperative description. Types: feat, fix, chore, style, docs, refactor, test. Scopes: backend, frontend, or omit for repo-level.
- Order per story: backend first, then frontend. After each step run the code, check "git status", ensure no .env is staged.
- Do not rewrite or reformat files unrelated to the current step.

## 9. Maintenance rules
- When a story is finished: update section 5 status, add new endpoints/contracts to section 6, and add a note to "Working notes". Commit as: docs: update agents context for USN-X.
- If the real code differs from this file, trust the code and fix this file.

## 10. Working notes
- Decisions: orange theme on top of the reference structure; localStorage + Bearer; Booking gets numberOfDevotees and status.
- Blockers: (none)
- Progress log: USN-1 backend + frontend done. USN-2 backend + frontend done.
