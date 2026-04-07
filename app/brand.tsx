import { BrandData } from '@/brand/brand-data';
import { Colors } from '@/constants/colors';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  House,
  MessageSquare,
  Smartphone,
  Users,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

function PhonePreview({ activeIndex }: { activeIndex: number }) {
  const pages = ['dashboard', 'tabs', 'exercicios'] as const;
  const page = pages[activeIndex % pages.length];

  return (
    <View style={phoneStyles.wrap}>
      <View style={phoneStyles.frame}>
        <View style={phoneStyles.notch} />
        <View style={phoneStyles.screen}>
          <LinearGradient
            colors={['#f8fbff', '#eef4ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={phoneStyles.screenBg}
          >
            <View style={phoneStyles.topBar}>
              <View style={phoneStyles.topPill} />
              <View style={phoneStyles.topPillSmall} />
            </View>

            {page === 'dashboard' ? (
              <>
                <View style={[phoneStyles.heroCard, { backgroundColor: Colors.primary }]}>
                  <Text style={phoneStyles.heroCardTitle}>Dashboard - Rafael</Text>
                  <Text style={phoneStyles.heroCardSubtitle}>8 recados, 3 provas esta semana</Text>
                </View>
                <View style={phoneStyles.grid}>
                  <View style={phoneStyles.metric}>
                    <Text style={phoneStyles.metricValue}>08</Text>
                    <Text style={phoneStyles.metricLabel}>Recados</Text>
                  </View>
                  <View style={phoneStyles.metric}>
                    <Text style={phoneStyles.metricValue}>03</Text>
                    <Text style={phoneStyles.metricLabel}>Atividades</Text>
                  </View>
                </View>
                <View style={phoneStyles.activityCard}>
                  <Text style={phoneStyles.activityTitle}>Proxima prova</Text>
                  <Text style={phoneStyles.activitySubtitle}>Matematica - Quinta, 10:00</Text>
                </View>
              </>
            ) : null}

            {page === 'tabs' ? (
              <View style={phoneStyles.tabsPage}>
                <Text style={phoneStyles.tabsTitle}>Navegacao por Tabs</Text>
                <View style={phoneStyles.list}>
                  {['Inicio', 'Mensagens', 'Exercicios', 'Provas'].map((item) => (
                    <View key={item} style={phoneStyles.itemRow}>
                      <View style={phoneStyles.avatar} />
                      <View style={phoneStyles.itemTextWrap}>
                        <Text style={phoneStyles.itemTitle}>{item}</Text>
                        <View style={phoneStyles.itemLine} />
                      </View>
                    </View>
                  ))}
                </View>
                <View style={phoneStyles.fakeTabBar}>
                  <View style={phoneStyles.tabItemActive}>
                    <House size={14} color={Colors.primary} />
                    <Text style={phoneStyles.tabTextActive}>Inicio</Text>
                  </View>
                  <View style={phoneStyles.tabItem}>
                    <MessageSquare size={14} color={Colors.textMuted} />
                    <Text style={phoneStyles.tabText}>Msgs</Text>
                  </View>
                  <View style={phoneStyles.tabItem}>
                    <ClipboardList size={14} color={Colors.textMuted} />
                    <Text style={phoneStyles.tabText}>Provas</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {page === 'exercicios' ? (
              <View style={phoneStyles.list}>
                <Text style={phoneStyles.tabsTitle}>Exercicios da Semana</Text>
                {[
                  'Matematica - Lista 05',
                  'Portugues - Interpretacao',
                  'Historia - Revolucao Industrial',
                ].map((item) => (
                  <View key={item} style={phoneStyles.assignmentCard}>
                    <Text style={phoneStyles.assignmentTitle}>{item}</Text>
                    <View style={phoneStyles.itemLine} />
                    <View style={[phoneStyles.itemLine, { width: '55%' }]} />
                    <View style={phoneStyles.assignmentMeta}>
                      <CalendarDays size={13} color={Colors.primary} />
                      <Text style={phoneStyles.assignmentMetaText}>Entrega: Sexta-feira</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </LinearGradient>
        </View>
      </View>
    </View>
  );
}

export default function BrandPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [activePreview, setActivePreview] = useState(0);

  const isWide = width >= 980;

  useEffect(() => {
    const timer = setInterval(() => {
      setActivePreview((prev) => (prev + 1) % 3);
    }, 2600);
    return () => clearInterval(timer);
  }, []);

  const features = useMemo(
    () => [
      {
        icon: MessageSquare,
        title: 'Comunicação Instantânea',
        description: 'Mensagens entre escola, professores e responsáveis sem ruído.',
      },
      {
        icon: ClipboardList,
        title: 'Gestão de Avaliações',
        description: 'Organize provas, entregas e lembretes em poucos toques.',
      },
      {
        icon: BookOpen,
        title: 'Rotina Acadêmica',
        description: 'Atividades e conteúdos com visual simples para todos.',
      },
      {
        icon: Users,
        title: 'Turmas Integradas',
        description: 'Acompanhe cada turma com visão clara e contexto completo.',
      },
      {
        icon: BarChart3,
        title: 'Visão de Desempenho',
        description: 'Acompanhe progresso com dados acessíveis para decisão rápida.',
      },
      {
        icon: Smartphone,
        title: 'Mobile First',
        description: 'Experiência pensada para celular, rápida e intuitiva.',
      },
    ],
    []
  );

  const goToLogin = () => router.push('/login');
  const openContact = () => Linking.openURL(`mailto:${BrandData.contact.email}`);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={BrandData.colors.gradient.primary as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={[styles.heroInner, !isWide && styles.heroInnerStack]}>
            <View style={[styles.left, !isWide && styles.leftStack]}>
              <Image
                source={require('@/assets/images/eduly_logo_login.png')}
                style={styles.logo}
                contentFit="contain"
              />
              <Text style={styles.title}>A plataforma escolar que conecta toda a comunidade.</Text>
              <Text style={styles.subtitle}>
                O Eduly simplifica comunicação, atividades e gestão acadêmica com um visual moderno
                e prático.
              </Text>

              <View style={styles.ctaRow}>
                <TouchableOpacity style={styles.mainCta} onPress={goToLogin}>
                  <Text style={styles.mainCtaText}>Acessar o app</Text>
                  <ArrowRight size={18} color={Colors.white} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.ghostCta} onPress={openContact}>
                  <Text style={styles.ghostCtaText}>Falar com a equipe</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.proofRow}>
              <Text style={styles.proofPill}>Tempo real</Text>
                <Text style={styles.proofPill}>Foco em escolas</Text>
              <Text style={styles.proofPill}>Dashboard + Tabs</Text>
              </View>
            </View>

            <View style={[styles.right, !isWide && styles.rightStack]}>
              <PhonePreview activeIndex={activePreview} />
              <View style={styles.dots}>
                {[0, 1, 2].map((idx) => (
                  <View key={idx} style={[styles.dot, activePreview === idx && styles.dotActive]} />
                ))}
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uma landing para divulgar seu app com clareza</Text>
          <Text style={styles.sectionSub}>
            Estrutura inspirada em páginas modernas: proposta de valor forte, prova visual e CTA
            direto.
          </Text>

          <View style={styles.featureGrid}>
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <View key={feature.title} style={styles.featureCard}>
                  <View style={styles.iconWrap}>
                    <Icon size={20} color={Colors.primary} />
                  </View>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureText}>{feature.description}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.valueBox}>
          <Text style={styles.valueTitle}>Por que esse layout converte melhor?</Text>
          <View style={styles.valueList}>
            {[
              'Mensagem principal objetiva no primeiro bloco',
              'Mockup do app visível sem precisar rolar',
              'Sessão de benefícios com leitura rápida',
              'CTA principal repetido em pontos estratégicos',
            ].map((item) => (
              <View key={item} style={styles.valueItem}>
                <CheckCircle2 size={18} color={Colors.success} />
                <Text style={styles.valueText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <LinearGradient
          colors={BrandData.colors.gradient.primary as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bottomCta}
        >
          <Text style={styles.bottomCtaTitle}>Pronto para divulgar o Eduly?</Text>
          <Text style={styles.bottomCtaSub}>
            Seu app já tem identidade forte. Agora a landing está no mesmo nível.
          </Text>
          <TouchableOpacity style={styles.bottomCtaButton} onPress={goToLogin}>
            <Text style={styles.bottomCtaButtonText}>Entrar no Eduly</Text>
            <ArrowRight size={18} color={Colors.primary} />
          </TouchableOpacity>
        </LinearGradient>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 34 },
  hero: {
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0) + 34,
    paddingBottom: 36,
    paddingHorizontal: 20,
  },
  heroInner: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroInnerStack: { flexDirection: 'column' },
  left: { flex: 1, maxWidth: 620 },
  leftStack: { maxWidth: '100%' },
  right: { width: 340, alignItems: 'center' },
  rightStack: { width: '100%', marginTop: 12 },
  logo: { width: 240, height: 64, marginBottom: 14 },
  title: { fontSize: 38, lineHeight: 44, color: Colors.white, fontWeight: '800', marginBottom: 12 },
  subtitle: { color: 'rgba(255,255,255,0.92)', fontSize: 17, lineHeight: 25, marginBottom: 18 },
  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  mainCta: {
    backgroundColor: Colors.white,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mainCtaText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  ghostCta: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12 },
  ghostCtaText: { color: Colors.white, fontWeight: '600', fontSize: 15 },
  proofRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  proofPill: { backgroundColor: 'rgba(255,255,255,0.16)', color: Colors.white, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, fontSize: 12, fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 7, marginTop: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 22, backgroundColor: Colors.white },
  section: { paddingHorizontal: 20, paddingTop: 34, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  sectionTitle: { fontSize: 30, lineHeight: 36, color: Colors.text, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  sectionSub: { textAlign: 'center', color: Colors.textSecondary, fontSize: 16, lineHeight: 23, marginBottom: 20 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  featureCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 16,
    width: '49%',
  },
  iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#e8f0ff', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  featureTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  featureText: { fontSize: 13.5, lineHeight: 20, color: Colors.textSecondary },
  valueBox: {
    marginHorizontal: 20,
    marginTop: 26,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
  },
  valueTitle: { color: Colors.text, fontSize: 22, fontWeight: '800', marginBottom: 12 },
  valueList: { gap: 10 },
  valueItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  valueText: { color: Colors.textSecondary, fontSize: 14.5, flex: 1 },
  bottomCta: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  bottomCtaTitle: { color: Colors.white, fontSize: 27, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  bottomCtaSub: { color: 'rgba(255,255,255,0.92)', textAlign: 'center', fontSize: 15, marginBottom: 14 },
  bottomCtaButton: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomCtaButtonText: { color: Colors.primary, fontWeight: '700' },
});

const phoneStyles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  frame: {
    width: 290,
    height: 590,
    borderRadius: 42,
    backgroundColor: '#0f172a',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 10,
  },
  notch: {
    position: 'absolute',
    top: 8,
    left: '50%',
    transform: [{ translateX: -52 }],
    width: 104,
    height: 24,
    backgroundColor: '#0f172a',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: 2,
  },
  screen: { flex: 1, borderRadius: 34, overflow: 'hidden', backgroundColor: '#f8fbff' },
  screenBg: { flex: 1, paddingHorizontal: 14, paddingTop: 34, paddingBottom: 12 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  topPill: { width: 88, height: 8, borderRadius: 999, backgroundColor: '#dbeafe' },
  topPillSmall: { width: 46, height: 8, borderRadius: 999, backgroundColor: '#e2e8f0' },
  heroCard: { borderRadius: 14, padding: 14, marginBottom: 12 },
  heroCardTitle: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  heroCardSubtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 4, fontSize: 12 },
  grid: { flexDirection: 'row', gap: 10 },
  metric: { flex: 1, borderRadius: 12, backgroundColor: Colors.white, borderWidth: 1, borderColor: '#e2e8f0', padding: 12 },
  metricValue: { fontSize: 20, color: Colors.text, fontWeight: '800' },
  metricLabel: { marginTop: 2, fontSize: 12, color: Colors.textSecondary },
  activityCard: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  activityTitle: { color: Colors.text, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  activitySubtitle: { color: Colors.textSecondary, fontSize: 11.5 },
  tabsPage: { flex: 1 },
  tabsTitle: { color: Colors.text, fontSize: 13, fontWeight: '800', marginBottom: 8 },
  list: { gap: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, backgroundColor: Colors.white, borderWidth: 1, borderColor: '#e2e8f0' },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#bfdbfe', marginRight: 10 },
  itemTextWrap: { flex: 1 },
  itemTitle: { color: Colors.text, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  itemLine: { height: 6, borderRadius: 999, backgroundColor: '#e2e8f0', width: '75%' },
  assignmentCard: { padding: 12, borderRadius: 12, backgroundColor: Colors.white, borderWidth: 1, borderColor: '#e2e8f0' },
  assignmentTitle: { color: Colors.text, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  assignmentMeta: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  assignmentMetaText: { color: Colors.primary, fontSize: 11.5, fontWeight: '600' },
  fakeTabBar: {
    marginTop: 'auto',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: Colors.white,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tabItemActive: { alignItems: 'center', gap: 3, minWidth: 62 },
  tabItem: { alignItems: 'center', gap: 3, minWidth: 62 },
  tabTextActive: { fontSize: 10.5, color: Colors.primary, fontWeight: '700' },
  tabText: { fontSize: 10.5, color: Colors.textMuted, fontWeight: '600' },
});
