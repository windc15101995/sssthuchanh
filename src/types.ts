export interface FieldConfig {
  type: 'text' | 'select';
  options?: string[];
}

export interface TemplateConfig {
  fontSize: number;
  textColor: string;
  fontFamily: string;
  headingColor1: string;
  headingColor2: string;
  borderColor1: string;
  borderColor2: string;
  borderColor3: string;
  backgroundColor: string;
  logoUrl?: string;
  guideImageUrl?: string;
  fieldsConfig?: Record<string, FieldConfig>;
  supporterCode?: string;
  supporters?: { name: string; code: string }[];
}

export interface FormData {
  writer: string;
  date: string;
  thucCanh: string;
  tinhHuong: string;
  soiTinhXau: string;
  xetDocHai: string;
  thayHauQua: string;
  nhinGoc: string;
  chonTam: string;
  duongTinh: string;
  phaChap: string;
  dinhTam: string;
  phatTue: string;
  thanhNguoi: string;
}

export const defaultTemplateConfig: TemplateConfig = {
  fontSize: 12,
  textColor: '#4b5563', 
  fontFamily: "'Google Sans', 'Be Vietnam Pro', 'Inter', sans-serif",
  headingColor1: '#1e40af', // Blue
  headingColor2: '#ef4444', // Red
  borderColor1: '#1e40af',
  borderColor2: '#ef4444',
  borderColor3: '#93c5fd',
  backgroundColor: '#ffffff'
};

// Will adjust colors later to perfectly match the image.
defaultTemplateConfig.fontSize = 11;
defaultTemplateConfig.headingColor1 = '#1d4ed8'; // blue-700
defaultTemplateConfig.headingColor2 = '#ef4444'; // red-500
defaultTemplateConfig.borderColor1 = '#1d4ed8'; // blue border
defaultTemplateConfig.borderColor2 = '#ef4444'; // red border
defaultTemplateConfig.borderColor3 = '#93c5fd'; // light blue border

export const defaultFormData: FormData = {
  writer: '',
  date: new Date().toLocaleDateString('vi-VN'),
  thucCanh: '',
  tinhHuong: '',
  soiTinhXau: '',
  xetDocHai: '',
  thayHauQua: '',
  nhinGoc: '',
  chonTam: '',
  duongTinh: '',
  phaChap: '',
  dinhTam: '',
  phatTue: '',
  thanhNguoi: ''
};
