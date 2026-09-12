import type { FitnessGoal, FitnessLevel, IndoorOutdoor } from "./supabase/types";

export const GOALS: FitnessGoal[] = ["Stamina", "Weight Management", "Stress Relief", "Flexibility", "Sports Fitness"];
export const LEVELS: FitnessLevel[] = ["Beginner", "Intermediate", "Advanced"];
export const ACTIVITIES = ["Walking", "Running", "Cycling", "Yoga", "Badminton", "Gym", "Sports"];
export const DURATIONS = [5, 10, 15, 30] as const;
export const INDOOR_OUTDOOR: IndoorOutdoor[] = ["Indoor", "Outdoor", "Both"];
export const LANGUAGES = ["English", "Hindi", "Tamil", "Telugu", "Bengali", "Marathi"];
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const TIME_BUCKETS = [
  { label: "Morning", start: "07:00", end: "09:00" },
  { label: "Afternoon", start: "13:00", end: "15:00" },
  { label: "Evening", start: "17:00", end: "19:00" },
];

export type Duration = (typeof DURATIONS)[number];
