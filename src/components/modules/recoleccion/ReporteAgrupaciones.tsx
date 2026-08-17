import React, { useState } from 'react';
import type { RegistroRecoleccion } from '../../../types';
import { 
  Building2, 
  Truck, 
  MapPin, 
  Tag, 
  Calendar, 
  Layers, 
  FileSpreadsheet, 
  TrendingUp, 
  BarChart2, 
  PieChart as PieIcon 
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  registros: RegistroRecoleccion[];
  totalUnidadesGeneral: number;
}

type TipoAgrupacion = 'cliente' | 'ruta' | 'ubicacion' | 'categoria' | 'periodo';

export default function ReporteAgrupaciones({ registros, totalUnidadesGeneral }: Props) {
  const [tipoAgrupacion, setTipoAgrupacion] = useState<TipoAgrupacion>('cliente');

  if (registros.length === 0) {
    return null;
  }

  // 1. Group by Cliente
  const clienteMap: Record<string, {
    codigo: string;
    nombre: string;
    recibos: Set<string>;
    unidades: number;
    ubicaciones: Set<string>;
    rutas: Set<string>;
  }> = {};

  // 2. Group by Ruta
  const rutaMap: Record<string, {
    codigoRuta: string;
    ruta: string;
    recibos: Set<string>;
    unidades: number;
    clientes: Set<string>;
  }> = {};

  // 3. Group by Ubicacion
  const ubicacionMap: Record<string, {
    codigo: string;
    nombre: string;
    cliente: string;
    recibos: Set<string>;
    unidades: number;
  }> = {};

  // 4. Group by Categoria
  const categoriaMap: Record<string, {
    categoria: string;
    recibos: Set<string>;
    unidades: number;
    productos: Set<string>;
  }> = {};

  // 5. Group by Periodo (Fecha)
  const periodoMap: Record<string, {
    fecha: string;
    recibos: Set<string>;
    unidades: number;
    rutas: Set<string>;
    clientes: Set<string>;
  }> = {};

  registros.forEach((r) => {
    const un = Number(r.unidades) || 0;
    const recId = r.numeroRecibo || r.id || 'S/R';

    // Cliente
    const cKey = `${r.codigoCliente || 'S/C'}___${r.nombreCliente || 'S/N'}`;
    if (!clienteMap[cKey]) {
      clienteMap[cKey] = {
        codigo: r.codigoCliente || 'S/C',
        nombre: r.nombreCliente || 'SIN NOMBRE',
        recibos: new Set(),
        unidades: 0,
        ubicaciones: new Set(),
        rutas: new Set()
      };
    }
    clienteMap[cKey].recibos.add(recId);
    clienteMap[cKey].unidades += un;
    if (r.nombreUbicacion || r.codigoUbicacion) {
      clienteMap[cKey].ubicaciones.add(r.nombreUbicacion || r.codigoUbicacion);
    }
    if (r.ruta || r.codigoRuta) {
      clienteMap[cKey].rutas.add(r.ruta || r.codigoRuta);
    }

    // Ruta
    const rKey = `${r.codigoRuta || 'S/R'}___${r.ruta || 'SIN RUTA'}`;
    if (!rutaMap[rKey]) {
      rutaMap[rKey] = {
        codigoRuta: r.codigoRuta || 'S/R',
        ruta: r.ruta || 'SIN RUTA',
        recibos: new Set(),
        unidades: 0,
        clientes: new Set()
      };
    }
    rutaMap[rKey].recibos.add(recId);
    rutaMap[rKey].unidades += un;
    if (r.nombreCliente || r.codigoCliente) {
      rutaMap[rKey].clientes.add(r.nombreCliente || r.codigoCliente);
    }

    // Ubicacion
    const uKey = `${r.codigoUbicacion || 'S/U'}___${r.nombreUbicacion || 'S/N'}___${r.nombreCliente || ''}`;
    if (!ubicacionMap[uKey]) {
      ubicacionMap[uKey] = {
        codigo: r.codigoUbicacion || 'S/U',
        nombre: r.nombreUbicacion || 'SEDE GENERAL',
        cliente: r.nombreCliente || 'CLIENTE GENERAL',
        recibos: new Set(),
        unidades: 0
      };
    }
    ubicacionMap[uKey].recibos.add(recId);
    ubicacionMap[uKey].unidades += un;

    // Categoria
    const catKey = r.categoria || 'SIN CATEGORÍA';
    if (!categoriaMap[catKey]) {
      categoriaMap[catKey] = {
        categoria: catKey,
        recibos: new Set(),
        unidades: 0,
        productos: new Set()
      };
    }
    categoriaMap[catKey].recibos.add(recId);
    categoriaMap[catKey].unidades += un;
    if (r.producto) {
      categoriaMap[catKey].productos.add(r.producto);
    }

    // Periodo (Fecha)
    const pKey = r.fechaVisita || 'SIN FECHA';
    if (!periodoMap[pKey]) {
      periodoMap[pKey] = {
        fecha: pKey,
        recibos: new Set(),
        unidades: 0,
        rutas: new Set(),
        clientes: new Set()
      };
    }
    periodoMap[pKey].recibos.add(recId);
    periodoMap[pKey].unidades += un;
    if (r.ruta || r.codigoRuta) periodoMap[pKey].rutas.add(r.ruta || r.codigoRuta);
    if (r.nombreCliente || r.codigoCliente) periodoMap[pKey].clientes.add(r.nombreCliente || r.codigoCliente);
  });

  const clienteList = Object.values(clienteMap).sort((a, b) => b.unidades - a.unidades);
  const rutaList = Object.values(rutaMap).sort((a, b) => b.unidades - a.unidades);
  const ubicacionList = Object.values(ubicacionMap).sort((a, b) => b.unidades - a.unidades);
  const categoriaList = Object.values(categoriaMap).sort((a, b) => b.unidades - a.unidades);
  const periodoList = Object.values(periodoMap).sort((a, b) => a.fecha.localeCompare(b.fecha));

  // Export current summary table to Excel
  const handleExportSummaryExcel = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let sheetName = 'Resumen';

    if (tipoAgrupacion === 'cliente') {
      sheetName = 'Resumen por Cliente';
      headers = ['CÓDIGO CLIENTE', 'NOMBRE CLIENTE', 'RECIBOS EMITIDOS', 'TOTAL LBS/UNIDADES', 'PROMEDIO POR RECIBO', 'UBICACIONES', '% DEL TOTAL'];
      rows = clienteList.map(c => [
        c.codigo,
        c.nombre,
        c.recibos.size,
        c.unidades.toFixed(2),
        (c.unidades / (c.recibos.size || 1)).toFixed(2),
        c.ubicaciones.size,
        `${totalUnidadesGeneral > 0 ? ((c.unidades / totalUnidadesGeneral) * 100).toFixed(2) : 0}%`
      ]);
    } else if (tipoAgrupacion === 'ruta') {
      sheetName = 'Resumen por Ruta';
      headers = ['CÓDIGO RUTA', 'NOMBRE RUTA', 'VISITAS/RECIBOS', 'TOTAL LBS/UNIDADES', 'CLIENTES ATENDIDOS', 'PROMEDIO POR VISITA', '% DEL TOTAL'];
      rows = rutaList.map(r => [
        r.codigoRuta,
        r.ruta,
        r.recibos.size,
        r.unidades.toFixed(2),
        r.clientes.size,
        (r.unidades / (r.recibos.size || 1)).toFixed(2),
        `${totalUnidadesGeneral > 0 ? ((r.unidades / totalUnidadesGeneral) * 100).toFixed(2) : 0}%`
      ]);
    } else if (tipoAgrupacion === 'ubicacion') {
      sheetName = 'Resumen por Ubicación';
      headers = ['CÓDIGO UBICACIÓN', 'NOMBRE UBICACIÓN / SEDE', 'CLIENTE', 'RECIBOS', 'TOTAL LBS/UNIDADES', '% DEL TOTAL'];
      rows = ubicacionList.map(u => [
        u.codigo,
        u.nombre,
        u.cliente,
        u.recibos.size,
        u.unidades.toFixed(2),
        `${totalUnidadesGeneral > 0 ? ((u.unidades / totalUnidadesGeneral) * 100).toFixed(2) : 0}%`
      ]);
    } else if (tipoAgrupacion === 'categoria') {
      sheetName = 'Resumen por Categoría';
      headers = ['TIPO DE DESECHO / CATEGORÍA', 'RECIBOS', 'TOTAL LBS/UNIDADES', 'PRODUCTOS DISTINTOS', '% DEL TOTAL'];
      rows = categoriaList.map(cat => [
        cat.categoria,
        cat.recibos.size,
        cat.unidades.toFixed(2),
        cat.productos.size,
        `${totalUnidadesGeneral > 0 ? ((cat.unidades / totalUnidadesGeneral) * 100).toFixed(2) : 0}%`
      ]);
    } else if (tipoAgrupacion === 'periodo') {
      sheetName = 'Resumen por Fecha';
      headers = ['FECHA VISITA', 'RECIBOS', 'TOTAL LBS/UNIDADES', 'RUTAS ACTIVAS', 'CLIENTES ATENDIDOS'];
      rows = periodoList.map(p => [
        p.fecha,
        p.recibos.size,
        p.unidades.toFixed(2),
        p.rutas.size,
        p.clientes.size
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `Reporte_Resumen_${tipoAgrupacion}_BIOTRASH_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
      
      {/* Top Selector of Aggregation View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-600" />
            Consolidados y Tablas Resumen del Reporte
          </h3>
          <p className="text-[11px] text-slate-500">
            Consulte los totales agrupados según los filtros actualmente aplicados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setTipoAgrupacion('cliente')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                tipoAgrupacion === 'cliente'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> Por Cliente ({clienteList.length})
            </button>
            <button
              type="button"
              onClick={() => setTipoAgrupacion('ruta')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                tipoAgrupacion === 'ruta'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" /> Por Ruta ({rutaList.length})
            </button>
            <button
              type="button"
              onClick={() => setTipoAgrupacion('ubicacion')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                tipoAgrupacion === 'ubicacion'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" /> Por Ubicación ({ubicacionList.length})
            </button>
            <button
              type="button"
              onClick={() => setTipoAgrupacion('categoria')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                tipoAgrupacion === 'categoria'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tag className="w-3.5 h-3.5" /> Por Desecho ({categoriaList.length})
            </button>
            <button
              type="button"
              onClick={() => setTipoAgrupacion('periodo')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                tipoAgrupacion === 'periodo'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Cronológico ({periodoList.length})
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportSummaryExcel}
            className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Exportar esta tabla resumen a Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar Resumen
          </button>
        </div>
      </div>

      {/* Render Table for Selected Grouping */}
      <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-96">
        
        {/* Table 1: Cliente */}
        {tipoAgrupacion === 'cliente' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="p-2.5 border-r border-slate-200 text-center w-10">#</th>
                <th className="p-2.5 border-r border-slate-200">CODIGO CLIENTE</th>
                <th className="p-2.5 border-r border-slate-200">NOMBRE CLIENTE</th>
                <th className="p-2.5 border-r border-slate-200 text-center">RECIBOS</th>
                <th className="p-2.5 border-r border-slate-200 text-right">TOTAL UNIDADES / LBS</th>
                <th className="p-2.5 border-r border-slate-200 text-right">PROMEDIO / RECIBO</th>
                <th className="p-2.5 border-r border-slate-200 text-center">UBICACIONES</th>
                <th className="p-2.5 text-right">% VOLUMEN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {clienteList.map((c, idx) => {
                const pct = totalUnidadesGeneral > 0 ? (c.unidades / totalUnidadesGeneral) * 100 : 0;
                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2 border-r border-slate-200 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-200 font-mono font-bold text-blue-700">{c.codigo}</td>
                    <td className="p-2 border-r border-slate-200 font-medium text-slate-800">{c.nombre}</td>
                    <td className="p-2 border-r border-slate-200 text-center font-mono font-bold">{c.recibos.size}</td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono font-extrabold text-emerald-700">
                      {c.unidades.toFixed(2)}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-600">
                      {(c.unidades / (c.recibos.size || 1)).toFixed(2)}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-center font-mono">{c.ubicaciones.size}</td>
                    <td className="p-2 text-right font-mono font-bold text-slate-700">{pct.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Table 2: Ruta */}
        {tipoAgrupacion === 'ruta' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="p-2.5 border-r border-slate-200 text-center w-10">#</th>
                <th className="p-2.5 border-r border-slate-200">CODIGO RUTA</th>
                <th className="p-2.5 border-r border-slate-200">NOMBRE DE LA RUTA</th>
                <th className="p-2.5 border-r border-slate-200 text-center">VISITAS / RECIBOS</th>
                <th className="p-2.5 border-r border-slate-200 text-right">TOTAL UNIDADES / LBS</th>
                <th className="p-2.5 border-r border-slate-200 text-center">CLIENTES</th>
                <th className="p-2.5 border-r border-slate-200 text-right">PROMEDIO / VISITA</th>
                <th className="p-2.5 text-right">% VOLUMEN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rutaList.map((r, idx) => {
                const pct = totalUnidadesGeneral > 0 ? (r.unidades / totalUnidadesGeneral) * 100 : 0;
                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2 border-r border-slate-200 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-200 font-mono font-bold text-purple-700">{r.codigoRuta}</td>
                    <td className="p-2 border-r border-slate-200 font-medium text-slate-800">{r.ruta}</td>
                    <td className="p-2 border-r border-slate-200 text-center font-mono font-bold">{r.recibos.size}</td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono font-extrabold text-emerald-700">
                      {r.unidades.toFixed(2)}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-center font-mono">{r.clientes.size}</td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-600">
                      {(r.unidades / (r.recibos.size || 1)).toFixed(2)}
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-slate-700">{pct.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Table 3: Ubicación */}
        {tipoAgrupacion === 'ubicacion' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="p-2.5 border-r border-slate-200 text-center w-10">#</th>
                <th className="p-2.5 border-r border-slate-200">CODIGO UBICACIÓN</th>
                <th className="p-2.5 border-r border-slate-200">NOMBRE UBICACIÓN / SEDE</th>
                <th className="p-2.5 border-r border-slate-200">CLIENTE ASOCIADO</th>
                <th className="p-2.5 border-r border-slate-200 text-center">RECIBOS</th>
                <th className="p-2.5 border-r border-slate-200 text-right">TOTAL UNIDADES / LBS</th>
                <th className="p-2.5 text-right">% VOLUMEN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {ubicacionList.map((u, idx) => {
                const pct = totalUnidadesGeneral > 0 ? (u.unidades / totalUnidadesGeneral) * 100 : 0;
                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2 border-r border-slate-200 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-200 font-mono font-bold text-amber-700">{u.codigo}</td>
                    <td className="p-2 border-r border-slate-200 font-medium text-slate-800">{u.nombre}</td>
                    <td className="p-2 border-r border-slate-200 text-slate-600">{u.cliente}</td>
                    <td className="p-2 border-r border-slate-200 text-center font-mono font-bold">{u.recibos.size}</td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono font-extrabold text-emerald-700">
                      {u.unidades.toFixed(2)}
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-slate-700">{pct.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Table 4: Categoría / Tipo de Desecho */}
        {tipoAgrupacion === 'categoria' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="p-2.5 border-r border-slate-200 text-center w-10">#</th>
                <th className="p-2.5 border-r border-slate-200">TIPO DE DESECHO / CATEGORÍA</th>
                <th className="p-2.5 border-r border-slate-200 text-center">RECIBOS</th>
                <th className="p-2.5 border-r border-slate-200 text-right">TOTAL UNIDADES / LBS</th>
                <th className="p-2.5 border-r border-slate-200 text-center">PRODUCTOS DISTINTOS</th>
                <th className="p-2.5 text-right">% VOLUMEN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {categoriaList.map((cat, idx) => {
                const pct = totalUnidadesGeneral > 0 ? (cat.unidades / totalUnidadesGeneral) * 100 : 0;
                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2 border-r border-slate-200 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-200 font-bold text-rose-700">{cat.categoria}</td>
                    <td className="p-2 border-r border-slate-200 text-center font-mono font-bold">{cat.recibos.size}</td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono font-extrabold text-emerald-700">
                      {cat.unidades.toFixed(2)}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-center font-mono">{cat.productos.size}</td>
                    <td className="p-2 text-right font-mono font-bold text-slate-700">{pct.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Table 5: Cronológico / Periodo */}
        {tipoAgrupacion === 'periodo' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="p-2.5 border-r border-slate-200 text-center w-10">#</th>
                <th className="p-2.5 border-r border-slate-200">FECHA DE VISITA</th>
                <th className="p-2.5 border-r border-slate-200 text-center">RECIBOS EMITIDOS</th>
                <th className="p-2.5 border-r border-slate-200 text-right">TOTAL UNIDADES / LBS</th>
                <th className="p-2.5 border-r border-slate-200 text-center">RUTAS ACTIVAS</th>
                <th className="p-2.5 text-center">CLIENTES ATENDIDOS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {periodoList.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-2 border-r border-slate-200 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="p-2 border-r border-slate-200 font-mono font-bold text-slate-800">{p.fecha}</td>
                  <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-emerald-700">{p.recibos.size}</td>
                  <td className="p-2 border-r border-slate-200 text-right font-mono font-extrabold text-slate-900">
                    {p.unidades.toFixed(2)}
                  </td>
                  <td className="p-2 border-r border-slate-200 text-center font-mono">{p.rutas.size}</td>
                  <td className="p-2 text-center font-mono">{p.clientes.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>

    </div>
  );
}
