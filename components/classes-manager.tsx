"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Users, UserPlus, Trash2 } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Class, StudentWithProfile } from "@/lib/types"

interface ClassesManagerProps {
  teacherId: string
  initialClasses: Class[]
  initialStudents: StudentWithProfile[]
}

export function ClassesManager({ teacherId, initialClasses, initialStudents }: ClassesManagerProps) {
  const router = useRouter()
  const [classes, setClasses] = useState<Class[]>(initialClasses)
  const [students, setStudents] = useState<StudentWithProfile[]>(initialStudents)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [newClassName, setNewClassName] = useState("")
  const [newClassDescription, setNewClassDescription] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<string>("")
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  console.log("[v0] ClassesManager - Alunos iniciais:", initialStudents)
  console.log("[v0] ClassesManager - Total de alunos:", students.length)

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase
      .from("classes")
      .insert({
        teacher_id: teacherId,
        name: newClassName.trim(),
        description: newClassDescription.trim() || null,
      })
      .select()
      .single()

    if (!error && data) {
      setClasses([data, ...classes])
      setNewClassName("")
      setNewClassDescription("")
      setIsCreateOpen(false)
    }

    setIsLoading(false)
  }

  const handleAssignStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()
    const { error } = await supabase
      .from("profiles")
      .update({ class_id: selectedClass === "none" ? null : selectedClass })
      .eq("id", selectedStudent)

    if (!error) {
      setStudents(
        students.map((s) =>
          s.id === selectedStudent ? { ...s, class_id: selectedClass === "none" ? null : selectedClass } : s,
        ),
      )
      setSelectedStudent("")
      setSelectedClass("")
      setIsAssignOpen(false)
      router.refresh()
    }

    setIsLoading(false)
  }

  const handleDeleteClass = async (classId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta turma? Os alunos serão desvinculados.")) {
      return
    }

    const supabase = createClient()
    const { error } = await supabase.from("classes").delete().eq("id", classId)

    if (!error) {
      setClasses(classes.filter((c) => c.id !== classId))
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <header className="border-b-4 border-green-600 bg-white shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-5">
          <Link href="/teacher">
            <Button variant="ghost" size="icon" className="hover:bg-green-100">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-green-800">Gerenciar Turmas</h1>
            <p className="text-base text-gray-600">Crie turmas e atribua alunos</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold">
                <Plus className="mr-2 h-4 w-4" />
                Nova Turma
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateClass}>
                <DialogHeader>
                  <DialogTitle>Criar Nova Turma</DialogTitle>
                  <DialogDescription>Adicione uma nova turma para seus alunos</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="class-name">Nome da Turma *</Label>
                    <Input
                      id="class-name"
                      placeholder="ex: 3º Ano - Biologia"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="class-description">Descrição</Label>
                    <Textarea
                      id="class-description"
                      placeholder="Informações sobre a turma"
                      value={newClassDescription}
                      onChange={(e) => setNewClassDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Criando..." : "Criar Turma"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {/* Lista de Turmas */}
        <Card className="border-2 border-green-200">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-900 flex items-center">
              <Users className="mr-2 h-6 w-6" />
              Minhas Turmas
            </CardTitle>
            <CardDescription>Gerencie suas turmas e veja os alunos matriculados</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {classes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">Você ainda não criou nenhuma turma</p>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-green-600 hover:bg-green-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeira Turma
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {classes.map((classItem) => {
                  const studentsInClass = students.filter((s) => s.class_id === classItem.id)

                  return (
                    <Card key={classItem.id} className="border-2 border-green-300">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-xl">{classItem.name}</CardTitle>
                            {classItem.description && (
                              <CardDescription className="mt-1">{classItem.description}</CardDescription>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClass(classItem.id)}
                            className="text-red-600 hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="h-4 w-4" />
                          <span className="font-semibold">
                            {studentsInClass.length} {studentsInClass.length === 1 ? "aluno" : "alunos"}
                          </span>
                        </div>
                        {studentsInClass.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {studentsInClass.map((student) => (
                              <span
                                key={student.id}
                                className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800"
                              >
                                {student.display_name}
                              </span>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Atribuir Alunos */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-blue-900 flex items-center">
              <UserPlus className="mr-2 h-6 w-6" />
              Atribuir Alunos às Turmas
            </CardTitle>
            <CardDescription>Selecione um aluno e a turma para atribuir</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {students.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-2">Nenhum aluno cadastrado no sistema</p>
                <p className="text-sm text-gray-500">Os alunos precisam se cadastrar primeiro na plataforma</p>
              </div>
            ) : (
              <div className="space-y-6">
                <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full border-2 border-blue-400 text-blue-700 hover:bg-blue-50 bg-transparent"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Atribuir Aluno
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handleAssignStudent}>
                      <DialogHeader>
                        <DialogTitle>Atribuir Aluno à Turma</DialogTitle>
                        <DialogDescription>Selecione o aluno e a turma</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Aluno</Label>
                          <Select value={selectedStudent} onValueChange={setSelectedStudent} required>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um aluno" />
                            </SelectTrigger>
                            <SelectContent>
                              {students.map((student) => (
                                <SelectItem key={student.id} value={student.id}>
                                  {student.display_name} {student.class_id && "(já tem turma)"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Turma</Label>
                          <Select value={selectedClass} onValueChange={setSelectedClass} required>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma turma" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Remover de turma</SelectItem>
                              {classes.map((classItem) => (
                                <SelectItem key={classItem.id} value={classItem.id}>
                                  {classItem.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAssignOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? "Atribuindo..." : "Atribuir"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Lista de todos os alunos */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">Todos os Alunos ({students.length})</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {students.map((student) => {
                      const studentClass = classes.find((c) => c.id === student.class_id)

                      return (
                        <div
                          key={student.id}
                          className="flex items-center justify-between rounded-lg border-2 border-gray-200 p-3 hover:bg-gray-50"
                        >
                          <div>
                            <p className="font-semibold text-gray-900">{student.display_name}</p>
                            <p className="text-sm text-gray-600">{student.email}</p>
                          </div>
                          <div className="text-right">
                            {studentClass ? (
                              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                                {studentClass.name}
                              </span>
                            ) : (
                              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
                                Sem turma
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
