# API Walkthrough

Use this when demoing endpoints in interviews.

## Register
`POST /api/auth/register`

```json
{
  "name": "Alex Lifter",
  "email": "alex@example.com",
  "password": "password123"
}
```

## Create Split
`POST /api/splits`

```json
{
  "name": "Push Pull Legs",
  "goal": "Strength and hypertrophy",
  "days": [
    {
      "dayOfWeek": "MONDAY",
      "focus": "Push",
      "exercises": [
        {
          "exerciseId": "<exercise-cuid>",
          "targetSets": 4,
          "targetRepMin": 6,
          "targetRepMax": 10,
          "position": 1
        }
      ]
    }
  ]
}
```

## Log Session
`POST /api/workouts/sessions`

```json
{
  "splitDayId": "<split-day-cuid>",
  "notes": "Solid session",
  "exercises": [
    {
      "exerciseId": "<exercise-cuid>",
      "sets": [
        {
          "setNumber": 1,
          "reps": 8,
          "weightKg": 80,
          "rpe": 8.5
        },
        {
          "setNumber": 2,
          "reps": 7,
          "weightKg": 82.5,
          "rpe": 9
        }
      ]
    }
  ]
}
```

## Fetch Progress for Chart
`GET /api/analytics/exercise/<exercise-cuid>/progress?days=90`

Returns date-series points with:
- `bestWeight`
- `bestEstimatedOneRepMax`
- `totalReps`
- `totalVolume`
