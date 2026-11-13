import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, formatInspectionDate } from '../constants';
import {
  describeInspection,
  isMeterKind,
  recordKind,
  recordToDraft,
  recordToFields,
} from '../inspection';
import { useInspection } from '../store/InspectionProvider';
import { InspectionRecord } from '../types';

export default function RecordsScreen() {
  const { records, ready, storageError, updateDraft, deleteRecord, resetDraft } =
    useInspection();

  const editRecord = (record: InspectionRecord) => {
    updateDraft(recordToDraft(record));
    router.push('/');
  };

  const removeRecord = async (record: InspectionRecord) => {
    try {
      await deleteRecord(record.id);
      let cleanupFailed = false;
      for (const uri of [
        record.original_photo_uri,
        record.result_photo_uri,
      ]) {
        try {
          const file = new File(uri);
          if (file.exists) file.delete();
        } catch {
          cleanupFailed = true;
        }
      }
      Alert.alert(
        cleanupFailed ? '기록 삭제 완료' : '삭제 완료',
        cleanupFailed
          ? '점검 기록은 삭제했지만 일부 사진 파일을 정리하지 못했습니다.'
          : '점검 기록과 사진을 삭제했습니다.',
      );
    } catch (error) {
      Alert.alert(
        '삭제 실패',
        error instanceof Error ? error.message : '점검 기록을 삭제하지 못했습니다.',
      );
    }
  };

  const confirmDelete = (record: InspectionRecord) => {
    Alert.alert('점검 기록 삭제', '원본 및 합성 사진도 함께 삭제됩니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => void removeRecord(record),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.headerAction}>뒤로</Text>
        </Pressable>
        <Text style={styles.title}>점검 기록</Text>
        <Pressable
          onPress={() => {
            resetDraft();
            router.replace('/');
          }}
        >
          <Text style={styles.headerAction}>새 점검</Text>
        </Pressable>
      </View>
      {storageError ? (
        <Text style={styles.errorBanner}>{storageError}</Text>
      ) : null}
      {!ready ? (
        <View style={styles.emptyState}>
          <Text style={styles.helper}>점검 기록을 불러오는 중입니다.</Text>
        </View>
      ) : records.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>저장된 점검 기록이 없습니다.</Text>
          <Text style={styles.helper}>
            입력을 완료하고 사진을 저장하면 여기에 표시됩니다.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {records.map((record) => {
            const { position, content } = describeInspection(recordToFields(record));
            const meter = isMeterKind(recordKind(record));
            return (
            <View key={record.id} style={styles.card}>
              <Image
                resizeMode="cover"
                source={{ uri: record.result_photo_uri }}
                style={styles.thumbnail}
              />
              <View style={styles.cardContent}>
                <Text style={[styles.badge, meter ? styles.meterBadge : styles.defectBadge]}>
                  {meter ? '검침' : '하자'}
                </Text>
                <Text style={styles.location}>{position}</Text>
                <Text numberOfLines={2} style={styles.defects}>
                  {content}
                </Text>
                <Text style={styles.date}>
                  {formatInspectionDate(record.inspection_date)}
                </Text>
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => editRecord(record)}
                    style={styles.editButton}
                  >
                    <Text style={styles.editButtonText}>수정</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => confirmDelete(record)}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteButtonText}>삭제</Text>
                  </Pressable>
                </View>
              </View>
            </View>
            );
          })}
        </ScrollView>
      )}
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
    paddingVertical: 14,
  },
  headerAction: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  title: { color: COLORS.text, fontSize: 19, fontWeight: '800' },
  errorBanner: {
    backgroundColor: '#FFF0F0',
    color: COLORS.danger,
    marginHorizontal: 16,
    padding: 12,
  },
  list: { gap: 12, padding: 16, paddingBottom: 30 },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    padding: 10,
  },
  thumbnail: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    height: 118,
    width: 92,
  },
  cardContent: { flex: 1, justifyContent: 'center', paddingLeft: 12 },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 5,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  meterBadge: { backgroundColor: '#E6F5EE', color: COLORS.success },
  defectBadge: { backgroundColor: '#FFF0F0', color: COLORS.danger },
  location: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  defects: { color: COLORS.text, fontSize: 13, marginTop: 5 },
  date: { color: COLORS.muted, fontSize: 12, marginTop: 5 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  editButton: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  editButtonText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  deleteButton: {
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  deleteButtonText: { color: COLORS.danger, fontSize: 12, fontWeight: '700' },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },
  helper: { color: COLORS.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
