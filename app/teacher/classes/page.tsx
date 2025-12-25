import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ClassesManager } from "@/components/classes-manager"

export default async function ClassesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?role=teacher")
  }

  let profile
  try {
    const { data, error } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (error) {
      console.error("[v0] Error fetching profile:", error)
      redirect("/")
    }

    profile = data
  } catch (err) {
    console.error("[v0] Exception fetching profile:", err)
    redirect("/")
  }

  if (!profile || profile.role !== "teacher") {
    redirect("/")
  }

  // Buscar turmas do professor
  const { data: classes } = await supabase
    .from("classes")
    .select("*")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false })

  let students = []
  try {
    const { data: studentsData, error: studentsError } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .order("display_name", { ascending: true })

    console.log("[v0] Alunos encontrados:", studentsData)
    console.log("[v0] Erro ao buscar alunos:", studentsError)
    console.log("[v0] Total de alunos:", studentsData?.length || 0)

    if (studentsData && !studentsError) {
      students = studentsData
    } else {
      console.error("[v0] Error fetching students:", studentsError)
    }
  } catch (err) {
    console.error("[v0] Exception fetching students:", err)
  }

  return <ClassesManager teacherId={user.id} initialClasses={classes || []} initialStudents={students} />
}
