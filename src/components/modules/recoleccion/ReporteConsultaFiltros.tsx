import React from 'react';
import { 
  Search, 
  Filter, 
  RotateCcw, 
  Calendar, 
  MapPin, 
  Truck, 
  User, 
  Building2, 
  Tag, 
  Package, 
  Layers, 
  CheckCircle2,
  Clock
} from 'lucide-react';
import type { TipoCargaRecoleccion } from '../../../types';

export interface FiltrosConsultaRecoleccion {
  searchQuery: string;
  ruta: string;
  codigoCliente: string;
  nombreCliente: string;
  codigoUbicacion: string;
  nombreUbicacion: string;
  categoria: string;
  producto: string;
  tipoCarga: string;
  modoTemporal: 'todo' | 'dia' | 'semana' | 'mes' | 'anio' | 'rango';
  fechaDia: string;
  fechaSemana: string;
  fechaMes: string;
  fechaAnio: string;
  fechaRangoInicio: string;
  fechaRangoFin: string;
}

interface Props {
  filtros: FiltrosConsultaRecoleccion;
  onFiltrosChange: (newFiltros: FiltrosConsultaRecoleccion) => void;
  onResetFiltros: () => void;
  uniqueRutas: string[];
  uniqueCodigosCliente: string[];
  uniqueNombresCliente: string[];
  uniqueCodigosUbicacion: string[];
  uniqueNombresUbicacion: string[];
  uniqueCategorias: string[];
  uniqueProductos: string[];
  uniqueAnios: string[];
  totalResultados: number;
  totalRegistrosBD: number;
}

export default function ReporteConsultaFiltros({
  filtros,
  onFiltrosChange,
  onResetFiltros,
  uniqueRutas,
  uniqueCodigosCliente,
  uniqueNombresCliente,
  uniqueCodigosUbicacion,
  uniqueNombresUbicacion,
  uniqueCategorias,
  uniqueProductos,
  uniqueAnios,
  totalResultados,
  totalRegistrosBD
}: Props) {
  const updateField = (field: keyof FiltrosConsultaRecoleccion, value: any) => {
    onFiltrosChange({
      ...filtros,
      [field]: value
    });
  };

  // Count active non-default filters
  const countActiveFilters = () => {
    let count = 0;
    if (filtros.searchQuery.trim()) count++;
    if (filtros.ruta !== 'todas') count++;
    if (filtros.codigoCliente !== 'todos') count++;
    if (filtros.nombreCliente !== 'todos') count++;
    if (filtros.codigoUbicacion !== 'todas') count++;
    if (filtros.nombreUbicacion !== 'todas') count++;
    if (filtros.categoria !== 'todas') count++;
    if (filtros.producto !== 'todos') count++;
    if (filtros.tipoCarga !== 'todos') count++;
    if (filtros.modoTemporal !== 'todo') count++;
    return count;
  };

  const activeCount = countActiveFilters();

  return (
    <div id="panel-filtros-consulta" className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
      
      {/* Header and Reset Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              Filtros Conjuntos y Criterios de Búsqueda
              {activeCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-600 text-white rounded-full">
                  {activeCount} activo{activeCount > 1 ? 's' : ''}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500">
              Combine múltiples dimensiones (Ruta + Cliente + Ubicación + Tipo de Desecho + Rango de Tiempo)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500">
            Mostrando <strong>{totalResultados}</strong> de {totalRegistrosBD} registros
          </span>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onResetFiltros}
              className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition flex items-center gap-1 cursor-pointer"
              title="Restablecer todos los filtros"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Primary Free-Text Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          placeholder="Búsqueda rápida por cliente, código, recibo, ruta, ubicación, producto o lote..."
          value={filtros.searchQuery}
          onChange={(e) => updateField('searchQuery', e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
        />
      </div>

      {/* Grid 1: Dimensional Entity Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
        
        {/* 1. Por Ruta */}
        <div className="space-y-1">
          <label className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
            <Truck className="w-3 h-3 text-emerald-600" /> POR RUTA
          </label>
          <select
            value={filtros.ruta}
            onChange={(e) => updateField('ruta', e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
          >
            <option value="todas">Todas las Rutas ({uniqueRutas.length})</option>
            {uniqueRutas.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* 2. Por Código de Cliente */}
        <div className="space-y-1">
          <label className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
            <User className="w-3 h-3 text-blue-600" /> CODIGO CLIENTE
          </label>
          <select
            value={filtros.codigoCliente}
            onChange={(e) => updateField('codigoCliente', e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs font-mono"
          >
            <option value="todos">Todos los Códigos ({uniqueCodigosCliente.length})</option>
            {uniqueCodigosCliente.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* 3. Por Nombre del Cliente */}
        <div className="space-y-1">
          <label className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
            <Building2 className="w-3 h-3 text-indigo-600" /> NOMBRE DEL CLIENTE
          </label>
          <select
            value={filtros.nombreCliente}
            onChange={(e) => updateField('nombreCliente', e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
          >
            <option value="todos">Todos los Clientes ({uniqueNombresCliente.length})</option>
            {uniqueNombresCliente.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* 4. Por Código de Ubicación */}
        <div className="space-y-1">
          <label className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
            <MapPin className="w-3 h-3 text-amber-600" /> CODIGO UBICACIÓN
          </label>
          <select
            value={filtros.codigoUbicacion}
            onChange={(e) => updateField('codigoUbicacion', e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs font-mono"
          >
            <option value="todas">Todas las Sedes ({uniqueCodigosUbicacion.length})</option>
            {uniqueCodigosUbicacion.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        {/* 5. Por Nombre de Ubicación / Sede */}
        <div className="space-y-1">
          <label className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
            <MapPin className="w-3 h-3 text-amber-600" /> NOMBRE UBICACIÓN
          </label>
          <select
            value={filtros.nombreUbicacion}
            onChange={(e) => updateField('nombreUbicacion', e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
          >
            <option value="todas">Todas las Ubicaciones ({uniqueNombresUbicacion.length})</option>
            {uniqueNombresUbicacion.map((nu) => (
              <option key={nu} value={nu}>{nu}</option>
            ))}
          </select>
        </div>

        {/* 6. Por Tipo de Desecho / Categoría */}
        <div className="space-y-1">
          <label className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
            <Tag className="w-3 h-3 text-rose-600" /> TIPO DE DESECHO / CATEGORÍA
          </label>
          <select
            value={filtros.categoria}
            onChange={(e) => updateField('categoria', e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
          >
            <option value="todas">Todas las Categorías ({uniqueCategorias.length})</option>
            {uniqueCategorias.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* 7. Por Producto Detalle */}
        <div className="space-y-1">
          <label className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
            <Package className="w-3 h-3 text-purple-600" /> PRODUCTO DETALLADO
          </label>
          <select
            value={filtros.producto}
            onChange={(e) => updateField('producto', e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
          >
            <option value="todos">Todos los Productos ({uniqueProductos.length})</option>
            {uniqueProductos.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* 8. Por Modalidad / Tipo de Carga */}
        <div className="space-y-1">
          <label className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
            <Layers className="w-3 h-3 text-teal-600" /> MODALIDAD DE CARGA
          </label>
          <select
            value={filtros.tipoCarga}
            onChange={(e) => updateField('tipoCarga', e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
          >
            <option value="todos">Todos los Tipos de Carga</option>
            <option value="historica">🏛️ Histórica (Carga Primaria)</option>
            <option value="diario">📅 Diario</option>
            <option value="semanal">📆 Semanal</option>
            <option value="mensual">📊 Mensual</option>
          </select>
        </div>

      </div>

      {/* Grid 2: Temporal Filter Controls (Día / Mes / Semana / Año / Entre Fechas) */}
      <div className="pt-3 border-t border-slate-100 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            CRITERIO TEMPORAL (POR DÍA, SEMANA, MES, AÑO O ENTRE FECHAS)
          </label>
          
          {/* Mode Selector Buttons */}
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg">
            {[
              { id: 'todo', label: 'Todo el Histórico' },
              { id: 'dia', label: 'Por Día' },
              { id: 'semana', label: 'Por Semana' },
              { id: 'mes', label: 'Por Mes' },
              { id: 'anio', label: 'Por Año' },
              { id: 'rango', label: 'Entre Fechas (Rango)' }
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => updateField('modoTemporal', m.id)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${
                  filtros.modoTemporal === m.id
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Inputs according to Selected Temporal Mode */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
          {filtros.modoTemporal === 'todo' && (
            <p className="text-slate-500 text-xs italic">
              Consultando todos los registros históricos disponibles sin filtro de fecha.
            </p>
          )}

          {filtros.modoTemporal === 'dia' && (
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-700 text-xs">Seleccione el Día:</span>
              <input
                type="date"
                value={filtros.fechaDia}
                onChange={(e) => updateField('fechaDia', e.target.value)}
                className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
              />
            </div>
          )}

          {filtros.modoTemporal === 'semana' && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-slate-700 text-xs">Seleccione fecha dentro de la Semana:</span>
              <input
                type="date"
                value={filtros.fechaSemana}
                onChange={(e) => updateField('fechaSemana', e.target.value)}
                className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
              />
              <span className="text-[11px] text-slate-500 font-medium">
                (El reporte calcula y filtra automáticamente el ciclo completo de Lunes a Domingo de esa semana)
              </span>
            </div>
          )}

          {filtros.modoTemporal === 'mes' && (
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-700 text-xs">Seleccione Año y Mes:</span>
              <input
                type="month"
                value={filtros.fechaMes}
                onChange={(e) => updateField('fechaMes', e.target.value)}
                className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
              />
            </div>
          )}

          {filtros.modoTemporal === 'anio' && (
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-700 text-xs">Seleccione el Año:</span>
              <select
                value={filtros.fechaAnio}
                onChange={(e) => updateField('fechaAnio', e.target.value)}
                className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
              >
                {uniqueAnios.length > 0 ? (
                  uniqueAnios.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))
                ) : (
                  <>
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                  </>
                )}
              </select>
            </div>
          )}

          {filtros.modoTemporal === 'rango' && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-slate-700 text-xs">Desde:</span>
              <input
                type="date"
                value={filtros.fechaRangoInicio}
                onChange={(e) => updateField('fechaRangoInicio', e.target.value)}
                className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
              />
              <span className="font-bold text-slate-700 text-xs">Hasta:</span>
              <input
                type="date"
                value={filtros.fechaRangoFin}
                onChange={(e) => updateField('fechaRangoFin', e.target.value)}
                className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
              />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
