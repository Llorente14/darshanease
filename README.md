<p align="center">
  <img src="frontend/public/favicon.svg" alt="DarshanEase logo" width="96" height="96" />
</p>

<h1 align="center">DarshanEase</h1>

<p align="center">
  Online darshan slot booking for temples, built on the MERN stack.
</p>

<p align="center">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-22.x-339933?logo=nodedotjs&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img alt="Express" src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white" />
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white" />
  <img alt="Socket.IO" src="https://img.shields.io/badge/Socket.IO-4-010101?logo=socketdotio&logoColor=white" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Seeding Data](#seeding-data)
  - [Running the App](#running-the-app)
  - [Creating Organizer and Admin Accounts](#creating-organizer-and-admin-accounts)
- [Payments (Midtrans Sandbox)](#payments-midtrans-sandbox)
- [Available Scripts](#available-scripts)
- [API Overview](#api-overview)
- [Data Model](#data-model)
- [Author](#author)

---

## Overview

Popular temples often deal with long queues and unclear visit quotas. Devotees arrive without knowing when they can enter, and organizers still track slots and bookings by hand.

DarshanEase moves this process online. Devotees browse darshan slots and book them, and seat availability updates in real time. Organizers manage their temples and slots, and administrators oversee users and reports from one dashboard.

## Features

**Devotee**
- Browse temples and darshan slots without signing in, with filters by temple and date
- View temple details with a location map and the list of upcoming slots
- Book a slot for multiple devotees, with an optional donation
- Pay through Midtrans Snap; seats are held until the payment window ends
- Get a booking confirmation email with a QR ticket
- Modify the number of devotees on a booking, or cancel it, from the booking history
- Receive in-app notifications about booking and payment activity

**Organizer**
- Create, edit, and delete their own temples
- Manage darshan slots, including capacity, price, and status

**Admin**
- Search and filter users, change user roles, and activate or deactivate accounts
- View reports: confirmed revenue, donations, bookings by status, popular temples, and devotee demographics

**Platform**
- Real-time seat availability with Socket.IO
- Role-based access control on both the client and the server
- JWT authentication with hashed passwords
- Security middleware (Helmet, rate limiting, input validation)

## Tech Stack

| Layer      | Technology                                                    |
| ---------- | ------------------------------------------------------------- |
| Frontend   | React 19, Vite, React Router, Axios, Motion, Recharts, Leaflet |
| Backend    | Node.js, Express 5, Mongoose, Socket.IO                       |
| Database   | MongoDB (MongoDB Atlas)                                       |
| Auth       | JSON Web Token, bcrypt                                        |
| Payments   | Midtrans Snap (sandbox)                                       |
| Email      | Nodemailer with Brevo SMTP                                    |
| Security   | Helmet, express-rate-limit, express-validator                 |

## Project Structure

```
darshanease/
├── backend/
│   ├── config/          # Database, socket, mailer, and Midtrans configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth, role guard, validators, error handler
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express routes
│   ├── services/        # Business logic (booking, payment, email, ticket)
│   ├── utils/           # Seed script, role helpers, date utilities
│   └── server.js        # Application entry point
├── frontend/
│   ├── public/          # Static assets and logo
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── context/     # Auth context
│       ├── hooks/       # Custom hooks (real-time slot updates)
│       ├── pages/       # Route-level pages
│       ├── services/    # API and socket clients
│       └── utils/       # Formatting and helpers
└── .gitignore
```

## Getting Started

### Prerequisites

- Node.js 22.x or later
- npm
- A MongoDB Atlas cluster (the free tier is enough)
- A Midtrans sandbox account
- A Brevo account for SMTP (optional; needed only for confirmation emails)

### Installation

```bash
git clone https://github.com/Llorente14/darshanease.git
cd darshanease

cd backend
npm install

cd ../frontend
npm install
```

### Environment Variables

Copy the example files, then fill in the values.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**backend/.env**

| Variable                      | Description                                               | Example                   |
| ----------------------------- | --------------------------------------------------------- | ------------------------- |
| `PORT`                        | API server port                                           | `5000`                    |
| `NODE_ENV`                    | Runtime environment                                       | `development`             |
| `MONGO_URI`                   | MongoDB connection string                                 | `mongodb+srv://...`       |
| `JWT_SECRET`                  | Secret used to sign tokens                                | a long random string      |
| `JWT_EXPIRES_IN`              | Token lifetime                                            | `7d`                      |
| `CLIENT_URL`                  | Frontend origin, used for CORS                            | `http://localhost:5173`   |
| `BREVO_SMTP_HOST`             | SMTP host                                                 | `smtp-relay.brevo.com`    |
| `BREVO_SMTP_PORT`             | SMTP port                                                 | `587`                     |
| `BREVO_SMTP_USER`             | SMTP login                                                |                           |
| `BREVO_SMTP_PASS`             | SMTP key                                                  |                           |
| `MAIL_FROM`                   | Sender address for outgoing emails                        |                           |
| `MIDTRANS_SERVER_KEY`         | Midtrans server key                                       | `SB-Mid-server-...`       |
| `MIDTRANS_CLIENT_KEY`         | Midtrans client key                                       | `SB-Mid-client-...`       |
| `MIDTRANS_IS_PRODUCTION`      | Use the Midtrans production environment                   | `false`                   |
| `PAYMENT_TIMEOUT_MINUTES`     | Optional. How long seats are held for an unpaid booking   | `15`                      |
| `PAYMENT_SWEEP_GRACE_MINUTES` | Optional. Grace period before expired bookings are swept  | `5`                       |

**frontend/.env**

| Variable                   | Description               | Example                                              |
| -------------------------- | ------------------------- | ---------------------------------------------------- |
| `VITE_API_URL`             | Backend API base URL      | `http://localhost:5000/api`                          |
| `VITE_SOCKET_URL`          | Socket.IO server URL      | `http://localhost:5000`                              |
| `VITE_MIDTRANS_CLIENT_KEY` | Midtrans client key       | `SB-Mid-client-...`                                  |
| `VITE_MIDTRANS_SNAP_URL`   | Midtrans Snap script URL  | `https://app.sandbox.midtrans.com/snap/snap.js`      |

### Seeding Data

The seed script loads sample temples and darshan slots, with slot dates generated from the current date.

```bash
cd backend
npm run seed
```

Use `npm run seed -- --reset` to clear existing seeded data before seeding. The script refuses to run when `NODE_ENV=production` unless `--force` is passed.

### Running the App

Run the backend and the frontend in two separate terminals.

```bash
# Terminal 1
cd backend
npm run dev
```

```bash
# Terminal 2
cd frontend
npm run dev
```

| Service  | URL                         |
| -------- | --------------------------- |
| Frontend | http://localhost:5173       |
| API      | http://localhost:5000/api   |

### Creating Organizer and Admin Accounts

Every new account starts as a devotee. To promote an account, register it in the app first, then run the matching script from the `backend` folder:

```bash
npm run make-organizer -- organizer@example.com
npm run make-admin -- admin@example.com
```

Sign out and sign in again so the new role is applied.

## Payments (Midtrans Sandbox)

1. Sign in to the Midtrans dashboard in **Sandbox** mode and copy the server key and the client key into both `.env` files.
2. Set the Payment Notification URL in the dashboard to:
```
   https://<your-public-backend-url>/api/payments/midtrans/notification
```
   For local development, expose the backend with a tunneling tool such as ngrok.
3. Pay using the test credentials from the Midtrans sandbox documentation.

The server always verifies the payment status with Midtrans. Client-side Snap callbacks only trigger a status check and never change a booking directly.

## Available Scripts

**backend**

| Script                   | Description                              |
| ------------------------ | ---------------------------------------- |
| `npm run dev`            | Start the API with nodemon               |
| `npm start`              | Start the API with Node                  |
| `npm run seed`           | Seed temples and darshan slots           |
| `npm run make-organizer` | Promote an existing user to organizer    |
| `npm run make-admin`     | Promote an existing user to admin        |

**frontend**

| Script            | Description                      |
| ----------------- | -------------------------------- |
| `npm run dev`     | Start the Vite dev server        |
| `npm run build`   | Build for production             |
| `npm run preview` | Preview the production build     |
| `npm run lint`    | Run ESLint                       |

## API Overview

| Base Path                  | Access             | Purpose                              |
| -------------------------- | ------------------ | ------------------------------------ |
| `/api/auth`                | Public             | Register, login, current user        |
| `/api/temples`             | Public             | List temples and view temple details |
| `/api/slots`               | Public             | List darshan slots                   |
| `/api/bookings`            | Authenticated      | Create, view, modify, cancel         |
| `/api/payments`            | Authenticated / Midtrans | Payment sync and notifications |
| `/api/organizer/temples`   | Organizer, Admin   | Manage own temples                   |
| `/api/organizer/slots`     | Organizer, Admin   | Manage darshan slots                 |
| `/api/admin/users`         | Admin              | Manage users and roles               |
| `/api/admin/reports`       | Admin              | Reports and analytics                |

## Data Model

The application uses four collections:

| Collection    | Description                                                        |
| ------------- | ------------------------------------------------------------------ |
| `User`        | Account data and role (devotee, organizer, admin)                  |
| `Temple`      | Temple profile, location, darshan hours, and owner                 |
| `DarshanSlot` | Bookable time slot with capacity, available seats, price, status   |
| `Booking`     | Reservation with devotee count, donation, total, payment status    |

## Author

**Axel** (Llorente14)
GitHub: [@Llorente14](https://github.com/Llorente14)
