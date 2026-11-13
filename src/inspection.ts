import { INSPECTION_KINDS, floorLabel } from './constants';
import {
  InspectionDraft,
  InspectionKind,
  InspectionRecord,
  MeterKind,
} from './types';

export const isMeterKind = (kind: InspectionKind): kind is MeterKind =>
  kind !== 'defect';

export const kindLabel = (kind: InspectionKind) =>
  INSPECTION_KINDS.find((item) => item.value === kind)?.label ?? kind;

export const recordKind = (record: InspectionRecord): InspectionKind =>
  record.kind ?? 'defect';

type InspectionFields = Pick<
  InspectionDraft,
  'kind' | 'building_number' | 'floor' | 'location' | 'defects' | 'meter_location'
>;

/** 사진에 합성되는 표와 기록 목록에 쓰는 위치·내용 문구 */
export function describeInspection(fields: InspectionFields) {
  if (isMeterKind(fields.kind)) {
    return { position: fields.meter_location, content: kindLabel(fields.kind) };
  }
  const position = [
    fields.building_number ? `${fields.building_number}동` : '',
    fields.floor ? floorLabel(fields.floor) : '',
    fields.location,
  ]
    .filter(Boolean)
    .join(' ');
  return { position, content: fields.defects.join(', ') };
}

export function missingFields(draft: InspectionDraft) {
  const missing: string[] = [];
  if (isMeterKind(draft.kind)) {
    if (!draft.meter_location) missing.push('위치');
    return missing;
  }
  if (!draft.building_number) missing.push('동');
  if (!draft.floor) missing.push('층');
  if (!draft.location) missing.push('장소');
  if (!draft.defects.length) missing.push('하자 내용');
  return missing;
}

export function recordToFields(record: InspectionRecord): InspectionFields {
  return {
    kind: recordKind(record),
    building_number: record.building_number ? String(record.building_number) : '',
    floor: record.floor ?? '',
    location: record.location ?? '',
    defects: record.defects ?? [],
    meter_location: record.meter_location ?? '',
  };
}

export function recordToDraft(record: InspectionRecord): Partial<InspectionDraft> {
  return {
    ...recordToFields(record),
    inspection_date: record.inspection_date,
    editing_id: record.id,
  };
}

/** 저장할 기록의 점검 정보 부분. 점검 종류에 해당하지 않는 칸은 비워 둡니다. */
export function draftToRecordFields(draft: InspectionDraft) {
  if (isMeterKind(draft.kind)) {
    return { kind: draft.kind, meter_location: draft.meter_location, defects: [] };
  }
  return {
    kind: draft.kind,
    building_number: Number(draft.building_number),
    floor: draft.floor,
    location: draft.location,
    defects: draft.defects,
  };
}

/** 최근 일반 하자점검 기록에서 겹치지 않는 동·층 조합 */
export function recentBuildingFloors(records: InspectionRecord[], limit = 4) {
  const seen = new Set<string>();
  const result: { building: string; floor: string }[] = [];
  for (const record of records) {
    if (recordKind(record) !== 'defect' || !record.building_number || !record.floor) {
      continue;
    }
    const key = `${record.building_number}|${record.floor}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ building: String(record.building_number), floor: record.floor });
    if (result.length >= limit) break;
  }
  return result;
}
