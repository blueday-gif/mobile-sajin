export type InspectionLocation = '계단실' | '전실' | '승강기홀';

export type InspectionDraft = {
  building_number: string;
  floor: string;
  location: InspectionLocation | '';
  defects: string[];
  inspection_date: string;
  editing_id?: string;
};

export type InspectionRecord = {
  id: string;
  building_number: number;
  floor: string;
  location: InspectionLocation;
  defects: string[];
  inspection_date: string;
  original_photo_uri: string;
  result_photo_uri: string;
  created_at: string;
};
