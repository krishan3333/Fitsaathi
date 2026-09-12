// Hand-written mirror of supabase/migrations/0001_init.sql.
// Regenerate with `supabase gen types typescript` once the project is live.

export type FitnessGoal = "Stamina" | "Weight Management" | "Stress Relief" | "Flexibility" | "Sports Fitness";
export type FitnessLevel = "Beginner" | "Intermediate" | "Advanced";
export type IndoorOutdoor = "Indoor" | "Outdoor" | "Both";
export type StudentLevel = "Beginner" | "Active" | "Consistent" | "Campus Champion";
export type CrowdLevel = "Low" | "Medium" | "High";
export type SafetyRating = "Good" | "Fair" | "Poor";
export type ChallengeType =
  | "daily_steps" | "weekly_steps" | "walking_distance" | "workout_minutes"
  | "active_streak" | "cycling_distance" | "running_distance" | "team_steps"
  | "department_vs_department" | "hostel_vs_hostel";
export type ActivityType = "walk" | "run" | "cycle" | "workout" | "quest" | "gps_route";
export type FreeSlot = { day: string; start: string; end: string };

export type Profile = {
  id: string;
  name: string;
  college: string | null;
  department: string | null;
  fitness_goal: FitnessGoal | null;
  fitness_level: FitnessLevel | null;
  preferred_activities: string[];
  preferred_duration: 5 | 10 | 15 | 30 | null;
  indoor_outdoor: IndoorOutdoor;
  free_slots: FreeSlot[];
  preferred_language: string;
  low_impact: boolean;
  role: "student" | "coordinator";
  account_type: "student" | "personal";
  avatar_url: string | null;
  nickname: string | null;
  hide_steps: boolean;
  hide_location: boolean;
  use_nickname: boolean;
  notifications_enabled: boolean;
  current_streak: number;
  longest_streak: number;
  level: StudentLevel;
  onboarded: boolean;
  created_at: string;
}

export type FitCircle = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export type CircleMember = {
  id: string;
  circle_id: string;
  profile_id: string;
  joined_at: string;
}

export type Challenge = {
  id: string;
  circle_id: string | null;
  created_by: string | null;
  title: string;
  type: ChallengeType;
  goal_value: number;
  unit: string;
  start_date: string;
  end_date: string;
  is_official: boolean;
  college: string | null;
  group_a: string | null;
  group_b: string | null;
  created_at: string;
}

export type ChallengeParticipant = {
  id: string;
  challenge_id: string;
  profile_id: string;
  group_label: string | null;
  progress_value: number;
  joined_at: string;
}

export type Activity = {
  id: string;
  profile_id: string;
  activity_type: ActivityType;
  steps: number;
  distance_km: number;
  active_minutes: number;
  source: "manual" | "quest" | "gps_route";
  occurred_on: string;
  created_at: string;
}

export type Quest = {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  difficulty: "Easy" | "Medium" | "Hard";
  location: string;
  estimated_steps: number;
  points: number;
  indoor_outdoor: "Indoor" | "Outdoor";
  quest_type: string;
  audience: "student" | "personal" | "any";
  profile_id: string | null; // null = shared catalogue; set = AI-generated, personal to that student
  created_at: string;
}

export type QuestCompletion = {
  id: string;
  quest_id: string;
  profile_id: string;
  completed_at: string;
}

export type CampusLocation = {
  id: string;
  name: string;
  college: string;
  activity_type: string;
  lat: number;
  lng: number;
  distance_km: number;
  estimated_steps: number;
  crowd_level: CrowdLevel;
  safety_rating: SafetyRating;
  has_water: boolean;
  is_open: boolean;
  created_at: string;
}

export type RouteRow = {
  id: string;
  name: string;
  distance_km: number;
  path: [number, number][];
  location_id: string | null;
  created_at: string;
}

export type RouteCheckin = {
  id: string;
  location_id: string;
  profile_id: string;
  crowd_level: CrowdLevel;
  created_at: string;
}

export type Notification = {
  id: string;
  profile_id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export type UserBadge = {
  id: string;
  profile_id: string;
  badge_id: string;
  earned_at: string;
}

/** Columns other students are allowed to see (see migration 0005). */
export type PublicProfile = Pick<
  Profile,
  "id" | "name" | "nickname" | "use_nickname" | "avatar_url" | "college" | "department" | "level" | "current_streak" | "hide_steps"
>;

type Table<Row, Insert> = { Row: Row; Insert: Insert; Update: Partial<Row>; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Partial<Profile> & { id: string }>;
      fit_circles: Table<FitCircle, Partial<FitCircle>>;
      circle_members: Table<CircleMember, Partial<CircleMember>>;
      challenges: Table<Challenge, Partial<Challenge>>;
      challenge_participants: Table<ChallengeParticipant, Partial<ChallengeParticipant>>;
      activities: Table<Activity, Partial<Activity>>;
      quests: Table<Quest, Partial<Quest>>;
      quest_completions: Table<QuestCompletion, Partial<QuestCompletion>>;
      campus_locations: Table<CampusLocation, Partial<CampusLocation>>;
      routes: Table<RouteRow, Partial<RouteRow>>;
      route_checkins: Table<RouteCheckin, Partial<RouteCheckin>>;
      notifications: Table<Notification, Partial<Notification>>;
      badges: Table<Badge, Partial<Badge>>;
      user_badges: Table<UserBadge, Partial<UserBadge>>;
    };
    Views: {
      public_profiles: { Row: PublicProfile; Relationships: [] };
    };
    Functions: {
      friends_available_now: {
        Args: Record<string, never>;
        Returns: number;
      };
      coordinator_overview: {
        Args: Record<string, never>;
        Returns: {
          active_students_week: number;
          total_campus_steps: number;
          most_active_department: string | null;
          most_popular_route: string | null;
          most_active_hour: number | null;
        }[];
      };
      coordinator_department_leaderboard: {
        Args: Record<string, never>;
        Returns: { department: string; total_steps: number; active_students: number }[];
      };
      coordinator_route_usage: {
        Args: Record<string, never>;
        Returns: { route_name: string; checkins: number }[];
      };
      coordinator_broadcast_announcement: {
        Args: { announcement_title: string; announcement_body: string };
        Returns: void;
      };
      join_circle_by_code: {
        Args: { p_invite_code: string };
        Returns: { id: string; name: string }[];
      };
    };
  };
}
