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
import { INITIAL_DEFECTS, INITIAL_METER_LOCATIONS } from '../constants';
import {
  InspectionDraft,
  InspectionKind,
  InspectionRecord,
  MeterKind,
  MeterLocations,
} from '../types';

const STORAGE_KEY = 'inspection-app-state-v1';

const EMPTY_DRAFT: InspectionDraft = {
  kind: 'elec',
  building_number: '',
  floor: '',
  location: '',
  defects: [],
  meter_location: '',
  inspection_date: '',
};

const INSPECTION_KIND_VALUES: InspectionKind[] = ['elec', 'water', 'defect'];

/** 저장 후 새 점검을 시작할 때 마지막에 고른 점검 종류는 유지합니다. */
const emptyDraftFor = (kind: InspectionKind): InspectionDraft => ({
  ...EMPTY_DRAFT,
  kind,
});

type PersistedState = {
  draft: InspectionDraft;
  records: InspectionRecord[];
  defectOptions: string[];
  meterLocations: MeterLocations;
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
  addMeterLocation: (kind: MeterKind, label: string) => Promise<void>;
  renameMeterLocation: (
    kind: MeterKind,
    oldLabel: string,
    newLabel: string,
  ) => Promise<void>;
  removeMeterLocation: (kind: MeterKind, label: string) => Promise<void>;
};

const InspectionContext = createContext<InspectionContextValue | null>(null);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

function parseMeterLocations(value: unknown): MeterLocations {
  const saved = (value ?? {}) as Partial<Record<MeterKind, unknown>>;
  return {
    elec: isStringArray(saved.elec) ? saved.elec : INITIAL_METER_LOCATIONS.elec,
    water: isStringArray(saved.water) ? saved.water : INITIAL_METER_LOCATIONS.water,
  };
}

function parseDraft(value: Partial<InspectionDraft>): InspectionDraft {
  const draft = { ...EMPTY_DRAFT, ...value };
  if (!INSPECTION_KIND_VALUES.includes(draft.kind)) draft.kind = EMPTY_DRAFT.kind;
  return draft;
}

function validateLabel(
  value: string,
  existing: string[],
  noun: '하자 항목' | '위치',
  oldLabel?: string,
) {
  if (!value) {
    throw new Error(`${noun === '위치' ? '위치를' : '하자 항목을'} 입력해 주세요.`);
  }
  if (value !== oldLabel && existing.includes(value)) {
    throw new Error(`이미 등록된 ${noun}입니다.`);
  }
}

export function InspectionProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<InspectionDraft>(EMPTY_DRAFT);
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [defectOptions, setDefectOptions] = useState(INITIAL_DEFECTS);
  const [meterLocations, setMeterLocations] = useState<MeterLocations>(
    INITIAL_METER_LOCATIONS,
  );
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && active) {
          const parsed = JSON.parse(saved) as Partial<PersistedState>;
          if (parsed.draft) setDraft(parseDraft(parsed.draft));
          if (Array.isArray(parsed.records)) setRecords(parsed.records);
          if (isStringArray(parsed.defectOptions)) {
            setDefectOptions(parsed.defectOptions);
          }
          setMeterLocations(parseMeterLocations(parsed.meterLocations));
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

  const current = useMemo<PersistedState>(
    () => ({ draft, records, defectOptions, meterLocations }),
    [defectOptions, draft, meterLocations, records],
  );

  /** 현재 상태에 변경분을 합쳐 기기에 먼저 저장합니다. 실패하면 화면 상태는 그대로 둡니다. */
  const persist = useCallback(
    async (patch: Partial<PersistedState>) => {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...current, ...patch }),
      );
      setStorageError(null);
    },
    [current],
  );

  useEffect(() => {
    if (!ready) return;

    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current)).catch(() => {
      setStorageError('점검 정보를 기기에 저장하지 못했습니다.');
    });
  }, [current, ready]);

  const updateDraft = useCallback((patch: Partial<InspectionDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft((prev) => emptyDraftFor(prev.kind));
  }, []);

  const saveRecord = useCallback(
    async (record: InspectionRecord) => {
      const nextRecords = [
        record,
        ...records.filter((item) => item.id !== record.id),
      ];
      const nextDraft = emptyDraftFor(draft.kind);
      await persist({ draft: nextDraft, records: nextRecords });
      setRecords(nextRecords);
      setDraft(nextDraft);
    },
    [draft.kind, persist, records],
  );

  const deleteRecord = useCallback(
    async (id: string) => {
      const nextRecords = records.filter((record) => record.id !== id);
      await persist({ records: nextRecords });
      setRecords(nextRecords);
    },
    [persist, records],
  );

  const addDefect = useCallback(
    async (label: string) => {
      const value = label.trim();
      validateLabel(value, defectOptions, '하자 항목');
      const nextOptions = [...defectOptions, value];
      await persist({ defectOptions: nextOptions });
      setDefectOptions(nextOptions);
    },
    [defectOptions, persist],
  );

  const renameDefect = useCallback(
    async (oldLabel: string, newLabel: string) => {
      const value = newLabel.trim();
      validateLabel(value, defectOptions, '하자 항목', oldLabel);
      const nextOptions = defectOptions.map((item) =>
        item === oldLabel ? value : item,
      );
      const nextDraft = {
        ...draft,
        defects: draft.defects.map((item) => (item === oldLabel ? value : item)),
      };
      await persist({ draft: nextDraft, defectOptions: nextOptions });
      setDefectOptions(nextOptions);
      setDraft(nextDraft);
    },
    [defectOptions, draft, persist],
  );

  const removeDefect = useCallback(
    async (label: string) => {
      const nextOptions = defectOptions.filter((item) => item !== label);
      const nextDraft = {
        ...draft,
        defects: draft.defects.filter((item) => item !== label),
      };
      await persist({ draft: nextDraft, defectOptions: nextOptions });
      setDefectOptions(nextOptions);
      setDraft(nextDraft);
    },
    [defectOptions, draft, persist],
  );

  const addMeterLocation = useCallback(
    async (kind: MeterKind, label: string) => {
      const value = label.trim();
      validateLabel(value, meterLocations[kind], '위치');
      const next = { ...meterLocations, [kind]: [...meterLocations[kind], value] };
      await persist({ meterLocations: next });
      setMeterLocations(next);
    },
    [meterLocations, persist],
  );

  const renameMeterLocation = useCallback(
    async (kind: MeterKind, oldLabel: string, newLabel: string) => {
      const value = newLabel.trim();
      validateLabel(value, meterLocations[kind], '위치', oldLabel);
      const next = {
        ...meterLocations,
        [kind]: meterLocations[kind].map((item) => (item === oldLabel ? value : item)),
      };
      const nextDraft =
        draft.kind === kind && draft.meter_location === oldLabel
          ? { ...draft, meter_location: value }
          : draft;
      await persist({ draft: nextDraft, meterLocations: next });
      setMeterLocations(next);
      setDraft(nextDraft);
    },
    [draft, meterLocations, persist],
  );

  const removeMeterLocation = useCallback(
    async (kind: MeterKind, label: string) => {
      const next = {
        ...meterLocations,
        [kind]: meterLocations[kind].filter((item) => item !== label),
      };
      const nextDraft =
        draft.kind === kind && draft.meter_location === label
          ? { ...draft, meter_location: '' }
          : draft;
      await persist({ draft: nextDraft, meterLocations: next });
      setMeterLocations(next);
      setDraft(nextDraft);
    },
    [draft, meterLocations, persist],
  );

  const value = useMemo(
    () => ({
      ...current,
      ready,
      storageError,
      updateDraft,
      resetDraft,
      saveRecord,
      deleteRecord,
      addDefect,
      renameDefect,
      removeDefect,
      addMeterLocation,
      renameMeterLocation,
      removeMeterLocation,
    }),
    [
      addDefect,
      addMeterLocation,
      current,
      deleteRecord,
      ready,
      removeDefect,
      removeMeterLocation,
      renameDefect,
      renameMeterLocation,
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
