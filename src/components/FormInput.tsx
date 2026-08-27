import React, { useState, useEffect } from 'react';
import { FormData, TemplateConfig, defaultFormData } from '../types';
import { Save, Search, PenTool, Eye, HelpCircle } from 'lucide-react';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'motion/react';

interface FormInputProps {
  data: FormData;
  config: TemplateConfig;
  onChange: (data: FormData) => void;
  onPreview?: () => void;
  onHelp?: () => void;
}

interface InputFieldProps {
  label: string;
  name: keyof FormData;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const InputField = ({ label, name, placeholder, value, onChange }: InputFieldProps) => {
  return (
    <div>
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">{label}</label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border-b-2 border-[#F5F5F0] focus:border-[#7A8471] outline-none text-[12px] py-1 text-[#3C3633] bg-transparent transition-colors"
      />
    </div>
  );
};

interface TextAreaFieldProps {
  label: string;
  name: keyof FormData;
  rows?: number;
  placeholder?: string;
  value: string;
  config?: TemplateConfig;
  maxLength?: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const TextAreaField = ({ label, name, rows = 3, placeholder, value, config, maxLength, onChange }: TextAreaFieldProps) => {
  const [isFocused, setIsFocused] = useState(false);
  
  const fieldConfig = config?.fieldsConfig?.[name];

  return (
    <div>
      <div className="flex justify-between items-end mb-1">
        <label className="text-[10px] text-gray-500 italic block">{label}</label>
        {maxLength && (
          <span className={`text-[10px] ${value.length >= maxLength ? 'text-red-500' : 'text-gray-400'}`}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      {fieldConfig?.type === 'select' ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          className="w-full bg-[#F9F9F7] border border-transparent focus:border-[#7A8471] rounded p-2 text-[12px] text-[#3C3633] outline-none transition-colors"
        >
          <option value="">-- Chọn --</option>
          {fieldConfig.options?.map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          rows={isFocused ? Math.max(rows, 6) : rows}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="w-full bg-[#F9F9F7] border border-transparent focus:border-[#7A8471] rounded p-2 text-[12px] text-[#3C3633] outline-none transition-colors resize-none"
        />
      )}
    </div>
  );
};

export function FormInput({ data, config, onChange, onPreview, onHelp }: FormInputProps) {
  const [pin, setPin] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  const handleSave = async () => {
    if (pin.length !== 4) {
      alert('Vui lòng nhập mã PIN 4 số để lưu nháp');
      return;
    }
    const draft = {
      pin,
      data,
      timestamp: Date.now()
    };
    
    // Lưu tạm vào localStorage như 1 bản backup
    localStorage.setItem(`draft_${pin}`, JSON.stringify(draft));

    try {
      await setDoc(doc(db, 'drafts', pin), draft);
      setSaveStatus('Đã lưu nháp!');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (e) {
      setSaveStatus('Lỗi khi lưu!');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  // Auto-save effect
  useEffect(() => {
    if (pin.length === 4) {
      const timeout = setTimeout(async () => {
        // Skip if data is exactly default (empty form)
        if (JSON.stringify(data) === JSON.stringify(defaultFormData)) return;

        const draft = {
          pin,
          data,
          timestamp: Date.now()
        };
        
        // Save locally
        localStorage.setItem(`draft_${pin}`, JSON.stringify(draft));

        // Sync to server
        try {
          await setDoc(doc(db, 'drafts', pin), draft);
          setSaveStatus('Đã tự động lưu nháp!');
          setTimeout(() => setSaveStatus(''), 2000);
        } catch (e) {
          // ignore
        }
      }, 1000);

      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const handleLoad = async () => {
    if (pin.length !== 4) {
      alert('Vui lòng nhập mã PIN 4 số');
      return;
    }
    try {
      const docSnap = await getDoc(doc(db, 'drafts', pin));
      if (!docSnap.exists()) {
        throw new Error('Not found');
      }
      const draft = docSnap.data();
      const isExpired = Date.now() - draft.timestamp > 24 * 60 * 60 * 1000;
      if (isExpired) {
        alert('Bản nháp đã hết hạn (quá 24h).');
        await deleteDoc(doc(db, 'drafts', pin));
      } else {
        onChange(draft.data);
        alert('Đã khôi phục bài viết!');
      }
    } catch (e) {
      // Fallback to localStorage
      const saved = localStorage.getItem(`draft_${pin}`);
      if (saved) {
        const draft = JSON.parse(saved);
        const isExpired = Date.now() - draft.timestamp > 24 * 60 * 60 * 1000;
        
        if (isExpired) {
          alert('Bản nháp đã hết hạn (quá 24h).');
          localStorage.removeItem(`draft_${pin}`);
        } else {
          onChange(draft.data);
          alert('Đã khôi phục bài viết từ máy hiện tại!');
        }
      } else {
        alert('Không tìm thấy bài viết nào với mã PIN này.');
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: value });
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-black/5 flex flex-col border border-white/50 w-full mb-12">
      <div className="p-4 sm:p-6 bg-[#5A5A40] text-white shrink-0 rounded-t-2xl relative overflow-hidden flex justify-between items-start">
        <div>
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 22h20L12 2zm0 3.8l7.5 15.2H4.5L12 5.8z"/>
            </svg>
          </div>
          <h3 className="font-serif italic text-2xl mb-1 relative z-10">Nhập liệu nội dung</h3>
          <p className="text-[10px] opacity-80 uppercase tracking-widest relative z-10">Thực luyện tâm thức - 20 bộ đời sống tâm thức</p>
        </div>
        <div className="flex gap-2 bg-[#4A4A35] p-1 rounded-lg relative z-10">
          <button
            className="relative p-2 rounded-md text-[#3C3633] transition-colors z-10"
            title="Nhập liệu"
          >
            <motion.div layoutId="activeTabIndicator" className="absolute inset-0 bg-white shadow-sm rounded-md -z-10" />
            <PenTool className="relative z-20 w-4 h-4" />
          </button>
          <button
            onClick={onPreview}
            className="relative p-2 rounded-md text-gray-300 hover:text-white transition-colors z-10"
            title="Xem trước"
          >
            <Eye className="relative z-20 w-4 h-4" />
          </button>
          {config.guideImageUrl && (
            <button
              onClick={onHelp}
              className="relative p-2 rounded-md text-gray-300 hover:text-white transition-colors z-10"
              title="Hướng dẫn"
            >
              <HelpCircle className="relative z-20 w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Auto Save/Load Section */}
      <div className="px-4 sm:px-8 pt-6 pb-2 border-b border-[#F5F5F0]">
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#F9F9F7] p-3 rounded-lg border border-[#E2E2D8]">
          <div className="flex items-center gap-2">
            <Save className="w-4 h-4 text-[#7A8471]" />
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Lưu / Tìm lại bài viết</span>
          </div>
          <div className="flex-1 flex flex-wrap justify-center sm:justify-end items-center gap-2">
            <input
              type="text"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Mã PIN"
              className="w-20 text-center p-1.5 text-xs font-mono border border-[#E2E2D8] rounded focus:border-[#7A8471] outline-none"
            />
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#5A5A40] text-white text-xs font-bold uppercase rounded hover:bg-[#4A4A35] transition-colors"
            >
              <Save className="w-3 h-3" />
              Lưu nháp
            </button>
            <button
              onClick={handleLoad}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#5A5A40] text-white text-xs font-bold uppercase rounded hover:bg-[#4A4A35] transition-colors"
            >
              <Search className="w-3 h-3" />
              Tìm
            </button>
          </div>
          {saveStatus && (
            <span className="text-[10px] text-green-600 font-medium absolute top-4 right-4 animate-in fade-in">
              {saveStatus}
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-400 italic mt-2">
          * Nhập mã PIN 4 số để tự động lưu nháp trong 24h hoặc khôi phục bài viết cũ.
        </p>
      </div>

      <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
        {/* Thông tin chung */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <InputField label="Ngày" name="date" placeholder="DD/MM/YYYY" value={data.date} onChange={handleChange} />
          <InputField label="Writer (Người viết)" name="writer" placeholder="Tên của bạn" value={data.writer} onChange={handleChange} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
          <div className="space-y-4">
            <TextAreaField config={config} label="Tên tình huống ngắn gọn" name="tinhHuong" rows={2} placeholder="Tình huống..." value={data.tinhHuong} onChange={handleChange} maxLength={150} />
            <TextAreaField config={config} label="Thực cảnh" name="thucCanh" rows={2} placeholder="Sự việc diễn ra..." value={data.thucCanh} onChange={handleChange} />
          </div>
        </div>

        {/* Nhận dạng tâm thức */}
        <div className="pt-6 border-t border-[#F5F5F0]">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-6 h-6 rounded-full bg-[#9A8C73] text-white flex items-center justify-center text-[10px] font-bold">01</span>
            <p className="text-xs font-black text-[#9A8C73] uppercase tracking-wider" style={{ fontFamily: "'Google Sans', sans-serif" }}>Nhận dạng tâm thức</p>
          </div>
          <div className="space-y-4 pl-4 border-l border-[#E2E2D8] ml-3">
            <TextAreaField config={config} label="1. Nhìn gốc (Nhân gốc mạnh cấy sâu)" name="nhinGoc" rows={2} value={data.nhinGoc} onChange={handleChange} />
            <TextAreaField config={config} label="2. Chọn tâm (Xây giá trị phát triển)" name="chonTam" rows={3} value={data.chonTam} onChange={handleChange} />
            <TextAreaField config={config} label="3. Dưỡng tính (Đức tính cần rèn luyện)" name="duongTinh" rows={2} value={data.duongTinh} onChange={handleChange} />
          </div>
        </div>

        {/* Nhận dạng vô thức */}
        <div className="pt-6 border-t border-[#F5F5F0]">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-6 h-6 rounded-full bg-[#7A8471] text-white flex items-center justify-center text-[10px] font-bold">02</span>
            <p className="text-xs font-black text-[#7A8471] uppercase tracking-wider" style={{ fontFamily: "'Google Sans', sans-serif" }}>Nhận dạng vô thức</p>
          </div>
          <div className="space-y-4 pl-4 border-l border-[#E2E2D8] ml-3">
            <TextAreaField config={config} label="1. Soi tính xấu (Mình đang có tính xấu gì)" name="soiTinhXau" rows={2} value={data.soiTinhXau} onChange={handleChange} />
            <TextAreaField config={config} label="2. Xét độc hại (Độc tính nào đang phát tác)" name="xetDocHai" rows={3} value={data.xetDocHai} onChange={handleChange} />
            <TextAreaField config={config} label="3. Thấy hậu quả (Hậu quả nào sẽ xảy ra)" name="thayHauQua" rows={2} value={data.thayHauQua} onChange={handleChange} />
          </div>
        </div>

        {/* Thực luyện tâm thức */}
        <div className="pt-6 border-t border-[#F5F5F0]">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-6 h-6 rounded-full bg-[#5A5A40] text-white flex items-center justify-center text-[10px] font-bold">03</span>
            <p className="text-xs font-black text-[#5A5A40] uppercase tracking-wider" style={{ fontFamily: "'Google Sans', sans-serif" }}>Thực luyện tâm thức</p>
          </div>
          <div className="space-y-4 pl-4 border-l border-[#E2E2D8] ml-3">
            <TextAreaField config={config} label="1. Phá chấp mở đường" name="phaChap" rows={2} value={data.phaChap} onChange={handleChange} />
            <TextAreaField config={config} label="2. Định tâm giải quyết" name="dinhTam" rows={2} value={data.dinhTam} onChange={handleChange} />
            <TextAreaField config={config} label="3. Phát tuệ hành xử" name="phatTue" rows={2} value={data.phatTue} onChange={handleChange} />
            <TextAreaField config={config} label="4. Thành người đáng tin" name="thanhNguoi" rows={2} value={data.thanhNguoi} onChange={handleChange} />
          </div>
        </div>

        <div className="pt-8 flex justify-center">
          <button
            onClick={onPreview}
            className="flex items-center gap-2 px-6 py-3 bg-[#5A5A40] text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#4A4A35] transition-colors shadow-sm"
          >
            <Eye className="w-4 h-4" />
            Xem trước bài viết
          </button>
        </div>
      </div>
    </div>
  );
}
