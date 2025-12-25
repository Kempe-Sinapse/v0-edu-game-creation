"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, X, ArrowLeft, Trash2, Eye, EyeOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import type { Game, GameQuestion } from "@/lib/types"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Question {
  id?: string
  text: string
  correctAnswers: string[]
  distractors: string[]
}

export function EditGameForm({
  game,
  questions: initialQuestions,
}: {
  game: Game
  questions: GameQuestion[]
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(game.title)
  const [description, setDescription] = useState(game.description || "")
  const [timeLimit, setTimeLimit] = useState(game.time_limit.toString())
  const [revealAnswers, setRevealAnswers] = useState(game.reveal_answers ?? true)

  const [questions, setQuestions] = useState<Question[]>(
    initialQuestions.map((q) => ({
      id: q.id,
      text: q.question_text,
      correctAnswers: Array.isArray(q.correct_answers) ? q.correct_answers : [],
      distractors: Array.isArray(q.distractors) ? q.distractors : [],
    })),
  )

  // ... (mesmas funções auxiliares de add/remove question)
  const addQuestion = () => {
    setQuestions([...questions, { text: "", correctAnswers: [""], distractors: [] }])
  }

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index))
    }
  }

  const updateQuestionText = (index: number, value: string) => {
    const updated = [...questions]
    updated[index].text = value
    const blankCount = (value.match(/_{3,}/g) || []).length
    const currentAnswers = updated[index].correctAnswers
    if (blankCount > currentAnswers.length) {
      updated[index].correctAnswers = [...currentAnswers, ...Array(blankCount - currentAnswers.length).fill("")]
    } else if (blankCount < currentAnswers.length) {
      updated[index].correctAnswers = currentAnswers.slice(0, blankCount)
    }
    setQuestions(updated)
  }

  const updateCorrectAnswer = (questionIndex: number, answerIndex: number, value: string) => {
    const updated = [...questions]
    updated[questionIndex].correctAnswers[answerIndex] = value
    setQuestions(updated)
  }

  const addDistractor = (questionIndex: number) => {
    const updated = [...questions]
    updated[questionIndex].distractors.push("")
    setQuestions(updated)
  }

  const removeDistractor = (questionIndex: number, distractorIndex: number) => {
    const updated = [...questions]
    updated[questionIndex].distractors = updated[questionIndex].distractors.filter((_, i) => i !== distractorIndex)
    setQuestions(updated)
  }

  const updateDistractor = (questionIndex: number, distractorIndex: number, value: string) => {
    const updated = [...questions]
    updated[questionIndex].distractors[distractorIndex] = value
    setQuestions(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!title.trim()) {
      setError("Por favor, insira um título para a tarefa")
      setIsLoading(false)
      return
    }

    // Validate questions (simplificado para brevidade)
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const blankCount = (q.text.match(/_{3,}/g) || []).length
        if (!q.text.trim()) { setError(`Pergunta ${i + 1}: Texto vazio`); setIsLoading(false); return; }
        if (blankCount === 0) { setError(`Pergunta ${i + 1}: Sem lacunas (___)`); setIsLoading(false); return; }
        if (q.correctAnswers.some(a => !a.trim())) { setError(`Pergunta ${i + 1}: Resposta vazia`); setIsLoading(false); return; }
    }

    const supabase = createClient()

    try {
      const { error: gameError } = await supabase
        .from("games")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          time_limit: Number.parseInt(timeLimit),
          reveal_answers: revealAnswers,
        })
        .eq("id", game.id)

      if (gameError) throw gameError

      await supabase.from("game_questions").delete().eq("game_id", game.id)

      const questionsData = questions.map((q, index) => ({
        game_id: game.id,
        question_text: q.text.trim(),
        correct_answers: q.correctAnswers.map((a) => a.trim()),
        distractors: q.distractors.filter((d) => d.trim()).map((d) => d.trim()),
        position: index,
      }))

      const { error: questionsError } = await supabase.from("game_questions").insert(questionsData)

      if (questionsError) throw questionsError

      router.push("/teacher")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    const supabase = createClient()
    try {
      const { error } = await supabase.from("games").delete().eq("id", game.id)
      if (error) throw error
      router.push("/teacher")
      router.refresh()
    } catch (err) {
      setError("Falha ao excluir")
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/teacher">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Editar Avaliação</h1>
              <p className="text-sm text-muted-foreground">{game.title}</p>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting} size="sm">
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Avaliação?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Todos os dados e tentativas dos alunos serão perdidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                  Excluir Permanentemente
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <Card className="bg-card border-border">
            <CardHeader className="bg-secondary/20 border-b border-border">
              <CardTitle>Configurações</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Título</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Descrição</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Tempo (seg)</Label>
                  <Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} required />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-secondary/10">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Revelar Respostas</Label>
                    <p className="text-xs text-muted-foreground">Mostrar gabarito ao aluno</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {revealAnswers ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4" />}
                    <Checkbox checked={revealAnswers} onCheckedChange={(c) => setRevealAnswers(!!c)} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {questions.map((question, qIndex) => (
              <Card key={qIndex} className="bg-card border-border overflow-hidden">
                <CardHeader className="pb-3 pt-4 flex flex-row items-center justify-between bg-secondary/5">
                  <CardTitle className="text-base">Questão {qIndex + 1}</CardTitle>
                  {questions.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(qIndex)} className="text-destructive h-8">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Texto</Label>
                    <Textarea 
                      value={question.text} 
                      onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                      className="text-lg font-medium" 
                    />
                  </div>
                  {/* ... Inputs de respostas e distratores (similar ao CreateGameForm) ... */}
                  {/* Para brevidade, assuma que a estrutura de inputs é a mesma do CreateGameForm */}
                  {question.correctAnswers.length > 0 && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {question.correctAnswers.map((answer, aIndex) => (
                            <Input key={aIndex} value={answer} onChange={(e) => updateCorrectAnswer(qIndex, aIndex, e.target.value)} placeholder={`Resposta ${aIndex+1}`} className="border-primary/30" />
                        ))}
                      </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                      {question.distractors.map((d, dIndex) => (
                          <div key={dIndex} className="flex gap-1 items-center bg-secondary/30 p-1 rounded">
                              <Input value={d} onChange={(e) => updateDistractor(qIndex, dIndex, e.target.value)} className="h-8 min-w-[120px]" />
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeDistractor(qIndex, dIndex)}><X className="h-3 w-3" /></Button>
                          </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => addDistractor(qIndex)}><Plus className="h-3 w-3 mr-1" /> Distrator</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button type="button" variant="outline" onClick={addQuestion} className="w-full border-dashed"><Plus className="mr-2 h-4 w-4" /> Nova Pergunta</Button>
          </div>

          <div className="flex gap-4">
            <Link href="/teacher" className="flex-1">
                <Button variant="outline" className="w-full">Cancelar</Button>
            </Link>
            <Button type="submit" className="flex-1" disabled={isLoading}>{isLoading ? "Salvando..." : "Salvar Alterações"}</Button>
          </div>
        </form>
      </main>
    </div>
  )
}
