import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import download from 'downloadjs';
import { GraduationCap, Settings, PenTool, Image as ImageIcon, Download, ZoomIn, ZoomOut, Eye, Home, HelpCircle, X, Save } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { motion, AnimatePresence } from 'motion/react';

import { defaultFormData, defaultTemplateConfig, FormData, TemplateConfig } from './types';
import { FormInput } from './components/FormInput';
import { TemplatePreview } from './components/TemplatePreview';
import { AdminPanel } from './components/AdminPanel';
import { ChatPopup } from './components/ChatPopup';
import { ClassroomPanel } from './components/ClassroomPanel';

type Tab = 'fill' | 'preview' | 'admin' | 'classroom';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('fill');
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [previewZoom, setPreviewZoom] = useState(window.innerWidth < 1024 ? Math.max((window.innerWidth - 64) / 1000, 0.3) : 1);
  const [previewHeight, setPreviewHeight] = useState(1000);
  const [showPinInfoPrompt, setShowPinInfoPrompt] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [previewBgIndex, setPreviewBgIndex] = useState(0);

  const [templateConfig, setTemplateConfig] = useState<TemplateConfig>(defaultTemplateConfig);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to top immediately when tab changes, avoiding smooth scroll which can glitch during layout shifts
    const el = document.getElementById('main-scroll-section');
    if (el) {
      el.scrollTop = 0;
    }
  }, [activeTab]);

  useEffect(() => {
    if (previewRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          setPreviewHeight((entry.target as HTMLElement).offsetHeight);
        }
      });
      observer.observe(previewRef.current);
      return () => observer.disconnect();
    }
  }, [activeTab, formData, templateConfig]);

  useEffect(() => {
    const hasSeen = sessionStorage.getItem('has_seen_pin_prompt');
    if (!hasSeen) {
      setShowPinInfoPrompt(true);
    }
  }, []);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            setTemplateConfig(prev => ({ ...prev, ...data }));
            return;
          }
        }
      } catch (err) {
        console.warn('API config fetch failed, trying Firestore fallback:', err);
      }

      try {
        const configRef = doc(db, 'config', 'global');
        const docSnap = await getDoc(configRef);
        if (docSnap.exists()) {
          setTemplateConfig(prev => ({ ...prev, ...docSnap.data() as Partial<TemplateConfig> }));
        }
      } catch (e) {
        console.error('Lỗi khi tải cấu hình', e);
      }
    };

    fetchConfig();
    const interval = setInterval(fetchConfig, 30000); // Sync config every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleSaveConfig = async (overrideConfig?: TemplateConfig) => {
    const configToSave = overrideConfig || templateConfig;
    let saved = false;

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configToSave)
      });
      if (res.ok) {
        saved = true;
      }
    } catch (e) {
      console.warn('Could not save to Cloud SQL API, falling back to Firestore', e);
    }

    try {
      const configRef = doc(db, 'config', 'global');
      await setDoc(configRef, configToSave);
      saved = true;
    } catch (e) {
      console.warn('Could not save to Firestore fallback', e);
    }

    if (saved) {
      alert('Đã lưu tùy chọn cấu hình thành công cho tất cả mọi người!');
    } else {
      alert('Lỗi khi lưu cấu hình');
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(() => {
    if (previewRef.current === null) {
      return;
    }
    setIsExporting(true);
    
    // Delay to ensure React layout & custom fonts are ready before snapshot
    setTimeout(async () => {
      try {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }

        const exportOptions = {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: templateConfig.backgroundColor || '#ffffff',
          style: {
            margin: '0',
          },
        };

        // Warm up html-to-image font embedding engine
        await toPng(previewRef.current!, exportOptions);

        // Capture actual crisp PNG snapshot
        const dataUrl = await toPng(previewRef.current!, exportOptions);
        
        // Convert dataUrl to Blob for better mobile/iOS support
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = `TamThuc_${formData.date.replace(/\//g, '-')}.png`;
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
      } catch (err) {
        console.error('Error exporting image', err);
        alert('Có lỗi xảy ra khi xuất ảnh.');
      } finally {
        setIsExporting(false);
      }
    }, 150);
  }, [previewRef, formData.date, templateConfig.backgroundColor]);

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#3C3633] font-sans flex flex-col">
      <AnimatePresence>
        {showPinInfoPrompt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0 }}
              className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
            >
              <button 
                onClick={() => {
                  setShowPinInfoPrompt(false);
                  sessionStorage.setItem('has_seen_pin_prompt', 'true');
                }}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#7A8471]/10 rounded-full flex items-center justify-center text-[#7A8471]">
                  <Save className="w-5 h-5" />
                </div>
                <h3 className="font-serif italic text-2xl text-[#5A5A40]">Lưu Nháp Bằng Mã PIN</h3>
              </div>
              
              <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
                <p>
                  Nếu chưa thể hoàn thành bài viết ngay, hãy <strong className="text-[#3C3633]">tạo mã PIN</strong> và <strong className="text-[#3C3633]">Lưu nháp</strong>.
                </p>
                <p>
                  Trong vòng 24 giờ, bạn chỉ cần nhập lại mã PIN này để mở lại bài viết và tiếp tục chỉnh sửa mà không cần nhập lại từ đầu.
                </p>
                <div className="bg-[#F5F5F0] p-4 rounded-lg border border-[#E2E2D8]">
                  <p className="text-xs text-[#5A5A40]">
                    <strong>Lưu ý:</strong> Vui lòng tránh sử dụng các mã PIN quá đơn giản (như 1234, 0000) và <strong>ghi nhớ mã PIN</strong> để sử dụng khi cần khôi phục bài viết.
                  </p>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => {
                    setShowPinInfoPrompt(false);
                    sessionStorage.setItem('has_seen_pin_prompt', 'true');
                  }}
                  className="px-6 py-2.5 bg-[#7A8471] text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm hover:bg-[#606958] transition-colors w-full sm:w-auto"
                >
                  Đã Hiểu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Navigation */}
      <header className="h-16 bg-white border-b border-[#E2E2D8] flex items-center justify-between px-4 sm:px-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#7A8471] rounded-full flex items-center justify-center text-white font-serif italic shadow-sm">S</div>
          <h1 className="font-serif text-xl font-semibold tracking-tight uppercase text-[#5A5A40] hidden sm:block">Sống Sáng Suốt</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-2 p-1 bg-[#F5F5F0] rounded-lg">
            <button
              onClick={() => setActiveTab('fill')}
              className={`px-3 sm:px-4 py-1.5 rounded-md text-[10px] sm:text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-colors ${
                activeTab === 'fill' ? 'bg-white shadow-sm text-[#3C3633]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Home className="w-3 h-3" />
              <span className="hidden sm:inline">Trang chủ</span>
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 sm:px-4 py-1.5 rounded-md text-[10px] sm:text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-colors ${
                activeTab === 'admin' ? 'bg-white shadow-sm text-[#3C3633]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Settings className="w-3 h-3" />
              <span className="hidden sm:inline">Quản trị</span>
            </button>
            <button
              onClick={() => setActiveTab('classroom')}
              className={`px-3 sm:px-4 py-1.5 rounded-md text-[10px] sm:text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-colors ${
                activeTab === 'classroom' ? 'bg-white shadow-sm text-[#3C3633]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <GraduationCap className="w-3 h-3" />
              <span className="hidden sm:inline">Lớp học</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden bg-[#F0F0E8]">
        <section id="main-scroll-section" className="flex-1 flex justify-center overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'fill' && (
              <motion.div
                key="fill"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="w-full max-w-[600px]"
              >
                <FormInput 
                  data={formData} 
                  config={templateConfig} 
                  onChange={setFormData} 
                  onPreview={() => setActiveTab('preview')} 
                  onHelp={() => setIsGuideModalOpen(true)}
                />
              </motion.div>
            )}

            {activeTab === 'admin' && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="w-full max-w-[600px]"
              >
                <AdminPanel 
                  config={templateConfig} 
                  onChange={setTemplateConfig} 
                  onSave={handleSaveConfig}
                  onViewDraft={(data) => {
                    setFormData(data);
                    setActiveTab('preview');
                  }}
                />
              </motion.div>
            )}

            {activeTab === 'classroom' && (
              <motion.div
                key="classroom"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="w-full flex justify-center"
              >
                <ClassroomPanel />
              </motion.div>
            )}

            {activeTab === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="w-full flex flex-col items-center"
              >
                <div className="w-full max-w-[1020px] flex flex-col lg:flex-row gap-3 mb-4 px-2 sm:px-4 lg:justify-between lg:items-center">
                  <div className="flex items-center justify-between lg:justify-start w-full lg:w-auto gap-2 sm:gap-4">
                    <div className="flex gap-1 sm:gap-2 bg-[#E2E2D8] p-1 rounded-lg shrink-0">
                      <button
                        onClick={() => setActiveTab('fill')}
                        className="relative p-1.5 sm:p-2 rounded-md text-gray-500 hover:text-gray-800 transition-colors z-10"
                        title="Nhập liệu"
                      >
                        <PenTool className="relative z-20 w-4 h-4" />
                      </button>
                      <button
                        className="relative p-1.5 sm:p-2 rounded-md text-[#3C3633] transition-colors z-10"
                        title="Xem trước"
                      >
                        <motion.div layoutId="activeTabIndicator" className="absolute inset-0 bg-white shadow-sm rounded-md -z-10" />
                        <Eye className="relative z-20 w-4 h-4" />
                      </button>
                      {templateConfig.guideImageUrl && (
                        <button
                          onClick={() => setIsGuideModalOpen(true)}
                          className="relative p-1.5 sm:p-2 rounded-md text-gray-500 hover:text-gray-800 transition-colors z-10"
                          title="Hướng dẫn"
                        >
                          <HelpCircle className="relative z-20 w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 bg-white rounded-full p-1 shadow-sm shrink-0">
                      <button 
                        onClick={() => setPreviewZoom(z => Math.max(0.3, z - 0.1))}
                        className="p-1 sm:p-1.5 text-gray-500 hover:text-[#5A5A40] hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <span className="text-[10px] sm:text-xs font-mono font-medium text-gray-500 w-8 sm:w-12 text-center">
                        {Math.round(previewZoom * 100)}%
                      </span>
                      <button 
                        onClick={() => setPreviewZoom(z => Math.min(2, z + 0.1))}
                        className="p-1 sm:p-1.5 text-gray-500 hover:text-[#5A5A40] hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Mobile Download Button */}
                    <button
                      onClick={handleExport}
                      disabled={isExporting}
                      className="lg:hidden inline-flex items-center p-2 sm:px-4 sm:py-2 bg-[#5A5A40] text-white rounded-lg sm:rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:bg-[#4A4A35] transition-colors disabled:opacity-50 shadow-sm shrink-0"
                    >
                      {isExporting ? (
                        <span>Đang xử lý...</span>
                      ) : (
                        <>
                          <Download className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">TẢI XUỐNG</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Background Selector */}
                  <div className="flex items-center justify-start lg:justify-center gap-2 bg-white p-2 lg:p-1.5 rounded-xl lg:rounded-full shadow-sm px-3 overflow-x-auto custom-scrollbar w-full lg:w-auto shrink-0">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">Nền ảnh:</span>
                    <div className="flex items-center gap-2 sm:gap-1.5 shrink-0">
                      {[
                        { id: 0, name: 'Mặc định', bg: templateConfig.backgroundColor || '#ffffff' },
                        { id: 1, name: 'Morning Light', bg: 'linear-gradient(to bottom, #FFFDF8, #F8F3EA)' },
                        { id: 2, name: 'Ocean Mind', bg: 'linear-gradient(to bottom, #F8FCFD, #EEF6F8)' },
                        { id: 3, name: 'Nature', bg: 'linear-gradient(to bottom, #FAFCF8, #F1F6EF)' },
                        { id: 4, name: 'Sunrise', bg: 'linear-gradient(to bottom, #FFFDF6, #FFF4DD)' },
                        { id: 5, name: 'Sacred', bg: 'linear-gradient(to bottom, #FAF8F4, #F2EEE5)' },
                      ].map(bg => (
                        <button
                          key={bg.id}
                          title={bg.name}
                          onClick={() => setPreviewBgIndex(bg.id)}
                          className={`w-6 h-6 lg:w-5 lg:h-5 rounded-full transition-all border shadow-sm shrink-0 ${previewBgIndex === bg.id ? 'border-[#5A5A40] ring-2 ring-[#5A5A40]/20 scale-110' : 'border-gray-200 hover:scale-110'}`}
                          style={{ background: bg.bg }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Desktop Download Button */}
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="hidden lg:inline-flex items-center px-5 py-2 bg-[#5A5A40] text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#4A4A35] transition-colors disabled:opacity-50 shadow-sm shrink-0"
                  >
                    {isExporting ? (
                      <span>Đang xử lý...</span>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        <span>TẢI XUỐNG</span>
                      </>
                    )}
                  </button>
                </div>

            <div className="w-full overflow-auto custom-scrollbar pb-24 pt-8 flex justify-center items-start">
              <div 
                className="relative shrink-0 transition-all duration-200"
                style={{ 
                  width: `${1000 * previewZoom}px`, 
                  height: `${previewHeight * previewZoom}px` 
                }}
              >
                <div 
                  className="absolute top-0 left-0 origin-top-left w-[1000px] shadow-2xl transition-transform duration-200"
                  style={{ transform: `scale(${previewZoom})` }}
                >
                  <TemplatePreview ref={previewRef} data={formData} config={templateConfig} bgIndex={previewBgIndex} />
                </div>
              </div>
            </div>
          </motion.div>
          )}
          </AnimatePresence>
        </section>
      </main>

      {/* Guide Modal */}
      <AnimatePresence>
        {isGuideModalOpen && templateConfig.guideImageUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 sm:p-8 cursor-pointer" 
            onClick={() => setIsGuideModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0 }}
              className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center pointer-events-none"
            >
              <button 
                onClick={(e) => { e.stopPropagation(); setIsGuideModalOpen(false); }}
                className="absolute top-4 right-4 sm:top-0 sm:-right-12 p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-colors pointer-events-auto"
              >
                <X className="w-6 h-6" />
              </button>
              <img 
                src={templateConfig.guideImageUrl} 
                alt="Hướng dẫn" 
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl pointer-events-auto cursor-default"
                onClick={(e) => e.stopPropagation()}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ChatPopup />
    </div>
  );
}
