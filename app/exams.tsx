import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { ArrowLeft, Clock, MapPin } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import BottomNav from '@/components/BottomNav';
import { useRouter } from 'expo-router';

export default function Exams() {
  const router = useRouter();

  const exams = [
    {
      id: 1,
      subject: 'Matemática',
      date: '02 Nov 2025',
      time: '08:00 - 10:00',
      room: 'Sala 6º A',
      teacher: 'Prof. Carlos Silva',
      content: 'Frações, Decimais e Porcentagem',
      status: 'upcoming',
    },
    {
      id: 2,
      subject: 'Português',
      date: '04 Nov 2025',
      time: '10:30 - 12:00',
      room: 'Sala 6º A',
      teacher: 'Profa. Ana Santos',
      content: 'Leitura e Interpretação de Textos',
      status: 'upcoming',
    },
    {
      id: 3,
      subject: 'Ciências',
      date: '06 Nov 2025',
      time: '08:00 - 09:30',
      room: 'Sala 6º A',
      teacher: 'Prof. Roberto Costa',
      content: 'Fotossíntese e Ecossistemas',
      status: 'upcoming',
    },
    {
      id: 4,
      subject: 'História',
      date: '08 Nov 2025',
      time: '13:00 - 14:30',
      room: 'Sala 6º A',
      teacher: 'Profa. Mariana Oliveira',
      content: 'Revolução Francesa e Napoleão',
      status: 'upcoming',
    },
    {
      id: 5,
      subject: 'Inglês',
      date: '10 Nov 2025',
      time: '10:00 - 11:00',
      room: 'Sala 6º A',
      teacher: 'Prof. James Wilson',
      content: 'Present Continuous e Past Simple',
      status: 'upcoming',
    },
  ];

  const calendarDays = Array.from({ length: 30 }, (_, i) => i + 1);
  const examDays = [2, 4, 6, 8, 10];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Provas</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarTitle}>Novembro 2025</Text>
            <View style={styles.calendarNav}>
              <TouchableOpacity style={styles.calendarNavButton}>
                <Text style={styles.calendarNavText}>←</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.calendarNavButton}>
                <Text style={styles.calendarNavText}>→</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.calendarGrid}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day) => (
              <View key={day} style={styles.calendarDayHeader}>
                <Text style={styles.calendarDayHeaderText}>{day}</Text>
              </View>
            ))}
            {calendarDays.map((day) => {
              const hasExam = examDays.includes(day);
              return (
                <View
                  key={day}
                  style={[
                    styles.calendarDay,
                    hasExam && styles.calendarDayExam,
                  ]}
                >
                  <Text
                    style={[
                      styles.calendarDayText,
                      hasExam && styles.calendarDayTextExam,
                    ]}
                  >
                    {day}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Próximas Provas</Text>
        {exams.map((exam) => (
          <View key={exam.id} style={styles.examCard}>
            <View style={styles.examHeader}>
              <View>
                <Text style={styles.examSubject}>{exam.subject}</Text>
                <Text style={styles.examTeacher}>
                  Prof. {exam.teacher.split(' ')[1]}
                </Text>
              </View>
              <Text style={styles.examDate}>{exam.date}</Text>
            </View>

            <View style={styles.examDetails}>
              <View style={styles.examDetailRow}>
                <Clock size={16} color={Colors.textMuted} />
                <Text style={styles.examDetailText}>{exam.time}</Text>
              </View>
              <View style={styles.examDetailRow}>
                <MapPin size={16} color={Colors.textMuted} />
                <Text style={styles.examDetailText}>{exam.room}</Text>
              </View>
              <View style={styles.examContent}>
                <Text style={styles.examContentLabel}>Conteúdo: {exam.content}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <BottomNav />
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
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  placeholder: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 16,
  },
  calendarCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  calendarNav: {
    flexDirection: 'row',
    gap: 8,
  },
  calendarNavButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  calendarNavText: {
    fontSize: 16,
    color: Colors.text,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  calendarDayHeader: {
    width: '13%',
    paddingVertical: 8,
    alignItems: 'center',
  },
  calendarDayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  calendarDay: {
    width: '13%',
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  calendarDayExam: {
    backgroundColor: Colors.primary,
  },
  calendarDayText: {
    fontSize: 12,
    color: Colors.text,
  },
  calendarDayTextExam: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  examCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  examSubject: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  examTeacher: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  examDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  examDetails: {
    gap: 8,
  },
  examDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  examDetailText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  examContent: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 8,
  },
  examContentLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
  },
});

