import React from 'react';

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
  cambios = [
    { version: '1.0', fecha: '13/06/2026', seccion: 'Todas', cambio: 'Creación del formato inicial bajo norma ISO 14001', solicitante: 'Comité de Calidad' }
  ]
}: FormFooterProps) {
  return (
    <div id="form-footer-container" className="mt-6 space-y-4 text-xs">
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
