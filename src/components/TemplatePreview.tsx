import React, { forwardRef } from 'react';
import { FormData, TemplateConfig } from '../types';

interface TemplatePreviewProps {
  data: FormData;
  config: TemplateConfig;
  bgIndex?: number;
}

export const TemplatePreview = forwardRef<HTMLDivElement, TemplatePreviewProps>(
  ({ data, config, bgIndex = 0 }, ref) => {
    const {
      fontSize,
      textColor,
      fontFamily,
      headingColor1,
      headingColor2,
      borderColor1,
      borderColor2,
      borderColor3,
    } = config;

    // Helper to get background styles
    const getBackgroundStyle = () => {
      const morningLightPattern = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120' opacity='0.03'%3E%3Ccircle cx='60' cy='60' r='20' fill='none' stroke='%23D4AF37' stroke-width='1'/%3E%3Cpath d='M60 10 L60 35 M60 85 L60 110 M10 60 L35 60 M85 60 L110 60 M25 25 L42 42 M95 95 L78 78 M25 95 L42 78 M95 25 L78 42' stroke='%23D4AF37' stroke-width='1'/%3E%3C/svg%3E")`;
      
      const oceanMindPattern = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='40' viewBox='0 0 80 40' opacity='0.04'%3E%3Cpath d='M0 20 Q 20 5, 40 20 T 80 20' fill='none' stroke='%23005577' stroke-width='1.5'/%3E%3Cpath d='M0 30 Q 20 15, 40 30 T 80 30' fill='none' stroke='%23005577' stroke-width='0.5'/%3E%3C/svg%3E")`;

      const naturePattern = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100' opacity='0.04'%3E%3Cpath d='M10 90 Q 40 40, 90 10' fill='none' stroke='%232E8B57' stroke-width='1'/%3E%3Cpath d='M90 10 Q 95 20, 80 25 Q 75 10, 90 10 Z' fill='%232E8B57'/%3E%3Cpath d='M50 40 Q 45 25, 60 20 Q 65 35, 50 40 Z' fill='%232E8B57' opacity='0.5'/%3E%3Cpath d='M30 65 Q 25 50, 40 45 Q 45 60, 30 65 Z' fill='%232E8B57' opacity='0.5'/%3E%3C/svg%3E")`;

      const sunrisePattern = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120' opacity='0.03'%3E%3Ccircle cx='60' cy='60' r='40' fill='none' stroke='%23FF7F50' stroke-dasharray='2 6' stroke-width='2'/%3E%3Cpath d='M60 55 Q 70 30, 60 15 Q 50 30, 60 55 Z' fill='none' stroke='%23FF7F50' stroke-width='1'/%3E%3Cpath d='M60 65 Q 70 90, 60 105 Q 50 90, 60 65 Z' fill='none' stroke='%23FF7F50' stroke-width='1'/%3E%3Cpath d='M55 60 Q 30 70, 15 60 Q 30 50, 55 60 Z' fill='none' stroke='%23FF7F50' stroke-width='1'/%3E%3Cpath d='M65 60 Q 90 70, 105 60 Q 90 50, 65 60 Z' fill='none' stroke='%23FF7F50' stroke-width='1'/%3E%3C/svg%3E")`;

      const sacredPattern = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100' opacity='0.03'%3E%3Ccircle cx='50' cy='50' r='40' fill='none' stroke='%23B8860B' stroke-width='0.5'/%3E%3Ccircle cx='50' cy='50' r='35' fill='none' stroke='%23B8860B' stroke-width='0.5'/%3E%3Cpolygon points='50,10 85,70 15,70' fill='none' stroke='%23B8860B' stroke-width='0.5'/%3E%3Cpolygon points='50,90 85,30 15,30' fill='none' stroke='%23B8860B' stroke-width='0.5'/%3E%3C/svg%3E")`;

      switch (bgIndex) {
        case 1:
          return { background: `${morningLightPattern}, linear-gradient(to bottom, #FFFDF8, #F8F3EA)` };
        case 2:
          return { background: `${oceanMindPattern}, linear-gradient(to bottom, #F8FCFD, #EEF6F8)` };
        case 3:
          return { background: `${naturePattern}, linear-gradient(to bottom, #FAFCF8, #F1F6EF)` };
        case 4:
          return { background: `${sunrisePattern}, linear-gradient(to bottom, #FFFDF6, #FFF4DD)` };
        case 5:
          return { background: `${sacredPattern}, linear-gradient(to bottom, #FAF8F4, #F2EEE5)` };
        default:
          return { backgroundColor: config.backgroundColor || '#ffffff' };
      }
    };

    return (
      <div
        ref={ref}
        className="w-[1000px] flex flex-col gap-6 relative pb-12"
        style={{ fontFamily, fontSize: `${fontSize}px`, color: textColor, ...getBackgroundStyle() }}
      >
        {/* Header Spacer */}
        <div style={{ height: '32px', width: '100%', flexShrink: 0 }}></div>

        {/* Header */}
        <div className="flex items-stretch px-8 border-b-[1px] pb-4" style={{ borderColor: headingColor1 }}>
          {/* Left Column */}
          <div className="w-[270px] flex flex-col items-center justify-center pr-5 border-r-[1px] shrink-0" style={{ borderColor: headingColor1 }}>
            {config.logoUrl ? (
              <img src={config.logoUrl} alt="Sống Sáng Suốt Logo" className="w-[250px] h-[31px] object-contain mb-3" />
            ) : (
              <div className="mb-3 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg w-[230px] h-[70px] flex flex-col items-center justify-center">
                <span className="text-xs font-bold uppercase">Chưa có Logo</span>
                <span className="text-[10px]">Cài đặt</span>
              </div>
            )}
            <h2 className="font-bold text-[18px] uppercase mb-1 whitespace-nowrap tracking-[0.5px]" style={{ color: headingColor2, fontFamily }}>
              THỰC LUYỆN TÂM THỨC
            </h2>
            <h3 className="font-bold text-[15.5px] leading-[22px] uppercase whitespace-nowrap tracking-[0.5px]" style={{ color: headingColor2, fontFamily }}>
              <span style={{ color: headingColor1 }}>20 BỘ</span> ĐỜI SỐNG TÂM THỨC
            </h3>
          </div>

          {/* Middle & Right Grid */}
          <div className="flex-1 grid grid-cols-[340px_1fr] content-start relative">
            {/* Vertical border between Middle and Right */}
            <div className="absolute top-0 bottom-0 left-[340px] border-l-[1px]" style={{ borderColor: headingColor1 }}></div>

            {/* Middle Content */}
            <div className="flex flex-col pl-6 pr-6 min-w-0 justify-center h-full">
              <div className="h-[31px] mb-3 flex items-center">
                <h4 className="font-bold text-[15px] uppercase whitespace-nowrap">
                  {(() => {
                    const val = data.bo || 'BỘ 01. ĐỜI SỐNG NỘI TÂM';
                    const parts = val.split('. ');
                    if (parts.length > 1) {
                      return (
                        <>
                          <span style={{ color: headingColor1 }}>{parts[0]}. </span>
                          <span style={{ color: headingColor2 }}>{parts.slice(1).join('. ')}</span>
                        </>
                      );
                    }
                    return <span style={{ color: headingColor2 }}>{val}</span>;
                  })()}
                </h4>
              </div>
              <div className="font-bold text-[14px] uppercase whitespace-nowrap mb-1">
                {(() => {
                  const val = data.giaiDoan || 'Giai đoạn 01. Hình thành nền móng';
                  const parts = val.split('. ');
                  if (parts.length > 1) {
                    return (
                      <>
                        <span style={{ color: headingColor2 }}>{parts[0]}. </span>
                        <span style={{ color: headingColor1 }}>{parts.slice(1).join('. ')}</span>
                      </>
                    );
                  }
                  return <span style={{ color: headingColor1 }}>{val}</span>;
                })()}
              </div>
              <div className="font-bold text-[14px] leading-snug break-words uppercase">
                {(() => {
                  const val = data.thucCanh || 'Thực cảnh 01. Được nuông chiều từ nhỏ';
                  const parts = val.split('. ');
                  if (parts.length > 1) {
                    return (
                      <>
                        <span style={{ color: headingColor2 }}>{parts[0]}. </span>
                        <span style={{ color: headingColor1 }}>{parts.slice(1).join('. ')}</span>
                      </>
                    );
                  }
                  return <span style={{ color: headingColor2 }}>{val}</span>;
                })()}
              </div>
            </div>

            {/* Right Content */}
            <div className="pl-6 min-w-0 flex flex-col h-full">
              <div className="flex-1 flex flex-col justify-center">
                <div className="text-[15px] italic break-words text-justify">
                  <span style={{ color: headingColor2 }}>Tình huống: </span>
                  <span style={{ color: headingColor1 }}>{data.tinhHuong || 'Nuông chiều mình trong mua sắm'}</span>
                </div>
              </div>
              <div className="flex justify-between items-end mt-2">
                <p className="font-bold text-[14px] whitespace-nowrap" style={{ color: headingColor1 }}>
                  Writer: {data.writer || 'Thành Công'}
                </p>
                <p className="italic text-[14px] whitespace-nowrap" style={{ color: headingColor1 }}>
                  {data.date || '23/07/2026'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Two Columns */}
        <div className="grid grid-cols-2 gap-4 px-8 mt-2 relative">
          {/* Left Column */}
          <div>
            <h3 className="font-bold uppercase mb-2 tracking-wide text-[16px] whitespace-nowrap" style={{ color: headingColor2, fontFamily }}>
              NHẬN DẠNG TÂM THỨC
            </h3>
            <div
              className="border-[1px] flex flex-col min-h-[400px] bg-transparent"
              style={{ borderColor: borderColor2 }}
            >
              <div
                className="p-3 border-b-[1px] flex-1"
                style={{ borderColor: borderColor2 }}
              >
                <div style={{ color: headingColor2 }} className="mb-1 font-bold text-[14px] whitespace-nowrap">1. Cấy gốc <span className="font-normal">(Nhân gốc mạnh cấy sâu)</span></div>
                <div className="whitespace-pre-wrap">{data.nhinGoc}</div>
              </div>
              <div
                className="p-3 border-b-[1px] flex-[2]"
                style={{ borderColor: borderColor2 }}
              >
                <div style={{ color: headingColor2 }} className="mb-1 font-bold text-[14px] whitespace-nowrap">2. Chọn tâm <span className="font-normal">(Xây giá trị phát triển)</span></div>
                <div className="whitespace-pre-wrap mb-2">{data.chonTam}</div>
              </div>
              <div className="p-3 flex-1">
                <div style={{ color: headingColor2 }} className="mb-1 font-bold text-[14px] whitespace-nowrap">3. Dưỡng tính <span className="font-normal">(Đức tính cần rèn luyện)</span></div>
                <div className="whitespace-pre-wrap">{data.duongTinh}</div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div>
            <h3 className="font-bold uppercase mb-2 tracking-wide text-[16px] whitespace-nowrap" style={{ color: headingColor1, fontFamily }}>
              NHẬN DẠNG VÔ THỨC
            </h3>
            <div
              className="border-[1px] flex flex-col min-h-[400px] bg-transparent"
              style={{ borderColor: borderColor1 }}
            >
              <div
                className="p-3 border-b-[1px] flex-1"
                style={{ borderColor: borderColor1 }}
              >
                <div style={{ color: headingColor1 }} className="mb-1 font-bold text-[14px] whitespace-nowrap">1. Soi tính xấu <span className="font-normal">(Mình đang có tính xấu gì)</span></div>
                <div className="whitespace-pre-wrap">{data.soiTinhXau}</div>
              </div>
              <div
                className="p-3 border-b-[1px] flex-[2]"
                style={{ borderColor: borderColor1 }}
              >
                <div style={{ color: headingColor1 }} className="mb-1 font-bold text-[14px] whitespace-nowrap">2. Xét độc hại <span className="font-normal">(Độc tính nào đang phát tác)</span></div>
                <div className="whitespace-pre-wrap mb-2">{data.xetDocHai}</div>
              </div>
              <div className="p-3 flex-1">
                <div style={{ color: headingColor1 }} className="mb-1 font-bold text-[14px] whitespace-nowrap">3. Thấy hậu quả <span className="font-normal">(Hậu quả nào sẽ xảy ra)</span></div>
                <div className="whitespace-pre-wrap">{data.thayHauQua}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Table */}
        <div className="mt-4 px-8">
          <h3 className="font-bold uppercase mb-2 tracking-wide text-[16px] whitespace-nowrap" style={{ color: headingColor2, fontFamily }}>
            THỰC LUYỆN TÂM THỨC
          </h3>
          <div
            className="border-[1px] flex flex-col bg-transparent"
            style={{ borderColor: headingColor2 }}
          >
            {/* Row 1 */}
            <div className="flex border-b-[1px]" style={{ borderColor: headingColor2 }}>
              <div
                className="w-48 shrink-0 border-r-[1px] p-4 flex items-start justify-start font-bold text-[14px] whitespace-nowrap"
                style={{ borderColor: headingColor2, color: headingColor2 }}
              >
                1. Phá chấp mở đường
              </div>
              <div className="flex-1 p-4 whitespace-pre-wrap min-h-[60px]">{data.phaChap}</div>
            </div>
            {/* Row 2 */}
            <div className="flex border-b-[1px]" style={{ borderColor: headingColor2 }}>
              <div
                className="w-48 shrink-0 border-r-[1px] p-4 flex items-start justify-start font-bold text-[14px] whitespace-nowrap"
                style={{ borderColor: headingColor2, color: headingColor2 }}
              >
                2. Định tâm giải quyết
              </div>
              <div className="flex-1 p-4 whitespace-pre-wrap min-h-[60px]">{data.dinhTam}</div>
            </div>
            {/* Row 3 */}
            <div className="flex border-b-[1px]" style={{ borderColor: headingColor2 }}>
              <div
                className="w-48 shrink-0 border-r-[1px] p-4 flex items-start justify-start font-bold text-[14px] whitespace-nowrap"
                style={{ borderColor: headingColor2, color: headingColor2 }}
              >
                3. Phát tuệ hành xử
              </div>
              <div className="flex-1 p-4 whitespace-pre-wrap min-h-[60px]">{data.phatTue}</div>
            </div>
            {/* Row 4 */}
            <div className="flex">
              <div
                className="w-48 shrink-0 border-r-[1px] p-4 flex items-start justify-start font-bold text-[14px] whitespace-nowrap"
                style={{ borderColor: headingColor2, color: headingColor2 }}
              >
                4. Thành người đáng tin
              </div>
              <div className="flex-1 p-4 whitespace-pre-wrap min-h-[60px]">{data.thanhNguoi}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

TemplatePreview.displayName = 'TemplatePreview';
