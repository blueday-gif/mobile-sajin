export const BUILDINGS = Array.from({ length: 30 }, (_, index) => 401 + index);

export const FLOORS = [
  { value: 'B3', label: '지하 3층' },
  { value: 'B2', label: '지하 2층' },
  { value: 'B1', label: '지하 1층' },
  ...Array.from({ length: 35 }, (_, index) => ({
    value: `${index + 1}F`,
    label: `${index + 1}층`,
  })),
  { value: 'RF', label: '옥상' },
];

export const LOCATIONS = ['계단실', '전실', '승강기홀'] as const;

export const INITIAL_DEFECTS = ['타일오염', '도장들뜸'];

export const INSPECTION_KINDS = [
  { value: 'elec', label: '4단지 전기검침' },
  { value: 'water', label: '4단지 수도검침' },
  { value: 'defect', label: '일반 하자점검' },
] as const;

export const INITIAL_METER_LOCATIONS = {
  elec: [
    'PF',
    'MOF1-6',
    'MOF1-7',
    'MOF1-8',
    'MOF2-6',
    'MOF2-7',
    'MOF2-8',
    '롯데건설',
    '노인정',
  ],
  water: ['시수', '지하수'],
};

export const COLORS = {
  background: '#F3F6FB',
  surface: '#FFFFFF',
  text: '#17243A',
  muted: '#718096',
  border: '#DDE4EE',
  primary: '#245BE8',
  primaryLight: '#EAF0FF',
  danger: '#C33D46',
  success: '#16845B',
};

export const formatInspectionDate = (date: string) => {
  const [year, month, day] = date.slice(0, 10).split('-');
  return `${year}.${month}.${day}`;
};

export const getLocalInspectionDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const floorLabel = (floor: string) =>
  FLOORS.find((option) => option.value === floor)?.label ?? floor;
