import { File, Directory, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import {
  requestPermissionsAsync,
  saveToLibraryAsync,
} from 'expo-media-library/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot, { captureRef, ViewShotRef } from 'react-native-view-shot';
import { COLORS, formatInspectionDate } from '../constants';
import {
  describeInspection,
  draftToRecordFields,
  missingFields,
} from '../inspection';
import { useInspection } from '../store/InspectionProvider';
import { InspectionRecord } from '../types';

type ImageDimensions = {
  width: number;
  height: number;
};

function makeRecordId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function PhotoPreviewScreen() {
  const params = useLocalSearchParams<{
    photoUri?: string;
    captureDate?: string;
    editId?: string;
  }>();
  const photoUri = typeof params.photoUri === 'string' ? params.photoUri : '';
  const captureDate =
    typeof params.captureDate === 'string' ? params.captureDate : '';
  const editId = typeof params.editId === 'string' ? params.editId : undefined;
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { draft, records, saveRecord } = useInspection();
  const shotRef = useRef<ViewShotRef>(null);
  const [processedUri, setProcessedUri] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveToGallery, setSaveToGallery] = useState(false);

  const existingRecord = useMemo(
    () => records.find((record) => record.id === (editId ?? draft.editing_id)),
    [draft.editing_id, editId, records],
  );

  const date = captureDate || draft.inspection_date;

  useEffect(() => {
    let active = true;

    if (!photoUri) {
      Alert.alert('사진을 찾을 수 없습니다.', '다시 촬영해 주세요.', [
        { text: '확인', onPress: () => router.back() },
      ]);
      return () => {
        active = false;
      };
    }

    const prepareImage = async () => {
      const context = ImageManipulator.manipulate(photoUri, {
        maxWidth: 1800,
        maxHeight: 1800,
      });
      const image = await context.renderAsync();
      const result = await image.saveAsync({
        compress: 0.9,
        format: SaveFormat.JPEG,
      });
      if (active) {
        setProcessedUri(result.uri);
        setDimensions({ width: result.width, height: result.height });
      }
    };

    void prepareImage().catch((error: unknown) => {
      if (!active) return;
      Alert.alert(
        '사진을 준비할 수 없습니다',
        error instanceof Error ? error.message : '이미지 처리 중 오류가 발생했습니다.',
      );
    });

    return () => {
      active = false;
    };
  }, [photoUri]);

  const previewSize = useMemo(() => {
    if (!dimensions) return null;
    const maxWidth = screenWidth - 32;
    const maxHeight = Math.max(220, screenHeight - 360);
    const scale = Math.min(
      maxWidth / dimensions.width,
      maxHeight / dimensions.height,
    );
    return {
      width: Math.round(dimensions.width * scale),
      height: Math.round(dimensions.height * scale),
    };
  }, [dimensions, screenHeight, screenWidth]);

  const save = async () => {
    if (missingFields(draft).length) {
      Alert.alert('점검 정보를 확인해 주세요', '필수 입력 내용이 비어 있습니다.');
      return;
    }
    if (!processedUri || !dimensions || !shotRef.current || !imageReady) {
      Alert.alert('사진을 준비하고 있습니다', '잠시 후 다시 시도해 주세요.');
      return;
    }

    const id = editId ?? draft.editing_id ?? makeRecordId();
    const directory = new Directory(Paths.document, 'inspections');
    let originalFile: File | null = null;
    let resultFile: File | null = null;
    let recordSaved = false;
    setSaving(true);

    try {
      const compositeUri = await captureRef(shotRef.current, {
        format: 'jpg',
        quality: 0.94,
        width: dimensions.width,
        height: dimensions.height,
      });

      if (!directory.exists) {
        directory.create({ idempotent: true, intermediates: true });
      }

      const originalUri = existingRecord?.original_photo_uri ?? photoUri;
      if (!existingRecord) {
        originalFile = new File(directory, `${id}-original.jpg`);
        if (originalFile.exists) originalFile.delete();
        await new File(photoUri).copy(originalFile);
      }

      resultFile = new File(directory, `${id}-result-${Date.now()}.jpg`);
      await new File(compositeUri).copy(resultFile);

      const record: InspectionRecord = {
        id,
        ...draftToRecordFields(draft),
        inspection_date: date,
        original_photo_uri: originalFile?.uri ?? originalUri,
        result_photo_uri: resultFile.uri,
        created_at: existingRecord?.created_at ?? new Date().toISOString(),
      };
      await saveRecord(record);
      recordSaved = true;

      let galleryMessage = '';
      if (saveToGallery) {
        try {
          const permission = await requestPermissionsAsync(true, ['photo']);
          if (!permission.granted) {
            galleryMessage = '\n갤러리 권한이 허용되지 않아 앱 저장 공간에만 저장했습니다.';
          } else {
            await saveToLibraryAsync(resultFile.uri);
            galleryMessage = '\n갤러리에도 저장했습니다.';
          }
        } catch (error) {
          galleryMessage = `\n갤러리 저장 실패: ${
            error instanceof Error ? error.message : '권한 또는 저장 오류'
          }`;
        }
      }

      if (existingRecord?.result_photo_uri) {
        try {
          const oldResult = new File(existingRecord.result_photo_uri);
          if (oldResult.exists) oldResult.delete();
        } catch {
          galleryMessage += '\n이전 결과 사진 파일을 정리하지 못했습니다.';
        }
      }

      Alert.alert(
        '점검 사진 저장 완료',
        `원본과 점검 정보가 합성된 사진을 앱에 저장했습니다.${galleryMessage}`,
        [{ text: '확인', onPress: () => router.replace('/records') }],
      );
    } catch (error) {
      let cleanupMessage = '';
      if (!recordSaved) {
        try {
          if (resultFile?.exists) resultFile.delete();
          if (originalFile?.exists) originalFile.delete();
        } catch {
          cleanupMessage = '\n임시 파일 정리도 완료하지 못했습니다.';
        }
      }
      Alert.alert(
        '점검 사진 저장 실패',
        `${error instanceof Error ? error.message : '사진 파일 저장 중 오류가 발생했습니다.'}${cleanupMessage}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const { position, content } = describeInspection(draft);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={() => router.replace('/')}>
          <Text style={styles.headerAction}>취소</Text>
        </Pressable>
        <Text style={styles.headerTitle}>사진 미리보기</Text>
        <View style={styles.headerActionSlot} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          표가 사진에 실제로 합성됩니다. 위치와 글자를 확인해 주세요.
        </Text>
        <View style={styles.imageStage}>
          {processedUri && previewSize ? (
            <ViewShot
              ref={shotRef}
              style={[
                styles.captureFrame,
                { width: previewSize.width, height: previewSize.height },
              ]}
            >
              <Image
                onLoad={() => setImageReady(true)}
                resizeMode="stretch"
                source={{ uri: processedUri }}
                style={StyleSheet.absoluteFill}
              />
              <View
                accessibilityLabel="사진에 합성될 점검 정보"
                style={[
                  styles.inspectionTable,
                  { width: Math.min(previewSize.width * 0.66, 270) },
                ]}
              >
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>위치</Text>
                  <Text style={styles.tableValue}>{position}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>내용</Text>
                  <Text style={styles.tableValue}>{content}</Text>
                </View>
                <View style={[styles.tableRow, styles.lastTableRow]}>
                  <Text style={styles.tableLabel}>일자</Text>
                  <Text style={styles.tableValue}>
                    {formatInspectionDate(date)}
                  </Text>
                </View>
              </View>
            </ViewShot>
          ) : (
            <View style={styles.imageLoading}>
              <ActivityIndicator color={COLORS.primary} size="large" />
              <Text style={styles.helper}>사진을 준비하고 있습니다.</Text>
            </View>
          )}
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: saveToGallery }}
          onPress={() => setSaveToGallery((current) => !current)}
          style={styles.galleryOption}
        >
          <View style={[styles.checkbox, saveToGallery && styles.checkedBox]}>
            {saveToGallery ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <View style={styles.galleryCopy}>
            <Text style={styles.galleryTitle}>갤러리에도 저장</Text>
            <Text style={styles.helper}>선택하지 않아도 앱에는 저장됩니다.</Text>
          </View>
        </Pressable>

        <View style={styles.buttonRow}>
          <Pressable
            disabled={saving}
            onPress={() =>
              editId || draft.editing_id
                ? router.push('/camera')
                : router.back()
            }
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>다시 촬영</Text>
          </Pressable>
          <Pressable
            disabled={saving || !imageReady}
            onPress={() => void save()}
            style={[
              styles.primaryButton,
              (saving || !imageReady) && styles.disabledButton,
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {editId || draft.editing_id ? '수정 내용 저장' : '사진 사용 확정'}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: COLORS.background, flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerAction: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  headerActionSlot: { minWidth: 32 },
  headerTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  content: { paddingBottom: 30, paddingHorizontal: 16 },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
    textAlign: 'center',
  },
  imageStage: {
    alignItems: 'center',
    backgroundColor: '#E2E7EF',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 230,
    overflow: 'hidden',
    padding: 6,
  },
  captureFrame: {
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  inspectionTable: {
    backgroundColor: '#FFFFFF',
    borderColor: '#000000',
    borderWidth: 1.5,
    bottom: 8,
    left: 8,
    position: 'absolute',
  },
  tableRow: {
    alignItems: 'stretch',
    borderBottomColor: '#000000',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 30,
  },
  lastTableRow: { borderBottomWidth: 0 },
  tableLabel: {
    borderRightColor: '#000000',
    borderRightWidth: 1,
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    minWidth: 42,
    paddingHorizontal: 5,
    paddingVertical: 7,
    textAlign: 'center',
  },
  tableValue: {
    color: '#000000',
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 7,
  },
  imageLoading: {
    alignItems: 'center',
    height: 230,
    justifyContent: 'center',
    width: '100%',
  },
  helper: { color: COLORS.muted, fontSize: 12, marginTop: 5 },
  galleryOption: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 14,
    padding: 13,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: COLORS.border,
    borderRadius: 6,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checkedBox: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  galleryCopy: { marginLeft: 10 },
  galleryTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 16,
  },
  secondaryButtonText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  disabledButton: { opacity: 0.55 },
});
