export type UserRole = "teacher" | "student"

export interface Profile {
  id: string
  email: string
  display_name: string
  role: UserRole
  class_id: string | null
  created_at: string
  updated_at: string
}

export interface Game {
  id: string
  teacher_id: string
  title: string
  description: string | null
  time_limit: number
  class_id: string | null
  is_published: boolean
  published_at: string | null
  reveal_answers: boolean // Novo campo
  created_at: string
  updated_at: string
}

// ... restante das interfaces (GameQuestion, GameAttempt, Class, etc.)
export interface GameQuestion {
  id: string
  game_id: string
  question_text: string
  correct_answers: string[]
  distractors: string[]
  position: number
  created_at: string
}

export interface GameAttempt {
  id: string
  game_id: string
  student_id: string
  score: number
  total_questions: number
  time_taken: number
  can_retry: boolean
  answers: {
    question_id: string
    user_answers: string[]
    correct_answers: string[]
    is_correct: boolean
  }[]
  completed_at: string
}

export interface Class {
  id: string
  teacher_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface StudentWithProfile extends Profile {
  role: "student"
}
