import React from 'react';

interface FormHeaderProps {
  titulo: string;
  codigo?: string;
  version?: string;
  fechaElaboracion?: string;
  fechaVersion?: string;
}

export default function FormHeader({
  titulo,
  codigo = 'BIOTRASH 4.0. F-OPR-000',
  version = '1',
  fechaElaboracion = '13/06/2026',
  fechaVersion = '13/06/2026'
}: FormHeaderProps) {
  return (
    <div id="form-header-container" className="border border-[#E2E8F0] bg-white shadow-sm overflow-hidden text-xs md:text-sm mb-5 rounded-lg text-[#1A1C1E]">
      {/* 2x3 responsive grid table mimicking paper header */}
      <div className="grid grid-cols-12 border-[#E2E8F0]">
        
        {/* Logo Section */}
        <div id="logo-section" className="col-span-12 md:col-span-3 p-3 flex items-center justify-center border-b md:border-b-0 md:border-r border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            <div className="bg-[#3B82F6] p-1.5 rounded">
              <span className="text-white font-bold text-xs font-mono">BIO</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-[#1E293B] text-sm leading-none">BIOTRASH</span>
              <span className="text-[8px] font-mono font-bold text-[#3B82F6] tracking-widest leading-none mt-0.5">SGC ISO 14001</span>
            </div>
          </div>
        </div>

        {/* Title Section */}
        <div id="title-section" className="col-span-12 md:col-span-6 p-3 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-[#E2E8F0]">
          <h1 className="font-bold text-[#1E293B] text-xs md:text-sm leading-tight uppercase tracking-tight">
            {titulo}
          </h1>
          <span className="text-[10px] font-mono text-gray-500 mt-1">{codigo}</span>
        </div>

        {/* Metadata section */}
        <div id="metadata-section" className="col-span-12 md:col-span-3 flex flex-col font-mono text-[10px]">
          <div className="grid grid-cols-12 border-b border-[#E2E8F0] flex-1">
            <div className="col-span-7 px-3 py-1 flex items-center border-r border-[#E2E8F0] bg-[#F8FAFC] text-gray-500 font-bold">
              ELABORACIÓN:
            </div>
            <div className="col-span-5 px-3 py-1 flex items-center font-bold text-[#1E293B]">
              {fechaElaboracion}
            </div>
          </div>
          <div className="grid grid-cols-12 flex-1">
            {/* Version and Version date split */}
            <div className="col-span-6 flex flex-col border-r border-[#E2E8F0]">
              <div className="px-2 py-0.5 border-b border-[#E2E8F0] text-center bg-[#F8FAFC] text-[9px] text-gray-500 font-bold">VER.</div>
              <div className="py-0.5 text-center font-bold text-[#1E293B]">{version}</div>
            </div>
            <div className="col-span-6 flex flex-col">
              <div className="px-2 py-0.5 border-b border-[#E2E8F0] text-center bg-[#F8FAFC] text-[9px] text-gray-500 font-bold">FECHA VER.</div>
              <div className="py-0.5 text-center font-bold text-[#1E293B]">{fechaVersion}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
