import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Home, MessageSquare, BookOpen, ClipboardList, BarChart3, Settings } from 'lucide-react-native';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  href: string;
  badge?: number;
}

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { label: 'Início', icon: Home, href: '/(tabs)', badge: undefined },
    { label: 'Mensagens', icon: MessageSquare, href: '/messages', badge: 3 },
    { label: 'Exercícios', icon: BookOpen, href: '/exercises', badge: 2 },
    { label: 'Provas', icon: ClipboardList, href: '/exams', badge: undefined },
    { label: 'Boletim', icon: BarChart3, href: '/report', badge: undefined },
    { label: 'Mais', icon: Settings, href: '/menu', badge: undefined },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.navContainer}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/(tabs)' && pathname === '/(tabs)');
          const IconComponent = item.icon;
          const iconColor = isActive ? Colors.primary : Colors.textMuted;
          const textColor = isActive ? Colors.primary : Colors.textMuted;

          return (
            <TouchableOpacity
              key={item.href}
              onPress={() => {
                if (item.href === '/(tabs)') {
                  router.push('/(tabs)');
                } else {
                  router.push(item.href as any);
                }
              }}
              style={styles.navItem}
            >
              <View style={styles.iconContainer}>
                <IconComponent size={24} color={iconColor} />
                {item.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
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
    fontSize: 12,
    fontWeight: '500',
  },
});

