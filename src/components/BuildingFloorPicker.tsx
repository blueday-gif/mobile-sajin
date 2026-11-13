import React, { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { BUILDINGS, COLORS, FLOORS, floorLabel } from '../constants';

type BuildingFloor = { building: string; floor: string };

type BuildingFloorPickerProps = {
  building: string;
  floor: string;
  recents: BuildingFloor[];
  onChange: (value: BuildingFloor) => void;
};

const ROW_HEIGHT = 44;
const ROW_GAP = 4;
const BUILDING_OPTIONS = BUILDINGS.map((value) => ({
  value: String(value),
  label: `${value}동`,
}));

const positionLabel = (building: string, floor: string) =>
  `${building}동 ${floorLabel(floor)}`;

/** 선택된 줄이 목록 가운데쯤 보이도록 스크롤합니다. */
function scrollToSelected(
  ref: React.RefObject<ScrollViewInstance | null>,
  index: number,
) {
  if (index < 0) return;
  ref.current?.scrollTo({
    y: Math.max(0, index * (ROW_HEIGHT + ROW_GAP) - ROW_HEIGHT * 2),
    animated: false,
  });
}

/** 동과 층을 시트 하나에서 나란히 고르는 선택기. 층을 누르면 바로 확정됩니다. */
export function BuildingFloorPicker({
  building,
  floor,
  recents,
  onChange,
}: BuildingFloorPickerProps) {
  const [visible, setVisible] = useState(false);
  const [tempBuilding, setTempBuilding] = useState(building);
  const [tempFloor, setTempFloor] = useState(floor);
  const buildingRef = useRef<ScrollViewInstance>(null);
  const floorRef = useRef<ScrollViewInstance>(null);

  const open = () => {
    setTempBuilding(building);
    setTempFloor(floor);
    setVisible(true);
  };

  const commit = (value: BuildingFloor) => {
    onChange(value);
    setVisible(false);
  };

  return (
    <>
      <Pressable accessibilityRole="button" onPress={open} style={styles.field}>
        <Text style={[styles.fieldValue, !(building && floor) && styles.placeholder]}>
          {building && floor
            ? positionLabel(building, floor)
            : building
              ? `${building}동 · 층 선택`
              : '동·층을 선택해 주세요'}
        </Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>
      <Modal
        animationType="slide"
        onRequestClose={() => setVisible(false)}
        transparent
        visible={visible}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.title}>위치 선택</Text>
              <Pressable hitSlop={10} onPress={() => setVisible(false)}>
                <Text style={styles.close}>닫기</Text>
              </Pressable>
            </View>

            {recents.length ? (
              <>
                <Text style={styles.label}>최근 위치</Text>
                <View style={styles.recents}>
                  {recents.map((item) => (
                    <Pressable
                      accessibilityRole="button"
                      key={`${item.building}|${item.floor}`}
                      onPress={() => commit(item)}
                      style={styles.recent}
                    >
                      <Text style={styles.recentText}>
                        {positionLabel(item.building, item.floor)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            <View style={styles.columns}>
              <View style={styles.column}>
                <Text style={styles.label}>동</Text>
                <ScrollView
                  contentContainerStyle={styles.columnContent}
                  onLayout={() =>
                    scrollToSelected(
                      buildingRef,
                      BUILDING_OPTIONS.findIndex((o) => o.value === tempBuilding),
                    )
                  }
                  ref={buildingRef}
                  style={styles.columnList}
                >
                  {BUILDING_OPTIONS.map((option) => {
                    const selected = option.value === tempBuilding;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        key={option.value}
                        onPress={() => setTempBuilding(option.value)}
                        style={[styles.option, selected && styles.selectedOption]}
                      >
                        <Text style={[styles.optionText, selected && styles.selectedText]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
              <View style={styles.column}>
                <Text style={styles.label}>층</Text>
                <ScrollView
                  contentContainerStyle={styles.columnContent}
                  onLayout={() =>
                    scrollToSelected(
                      floorRef,
                      FLOORS.findIndex((o) => o.value === tempFloor),
                    )
                  }
                  ref={floorRef}
                  style={styles.columnList}
                >
                  {FLOORS.map((option) => {
                    const selected = option.value === tempFloor;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        key={option.value}
                        onPress={() => {
                          setTempFloor(option.value);
                          if (tempBuilding) {
                            commit({ building: tempBuilding, floor: option.value });
                          }
                        }}
                        style={[styles.option, selected && styles.selectedOption]}
                      >
                        <Text style={[styles.optionText, selected && styles.selectedText]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            <Pressable
              disabled={!tempBuilding || !tempFloor}
              onPress={() => commit({ building: tempBuilding, floor: tempFloor })}
              style={[
                styles.doneButton,
                (!tempBuilding || !tempFloor) && styles.disabledButton,
              ]}
            >
              <Text style={styles.doneText}>
                {tempBuilding && tempFloor
                  ? `${positionLabel(tempBuilding, tempFloor)} 선택`
                  : tempBuilding
                    ? '층을 선택해 주세요'
                    : '동을 먼저 선택해 주세요'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  fieldValue: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  placeholder: { color: COLORS.muted, fontWeight: '600' },
  chevron: { color: COLORS.muted, fontSize: 22 },
  backdrop: {
    backgroundColor: 'rgba(17, 28, 48, 0.42)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  close: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
  label: { color: COLORS.muted, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  recents: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  recent: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  recentText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  columns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1 },
  columnList: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    height: 320,
  },
  columnContent: { gap: ROW_GAP, padding: 6 },
  option: {
    alignItems: 'center',
    borderRadius: 10,
    height: ROW_HEIGHT,
    justifyContent: 'center',
  },
  selectedOption: { backgroundColor: COLORS.primary },
  optionText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  selectedText: { color: COLORS.surface, fontWeight: '800' },
  doneButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 52,
  },
  doneText: { color: COLORS.surface, fontSize: 15, fontWeight: '800' },
  disabledButton: { opacity: 0.5 },
});
