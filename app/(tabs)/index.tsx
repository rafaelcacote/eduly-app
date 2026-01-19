import BottomNav from '@/components/BottomNav';
import { LoadingSquares } from '@/components/loading-squares';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { Student, studentsService } from '@/services/students';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Bell, ChevronDown, LogOut } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function Home() {
  const router = useRouter();
  const { logout, isAuthenticated, user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const [isChangingStudent, setIsChangingStudent] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const loadStudents = useCallback(async () => {
    try {
      setIsLoadingStudents(true);
      const studentsList = await studentsService.getStudents();
      setStudents(studentsList);

      // Seleciona o primeiro aluno automaticamente se houver alunos
      if (studentsList.length > 0) {
        setSelectedStudent(studentsList[0]);
      }
    } catch (error: any) {
      Alert.alert(
        'Erro',
        error?.message || 'Não foi possível carregar os alunos. Tente novamente.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoadingStudents(false);
    }
  }, []);

  // Busca alunos ao carregar a tela
  useEffect(() => {
    if (isAuthenticated) {
      loadStudents();
    }
  }, [isAuthenticated, loadStudents]);

  const handleSelectStudent = async (student: Student) => {
    if (selectedStudent?.id === student.id) {
      setShowStudentSelector(false);
      return;
    }

    setShowStudentSelector(false);
    setIsChangingStudent(true);

    // Simula um pequeno delay para mostrar o loading e transição suave
    await new Promise(resolve => setTimeout(resolve, 600));

    setSelectedStudent(student);
    setIsChangingStudent(false);
  };

  const getStudentDisplayText = (student: Student | null): string => {
    if (!student || student.turmas.length === 0) {
      return 'Carregando...';
    }

    const turma = student.turmas[0]; // Pega a primeira turma ativa
    const nome = student.nome_social || student.nome;
    return `${nome} - ${turma.serie} ${turma.turma_letra}`;
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              await logout();
              // O redirecionamento será feito automaticamente pelo _layout.tsx
            } catch (error) {
              setIsLoggingOut(false);
              Alert.alert('Erro', 'Não foi possível fazer logout. Tente novamente.');
            }
          },
        },
      ]
    );
  };

  const messages = [
    { title: 'Exercício de Matemática', subtitle: 'Prof. Carlos', time: 'Hoje 14:30', icon: '📚' },
    { title: 'Aviso Importante', subtitle: 'Coordenação', time: 'Hoje 10:15', icon: '⚠️' },
    { title: 'Trabalho de Português', subtitle: 'Profa. Ana', time: 'Ontem 16:45', icon: '✍️' },
  ];

  const events = [
    { date: '02 Nov', title: 'Prova de Matemática', color: '#fee2e2', textColor: '#dc2626' },
    { date: '05 Nov', title: 'Entrega Trabalho de Ciências', color: '#d1fae5', textColor: '#059669' },
    { date: '08 Nov', title: 'Reunião de Pais', color: '#dbeafe', textColor: '#2563eb' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Agenda Escolar</Text>
          {isLoadingStudents ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.textMuted} />
              <Text style={styles.headerSubtitle}>Carregando...</Text>
            </View>
          ) : students.length > 1 ? (
            <TouchableOpacity
              style={styles.studentSelector}
              onPress={() => setShowStudentSelector(true)}
            >
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {getStudentDisplayText(selectedStudent)}
              </Text>
              <ChevronDown size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {getStudentDisplayText(selectedStudent)}
            </Text>
          )}
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <Bell size={20} color={Colors.text} />
            <View style={styles.badge} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
            <LogOut size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={Colors.gradient.primary as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.welcomeCard}
        >
          <Text style={styles.welcomeTitle}>
            Olá, {user?.nome_completo || '...'}!
          </Text>
          <Text style={styles.welcomeSubtitle}>
            Bem-vindo agenda escolar {selectedStudent?.school?.nome || '...'}.
          </Text>
        </LinearGradient>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: Colors.primary }]}>2</Text>
            <Text style={styles.statLabel}>Exercícios pendentes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: Colors.secondary }]}>1</Text>
            <Text style={styles.statLabel}>Prova próxima semana</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mensagens Recentes</Text>
          <View style={styles.messagesList}>
            {messages.map((msg, i) => (
              <TouchableOpacity
                key={i}
                style={styles.messageCard}
                onPress={() => router.push('/messages')}
              >
                <Text style={styles.messageIcon}>{msg.icon}</Text>
                <View style={styles.messageContent}>
                  <Text style={styles.messageTitle}>{msg.title}</Text>
                  <Text style={styles.messageSubtitle}>{msg.subtitle}</Text>
                </View>
                <Text style={styles.messageTime}>{msg.time}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Próximos Eventos</Text>
          <View style={styles.eventsList}>
            {events.map((event, i) => (
              <View key={i} style={styles.eventCard}>
                <View style={[styles.eventDate, { backgroundColor: event.color }]}>
                  <Text style={[styles.eventDateText, { color: event.textColor }]}>
                    {event.date}
                  </Text>
                </View>
                <Text style={styles.eventTitle}>{event.title}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <BottomNav />

      {/* Modal para seleção de aluno */}
      <Modal
        visible={showStudentSelector}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStudentSelector(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStudentSelector(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione o Aluno</Text>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {students.map((student) => {
                const turma = student.turmas[0];
                const nome = student.nome_social || student.nome;
                const isSelected = selectedStudent?.id === student.id;

                return (
                  <TouchableOpacity
                    key={student.id}
                    style={[
                      styles.studentOption,
                      isSelected && styles.studentOptionSelected,
                    ]}
                    onPress={() => handleSelectStudent(student)}
                  >
                    <View style={styles.studentOptionContent}>
                      <Text style={styles.studentOptionName}>{nome}</Text>
                      {turma && (
                        <Text style={styles.studentOptionTurma}>
                          {turma.serie} {turma.turma_letra}
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <View style={styles.selectedIndicator} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Overlay de loading ao trocar de aluno */}
      <Modal
        visible={isChangingStudent}
        transparent
        animationType="fade"
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingModal}>
            <LoadingSquares squareSize={20} gap={8} />
            <Text style={styles.loadingText}>Carregando aluno...</Text>
          </View>
        </View>
      </Modal>

      {/* Overlay de loading ao fazer logout */}
      <Modal
        visible={isLoggingOut}
        transparent
        animationType="fade"
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingModal}>
            <LoadingSquares squareSize={20} gap={8} />
            <Text style={styles.loadingText}>Saindo do sistema...</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0) + 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  studentSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.destructive,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  welcomeCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  messagesList: {
    gap: 8,
  },
  messageCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageIcon: {
    fontSize: 24,
  },
  messageContent: {
    flex: 1,
  },
  messageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  messageSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  messageTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  eventsList: {
    gap: 8,
  },
  eventCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eventDate: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  eventDateText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  studentOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studentOptionSelected: {
    backgroundColor: Colors.background,
  },
  studentOptionContent: {
    flex: 1,
  },
  studentOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  studentOptionTurma: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 12,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingModal: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
});
