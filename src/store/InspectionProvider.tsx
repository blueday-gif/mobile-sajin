import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { INITIAL_DEFECTS } from '../constants';
import { InspectionDraft, InspectionRecord } from '../types';

const STORAGE_KEY = 'inspection-app-state-v1';

const EMPTY_DRAFT: InspectionDraft = {
  building_number: '',
  floor: '',
  location: '',
  defects: [],
  inspection_date: '',
};

type PersistedState = {
  draft: InspectionDraft;
  records: InspectionRecord[];
  defectOptions: string[];
};

type InspectionContextValue = PersistedState & {
  ready: boolean;
  storageError: string | null;
  updateDraft: (patch: Partial<InspectionDraft>) => void;
  resetDraft: () => void;
  saveRecord: (record: InspectionRecord) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  addDefect: (label: string) => Promise<void>;
  renameDefect: (oldLabel: string, newLabel: string) => Promise<void>;
  removeDefect: (label: string) => Promise<void>;
};

const InspectionContext = createContext<InspectionContextValue | null>(null);

export function InspectionProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<InspectionDraft>(EMPTY_DRAFT);
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [defectOptions, setDefectOptions] = useState(INITIAL_DEFECTS);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && active) {
          const parsed = JSON.parse(saved) as Partial<PersistedState>;
          if (parsed.draft) setDraft({ ...EMPTY_DRAFT, ...parsed.draft });
          if (Array.isArray(parsed.records)) setRecords(parsed.records);
          if (Array.isArray(parsed.defectOptions)) {
            setDefectOptions(parsed.defectOptions);
          }
        }
      } catch {
        if (active) {
          setStorageError('저장된 점검 정보를 불러오지 못했습니다.');
        }
      } finally {
        if (active) setReady(true);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback(async (next: PersistedState) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    if (!ready) return;

    void AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ draft, records, defectOptions }),
    ).catch(() => {
      setStorageError('점검 정보를 기기에 저장하지 못했습니다.');
    });
  }, [defectOptions, draft, ready, records]);

  const updateDraft = useCallback((patch: Partial<InspectionDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(EMPTY_DRAFT);
  }, []);

  const saveRecord = useCallback(
    async (record: InspectionRecord) => {
      const nextRecords = [
        record,
        ...records.filter((item) => item.id !== record.id),
      ];
      const next = {
        draft: EMPTY_DRAFT,
        records: nextRecords,
        defectOptions,
      };
      await persist(next);
      setStorageError(null);
      setRecords(nextRecords);
      setDraft(EMPTY_DRAFT);
    },
    [defectOptions, persist, records],
  );

  const deleteRecord = useCallback(
    async (id: string) => {
      const nextRecords = records.filter((record) => record.id !== id);
      await persist({ draft, records: nextRecords, defectOptions });
      setStorageError(null);
      setRecords(nextRecords);
    },
    [defectOptions, draft, persist, records],
  );

  const addDefect = useCallback(
    async (label: string) => {
      const value = label.trim();
      if (!value) throw new Error('하자 항목을 입력해 주세요.');
      if (defectOptions.includes(value)) {
        throw new Error('이미 등록된 하자 항목입니다.');
      }

      const nextOptions = [...defectOptions, value];
      await persist({ draft, records, defectOptions: nextOptions });
      setStorageError(null);
      setDefectOptions(nextOptions);
    },
    [defectOptions, draft, persist, records],
  );

  const renameDefect = useCallback(
    async (oldLabel: string, newLabel: string) => {
      const value = newLabel.trim();
      if (!value) throw new Error('하자 항목을 입력해 주세요.');
      if (value !== oldLabel && defectOptions.includes(value)) {
        throw new Error('이미 등록된 하자 항목입니다.');
      }

      const nextOptions = defectOptions.map((item) =>
        item === oldLabel ? value : item,
      );
      const nextDraft = {
        ...draft,
        defects: draft.defects.map((item) =>
          item === oldLabel ? value : item,
        ),
      };
      await persist({ draft: nextDraft, records, defectOptions: nextOptions });
      setStorageError(null);
      setDefectOptions(nextOptions);
      setDraft(nextDraft);
    },
    [defectOptions, draft, persist, records],
  );

  const removeDefect = useCallback(
    async (label: string) => {
      const nextOptions = defectOptions.filter((item) => item !== label);
      const nextDraft = {
        ...draft,
        defects: draft.defects.filter((item) => item !== label),
      };
      await persist({ draft: nextDraft, records, defectOptions: nextOptions });
      setStorageError(null);
      setDefectOptions(nextOptions);
      setDraft(nextDraft);
    },
    [defectOptions, draft, persist, records],
  );

  const value = useMemo(
    () => ({
      draft,
      records,
      defectOptions,
      ready,
      storageError,
      updateDraft,
      resetDraft,
      saveRecord,
      deleteRecord,
      addDefect,
      renameDefect,
      removeDefect,
    }),
    [
      addDefect,
      defectOptions,
      deleteRecord,
      draft,
      ready,
      records,
      removeDefect,
      renameDefect,
      resetDraft,
      saveRecord,
      storageError,
      updateDraft,
    ],
  );

  return (
    <InspectionContext.Provider value={value}>
      {children}
    </InspectionContext.Provider>
  );
}

export function useInspection() {
  const context = useContext(InspectionContext);
  if (!context) {
    throw new Error('useInspection must be used within InspectionProvider');
  }
  return context;
}
