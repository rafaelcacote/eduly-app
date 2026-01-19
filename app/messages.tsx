import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { ArrowLeft, Search, Pin, Trash2 } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import BottomNav from '@/components/BottomNav';
import { useRouter } from 'expo-router';

export default function Messages() {
  const router = useRouter();

  const messages = [
    {
      id: 1,
      title: 'Exercício de Matemática',
      sender: 'Prof. Carlos Silva',
      preview: 'Resolvam os exercícios da página 45 até 50 do livro...',
      time: 'Hoje 14:30',
      unread: true,
      icon: '📚',
    },
    {
      id: 2,
      title: 'Aviso Importante - Reunião de Pais',
      sender: 'Coordenação Pedagógica',
      preview: 'Informamos que a reunião de pais está marcada para...',
      time: 'Hoje 10:15',
      unread: true,
      icon: '⚠️',
    },
    {
      id: 3,
      title: 'Trabalho de Português',
      sender: 'Profa. Ana Santos',
      preview: 'O trabalho sobre "Modernismo Brasileiro" deve ser entregue...',
      time: 'Ontem 16:45',
      unread: true,
      icon: '✍️',
    },
    {
      id: 4,
      title: 'Resultado da Prova de Ciências',
      sender: 'Prof. Roberto Costa',
      preview: 'Sua nota foi 8.5. Parabéns pelo desempenho!',
      time: '28 Out 09:20',
      unread: false,
      icon: '🧪',
    },
    {
      id: 5,
      title: 'Boletim Parcial - 1º Trimestre',
      sender: 'Secretaria Escolar',
      preview: 'Seu boletim parcial está disponível para consulta...',
      time: '25 Out 14:00',
      unread: false,
      icon: '📊',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mensagens</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Search size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar mensagens..."
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {messages.map((msg) => (
          <TouchableOpacity
            key={msg.id}
            style={[
              styles.messageCard,
              msg.unread && styles.messageCardUnread,
            ]}
          >
            <Text style={styles.messageIcon}>{msg.icon}</Text>
            <View style={styles.messageContent}>
              <View style={styles.messageHeader}>
                <Text
                  style={[
                    styles.messageTitle,
                    msg.unread && styles.messageTitleUnread,
                  ]}
                >
                  {msg.title}
                </Text>
                {msg.unread && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.messageSender}>{msg.sender}</Text>
              <Text style={styles.messagePreview} numberOfLines={2}>
                {msg.preview}
              </Text>
              <Text style={styles.messageTime}>{msg.time}</Text>
            </View>
            <View style={styles.messageActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Pin size={16} color={Colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Trash2 size={16} color={Colors.destructive} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
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
  searchContainer: {
    padding: 16,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 8,
  },
  messageCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageCardUnread: {
    backgroundColor: '#eff6ff',
    borderColor: Colors.primary + '33',
  },
  messageIcon: {
    fontSize: 24,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  messageTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  messageTitleUnread: {
    color: Colors.text,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  messageSender: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  messagePreview: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  messageTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  messageActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    padding: 6,
    borderRadius: 6,
  },
});

