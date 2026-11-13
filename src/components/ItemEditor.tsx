import React, { useState } from 'react';
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
import { COLORS } from '../constants';

type ItemEditorProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  helper: string;
  placeholder: string;
  /** 알림 문구에 쓰는 항목 이름 (예: "하자 항목", "위치") */
  noun: string;
  items: string[];
  onAdd: (label: string) => Promise<void>;
  onRename: (oldLabel: string, newLabel: string) => Promise<void>;
  onRemove: (label: string) => Promise<void>;
};

/** 하자 항목, 검침 위치처럼 사용자가 직접 관리하는 선택지 목록을 추가·수정·삭제하는 시트 */
export function ItemEditor({
  visible,
  onClose,
  title,
  helper,
  placeholder,
  noun,
  items,
  onAdd,
  onRename,
  onRemove,
}: ItemEditorProps) {
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const clearEditor = () => {
    setValue('');
    setEditing(null);
  };

  const close = () => {
    clearEditor();
    onClose();
  };

  const save = async () => {
    if (busy) return;
    try {
      setBusy(true);
      if (editing) await onRename(editing, value);
      else await onAdd(value);
      clearEditor();
    } catch (error) {
      Alert.alert(
        '저장할 수 없습니다',
        error instanceof Error ? error.message : `${noun} 저장에 실패했습니다.`,
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = (label: string) => {
    Alert.alert(`${noun} 삭제`, `‘${label}’ 항목을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          void onRemove(label)
            .then(() => {
              if (editing === label) clearEditor();
            })
            .catch((error: unknown) => {
              Alert.alert(
                '삭제할 수 없습니다',
                error instanceof Error ? error.message : `${noun} 삭제에 실패했습니다.`,
              );
            });
        },
      },
    ]);
  };

  return (
    <Modal animationType="slide" onRequestClose={close} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.heading}>
            <Text style={styles.title}>{title}</Text>
            <Pressable hitSlop={10} onPress={close}>
              <Text style={styles.linkText}>닫기</Text>
            </Pressable>
          </View>
          <Text style={styles.helper}>{helper}</Text>
          <ScrollView style={styles.list}>
            {items.length === 0 ? (
              <Text style={[styles.helper, styles.empty]}>등록된 항목이 없습니다.</Text>
            ) : null}
            {items.map((item) => (
              <View key={item} style={styles.row}>
                <Text style={styles.name}>{item}</Text>
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
                    <Text style={[styles.smallActionText, styles.deleteText]}>삭제</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
          <TextInput
            onChangeText={setValue}
            onSubmitEditing={() => void save()}
            placeholder={placeholder}
            placeholderTextColor={COLORS.muted}
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

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(17, 28, 48, 0.42)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 20,
    paddingBottom: 30,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  helper: { color: COLORS.muted, fontSize: 13, lineHeight: 19 },
  empty: { paddingVertical: 12, textAlign: 'center' },
  linkText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  list: { marginVertical: 14, maxHeight: 300 },
  row: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  name: { color: COLORS.text, flex: 1, fontSize: 14, fontWeight: '600' },
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
    marginBottom: 10,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 54,
  },
  primaryButtonText: { color: COLORS.surface, fontSize: 16, fontWeight: '800' },
  disabledButton: { opacity: 0.65 },
  cancelEdit: { alignItems: 'center', padding: 12 },
});
