import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BuildingFloorPicker } from '../components/BuildingFloorPicker';
import { ItemEditor } from '../components/ItemEditor';
import { COLORS, INSPECTION_KINDS, LOCATIONS } from '../constants';
import {
  describeInspection,
  isMeterKind,
  kindLabel,
  missingFields,
  recentBuildingFloors,
  recordToDraft,
} from '../inspection';
import { useInspection } from '../store/InspectionProvider';

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  role?: 'button' | 'checkbox';
  wide?: boolean;
};

function Chip({ label, selected, onPress, role = 'button', wide }: ChipProps) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === 'checkbox' ? { checked: selected } : { selected }}
      onPress={onPress}
      style={[styles.choice, wide && styles.wideChoice, selected && styles.selectedChoice]}
    >
      <Text style={[styles.choiceText, selected && styles.selectedChoiceText]}>
        {role === 'checkbox' && selected ? '✓ ' : ''}
        {label}
      </Text>
    </Pressable>
  );
}

export default function InspectionFormScreen() {
  const params = useLocalSearchParams<{ editId?: string }>();
  const {
    draft,
    records,
    defectOptions,
    meterLocations,
    ready,
    storageError,
    updateDraft,
    addDefect,
    renameDefect,
    removeDefect,
    addMeterLocation,
    renameMeterLocation,
    removeMeterLocation,
  } = useInspection();
  const [editor, setEditor] = useState<'defect' | 'location' | null>(null);
  const editId = typeof params.editId === 'string' ? params.editId : undefined;
  const meterKind = isMeterKind(draft.kind) ? draft.kind : null;

  useEffect(() => {
    if (!ready || !editId) return;
    const record = records.find((item) => item.id === editId);
    if (!record) {
      Alert.alert('점검 기록을 찾을 수 없습니다.', '기록 목록에서 다시 선택해 주세요.');
      router.replace('/records');
      return;
    }
    updateDraft(recordToDraft(record));
  }, [editId, ready, records, updateDraft]);

  const recents = useMemo(() => recentBuildingFloors(records), [records]);
  const summary = describeInspection(draft);

  const continueToPhoto = () => {
    const missing = missingFields(draft);
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
            <Text style={styles.eyebrow}>보드사진</Text>
            <Text style={styles.title}>
              {draft.editing_id ? '점검 내용 수정' : '점검 입력'}
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
          점검 종류와 위치를 선택한 뒤 사진을 촬영해 주세요.
        </Text>
        {storageError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{storageError}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>점검 종류</Text>
          <View style={styles.choiceRow}>
            {INSPECTION_KINDS.map((kind) => (
              <Chip
                key={kind.value}
                label={kind.label}
                onPress={() => updateDraft({ kind: kind.value })}
                selected={draft.kind === kind.value}
                wide={kind.value !== 'defect'}
              />
            ))}
          </View>
        </View>

        {meterKind ? (
          <View style={styles.card}>
            <View style={styles.cardHeading}>
              <Text style={styles.sectionTitle}>위치</Text>
              <Pressable hitSlop={10} onPress={() => setEditor('location')}>
                <Text style={styles.linkText}>항목 관리</Text>
              </Pressable>
            </View>
            {meterLocations[meterKind].length ? (
              <View style={styles.choiceRow}>
                {meterLocations[meterKind].map((name) => (
                  <Chip
                    key={name}
                    label={name}
                    onPress={() => updateDraft({ meter_location: name })}
                    selected={draft.meter_location === name}
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.helper}>
                등록된 위치가 없습니다. 항목 관리에서 추가해 주세요.
              </Text>
            )}
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>점검 위치</Text>
              <BuildingFloorPicker
                building={draft.building_number}
                floor={draft.floor}
                onChange={({ building, floor }) =>
                  updateDraft({ building_number: building, floor })
                }
                recents={recents}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>장소</Text>
              <View style={styles.choiceRow}>
                {LOCATIONS.map((location) => (
                  <Chip
                    key={location}
                    label={location}
                    onPress={() => updateDraft({ location })}
                    selected={draft.location === location}
                  />
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeading}>
                <Text style={styles.sectionTitle}>하자 내용</Text>
                <Pressable hitSlop={10} onPress={() => setEditor('defect')}>
                  <Text style={styles.linkText}>항목 관리</Text>
                </Pressable>
              </View>
              <Text style={[styles.helper, styles.helperGap]}>
                해당하는 항목을 모두 선택해 주세요.
              </Text>
              <View style={styles.choiceRow}>
                {defectOptions.map((defect) => {
                  const selected = draft.defects.includes(defect);
                  return (
                    <Chip
                      key={defect}
                      label={defect}
                      onPress={() =>
                        updateDraft({
                          defects: selected
                            ? draft.defects.filter((item) => item !== defect)
                            : [...draft.defects, defect],
                        })
                      }
                      role="checkbox"
                      selected={selected}
                    />
                  );
                })}
              </View>
            </View>
          </>
        )}

        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>사진 표</Text>
          <Text style={styles.summaryText}>
            위치 {summary.position || '–'} · 내용 {summary.content || '–'}
          </Text>
        </View>

        <Pressable onPress={continueToPhoto} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>
            {draft.editing_id ? '수정 내용 미리보기' : '사진 촬영으로 이동'}
          </Text>
        </Pressable>
        <Text style={styles.footerNote}>사진 촬영일이 점검 날짜로 기록됩니다.</Text>
      </ScrollView>

      <ItemEditor
        helper="점검에 사용할 하자 항목을 직접 추가하거나 수정·삭제할 수 있어요."
        items={defectOptions}
        noun="하자 항목"
        onAdd={addDefect}
        onClose={() => setEditor(null)}
        onRemove={removeDefect}
        onRename={renameDefect}
        placeholder="예: 벽체 균열"
        title="하자 항목 관리"
        visible={editor === 'defect'}
      />
      {meterKind ? (
        <ItemEditor
          helper={`${kindLabel(meterKind)}에서 쓸 위치를 추가하거나 수정·삭제할 수 있어요.`}
          items={meterLocations[meterKind]}
          noun="위치"
          onAdd={(label) => addMeterLocation(meterKind, label)}
          onClose={() => setEditor(null)}
          onRemove={(label) => removeMeterLocation(meterKind, label)}
          onRename={(oldLabel, newLabel) =>
            renameMeterLocation(meterKind, oldLabel, newLabel)
          }
          placeholder={meterKind === 'elec' ? '예: MOF3-6' : '예: 상수'}
          title={`${meterKind === 'elec' ? '전기검침' : '수도검침'} 위치 관리`}
          visible={editor === 'location'}
        />
      ) : null}
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
  cardHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 14,
  },
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
  wideChoice: { flexBasis: '45%', flexGrow: 1 },
  selectedChoice: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  choiceText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  selectedChoiceText: { color: COLORS.primary, fontWeight: '800' },
  helper: { color: COLORS.muted, fontSize: 13, lineHeight: 19 },
  helperGap: { marginBottom: 10, marginTop: -6 },
  linkText: { color: COLORS.primary, fontSize: 14, fontWeight: '700', marginBottom: 14 },
  summary: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  summaryLabel: { color: COLORS.primary, fontSize: 13, fontWeight: '800' },
  summaryText: { color: COLORS.text, flex: 1, fontSize: 13, fontWeight: '700' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 54,
  },
  primaryButtonText: { color: COLORS.surface, fontSize: 16, fontWeight: '800' },
  footerNote: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
});
