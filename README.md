# 🌱 HabitFlow — Modern Habit Tracker

A full-stack habit tracking app with pastel dashboard, analytics, and MongoDB persistence.

## Tech Stack
- **Frontend**: React 18 (Vite), custom CSS, Recharts
- **Backend**: Node.js + Express.js
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT 

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
