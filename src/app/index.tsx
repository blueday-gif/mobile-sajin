import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { OptionPicker } from '../components/OptionPicker';
import {
  BUILDINGS,
  COLORS,
  FLOORS,
  LOCATIONS,
  floorLabel,
} from '../constants';
import { useInspection } from '../store/InspectionProvider';
import { InspectionRecord } from '../types';

type DefectEditorProps = {
  visible: boolean;
  onClose: () => void;
};

function DefectEditor({ visible, onClose }: DefectEditorProps) {
  const { defectOptions, addDefect, renameDefect, removeDefect } =
    useInspection();
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const clearEditor = () => {
    setValue('');
    setEditing(null);
  };

  const save = async () => {
    try {
      setBusy(true);
      if (editing) await renameDefect(editing, value);
      else await addDefect(value);
      clearEditor();
    } catch (error) {
      Alert.alert(
        '저장할 수 없습니다',
        error instanceof Error ? error.message : '하자 항목 저장에 실패했습니다.',
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = (label: string) => {
    Alert.alert('하자 항목 삭제', `‘${label}’ 항목을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          void removeDefect(label).catch((error: unknown) => {
            Alert.alert(
              '삭제할 수 없습니다',
              error instanceof Error ? error.message : '하자 항목 삭제에 실패했습니다.',
            );
          });
        },
      },
    ]);
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.defectSheet}>
          <View style={styles.modalHeading}>
            <Text style={styles.modalTitle}>하자 항목 관리</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.linkText}>닫기</Text>
            </Pressable>
          </View>
          <Text style={styles.helper}>
            점검에 사용할 하자 항목을 직접 추가하거나 수정·삭제할 수 있어요.
          </Text>
          <ScrollView style={styles.defectList}>
            {defectOptions.map((item) => (
              <View key={item} style={styles.defectRow}>
                <Text style={styles.defectName}>{item}</Text>
                <View style={styles.rowActions}>
                  <Pressable
                    onPress={() => {
                      setEditing(item);
                      setValue(item);
                    }}
                    style={styles.smallAction}
                  >
                    <Text style={styles.smallActionText}>수정</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => confirmRemove(item)}
                    style={[styles.smallAction, styles.deleteAction]}
                  >
                    <Text style={[styles.smallActionText, styles.deleteText]}>
                      삭제
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
          <TextInput
            onChangeText={setValue}
            onSubmitEditing={() => void save()}
            placeholder="예: 벽체 균열"
            returnKeyType="done"
            style={styles.textInput}
            value={value}
          />
          <Pressable
            disabled={busy}
            onPress={() => void save()}
            style={[styles.primaryButton, busy && styles.disabledButton]}
          >
            <Text style={styles.primaryButtonText}>
              {editing ? '항목 수정' : '항목 추가'}
            </Text>
          </Pressable>
          {editing ? (
            <Pressable onPress={clearEditor} style={styles.cancelEdit}>
              <Text style={styles.linkText}>수정 취소</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function selectedRecordDraft(record: InspectionRecord) {
  return {
    building_number: String(record.building_number),
    floor: record.floor,
    location: record.location,
    defects: record.defects,
    inspection_date: record.inspection_date,
    editing_id: record.id,
  };
}

export default function InspectionFormScreen() {
  const params = useLocalSearchParams<{ editId?: string }>();
  const {
    draft,
    records,
    defectOptions,
    ready,
    storageError,
    updateDraft,
  } = useInspection();
  const [defectEditorVisible, setDefectEditorVisible] = useState(false);
  const editId = typeof params.editId === 'string' ? params.editId : undefined;

  useEffect(() => {
    if (!ready || !editId) return;
    const record = records.find((item) => item.id === editId);
    if (!record) {
      Alert.alert('점검 기록을 찾을 수 없습니다.', '기록 목록에서 다시 선택해 주세요.');
      router.replace('/records');
      return;
    }
    updateDraft(selectedRecordDraft(record));
  }, [editId, ready, records, updateDraft]);

  const buildingOptions = useMemo(
    () =>
      BUILDINGS.map((building) => ({
        value: String(building),
        label: `${building}동`,
      })),
    [],
  );

  const continueToPhoto = () => {
    const missing: string[] = [];
    if (!draft.building_number) missing.push('동');
    if (!draft.floor) missing.push('층');
    if (!draft.location) missing.push('장소');
    if (!draft.defects.length) missing.push('하자 내용');

    if (missing.length) {
      Alert.alert(
        '필수 항목을 선택해 주세요',
        `${missing.join(', ')} 항목을 확인한 뒤 계속할 수 있습니다.`,
      );
      return;
    }

    if (draft.editing_id) {
      const record = records.find((item) => item.id === draft.editing_id);
      if (!record) {
        Alert.alert('점검 기록을 찾을 수 없습니다.');
        return;
      }
      router.push({
        pathname: '/preview',
        params: {
          photoUri: record.original_photo_uri,
          captureDate: record.inspection_date,
          editId: record.id,
        },
      });
      return;
    }
    router.push('/camera');
  };

  if (!ready) {
    return (
      <SafeAreaView style={styles.loading}>
        <Text style={styles.helper}>점검 정보를 불러오는 중입니다.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.eyebrow}>현장 점검</Text>
            <Text style={styles.title}>
              {draft.editing_id ? '점검 내용 수정' : '하자 점검 입력'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/records')}
            style={styles.recordsButton}
          >
            <Text style={styles.recordsButtonText}>점검 기록</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          위치와 하자 내용을 선택한 뒤 사진을 촬영해 주세요.
        </Text>
        {storageError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{storageError}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>점검 위치</Text>
          <Text style={styles.fieldLabel}>동</Text>
          <OptionPicker
            columns={3}
            onSelect={(value) => updateDraft({ building_number: value })}
            options={buildingOptions}
            selectedLabel={
              draft.building_number ? `${draft.building_number}동` : ''
            }
            title="동 선택"
          />
          <Text style={[styles.fieldLabel, styles.secondField]}>층</Text>
          <OptionPicker
            columns={4}
            onSelect={(value) => updateDraft({ floor: value })}
            options={FLOORS}
            selectedLabel={floorLabel(draft.floor)}
            title="층 선택"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>장소</Text>
          <View style={styles.choiceRow}>
            {LOCATIONS.map((location) => {
              const selected = draft.location === location;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={location}
                  onPress={() => updateDraft({ location })}
                  style={[styles.choice, selected && styles.selectedChoice]}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      selected && styles.selectedChoiceText,
                    ]}
                  >
                    {location}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.defectHeading}>
            <Text style={styles.sectionTitle}>하자 내용</Text>
            <Pressable onPress={() => setDefectEditorVisible(true)}>
              <Text style={styles.linkText}>항목 관리</Text>
            </Pressable>
          </View>
          <Text style={styles.helper}>해당하는 항목을 모두 선택해 주세요.</Text>
          <View style={styles.choiceRow}>
            {defectOptions.map((defect) => {
              const selected = draft.defects.includes(defect);
              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  key={defect}
                  onPress={() =>
                    updateDraft({
                      defects: selected
                        ? draft.defects.filter((item) => item !== defect)
                        : [...draft.defects, defect],
                    })
                  }
                  style={[styles.choice, selected && styles.selectedChoice]}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      selected && styles.selectedChoiceText,
                    ]}
                  >
                    {selected ? '✓ ' : ''}
                    {defect}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable onPress={continueToPhoto} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>
            {draft.editing_id ? '수정 내용 미리보기' : '사진 촬영으로 이동'}
          </Text>
        </Pressable>
        <Text style={styles.footerNote}>
          사진 촬영일이 점검 날짜로 기록됩니다.
        </Text>
      </ScrollView>
      <DefectEditor
        onClose={() => setDefectEditorVisible(false)}
        visible={defectEditorVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: COLORS.background, flex: 1 },
  loading: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: 'center',
  },
  content: { padding: 20, paddingBottom: 36 },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  title: { color: COLORS.text, fontSize: 27, fontWeight: '800' },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
    marginTop: 8,
  },
  recordsButton: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  recordsButtonText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  errorBanner: {
    backgroundColor: '#FFF0F0',
    borderRadius: 10,
    marginBottom: 14,
    padding: 12,
  },
  errorText: { color: COLORS.danger, fontSize: 13 },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 14,
  },
  fieldLabel: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  secondField: { marginTop: 16 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 14,
  },
  selectedChoice: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  choiceText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  selectedChoiceText: { color: COLORS.primary, fontWeight: '800' },
  defectHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  helper: { color: COLORS.muted, fontSize: 13, lineHeight: 19 },
  linkText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 54,
    marginTop: 4,
  },
  primaryButtonText: { color: COLORS.surface, fontSize: 16, fontWeight: '800' },
  footerNote: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(17, 28, 48, 0.42)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  defectSheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 20,
    paddingBottom: 30,
  },
  modalHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  defectList: { marginVertical: 14, maxHeight: 270 },
  defectRow: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  defectName: { color: COLORS.text, flex: 1, fontSize: 14, fontWeight: '600' },
  rowActions: { flexDirection: 'row', gap: 8 },
  smallAction: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  smallActionText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  deleteAction: { backgroundColor: '#FFF0F0' },
  deleteText: { color: COLORS.danger },
  textInput: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  disabledButton: { opacity: 0.65 },
  cancelEdit: { alignItems: 'center', padding: 12 },
});
