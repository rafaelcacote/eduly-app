import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface CalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  markedDates?: number[]; // Array de dias do mês que têm eventos (1-31)
  onDayPress?: (day: number) => void;
  selectedDay?: number | null; // Dia selecionado para filtro
}

export default function Calendar({
  selectedDate,
  onDateChange,
  markedDates = [],
  onDayPress,
  selectedDay = null,
}: CalendarProps) {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  // Navega para o mês anterior
  const goToPreviousMonth = () => {
    const newDate = new Date(year, month - 1, 1);
    onDateChange(newDate);
  };

  // Navega para o próximo mês
  const goToNextMonth = () => {
    const newDate = new Date(year, month + 1, 1);
    onDateChange(newDate);
  };

  // Obtém o primeiro dia do mês e quantos dias tem o mês
  // Cria uma data local para evitar problemas de timezone
  const firstDayDate = new Date(year, month, 1);
  const firstDayOfMonth = firstDayDate.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Nome do mês em português
  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  const monthName = monthNames[month];
  const capitalizedMonth = `${monthName} ${year}`;

  // Verifica se é hoje
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();
  const isCurrentMonth = todayMonth === month && todayYear === year;

  // Dias da semana
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

  return (
    <View style={styles.calendarCard}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity
          onPress={goToPreviousMonth}
          style={styles.navButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.calendarTitle}>{capitalizedMonth}</Text>
        
        <TouchableOpacity
          onPress={goToNextMonth}
          style={styles.navButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronRight size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.calendarGrid}>
        {/* Cabeçalho dos dias da semana */}
        {weekDays.map((day) => (
          <View key={day} style={styles.calendarDayHeader}>
            <Text style={styles.calendarDayHeaderText}>{day}</Text>
          </View>
        ))}

        {/* Renderiza todos os 42 espaços possíveis (6 semanas x 7 dias) */}
        {Array.from({ length: 42 }).map((_, index) => {
          // Calcula qual dia do mês esta célula representa
          // Se o primeiro dia do mês é domingo (0), então index 0 = dia 1
          // Se o primeiro dia do mês é quarta (3), então index 3 = dia 1
          const dayNumber = index - firstDayOfMonth + 1;
          
          // Verifica se esta célula deve mostrar um dia do mês atual
          const isValidDay = dayNumber >= 1 && dayNumber <= daysInMonth;
          
          // Se não for um dia válido, mostra célula vazia
          if (!isValidDay) {
            return <View key={`empty-${index}`} style={styles.calendarDay} />;
          }

          const hasEvent = markedDates.includes(dayNumber);
          const isToday = isCurrentMonth && dayNumber === todayDate;
          const isSelected = selectedDay === dayNumber;

          return (
            <TouchableOpacity
              key={`day-${dayNumber}`}
              style={[
                styles.calendarDay,
                hasEvent && styles.calendarDayExam,
                isToday && styles.calendarDayToday,
                isSelected && styles.calendarDaySelected,
              ]}
              onPress={() => onDayPress?.(dayNumber)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.calendarDayText,
                  hasEvent && styles.calendarDayTextExam,
                  isToday && styles.calendarDayTextToday,
                ]}
              >
                {dayNumber}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  navButton: {
    padding: 8,
    borderRadius: 8,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayHeader: {
    width: '14.28%', // 100% / 7 dias = 14.28%
    paddingVertical: 8,
    alignItems: 'center',
  },
  calendarDayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  calendarDay: {
    width: '14.28%', // 100% / 7 dias = 14.28%
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    minHeight: 36,
  },
  calendarDayExam: {
    backgroundColor: Colors.primary,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  calendarDaySelected: {
    backgroundColor: Colors.primary + '30',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  calendarDayText: {
    fontSize: 12,
    color: Colors.text,
  },
  calendarDayTextExam: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  calendarDayTextToday: {
    fontWeight: 'bold',
    color: Colors.primary,
  },
});
