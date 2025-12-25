export type UserRole = "teacher" | "student"

export interface Profile {
  id: string
  email: string
  display_name: string
  role: UserRole
  class_id: string | null // Adicionado class_id
  created_at: string
  updated_at: string
}

export interface Game {
  id: string
  teacher_id: string
  title: string
  description: string | null
  time_limit: number
  class_id: string | null // Adicionado class_id
  is_published: boolean // Adicionado status de publicação
  published_at: string | null // Adicionado data de publicação
  created_at: string
  updated_at: string
}

export interface GameQuestion {
  id: string
  game_id: string
  question_text: string
  correct_answers: string[] // Pode ter até 5 respostas
  distractors: string[] // Palavras de distração específicas desta pergunta
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
  can_retry: boolean // Adicionado controle de nova tentativa
  answers: {
    question_id: string
    user_answers: string[] // Múltiplas respostas
    correct_answers: string[]
    is_correct: boolean
  }[]
  completed_at: string
}

// Tipo para turmas
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
