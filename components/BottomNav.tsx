import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Home, MessageSquare, BookOpen, ClipboardList, BarChart3, User } from 'lucide-react-native';
import { exercisesService } from '@/services/exercises';
import { messagesService } from '@/services/messages';
import { avisosService } from '@/services/avisos';
import { useAuth } from '@/context/AuthContext';
import { useStudent } from '@/context/StudentContext';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  href: string;
  badge?: number;
}

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();
  const { selectedStudent } = useStudent();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [newExercisesCount, setNewExercisesCount] = useState<number>(0);
  const homeHref = user?.type === 'teacher' ? '/teacher-dashboard' : '/(tabs)';
  const isResponsavel = user?.type === 'responsavel';

  const loadBadges = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const alunoId = selectedStudent?.id;
      const messagesPromise = messagesService.getUnreadCount(alunoId);
      const avisosPromise = avisosService.countNewAvisos();
      const exercisesPromise =
        isResponsavel && alunoId
          ? exercisesService.countNewExercises(alunoId)
          : Promise.resolve(0);

      const [messagesCount, avisosCount, exercisesCount] = await Promise.all([
        messagesPromise,
        avisosPromise,
        exercisesPromise,
      ]);

      setUnreadCount(messagesCount + avisosCount);
      setNewExercisesCount(exercisesCount);
    } catch (error) {
      console.error('Erro ao carregar badges de navegação:', error);
      setUnreadCount(0);
      setNewExercisesCount(0);
    }
  }, [isAuthenticated, selectedStudent, isResponsavel]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setNewExercisesCount(0);
      return;
    }

    loadBadges();

    const interval = setInterval(loadBadges, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, selectedStudent, loadBadges]);

  useEffect(() => {
    if (
      pathname === '/messages' ||
      pathname === '/message-detail' ||
      pathname === '/aviso-detail' ||
      pathname === '/exercises' ||
      pathname === '/exercise-detail' ||
      pathname === '/teacher-dashboard' ||
      pathname === '/' ||
      pathname.startsWith('/(tabs)')
    ) {
      loadBadges();
    }
  }, [pathname, loadBadges]);
  const navItems: NavItem[] = [
    { label: 'Início', icon: Home, href: homeHref, badge: undefined },
    { label: 'Comunicação', icon: MessageSquare, href: '/messages', badge: unreadCount > 0 ? unreadCount : undefined },
    {
      label: 'Exercícios',
      icon: BookOpen,
      href: '/exercises',
      badge: newExercisesCount > 0 ? newExercisesCount : undefined,
    },
    { label: 'Provas', icon: ClipboardList, href: '/exams', badge: undefined },
    // Boletim é exclusivo de responsáveis
    ...(isResponsavel
      ? [{ label: 'Boletim', icon: BarChart3, href: '/report', badge: undefined } as NavItem]
      : []),
    { label: 'Perfil', icon: User, href: '/perfil', badge: undefined },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.navContainer}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === homeHref && (pathname === homeHref || pathname === '/' || pathname.startsWith('/(tabs)')));
          const IconComponent = item.icon;
          const iconColor = isActive ? Colors.primary : Colors.textMuted;
          const textColor = isActive ? Colors.primary : Colors.textMuted;

          return (
            <TouchableOpacity
              key={item.href}
              onPress={() => {
                router.push(item.href as any);
              }}
              style={styles.navItem}
            >
              <View style={styles.iconContainer}>
                <IconComponent size={24} color={iconColor} />
                {item.badge !== undefined && item.badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.label, { color: textColor }]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 80,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.destructive,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
});

