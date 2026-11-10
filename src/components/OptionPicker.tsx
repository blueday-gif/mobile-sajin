import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS } from '../constants';

type Option = {
  value: string;
  label: string;
};

type OptionPickerProps = {
  title: string;
  selectedLabel: string;
  options: Option[];
  columns?: number;
  onSelect: (value: string) => void;
};

export function OptionPicker({
  title,
  selectedLabel,
  options,
  columns = 3,
  onSelect,
}: OptionPickerProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setVisible(true)}
        style={styles.field}
      >
        <Text style={styles.fieldValue}>
          {selectedLabel || '선택해 주세요'}
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
              <Text style={styles.title}>{title}</Text>
              <Pressable onPress={() => setVisible(false)}>
                <Text style={styles.close}>닫기</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.grid}>
              {options.map((option) => {
                const selected = option.label === selectedLabel;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={option.value}
                    onPress={() => {
                      onSelect(option.value);
                      setVisible(false);
                    }}
                    style={[
                      styles.option,
                      { width: `${100 / columns - 2}%` },
                      selected && styles.selectedOption,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.selectedOptionText,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
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
  fieldValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  chevron: {
    color: COLORS.muted,
    fontSize: 22,
  },
  backdrop: {
    backgroundColor: 'rgba(17, 28, 48, 0.42)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '78%',
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
  },
  close: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 20,
  },
  option: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 4,
  },
  selectedOption: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedOptionText: {
    color: COLORS.surface,
  },
});
