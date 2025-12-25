import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CreateGameForm } from "@/components/create-game-form"

export default async function CreateGamePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?role=teacher")
  }

  // Verify user is a teacher
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "teacher") {
    redirect("/")
  }

  const { data: classes } = await supabase
    .from("classes")
    .select("*")
    .eq("teacher_id", user.id)
    .order("name", { ascending: true })

  return <CreateGameForm teacherId={user.id} classes={classes || []} />
}
