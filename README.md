# 🌱 HabitFlow — Modern Habit Tracker

A full-stack habit tracking app with pastel dashboard, analytics, and MongoDB persistence.

## Tech Stack
- **Frontend**: React 18 (Vite), custom CSS, Recharts
- **Backend**: Node.js + Express.js
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT (optional)

## Project Structure
```
Habit tracker/
├── client/    ← React frontend (Vite)
└── server/    ← Express backend
```

## Setup & Run

### Prerequisites
- Node.js v18+
- MongoDB running locally on port 27017  
  OR update `MONGO_URI` in `server/.env` with your Atlas connection string

### 1. Backend
```bash
cd server
npm install
npm run dev
# → Server starts on http://localhost:5000
```

### 2. Frontend
```bash
cd client
npm install
npm run dev
# → App starts on http://localhost:5173
```

## Environment Variables (`server/.env`)
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/habittracker
JWT_SECRET=habittracker_super_secret_key_2024
NODE_ENV=development
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /api/habits | List all habits |
| POST   | /api/habits | Create a habit |
| PUT    | /api/habits/:id | Update a habit |
| DELETE | /api/habits/:id | Delete a habit |
| POST   | /api/track | Toggle completion |
| GET    | /api/track | Fetch tracking records |
| GET    | /api/analytics | Get analytics data |
| POST   | /api/auth/register | Register user |
| POST   | /api/auth/login | Login user |

## Features
- ✅ Weekly habit grid with checkboxes
- ✅ Daily/custom frequency habits
- ✅ Color-coded habits
- ✅ Progress ring (today's completion)
- ✅ Streak tracking
- ✅ Analytics: bar, line, pie charts
- ✅ Dark/light mode
- ✅ Week navigation
- ✅ JWT authentication (optional)
