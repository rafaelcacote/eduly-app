import { AppHeader } from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { SuccessModal } from '@/components/SuccessModal';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useStudent } from '@/context/StudentContext';
import {
  CATEGORIA_DECLARACAO_LABELS,
  CategoriaDeclaracao,
  DocumentoAnexoFile,
  documentosService,
} from '@/services/documentos';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { FileUp, Paperclip, Send, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const CATEGORIAS = Object.entries(CATEGORIA_DECLARACAO_LABELS) as [
  CategoriaDeclaracao,
  string,
][];

function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export default function PedirDeclaracaoScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isLoadingAuth } = useAuth();
  const { selectedStudent } = useStudent();

  const [categoria, setCategoria] = useState<CategoriaDeclaracao>('matricula');
  const [descricao, setDescricao] = useState('');
  const [anexo, setAnexo] = useState<DocumentoAnexoFile | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  React.useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoadingAuth, router]);

  React.useEffect(() => {
    if (!isLoadingAuth && isAuthenticated && user?.type === 'teacher') {
      router.replace('/teacher-dashboard');
    }
  }, [isAuthenticated, isLoadingAuth, user?.type, router]);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      if (asset.size && asset.size > 10 * 1024 * 1024) {
        showAlert('Atenção', 'O arquivo deve ter no máximo 10 MB.');
        return;
      }

      setAnexo({
        uri: asset.uri,
        mimeType: asset.mimeType,
        fileName: asset.name,
      });
    } catch (error: any) {
      showAlert('Erro', error?.message || 'Não foi possível selecionar o arquivo.');
    }
  };

  const handleSubmit = async () => {
    if (!selectedStudent?.id) {
      showAlert('Atenção', 'Selecione um aluno na tela inicial.');
      return;
    }

    setIsSending(true);
    try {
      await documentosService.createPedidoDeclaracao({
        aluno_id: selectedStudent.id,
        categoria_declaracao: categoria,
        descricao: descricao.trim() || undefined,
        anexo: anexo || undefined,
      });
      setShowSuccess(true);
    } catch (error: any) {
      showAlert('Erro', error?.message || 'Não foi possível enviar o pedido.');
    } finally {
      setIsSending(false);
    }
  };

  const alunoNome = selectedStudent
    ? selectedStudent.nome_social || selectedStudent.nome
    : 'Aluno não selecionado';

  return (
    <View style={styles.container}>
      <AppHeader title="Pedir declaração" subtitle={alunoNome} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.helper}>
          Solicite uma declaração à secretaria. Quando o documento estiver pronto, ele
          aparecerá aqui no app.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Tipo de declaração *</Text>
          <View style={styles.chipsWrap}>
            {CATEGORIAS.map(([key, label]) => {
              const active = categoria === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategoria(key)}
                  disabled={isSending}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Observação</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Opcional — detalhes para a secretaria"
            placeholderTextColor={Colors.textMuted}
            value={descricao}
            onChangeText={setDescricao}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!isSending}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Anexo (opcional)</Text>
          {anexo ? (
            <View style={styles.fileRow}>
              <Paperclip size={18} color={Colors.primary} />
              <Text style={styles.fileName} numberOfLines={1}>
                {anexo.fileName || 'Arquivo selecionado'}
              </Text>
              <TouchableOpacity
                onPress={() => setAnexo(null)}
                disabled={isSending}
                accessibilityLabel="Remover anexo"
              >
                <X size={18} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.pickButton}
              onPress={pickDocument}
              disabled={isSending}
              activeOpacity={0.85}
            >
              <FileUp size={18} color={Colors.primary} />
              <Text style={styles.pickButtonText}>Selecionar arquivo</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.hint}>PDF, JPG ou PNG · máx. 10 MB</Text>
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSending}
          activeOpacity={0.85}
          style={[styles.submitWrap, isSending && styles.submitDisabled]}
        >
          <LinearGradient
            colors={Colors.gradient.primary as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitButton}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Send size={18} color={Colors.white} />
            )}
            <Text style={styles.submitText}>
              {isSending ? 'Enviando...' : 'Enviar pedido'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      <SuccessModal
        visible={showSuccess}
        title="Pedido enviado"
        message="A secretaria recebeu sua solicitação e responderá pelo painel da escola."
        hint="Acompanhe o status em Documentos."
        buttonLabel="Ver documentos"
        onClose={() => {
          setShowSuccess(false);
          router.replace('/documentos');
        }}
      />

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 14,
  },
  helper: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.white,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 15,
    color: Colors.text,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  pickButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  submitWrap: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  submitText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
