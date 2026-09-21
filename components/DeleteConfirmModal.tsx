import { Colors } from '@/constants/colors';
import { Trash2 } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type DeleteConfirmModalProps = {
  visible: boolean;
  title?: string;
  itemName?: string | null;
  isDeleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Confirmation modal before deleting an exercise (same pattern as logout).
 */
export function DeleteConfirmModal({
  visible,
  title = 'Excluir exercício?',
  itemName,
  isDeleting = false,
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!isDeleting) onCancel();
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Trash2 size={28} color={Colors.error} strokeWidth={2.2} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {itemName
              ? `Deseja excluir permanentemente “${itemName}”?`
              : 'Deseja excluir este exercício permanentemente?'}
          </Text>
          <Text style={styles.hint}>
            Esta ação não pode ser desfeita. Alunos e responsáveis deixarão de ver este exercício.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={isDeleting}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton, isDeleting && styles.buttonDisabled]}
              onPress={onConfirm}
              disabled={isDeleting}
              activeOpacity={0.85}
            >
              {isDeleting ? (
                <View style={styles.confirmLoading}>
                  <ActivityIndicator size="small" color={Colors.white} />
                  <Text style={styles.confirmText}>Excluindo...</Text>
                </View>
              ) : (
                <Text style={styles.confirmText}>Sim, excluir</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.white,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#0b1f52',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.4,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  button: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  cancelButton: {
    backgroundColor: Colors.muted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  confirmButton: {
    backgroundColor: Colors.error,
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  confirmLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
});
