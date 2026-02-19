import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const exercises = [
  { name: "Barbell Back Squat", primaryMuscle: "Quads", equipment: "Barbell" },
  { name: "Barbell Bench Press", primaryMuscle: "Chest", equipment: "Barbell" },
  { name: "Conventional Deadlift", primaryMuscle: "Posterior Chain", equipment: "Barbell" },
  { name: "Overhead Press", primaryMuscle: "Shoulders", equipment: "Barbell" },
  { name: "Bent-Over Row", primaryMuscle: "Back", equipment: "Barbell" },
  { name: "Lat Pulldown", primaryMuscle: "Back", equipment: "Machine" },
  { name: "Romanian Deadlift", primaryMuscle: "Hamstrings", equipment: "Barbell" },
  { name: "Walking Lunge", primaryMuscle: "Legs", equipment: "Dumbbell" },
  { name: "Leg Press", primaryMuscle: "Quads", equipment: "Machine" },
  { name: "Leg Curl", primaryMuscle: "Hamstrings", equipment: "Machine" },
  { name: "Dumbbell Incline Press", primaryMuscle: "Chest", equipment: "Dumbbell" },
  { name: "Cable Fly", primaryMuscle: "Chest", equipment: "Cable" },
  { name: "Lateral Raise", primaryMuscle: "Shoulders", equipment: "Dumbbell" },
  { name: "Biceps Curl", primaryMuscle: "Biceps", equipment: "Dumbbell" },
  { name: "Triceps Pushdown", primaryMuscle: "Triceps", equipment: "Cable" },
  { name: "Hip Thrust", primaryMuscle: "Glutes", equipment: "Barbell" }
];

async function main() {
  for (const exercise of exercises) {
    await prisma.exercise.upsert({
      where: { name: exercise.name },
      update: {
        primaryMuscle: exercise.primaryMuscle,
        equipment: exercise.equipment
      },
      create: exercise
    });
  }

  console.log(`Seeded ${exercises.length} exercises`);
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
