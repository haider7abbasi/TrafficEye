import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ZoomIn } from 'lucide-react-native';
import {
  ON_PRIMARY_MUTED,
  PRIMARY_BLUE,
  WHITE,
} from '../../theme/brandColors';

/** Minimum time (ms) officer must view evidence before confirming verification. */
const MIN_REVIEW_MS = 2000;

type Props = {
  visible: boolean;
  imageUri: string;
  /** When true, view-only (e.g. after challan issued) — no verification step. */
  previewOnly?: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  /** Called when officer confirms verification (ignored when previewOnly). */
  onVerified?: () => void;
};

export function EvidenceImagePreviewModal({
  visible,
  imageUri,
  previewOnly = false,
  title,
  subtitle,
  onClose,
  onVerified,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewReady, setReviewReady] = useState(false);

  const needsVerification = !previewOnly && Boolean(onVerified);

  const resolvedTitle = title ?? (previewOnly ? 'Evidence preview' : 'Review evidence');
  const resolvedSubtitle =
    subtitle ??
    (previewOnly
      ? 'Pinch to zoom and inspect the evidence photo.'
      : 'Pinch to zoom and inspect the plate, road markings, and violation.');

  useEffect(() => {
    if (!visible || !needsVerification) {
      setReviewReady(false);
      return;
    }
    setReviewReady(false);
    const timer = setTimeout(() => setReviewReady(true), MIN_REVIEW_MS);
    return () => clearTimeout(timer);
  }, [visible, imageUri, needsVerification]);

  useEffect(() => {
    if (!visible || !imageUri) {
      return;
    }
    setLoading(true);
    setNatural(null);
    Image.getSize(
      imageUri,
      (w, h) => {
        setNatural({ w, h });
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [visible, imageUri]);

  const maxW = screenW;
  const maxH = screenH - insets.top - insets.bottom - 120;
  let contentW = maxW;
  let contentH = maxH;
  if (natural && natural.w > 0 && natural.h > 0) {
    const scale = Math.min(maxW / natural.w, maxH / natural.h, 1);
    contentW = Math.max(natural.w * scale, maxW * 0.9);
    contentH = Math.max(natural.h * scale, maxH * 0.5);
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
      accessibilityViewIsModal>
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{resolvedTitle}</Text>
            <Text style={styles.subtitle}>{resolvedSubtitle}</Text>
          </View>
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel={previewOnly ? 'Close preview' : 'Close without confirming'}>
            <X size={24} color={WHITE} strokeWidth={2.2} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          maximumZoomScale={4}
          minimumZoomScale={1}
          centerContent
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator size="large" color={WHITE} style={styles.loader} />
          ) : (
            <Image
              source={{ uri: imageUri }}
              style={{ width: contentW, height: contentH }}
              resizeMode="contain"
              accessibilityLabel="Violation evidence photo"
            />
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <ZoomIn size={18} color={ON_PRIMARY_MUTED} strokeWidth={2} />
          <Text style={styles.footerHint}>
            {previewOnly
              ? 'Challan already issued — this view is for reference only.'
              : 'Confirm only after you have personally verified the violation in this image.'}
          </Text>
          <Pressable
            style={[styles.doneBtn, needsVerification && !reviewReady && styles.doneBtnDisabled]}
            onPress={() => {
              if (needsVerification) {
                if (!reviewReady) {
                  return;
                }
                onVerified?.();
              }
              onClose();
            }}
            disabled={needsVerification && !reviewReady}
            accessibilityRole="button"
            accessibilityState={{ disabled: needsVerification && !reviewReady }}>
            <Text style={styles.doneBtnText}>
              {previewOnly
                ? 'Done'
                : reviewReady
                  ? 'I have verified this evidence'
                  : 'Review the image…'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(8, 18, 40, 0.97)' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 12,
  },
  headerText: { flex: 1, gap: 4 },
  title: { fontSize: 18, fontWeight: '800', color: WHITE },
  subtitle: { fontSize: 13, color: ON_PRIMARY_MUTED, lineHeight: 18 },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  loader: { marginVertical: 48 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  footerHint: {
    fontSize: 13,
    color: ON_PRIMARY_MUTED,
    lineHeight: 18,
  },
  doneBtn: {
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnDisabled: { opacity: 0.55 },
  doneBtnText: { color: WHITE, fontSize: 16, fontWeight: '800' },
});
