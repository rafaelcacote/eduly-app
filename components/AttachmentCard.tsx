import { Colors } from '@/constants/colors';
import {
  getAttachmentHint,
  getAttachmentKind,
  getAttachmentLabel,
  getAttachmentTitle,
  openAttachment,
  type AttachmentKind,
} from '@/utils/attachment';
import { resolveMediaUrl } from '@/utils/mediaUrl';
import { Image } from 'expo-image';
import { ExternalLink, FileText, ImageIcon, Maximize2, Paperclip } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type AttachmentTone = 'recado' | 'comunicado' | 'mine';
type AttachmentVariant = 'card' | 'bubble';

type AttachmentCardProps = {
  url: string;
  tone?: AttachmentTone;
  variant?: AttachmentVariant;
};

const TONE_COLORS = {
  recado: {
    accent: Colors.primary,
    surface: '#eff6ff',
    border: '#bfdbfe',
    label: Colors.primary,
  },
  comunicado: {
    accent: '#0f766e',
    surface: '#f0fdfa',
    border: '#99f6e4',
    label: '#0f766e',
  },
  mine: {
    accent: Colors.white,
    surface: 'rgba(255,255,255,0.16)',
    border: 'rgba(255,255,255,0.28)',
    label: Colors.white,
  },
} as const;

function KindIcon({
  kind,
  color,
  size = 18,
}: {
  kind: AttachmentKind;
  color: string;
  size?: number;
}) {
  if (kind === 'image') return <ImageIcon size={size} color={color} strokeWidth={2.25} />;
  if (kind === 'pdf') return <FileText size={size} color={color} strokeWidth={2.25} />;
  return <Paperclip size={size} color={color} strokeWidth={2.25} />;
}

export function AttachmentCard({
  url,
  tone = 'recado',
  variant = 'card',
}: AttachmentCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);

  const resolvedUrl = useMemo(() => resolveMediaUrl(url), [url]);
  const kind = useMemo(() => getAttachmentKind(resolvedUrl || url), [resolvedUrl, url]);
  const friendlyTitle = useMemo(() => getAttachmentTitle(kind), [kind]);
  const friendlyHint = useMemo(() => getAttachmentHint(kind), [kind]);
  const colors = TONE_COLORS[tone];
  const isBubble = variant === 'bubble';
  const isImage = kind === 'image' && !!resolvedUrl && !imageFailed;

  const handleOpen = async () => {
    if (isImage) {
      setLightboxOpen(true);
      return;
    }
    await openAttachment(resolvedUrl || url);
  };

  const handleOpenExternal = async () => {
    setLightboxOpen(false);
    await openAttachment(resolvedUrl || url);
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handleOpen}
        accessibilityRole="button"
        accessibilityLabel={`${friendlyTitle}. ${friendlyHint}`}
        style={[
          styles.base,
          isBubble ? styles.bubble : styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        {isImage ? (
          <View style={[styles.imageWrap, isBubble && styles.imageWrapBubble]}>
            {imageLoading && (
              <View style={styles.imageLoader}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            )}
            <Image
              source={{ uri: resolvedUrl! }}
              style={[styles.image, isBubble && styles.imageBubble]}
              contentFit="cover"
              transition={200}
              onLoadStart={() => setImageLoading(true)}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageFailed(true);
              }}
            />
            <View style={[styles.imageBadge, tone === 'mine' && styles.imageBadgeMine]}>
              <Maximize2 size={12} color={tone === 'mine' ? Colors.primary : Colors.white} />
              <Text style={[styles.imageBadgeText, tone === 'mine' && styles.imageBadgeTextMine]}>
                Ampliar
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.fileRow}>
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor:
                    tone === 'mine' ? 'rgba(255,255,255,0.22)' : colors.accent + '18',
                },
              ]}
            >
              <KindIcon kind={kind} color={colors.accent} />
            </View>
            <View style={styles.fileTextWrap}>
              <Text style={[styles.fileKind, { color: colors.label }]} numberOfLines={1}>
                {getAttachmentLabel(kind)}
              </Text>
              <Text
                style={[
                  styles.fileName,
                  { color: tone === 'mine' ? 'rgba(255,255,255,0.92)' : Colors.text },
                ]}
                numberOfLines={1}
              >
                {friendlyTitle}
              </Text>
              <Text
                style={[
                  styles.fileHint,
                  { color: tone === 'mine' ? 'rgba(255,255,255,0.7)' : Colors.textMuted },
                ]}
                numberOfLines={1}
              >
                {friendlyHint}
              </Text>
            </View>
            <ExternalLink
              size={16}
              color={tone === 'mine' ? 'rgba(255,255,255,0.85)' : colors.accent}
            />
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={lightboxOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxOpen(false)}
      >
        <Pressable style={styles.lightboxBackdrop} onPress={() => setLightboxOpen(false)}>
          <View style={styles.lightboxContent}>
            {resolvedUrl ? (
              <Image
                source={{ uri: resolvedUrl }}
                style={styles.lightboxImage}
                contentFit="contain"
              />
            ) : null}
            <View style={styles.lightboxActions}>
              <TouchableOpacity
                style={styles.lightboxButton}
                onPress={handleOpenExternal}
                accessibilityLabel="Abrir no aplicativo do aparelho"
              >
                <ExternalLink size={16} color={Colors.white} />
                <Text style={styles.lightboxButtonText}>Abrir no aparelho</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.lightboxButton, styles.lightboxButtonGhost]}
                onPress={() => setLightboxOpen(false)}
              >
                <Text style={styles.lightboxButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  card: {
    borderRadius: 16,
    padding: 10,
  },
  bubble: {
    borderRadius: 12,
    marginTop: 10,
    padding: 8,
  },
  imageWrap: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
  },
  imageWrapBubble: {
    borderRadius: 10,
  },
  image: {
    width: '100%',
    height: 220,
  },
  imageBubble: {
    height: 160,
  },
  imageLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  imageBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  imageBadgeMine: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  imageBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  imageBadgeTextMine: {
    color: Colors.primary,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  fileKind: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  fileName: {
    fontSize: 13,
    fontWeight: '600',
  },
  fileHint: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.92)',
    justifyContent: 'center',
    padding: 16,
  },
  lightboxContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  lightboxImage: {
    width: '100%',
    flex: 1,
    maxHeight: '78%',
  },
  lightboxActions: {
    gap: 10,
    paddingBottom: 12,
  },
  lightboxButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  lightboxButtonGhost: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  lightboxButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
