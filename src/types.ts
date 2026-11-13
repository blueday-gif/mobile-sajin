export type InspectionLocation = '계단실' | '전실' | '승강기홀';

/** elec/water: 4단지 검침 (위치만 선택), defect: 일반 하자점검 (동·층·장소·하자) */
export type InspectionKind = 'elec' | 'water' | 'defect';
export type MeterKind = Exclude<InspectionKind, 'defect'>;
export type MeterLocations = Record<MeterKind, string[]>;

export type InspectionDraft = {
  kind: InspectionKind;
  building_number: string;
  floor: string;
  location: InspectionLocation | '';
  defects: string[];
  meter_location: string;
  inspection_date: string;
  editing_id?: string;
};

export type InspectionRecord = {
  id: string;
  /** 이전 버전에서 저장된 기록에는 없으며, 없으면 일반 하자점검으로 취급합니다. */
  kind?: InspectionKind;
  building_number?: number;
  floor?: string;
  location?: InspectionLocation | '';
  defects: string[];
  meter_location?: string;
  inspection_date: string;
  original_photo_uri: string;
  result_photo_uri: string;
  created_at: string;
};
