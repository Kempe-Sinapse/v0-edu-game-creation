import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Check, X, Clock, ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { GameAttempt } from "@/lib/types"

export default async function StudentResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?role=student")
  }

  // Fetch attempt data
  const { data: attempt, error } = await supabase
    .from("game_attempts")
    .select(
      `
      *,
      games(title)
    `,
    )
    .eq("id", attemptId)
    .eq("student_id", user.id)
    .single()

  if (error || !attempt) {
    notFound()
  }

  const typedAttempt = attempt as GameAttempt & { games: { title: string } }
  const percentage = Math.round((typedAttempt.score / typedAttempt.total_questions) * 100)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
          <Link href="/student">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Game Results</h1>
            <p className="text-sm text-gray-600">{typedAttempt.games.title}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600">
              <Trophy className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-3xl">
              {percentage >= 80 ? "Excellent Work!" : percentage >= 60 ? "Good Job!" : "Keep Practicing!"}
            </CardTitle>
            <CardDescription className="text-lg">
              You scored {typedAttempt.score} out of {typedAttempt.total_questions} ({percentage}%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center gap-8 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{typedAttempt.score}</p>
                <p className="text-sm text-gray-600">Correct</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{typedAttempt.total_questions - typedAttempt.score}</p>
                <p className="text-sm text-gray-600">Incorrect</p>
              </div>
              <div>
                <Clock className="mx-auto mb-1 h-6 w-6 text-gray-600" />
                <p className="text-2xl font-bold text-gray-900">{typedAttempt.time_taken}s</p>
                <p className="text-sm text-gray-600">Time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Answer Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {typedAttempt.answers.map((answer, index) => (
              <div key={index} className="rounded border bg-white p-4">
                <div className="mb-2 flex items-start justify-between">
                  <p className="flex-1 font-medium">Question {index + 1}</p>
                  {answer.is_correct ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <X className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div className="text-sm">
                  <p className={answer.is_correct ? "text-green-700" : "text-red-700"}>
                    Your answer: <span className="font-semibold">{answer.user_answer || "(No answer)"}</span>
                  </p>
                  {!answer.is_correct && (
                    <p className="text-green-700">
                      Correct answer: <span className="font-semibold">{answer.correct_answer}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="mt-6">
          <Link href="/student">
            <Button className="w-full">Back to Dashboard</Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
