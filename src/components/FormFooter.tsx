import React, { useState } from 'react';

interface FormFooterProps {
  elaboroCargo?: string;
  revisoCargo?: string;
  aproboCargo?: string;
  onSignaturesChange?: (signatures: { elaboro: string; reviso: string; aprobo: string }) => void;
  cambios?: {
    version: string;
    fecha: string;
    seccion: string;
    cambio: string;
    solicitante: string;
  }[];
}

export default function FormFooter({
  elaboroCargo = 'Gerente Comercial Industrial',
  revisoCargo = 'Comité ISO',
  aproboCargo = 'Gerente General',
  onSignaturesChange,
  cambios = [
    { version: '1.0', fecha: '13/06/2026', seccion: 'Todas', cambio: 'Creación del formato inicial bajo norma ISO 14001', solicitante: 'Comité de Calidad' }
  ]
}: FormFooterProps) {
  const [elaboroNombre, setElaboroNombre] = useState('Ing. Alejandro Vega');
  const [revisoNombre, setRevisoNombre] = useState('Comité de Gestión ISO');
  const [aproboNombre, setAproboNombre] = useState('Lic. Francisco Solís');

  const handleElaboro = (val: string) => {
    setElaboroNombre(val);
    if (onSignaturesChange) onSignaturesChange({ elaboro: val, reviso: revisoNombre, aprobo: aproboNombre });
  };

  const handleReviso = (val: string) => {
    setRevisoNombre(val);
    if (onSignaturesChange) onSignaturesChange({ elaboro: elaboroNombre, reviso: val, aprobo: aproboNombre });
  };

  const handleAprobo = (val: string) => {
    setAproboNombre(val);
    if (onSignaturesChange) onSignaturesChange({ elaboro: elaboroNombre, reviso: revisoNombre, aprobo: val });
  };

  return (
    <div id="form-footer-container" className="mt-6 space-y-4 text-xs">
      {/* Signatures Panel */}
      <div id="signatures-panel" className="border border-[#E2E8F0] bg-white shadow-sm overflow-hidden rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0]">
          
          {/* Elaboró */}
          <div className="p-3 flex flex-col justify-between h-28">
            <div>
              <span className="block text-[9px] uppercase font-bold text-[#64748B] tracking-wider mb-1">Elaboró</span>
              <span className="font-semibold text-[#1E293B] block text-xs">{elaboroCargo}</span>
            </div>
            <div className="mt-2">
              <input
                id="firma-elaboro-input"
                type="text"
                value={elaboroNombre}
                onChange={(e) => handleElaboro(e.target.value)}
                placeholder="Firma / Nombre"
                className="w-full bg-[#F8FAFC] border-b border-dashed border-[#E2E8F0] focus:border-[#3B82F6] focus:bg-white text-xs px-2 py-0.5 outline-none transition font-medium text-[#1E293B] italic text-center rounded-sm"
              />
              <span className="block text-[8px] text-[#94A3B8] text-center mt-1">Autorización Digital</span>
            </div>
          </div>

          {/* Revisó */}
          <div className="p-3 flex flex-col justify-between h-28">
            <div>
              <span className="block text-[9px] uppercase font-bold text-[#64748B] tracking-wider mb-1">Revisó</span>
              <span className="font-semibold text-[#1E293B] block text-xs">{revisoCargo}</span>
            </div>
            <div className="mt-2">
              <input
                id="firma-reviso-input"
                type="text"
                value={revisoNombre}
                onChange={(e) => handleReviso(e.target.value)}
                placeholder="Firma / Nombre"
                className="w-full bg-[#F8FAFC] border-b border-dashed border-[#E2E8F0] focus:border-[#3B82F6] focus:bg-white text-xs px-2 py-0.5 outline-none transition font-medium text-[#1E293B] italic text-center rounded-sm"
              />
              <span className="block text-[8px] text-[#94A3B8] text-center mt-1">Autorización Digital</span>
            </div>
          </div>

          {/* Aprobó */}
          <div className="p-3 flex flex-col justify-between h-28">
            <div>
              <span className="block text-[9px] uppercase font-bold text-[#64748B] tracking-wider mb-1">Aprobó</span>
              <span className="font-semibold text-[#1E293B] block text-xs">{aproboCargo}</span>
            </div>
            <div className="mt-2">
              <input
                id="firma-aprobo-input"
                type="text"
                value={aproboNombre}
                onChange={(e) => handleAprobo(e.target.value)}
                placeholder="Firma / Nombre"
                className="w-full bg-[#F8FAFC] border-b border-dashed border-[#E2E8F0] focus:border-[#3B82F6] focus:bg-white text-xs px-2 py-0.5 outline-none transition font-medium text-[#1E293B] italic text-center rounded-sm"
              />
              <span className="block text-[8px] text-[#94A3B8] text-center mt-1">Autorización Digital</span>
            </div>
          </div>

        </div>
      </div>

      {/* Control de Cambios table */}
      <div id="change-control-panel" className="border border-[#E2E8F0] bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-3 py-1.5 flex items-center justify-between">
          <h4 className="font-bold text-[10px] text-[#1E293B] uppercase tracking-wide">Control de cambios (SGC ISO 14001)</h4>
          <span className="text-[9px] bg-green-50 text-green-600 font-bold px-2 py-0.5 rounded-full uppercase">Vigente</span>
        </div>
        <div className="overflow-x-auto">
          <table id="change-control-table" className="w-full text-[10px] text-left text-[#64748B]">
            <thead>
              <tr className="bg-[#F8FAFC] text-gray-500 border-b border-[#E2E8F0] uppercase tracking-wider text-[8px] font-bold">
                <th className="px-3 py-1.5 border-r border-[#E2E8F0] w-16 text-center">Versión</th>
                <th className="px-3 py-1.5 border-r border-[#E2E8F0] w-24 text-center">Fecha</th>
                <th className="px-3 py-1.5 border-r border-[#E2E8F0] w-32">Sección</th>
                <th className="px-3 py-1.5 border-r border-[#E2E8F0]">Cambio realizado</th>
                <th className="px-3 py-1.5">Solicitante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] font-mono text-[9px]">
              {cambios.map((cambio, index) => (
                <tr key={index} className="hover:bg-[#F8FAFC]">
                  <td className="px-3 py-1.5 border-r border-[#E2E8F0] text-center font-bold text-[#1E293B]">{cambio.version}</td>
                  <td className="px-3 py-1.5 border-r border-[#E2E8F0] text-center text-gray-500">{cambio.fecha}</td>
                  <td className="px-3 py-1.5 border-r border-[#E2E8F0] text-[#1E293B] font-sans">{cambio.seccion}</td>
                  <td className="px-3 py-1.5 border-r border-[#E2E8F0] text-[#1E293B] font-sans">{cambio.cambio}</td>
                  <td className="px-3 py-1.5 font-sans text-[#1E293B]">{cambio.solicitante}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
