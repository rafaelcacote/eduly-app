import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Student, studentsService } from '@/services/students';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const SELECTED_STUDENT_KEY = '@eduly:selectedStudentId';

interface StudentContextType {
  students: Student[];
  selectedStudent: Student | null;
  isLoading: boolean;
  setSelectedStudent: (student: Student | null) => Promise<void>;
  loadStudents: () => Promise<void>;
  refreshStudents: () => Promise<void>;
}

const StudentContext = createContext<StudentContextType | undefined>(undefined);

interface StudentProviderProps {
  children: ReactNode;
}

export function StudentProvider({ children }: StudentProviderProps) {
  const { isAuthenticated } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudentState] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Carrega lista de alunos
   */
  const loadStudents = useCallback(async () => {
    if (!isAuthenticated) {
      setStudents([]);
      setSelectedStudentState(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const studentsList = await studentsService.getStudents();
      setStudents(studentsList);

      // Se não houver alunos, limpa seleção
      if (studentsList.length === 0) {
        setSelectedStudentState(null);
        await AsyncStorage.removeItem(SELECTED_STUDENT_KEY);
        return;
      }

      // Tenta carregar aluno selecionado salvo
      try {
        const savedStudentId = await AsyncStorage.getItem(SELECTED_STUDENT_KEY);
        if (savedStudentId) {
          const savedStudent = studentsList.find(s => s.id === savedStudentId);
          if (savedStudent) {
            setSelectedStudentState(savedStudent);
            return;
          }
        }
      } catch (error) {
        console.warn('Erro ao carregar aluno selecionado:', error);
      }

      // Se não houver aluno salvo ou não encontrar, seleciona o primeiro
      if (studentsList.length > 0) {
        setSelectedStudentState(studentsList[0]);
        await AsyncStorage.setItem(SELECTED_STUDENT_KEY, studentsList[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
      setStudents([]);
      setSelectedStudentState(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * Define o aluno selecionado
   */
  const setSelectedStudent = useCallback(async (student: Student | null) => {
    if (student) {
      setSelectedStudentState(student);
      try {
        await AsyncStorage.setItem(SELECTED_STUDENT_KEY, student.id);
      } catch (error) {
        console.warn('Erro ao salvar aluno selecionado:', error);
      }
    } else {
      setSelectedStudentState(null);
      try {
        await AsyncStorage.removeItem(SELECTED_STUDENT_KEY);
      } catch (error) {
        console.warn('Erro ao remover aluno selecionado:', error);
      }
    }
  }, []);

  /**
   * Atualiza a lista de alunos
   */
  const refreshStudents = useCallback(async () => {
    await loadStudents();
  }, [loadStudents]);

  // Carrega alunos quando autenticação muda
  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Atualiza aluno selecionado se a lista mudar e o aluno atual não estiver mais na lista
  useEffect(() => {
    if (selectedStudent && students.length > 0) {
      const stillExists = students.some(s => s.id === selectedStudent.id);
      if (!stillExists && students.length > 0) {
        // Aluno foi removido, seleciona o primeiro
        setSelectedStudent(students[0]);
      }
    }
  }, [students, selectedStudent, setSelectedStudent]);

  return (
    <StudentContext.Provider
      value={{
        students,
        selectedStudent,
        isLoading,
        setSelectedStudent,
        loadStudents,
        refreshStudents,
      }}
    >
      {children}
    </StudentContext.Provider>
  );
}

/**
 * Hook para usar o contexto de aluno
 */
export function useStudent() {
  const context = useContext(StudentContext);
  if (context === undefined) {
    throw new Error('useStudent deve ser usado dentro de um StudentProvider');
  }
  return context;
}
