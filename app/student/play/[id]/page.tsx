import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { GamePlayInterface } from "@/components/game-play-interface"

export default async function PlayGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?role=student")
  }

  // Verify user is a student
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "student") {
    redirect("/")
  }

  // Fetch game data
  const { data: game, error: gameError } = await supabase.from("games").select("*").eq("id", id).single()

  if (gameError || !game) {
    notFound()
  }

  // Fetch questions
  const { data: questions } = await supabase
    .from("game_questions")
    .select("*")
    .eq("game_id", id)
    .order("position", { ascending: true })

  if (!questions || questions.length === 0) {
    notFound()
  }

  // Removed allWords - agora cada pergunta terá seu próprio banco
  // const allWords: string[] = []
  // questions.forEach((q) => {
  //   if (q.correct_answers) {
  //     allWords.push(...q.correct_answers)
  //   }
  //   if (q.distractors) {
  //     allWords.push(...q.distractors)
  //   }
  // })

  // Removed parâmetro allWords - cada pergunta gerencia suas próprias palavras
  return <GamePlayInterface game={game} questions={questions} studentId={user.id} />
}
