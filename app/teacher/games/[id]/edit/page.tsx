import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { EditGameForm } from "@/components/edit-game-form"

export default async function EditGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?role=teacher")
  }

  // Verify user is a teacher
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()

  if (!profile || profile.role !== "teacher") {
    redirect("/")
  }

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .maybeSingle()

  if (!game || gameError) {
    redirect("/teacher")
  }

  // Fetch questions (now includes correct_answers and distractors as JSONB fields)
  const { data: questions } = await supabase
    .from("game_questions")
    .select("*")
    .eq("game_id", id)
    .order("position", { ascending: true })

  return <EditGameForm game={game} questions={questions || []} />
}
