"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
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
import { ArrowLeft, Plus, Users, UserPlus, Trash2, GraduationCap, School, ChevronRight } from "lucide-react"
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
      router.refresh()
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Header com Glassmorphism */}
      <header className="border-b border-white/5 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/teacher">
              <Button variant="ghost" size="icon" className="hover:bg-white/5">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Gerenciamento de Turmas</h1>
              <p className="text-sm text-muted-foreground">Organize seus alunos e grupos de estudo</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="hidden sm:flex border-white/10 hover:bg-white/5">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Atribuir Aluno
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-white/10">
                <form onSubmit={handleAssignStudent}>
                  <DialogHeader>
                    <DialogTitle>Atribuir Aluno à Turma</DialogTitle>
                    <DialogDescription>Selecione o aluno e a turma de destino.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Aluno</Label>
                      <Select value={selectedStudent} onValueChange={setSelectedStudent} required>
                        <SelectTrigger className="bg-secondary/50 border-white/10">
                          <SelectValue placeholder="Selecione um aluno" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.display_name} {student.class_id && "(Já possui turma)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Turma de Destino</Label>
                      <Select value={selectedClass} onValueChange={setSelectedClass} required>
                        <SelectTrigger className="bg-secondary/50 border-white/10">
                          <SelectValue placeholder="Selecione uma turma" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-destructive focus:text-destructive">
                            Remover de qualquer turma
                          </SelectItem>
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
                    <Button type="button" variant="ghost" onClick={() => setIsAssignOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Salvando..." : "Confirmar Atribuição"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="font-bold shadow-lg shadow-primary/20">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Turma
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-white/10">
                <form onSubmit={handleCreateClass}>
                  <DialogHeader>
                    <DialogTitle>Criar Nova Turma</DialogTitle>
                    <DialogDescription>Defina o nome e detalhes da nova turma.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="class-name">Nome da Turma</Label>
                      <Input
                        id="class-name"
                        placeholder="Ex: Biologia - 3º Ano A"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        required
                        className="bg-secondary/50 border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="class-description">Descrição (Opcional)</Label>
                      <Textarea
                        id="class-description"
                        placeholder="Detalhes adicionais sobre a turma..."
                        value={newClassDescription}
                        onChange={(e) => setNewClassDescription(e.target.value)}
                        rows={3}
                        className="bg-secondary/50 border-white/10 resize-none"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
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
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        
        {/* Grid de Turmas */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Card de "Todas as Turmas" ou Estatística Geral (Opcional, mas dá um charme) */}
          <Card className="bg-gradient-to-br from-primary/20 to-secondary/30 border-primary/20 backdrop-blur-sm flex flex-col justify-center items-center text-center p-6 min-h-[200px]">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-4 text-primary">
              <School className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-bold text-white">{classes.length}</h3>
            <p className="text-muted-foreground">Turmas Ativas</p>
          </Card>

          {classes.map((classItem) => {
            const studentsInClass = students.filter((s) => s.class_id === classItem.id)

            return (
              <Card key={classItem.id} className="group bg-card border-white/5 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="h-10 w-10 rounded-lg bg-secondary/50 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClass(classItem.id)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mt-1 -mr-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardTitle className="mt-4 text-lg">{classItem.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {classItem.description || "Sem descrição definida."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Users className="h-4 w-4" />
                    <span className="font-medium text-foreground">{studentsInClass.length}</span> alunos matriculados
                  </div>
                  
                  {studentsInClass.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {studentsInClass.slice(0, 3).map((student) => (
                        <span
                          key={student.id}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary/50 text-secondary-foreground border border-white/5"
                        >
                          {student.display_name.split(' ')[0]}
                        </span>
                      ))}
                      {studentsInClass.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary/30 text-muted-foreground border border-white/5">
                          +{studentsInClass.length - 3}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Nenhum aluno nesta turma.</p>
                  )}
                </CardContent>
                <CardFooter className="pt-0">
                  <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-1/3 opacity-50 group-hover:w-full group-hover:opacity-100 transition-all duration-700 ease-out" />
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>

        {/* Lista Geral de Alunos (Tabela simplificada) */}
        <Card className="border border-white/5 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Todos os Alunos</CardTitle>
                <CardDescription>Visão geral de todos os estudantes cadastrados na plataforma</CardDescription>
              </div>
              <DialogTrigger asChild onClick={() => setIsAssignOpen(true)}>
                 <Button variant="outline" size="sm" className="border-white/10 sm:hidden">
                    <UserPlus className="h-4 w-4" />
                 </Button>
              </DialogTrigger>
            </div>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-lg">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Nenhum aluno cadastrado no sistema ainda.</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Os alunos precisam criar uma conta primeiro.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {students.map((student) => {
                  const studentClass = classes.find((c) => c.id === student.class_id)
                  return (
                    <div key={student.id} className="flex items-center justify-between py-4 hover:bg-white/5 transition-colors px-2 rounded-lg -mx-2">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                          {student.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{student.display_name}</p>
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {studentClass ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                            {studentClass.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
                            Sem turma
                          </span>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-white"
                          onClick={() => {
                            setSelectedStudent(student.id)
                            setIsAssignOpen(true)
                          }}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
