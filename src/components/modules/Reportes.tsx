import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { 
  FileText, 
  Calendar, 
  User, 
  Trash2, 
  Download, 
  RefreshCcw, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  ArrowLeft,
  ChevronRight,
  Filter,
  Info,
  FileSpreadsheet
} from 'lucide-react';
import FormHeader from '../FormHeader';
import { generateAndDownloadExcel } from '../../utils/excelGenerator';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';
import { sanitizeBiotrashObject } from '../../utils/textSanitizer';

interface Props {
  onBack: () => void;
  userEmail: string;
}

const BITACORAS_INFO = [
  { id: 'all', title: 'Todas las Bitácoras', col: 'all', code: 'BIOTRASH-ALL' },
  { id: 'inventarios', title: 'Bitácora de Ingreso de Desechos a Planta', col: 'bitacora_inventarios', code: 'F-OPR-000-1' },
  { id: 'entrega_contenedores', title: 'Entrega Contenedores Rojos', col: 'bitacora_entrega_contenedores', code: 'F-OPR-000-2' },
  { id: 'disposicion_pirolisis', title: 'Disposición Final a Pirólisis', col: 'bitacora_disposicion_pirolisis', code: 'F-OPR-000-3' },
  { id: 'disposicion_vertedero', title: 'Disposición Final a Vertedero', col: 'bitacora_disposicion_vertedero', code: 'F-OPR-000-4' },
  { id: 'control_incineracion', title: 'Control de Incineración RPBI', col: 'bitacora_control_incineracion', code: 'F-OPR-000-5' },
  { id: 'cuarto_frio', title: 'Control de Cuarto Frío', col: 'bitacora_cuarto_frio', code: 'F-OPR-000-6' },
  { id: 'reduccion_volumen', title: 'Reducción de Volumen Shredder', col: 'bitacora_reduccion_volumen', code: 'F-OPR-000-7' },
  { id: 'control_autoclaves', title: 'Control Químico/Biológico Autoclaves', col: 'bitacora_control_autoclaves', code: 'F-OPR-000-8' },
  { id: 'generacion_almacenamiento', title: 'Ingreso y Almacenamiento RPBI', col: 'bitacora_generacion_almacenamiento', code: 'F-OPR-000-9' },
  { id: 'lavado_banos', title: 'Sanitización de Baños y Oficinas', col: 'bitacora_lavado_banos', code: 'F-OPR-000-10' },
  { id: 'insumos_quimicos', title: 'Insumos Químicos y Plásticos', col: 'bitacora_insumos_quimicos', code: 'F-OPR-000-11' },
  { id: 'inventarios_sgc', title: 'Inventario General SGI', col: 'bitacora_inventarios_sgc', code: 'F-OPR-000-12' },
  { id: 'control_uniformes', title: 'Control de Uniformes de Planta', col: 'bitacora_control_uniformes', code: 'F-OPR-000-13' },
  { id: 'control_horas_cargador', title: 'Control de Horas de Trabajo', col: 'bitacora_control_horas_cargador', code: 'F-OPR-000-14' },
];

export default function ReportesModule({ onBack, userEmail }: Props) {
  const [selectedBitacora, setSelectedBitacora] = useState<string>('all');
  const [filterType, setFilterType] = useState<'dia' | 'semana' | 'mes' | 'rango'>('mes');
  
  // Filter selectors
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedWeek, setSelectedWeek] = useState<string>(''); // Date to find week of
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`;
  });
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Custom Logo Configuration state
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUrlInput, setLogoUrlInput] = useState<string>('');

  // Load custom logo settings on mount
  useEffect(() => {
    const savedBase64 = localStorage.getItem('sgc_logo_base64');
    const savedUrl = localStorage.getItem('sgc_logo_url');
    if (savedBase64) {
      setLogoPreview(savedBase64);
    } else if (savedUrl) {
      setLogoPreview(savedUrl);
    }
    if (savedUrl) {
      setLogoUrlInput(savedUrl);
    }
  }, []);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500000) { // ~500kb limit
      setMsg({ text: 'El archivo excede el tamaño sugerido de 500KB para almacenamiento local.', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      localStorage.setItem('sgc_logo_base64', base64);
      localStorage.removeItem('sgc_logo_url');
      setLogoPreview(base64);
      setMsg({ text: 'Se ha guardado el logotipo local del SGI para la exportación de PDFs.', type: 'success' });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLogoUrl = () => {
    if (!logoUrlInput.trim()) {
      handleResetLogo();
      return;
    }
    localStorage.setItem('sgc_logo_url', logoUrlInput.trim());
    localStorage.removeItem('sgc_logo_base64');
    setLogoPreview(logoUrlInput.trim());
    setMsg({ text: 'Enlace del logotipo SGI guardado con éxito.', type: 'success' });
  };

  const handleResetLogo = () => {
    localStorage.removeItem('sgc_logo_base64');
    localStorage.removeItem('sgc_logo_url');
    setLogoPreview(null);
    setLogoUrlInput('');
    setMsg({ text: 'Se ha restablecido al logotipo vectorial por defecto de BIOTRASH.', type: 'success' });
  };

  // Load week initialization
  useEffect(() => {
    setSelectedWeek(new Date().toISOString().split('T')[0]);
  }, []);

  // Run dynamic report on filter/selection changes
  useEffect(() => {
    handleRunReport();
  }, [selectedBitacora, filterType, selectedDate, selectedWeek, selectedMonth, startDate, endDate]);

  // Helper: Get start/end range of week for a given date
  const getWeekRange = (dateStr: string) => {
    if (!dateStr) return { start: '', end: '' };
    const curr = new Date(dateStr + 'T12:00:00'); // avoid timezone shifts
    const first = curr.getDate() - curr.getDay(); // Sunday is 0
    const last = first + 6; // Saturday is 6

    const firstDay = new Date(curr.setDate(first));
    const lastDay = new Date(curr.setDate(last));

    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0]
    };
  };

  const handleRunReport = async () => {
    setLoading(true);
    setMsg({ text: '', type: '' });
    try {
      let tempResults: any[] = [];
      const collectionsToQuery = selectedBitacora === 'all' 
        ? BITACORAS_INFO.filter(b => b.id !== 'all') 
        : BITACORAS_INFO.filter(b => b.id === selectedBitacora);

      for (const info of collectionsToQuery) {
        const querySnapshot = await getDocs(collection(db, info.col));
        querySnapshot.forEach(docSnap => {
          const data = sanitizeBiotrashObject(docSnap.data());
          tempResults.push({
            id: docSnap.id,
            tipo: info.id,
            tipoTitulo: info.title,
            codigoFormato: info.code,
            ...data
          });
        });
      }

      // Sort by fecha or fechaRegistro descending
      tempResults.sort((a, b) => {
        const dateA = a.fecha || a.fechaRegistro || '';
        const dateB = b.fecha || b.fechaRegistro || '';
        return dateB.localeCompare(dateA);
      });

      // Apply dynamic period filtering
      const filtered = tempResults.filter(item => {
        const itemDateStr = item.fecha || (item.fechaRegistro ? item.fechaRegistro.split('T')[0] : '');
        if (!itemDateStr) return false;

        switch (filterType) {
          case 'dia':
            return itemDateStr === selectedDate;
          case 'semana': {
            const { start, end } = getWeekRange(selectedWeek);
            if (!start || !end) return true;
            return itemDateStr >= start && itemDateStr <= end;
          }
          case 'mes':
            return itemDateStr.startsWith(selectedMonth);
          case 'rango':
            return itemDateStr >= startDate && itemDateStr <= endDate;
          default:
            return true;
        }
      });

      setResults(filtered);
    } catch (e: any) {
      console.error(e);
      setMsg({ 
        text: `Error al conectar con la base de datos de Firebase: ${e.message || e}`, 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVacuumAllData = async () => {
    if (clearConfirmText !== 'ELIMINAR') {
      setMsg({ text: 'Por seguridad, escriba "ELIMINAR" exactamente para continuar.', type: 'error' });
      return;
    }

    setClearing(true);
    setMsg({ text: 'Procesando eliminación de todos los registros en Firebase...', type: 'info' });
    try {
      const collectionsToClear = BITACORAS_INFO.filter(b => b.id !== 'all');
      let totalDeleted = 0;

      for (const info of collectionsToClear) {
        const qSnap = await getDocs(collection(db, info.col));
        for (const docSnap of qSnap.docs) {
          await deleteDoc(doc(db, info.col, docSnap.id));
          totalDeleted++;
        }
      }

      setMsg({ 
        text: `¡Firmeza del Sistema! Se han eliminado exitosamente ${totalDeleted} registros de todas las bitácoras operativas en Firebase.`, 
        type: 'success' 
      });
      setResults([]);
      setShowClearConfirm(false);
      setClearConfirmText('');
    } catch (e: any) {
      console.error(e);
      setMsg({ text: `Excepción durante el vaciado de datos: ${e.message || e}`, type: 'error' });
    } finally {
      setClearing(false);
    }
  };

  const handleExportExcel = () => {
    if (results.length === 0) {
      setMsg({ text: 'No hay datos en el reporte para exportar.', type: 'error' });
      return;
    }
    if (selectedBitacora !== 'all') {
      generateAndDownloadExcel(selectedBitacora, { results });
    } else {
      generateAndDownloadExcel('reporte_general', { results });
    }
  };

  const formatWeekSelectionRange = () => {
    const range = getWeekRange(selectedWeek);
    if (!range.start) return '';
    return `Semana del ${range.start} al ${range.end}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6 text-[#1A1C1E]">
      
      {/* Navigation and Title */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-1.5 hover:bg-[#E2E8F0] rounded text-gray-700 transition"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0F172A] flex items-center gap-2">
              <Database className="w-5 h-5 text-[#3B82F6]" />
              Módulo de Reportes SGI & Demanda ISO 14001
            </h1>
            <p className="text-xs text-[#64748B]">
              Filtro y generación consolidada de bitácoras para auditoría interna y fiscalización.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowClearConfirm(true)}
            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[11px] font-bold px-3 py-1.5 rounded flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" /> Vaciar Todo
          </button>
          <button
            onClick={handleExportExcel}
            disabled={results.length === 0}
            className="bg-[#1A1C1E] hover:bg-[#2D2F31] disabled:opacity-50 text-white text-[11px] font-bold px-4 py-1.5 rounded flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Exportar Excel
          </button>
        </div>
      </div>

      {/* Dynamic Alerts */}
      {msg.text && (
        <div className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
          msg.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 
          msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 
          'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>{msg.text}</div>
        </div>
      )}

      {/* 2-Column layout: Filters on left/top, Table results on right/bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Form Filter Engine Card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-4 space-y-4">
            <div className="flex items-center gap-1.5 border-b border-[#F1F5F9] pb-2">
              <Filter className="w-4 h-4 text-[#3B82F6]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">Parámetros de Consulta</h2>
            </div>

            {/* 1. Select Log */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase">1. Selección de Bitácora</label>
              <select
                value={selectedBitacora}
                onChange={(e) => setSelectedBitacora(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded px-2.5 py-1.5 text-xs text-[#1E293B] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
              >
                {BITACORAS_INFO.map(b => (
                  <option key={b.id} value={b.id}>{b.title} ({b.code})</option>
                ))}
              </select>
            </div>

            {/* 2. Filter Type */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase">2. Intervalo Temporal</label>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { id: 'dia', label: 'Día' },
                  { id: 'semana', label: 'Sem' },
                  { id: 'mes', label: 'Mes' },
                  { id: 'rango', label: 'Rango' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFilterType(opt.id as any)}
                    className={`text-[10px] uppercase font-bold py-1 border rounded text-center transition ${
                      filterType === opt.id 
                        ? 'bg-[#1A1C1E] text-white border-[#1A1C1E]' 
                        : 'bg-[#F8FAFC] hover:bg-[#F1F5F9] border-[#E2E8F0] text-gray-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Parameter Input based on selected Filter Type */}
            <div className="bg-[#F8FAFC] border border-[#F1F5F9] p-3 rounded space-y-2">
              
              {filterType === 'dia' && (
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase">Día Seleccionado</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-white border border-[#E2E8F0] rounded px-2 py-1 text-xs text-[#1E293B]"
                  />
                </div>
              )}

              {filterType === 'semana' && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-gray-400 uppercase">Seleccione Día de la Sem.</label>
                    <input
                      type="date"
                      value={selectedWeek}
                      onChange={(e) => setSelectedWeek(e.target.value)}
                      className="w-full bg-white border border-[#E2E8F0] rounded px-2 py-1 text-xs text-[#1E293B]"
                    />
                  </div>
                  <div className="text-[10px] text-[#3B82F6] font-mono font-semibold bg-blue-50/50 p-1.5 rounded text-center">
                    {formatWeekSelectionRange()}
                  </div>
                </div>
              )}

              {filterType === 'mes' && (
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase">Mes / Año de Cómputo</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full bg-white border border-[#E2E8F0] rounded px-2 py-1 text-xs text-[#1E293B]"
                  />
                </div>
              )}

              {filterType === 'rango' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-gray-400 uppercase">Desde</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-white border border-[#E2E8F0] rounded px-2 py-1 text-xs text-[#1E293B]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-gray-400 uppercase">Hasta</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-white border border-[#E2E8F0] rounded px-2 py-1 text-xs text-[#1E293B]"
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Quick stats summarizing matched queries */}
            <div className="pt-2 border-t border-[#F1F5F9] flex justify-between items-center text-[11px] font-mono">
              <span className="text-gray-500">Coincidencias:</span>
              <span className="font-bold text-[#3B82F6] bg-blue-50 px-2 py-0.5 rounded">
                {results.length} registros
              </span>
            </div>

            <button
              onClick={handleRunReport}
              disabled={loading}
              className="w-full bg-[#3B82F6] hover:bg-blue-600 font-bold text-xs text-white py-1.5 px-3 rounded flex items-center justify-center gap-1.5 transition"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Sincronizar Reporte
            </button>
          </div>

          {/* Quick info panel about ISO SGI compliance */}
          <div className="bg-[#FAF9F6] border border-[#E2D2B3]/30 rounded-lg p-3 text-[10px] text-[#865E25] space-y-1.5 font-sans">
            <div className="font-bold uppercase tracking-wider flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-[#865E25]" /> Lineamientos ISO 14001:2015
            </div>
            <p className="leading-relaxed">
              Los registros filtrados y exportados por este módulo constituyen evidencia documental para la trazabilidad operativa. No altere el control de cambios de los formatos emitidos ni destruya información de respaldo sin autorización escrita del Comité de Gestión Ambiental.
            </p>
          </div>

          {/* SGI LOGO CONFIGURATION CENTER */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-4 space-y-3.5 text-left">
            <div className="flex items-center gap-1.5 border-b border-[#F1F5F9] pb-2">
              <div className="p-1 bg-[#3B82F6]/10 rounded">
                <FileText className="w-4 h-4 text-[#3B82F6]" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">Logotipo del SGI en PDF</h2>
            </div>

            <p className="text-[10px] text-slate-500 leading-normal">
              Administre el logotipo para la cabecera de todas las bitácoras operacionales PDF. Puede arrastrar un archivo local o pegar un enlace compartido.
            </p>

            {/* Current preview */}
            <div className="border border-dashed border-[#E2E8F0] rounded p-3 bg-[#F8FAFC] flex flex-col items-center justify-center min-h-[90px] relative">
              <span className="absolute top-1 right-1 text-[8px] font-mono text-gray-400 uppercase font-semibold">Carga actual</span>
              {logoPreview ? (
                <img src={logoPreview} alt="Logo SGI" className="max-h-[60px] object-contain" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="bg-[#3B82F6] p-1.5 rounded">
                    <span className="text-white font-bold text-xs font-mono">BIO</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-bold tracking-tight text-[#1E293B] text-sm leading-none">BIOTRASH</span>
                    <span className="text-[7.5px] font-bold text-[#3B82F6] leading-none mt-1 uppercase tracking-tight">Sistema de Gestión Integral</span>
                    <span className="text-[6.5px] font-semibold text-slate-500 leading-none mt-0.5">ISO 9001:2015 / ISO 14001:2015</span>
                  </div>
                </div>
              )}
            </div>

            {/* Upload File area */}
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-gray-500 uppercase">1. Subir Archivo de Logo (Local)</label>
              <div className="relative group cursor-pointer border border-dashed border-[#CBD5E1] hover:border-[#3B82F6] rounded p-2.5 bg-slate-50 hover:bg-blue-50/20 text-center transition">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                  onChange={handleLogoFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <span className="text-[10px] font-bold text-[#3B82F6] group-hover:underline block">
                  Examinar imagen
                </span>
                <span className="text-[8px] text-gray-450 block mt-0.5">
                  PNG, JPG o SVG (Compresión sugerida, max 500KB)
                </span>
              </div>
            </div>

            {/* Link Text Area */}
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-gray-500 uppercase">2. O utilizar Enlace Compartido (URL)</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="https://ejemplo.com/mi_logo.png"
                  value={logoUrlInput}
                  onChange={(e) => setLogoUrlInput(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded px-2.5 py-1 text-[10px] font-mono focus:border-[#3B82F6] focus:outline-none placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={handleSaveLogoUrl}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] px-2.5 py-1 rounded transition"
                >
                  Guardar
                </button>
              </div>
            </div>

            {/* Clear option */}
            {logoPreview && (
              <button
                type="button"
                onClick={handleResetLogo}
                className="w-full border border-red-100 hover:bg-red-50 text-red-650 font-bold text-[10px] py-1 rounded transition text-center block"
              >
                Restablecer a Vector SGI
              </button>
            )}
          </div>
        </div>

        {/* Results Stream Area */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col">
            
            <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-4 py-2.5 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">Flujo de Registros Encontrados</h2>
              <span className="text-[10px] text-gray-500 font-mono">SGI Live Database Integration</span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-gray-500 font-mono flex flex-col items-center justify-center gap-2">
                <RefreshCcw className="w-5 h-5 text-[#3B82F6] animate-spin" />
                <span>Extrayendo información de Firebase...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="p-12 text-center text-xs text-orange-600 font-semibold bg-[#FFF9F2]/40 rounded-b">
                No se encontraron registros activos en Firebase que coincidan con la selección y fechas parametrizadas.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F1F5F9] border-b border-[#CBD5E1] text-[#475569] font-bold uppercase text-[9px] tracking-wider">
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Código</th>
                      <th className="px-4 py-3">Bitácora / Formato SGI</th>
                      <th className="px-4 py-3">Responsable</th>
                      {/* HIGHLIGHT WEIGHT COLUMN IN GREEN - HEADER */}
                      <th className="px-4 py-3 bg-emerald-100 text-emerald-800 font-extrabold border-x border-emerald-200 text-center">
                        Peso / Medición (Lbs)
                      </th>
                      <th className="px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {results.map((log: any, idx: number) => {
                      const isExpanded = expandedLog === log.id;
                      
                      // Helper to extract primary weight info
                      const getPesoPrincipal = (item: any) => {
                        if (item.totalLibras !== undefined) {
                          return { val: item.totalLibras, unit: 'lbs', label: 'Libras' };
                        }
                        if (item.totalPesaje !== undefined) {
                          return { val: item.totalPesaje, unit: 'lbs', label: 'Pesaje' };
                        }
                        if (item.pesoProceso !== undefined) {
                          return { val: item.pesoProceso, unit: 'lbs', label: 'Proceso' };
                        }
                        if (item.pesoTicketBascula !== undefined) {
                          return { val: item.pesoTicketBascula, unit: 'lbs', label: 'Báscula' };
                        }
                        if (item.pesoEntrada !== undefined || item.pesoSalida !== undefined) {
                          const ent = item.pesoEntrada !== undefined ? item.pesoEntrada : 0;
                          const sal = item.pesoSalida !== undefined ? item.pesoSalida : 0;
                          return { val: `${ent} / ${sal}`, unit: 'lbs', label: 'In / Out' };
                        }
                        if (item.totalPesoTickets !== undefined) {
                          return { val: item.totalPesoTickets, unit: 'lbs', label: 'Tickets' };
                        }
                        if (item.totalPacas !== undefined) {
                          return { val: item.totalPacas, unit: 'pacas', label: 'Pacas' };
                        }
                        if (item.totalContenedores !== undefined) {
                          return { val: item.totalContenedores, unit: 'cont.', label: 'Cont.' };
                        }
                        return { val: '—', unit: '', label: 'N/A' };
                      };

                      const pesoInfo = getPesoPrincipal(log);
                      const excludeKeys = [
                        'id', 'tipo', 'tipoTitulo', 'codigoFormato', 'fechaRegistro', 'fecha',
                        'filas', 'filasLeft', 'estadoGeneral', 'tempCongeladores', 'inspeccion',
                        'checklistBanos', 'abastecimientoBanos', 'checklistPrevia', 'tipoIndicador',
                        'parametrosOperacion', 'tipoResiduo', 'tipoEmbalaje', 'responsable'
                      ];

                      return (
                        <React.Fragment key={log.id || idx}>
                          <tr className={`hover:bg-[#F8FAFC] transition-colors ${isExpanded ? 'bg-blue-50/25' : ''}`}>
                            <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                              {log.fecha}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-[9px] font-bold uppercase tracking-wide text-white bg-[#3B82F6] px-1.5 py-0.5 rounded leading-none">
                                {log.codigoFormato}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-[#1E293B]">
                              {log.tipoTitulo}
                            </td>
                            <td className="px-4 py-3 text-[#475569] font-medium font-sans">
                              {log.responsable || 'Sin asignar'}
                            </td>
                            {/* HIGHLIGHT WEIGHT COLUMN IN GREEN - CELL */}
                            <td className="px-4 py-3 bg-emerald-50 text-emerald-800 font-extrabold border-x border-emerald-100 font-mono text-center">
                              {pesoInfo.val} {pesoInfo.unit}
                              {pesoInfo.label !== 'N/A' && (
                                <span className="block text-[7.5px] uppercase font-bold text-emerald-600 font-sans tracking-wide mt-0.5">
                                  {pesoInfo.label}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <button
                                onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                                className="text-[10px] font-extrabold text-[#3B82F6] hover:text-blue-700 hover:underline uppercase flex items-center justify-end gap-0.5 ml-auto"
                              >
                                {isExpanded ? 'Ocultar' : 'Detalles'} 
                                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="bg-[#F8FAFC] p-4 border-b border-[#CBD5E1]">
                                <div className="space-y-4 font-sans">
                                  
                                  {/* General Metadata Box */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-250 pb-2.5 gap-2 text-xs">
                                    <div>
                                      <span className="text-slate-400 text-[8px] font-bold uppercase tracking-wider block">ID Registro SGI:</span>
                                      <span className="font-mono font-semibold text-slate-700 select-all">{log.id}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 text-[8px] font-bold uppercase tracking-wider block sm:text-right">Fecha Registro:</span>
                                      <span className="font-mono font-semibold text-slate-700">{log.fechaRegistro || 'N/A'}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 text-[8px] font-bold uppercase tracking-wider block sm:text-right">Formato SGI:</span>
                                      <span className="font-semibold text-slate-800">{log.codigoFormato} — {log.tipoTitulo}</span>
                                    </div>
                                  </div>

                                  {/* Individual Report Action Buttons */}
                                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                                    <div className="flex items-center gap-1.5 text-slate-700">
                                      <Info className="w-4 h-4 text-[#3B82F6]" />
                                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Reporte Personalizado SGI:</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={async () => {
                                          try {
                                            await generateAndDownloadPDF(log.tipo, log);
                                            setMsg({ text: 'Reporte SGI en formato PDF descargado con éxito.', type: 'success' });
                                          } catch (err: any) {
                                            setMsg({ text: `No se pudo exportar a PDF: ${err.message || err}`, type: 'error' });
                                          }
                                        }}
                                        className="bg-[#EF4444] hover:bg-[#DC2626] text-white text-[9.5px] font-extrabold px-3 py-1.5 rounded flex items-center gap-1.5 transition uppercase tracking-wide cursor-pointer shadow-xs"
                                      >
                                        <FileText className="w-3.5 h-3.5" /> Descargar PDF SGI
                                      </button>
                                      <button
                                        onClick={() => {
                                          try {
                                            generateAndDownloadExcel(log.tipo, log);
                                            setMsg({ text: 'Reporte SGI en formato Excel descargado con éxito.', type: 'success' });
                                          } catch (err: any) {
                                            setMsg({ text: `No se pudo exportar a Excel: ${err.message || err}`, type: 'error' });
                                          }
                                        }}
                                        className="bg-[#10B981] hover:bg-[#059669] text-white text-[9.5px] font-extrabold px-3 py-1.5 rounded flex items-center gap-1.5 transition uppercase tracking-wide cursor-pointer shadow-xs"
                                      >
                                        <FileSpreadsheet className="w-3.5 h-3.5" /> Descargar Excel SGI
                                      </button>
                                    </div>
                                  </div>

                                  {/* Dynamic Key-Value grid for ALL primitive attributes */}
                                  <div className="space-y-1.5">
                                    <span className="text-[10px] text-[#3B82F6] font-extrabold block uppercase tracking-wider">Atributos y Parámetros del Formato SGI:</span>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                                      {Object.entries(log).map(([key, value]) => {
                                        if (excludeKeys.includes(key) || typeof value === 'object' || value === null || value === '') return null;
                                        // Format camelCase keys into Title Case
                                        const formattedKey = key
                                          .replace(/([A-Z])/g, ' $1')
                                          .replace(/^./, str => str.toUpperCase())
                                          .toUpperCase();
                                        return (
                                          <div key={key} className="bg-white p-2.5 rounded border border-slate-200/60 flex flex-col justify-between shadow-xs">
                                            <span className="text-slate-400 text-[7.5px] font-bold block uppercase tracking-wider">{formattedKey}:</span>
                                            <span className="font-semibold text-slate-800 mt-0.5">{String(value)}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Nested objects rendering */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                    {log.estadoGeneral && (
                                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                                        <span className="font-bold text-[8.5px] text-slate-400 block uppercase mb-1.5">Estado General Contenedores:</span>
                                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                                          {Object.entries(log.estadoGeneral).map(([k, v]) => (
                                            <div key={k} className="flex items-center gap-1.5">
                                              <span className={v ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>{v ? '✓' : '✗'}</span>
                                              <span className="text-slate-600 uppercase font-sans text-[8.5px]">{k.replace(/([A-Z])/g, ' $1')}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {log.inspeccion && (
                                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                                        <span className="font-bold text-[8.5px] text-slate-400 block uppercase mb-1.5">Inspección Sanitaria Cuarto Frío:</span>
                                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                                          {Object.entries(log.inspeccion).map(([k, v]) => (
                                            <div key={k} className="flex items-center gap-1.5">
                                              <span className={v ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>{v ? '✓' : '✗'}</span>
                                              <span className="text-slate-600 uppercase font-sans text-[8.5px]">{k.replace(/([A-Z])/g, ' $1')}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {log.checklistBanos && (
                                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                                        <span className="font-bold text-[8.5px] text-slate-400 block uppercase mb-1.5">Chequeo Lavado de Baños:</span>
                                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                                          {Object.entries(log.checklistBanos).map(([k, v]) => (
                                            <div key={k} className="flex items-center gap-1.5">
                                              <span className={v ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>{v ? '✓' : '✗'}</span>
                                              <span className="text-slate-600 uppercase font-sans text-[8.5px]">{k.replace(/([A-Z])/g, ' $1')}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {log.abastecimientoBanos && (
                                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                                        <span className="font-bold text-[8.5px] text-slate-400 block uppercase mb-1.5">Abastecimiento Consumibles Baños:</span>
                                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                                          {Object.entries(log.abastecimientoBanos).map(([k, v]) => (
                                            <div key={k} className="flex items-center gap-1.5">
                                              <span className={v ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>{v ? '✓' : '✗'}</span>
                                              <span className="text-slate-600 uppercase font-sans text-[8.5px]">{k.replace(/([A-Z])/g, ' $1')}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {log.checklistPrevia && (
                                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                                        <span className="font-bold text-[8.5px] text-slate-400 block uppercase mb-1.5">Chequeo Pre-Operacional Cargador:</span>
                                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                                          {Object.entries(log.checklistPrevia).map(([k, v]) => (
                                            <div key={k} className="flex items-center gap-1.5">
                                              <span className={v ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>{v ? '✓' : '✗'}</span>
                                              <span className="text-slate-600 uppercase font-sans text-[8.5px]">{k.replace(/([A-Z])/g, ' $1')}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {log.tempCongeladores && (
                                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                                        <span className="font-bold text-[8.5px] text-slate-400 block uppercase mb-1.5">Temperaturas Congeladores Auxiliares:</span>
                                        <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                                          {Object.entries(log.tempCongeladores).map(([k, v]) => (
                                            <div key={k} className="bg-[#F8FAFC] px-1.5 py-1 rounded border border-slate-100 text-center">
                                              <span className="text-[7.5px] text-gray-400 block">{k.toUpperCase()}</span>
                                              <span className="font-bold text-slate-700">{String(v)}°C</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {log.tipoIndicador && (
                                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                                        <span className="font-bold text-[8.5px] text-slate-400 block uppercase mb-1.5">Tipo de Indicador Autoclave:</span>
                                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                                          {Object.entries(log.tipoIndicador).map(([k, v]) => (
                                            <div key={k} className="flex items-center gap-1.5">
                                              <span className={v ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>{v ? '✓' : '✗'}</span>
                                              <span className="text-slate-600 uppercase font-sans text-[8.5px]">{k.replace(/([A-Z])/g, ' $1')}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {log.parametrosOperacion && (
                                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                                        <span className="font-bold text-[8.5px] text-slate-400 block uppercase mb-1.5">Parámetros Operación Autoclave:</span>
                                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                                          {Object.entries(log.parametrosOperacion).map(([k, v]) => (
                                            <div key={k} className="flex items-center gap-1.5">
                                              <span className={v ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>{v ? '✓' : '✗'}</span>
                                              <span className="text-slate-600 uppercase font-sans text-[8.5px]">{k.replace(/([A-Z])/g, ' $1')}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {log.tipoResiduo && (
                                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                                        <span className="font-bold text-[8.5px] text-slate-400 block uppercase mb-1.5">Clasificación Residuo RPBI:</span>
                                        <div className="grid grid-cols-3 gap-2 text-[10px]">
                                          {Object.entries(log.tipoResiduo).map(([k, v]) => (
                                            <div key={k} className="flex items-center gap-1.5">
                                              <span className={v ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>{v ? '✓' : '✗'}</span>
                                              <span className="text-slate-600 uppercase font-sans text-[8.5px]">{k.replace(/([A-Z])/g, ' $1')}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {log.tipoEmbalaje && (
                                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                                        <span className="font-bold text-[8.5px] text-slate-400 block uppercase mb-1.5">Tipo Embalaje RPBI:</span>
                                        <div className="grid grid-cols-3 gap-2 text-[10px]">
                                          {Object.entries(log.tipoEmbalaje).map(([k, v]) => (
                                            <div key={k} className="flex items-center gap-1.5">
                                              <span className={v ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>{v ? '✓' : '✗'}</span>
                                              <span className="text-slate-600 uppercase font-sans text-[8.5px]">{k.replace(/([A-Z])/g, ' $1')}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Subtables rendering (filas or filasLeft) */}
                                  {((log.filas && log.filas.length > 0) || (log.filasLeft && log.filasLeft.length > 0)) && (
                                    <div className="mt-2 text-[10px] bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                      <span className="font-bold block text-slate-700 uppercase mb-1.5 text-[9px] tracking-wide">Subtabla de Transacciones Operativas:</span>
                                      <div className="max-h-48 overflow-y-auto rounded border border-slate-200">
                                        <table className="w-full text-left text-[9px] border-collapse">
                                          <thead>
                                            <tr className="bg-[#F8FAFC] text-slate-500 uppercase font-bold border-b border-slate-200 text-[8px]">
                                              <th className="px-2 py-2">Ítem / Descripción</th>
                                              <th className="px-2 py-2 text-center">Identificación/Ruta/Atributo</th>
                                              <th className="px-2 py-2 text-right">Medición / Cantidad</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                            {((log.filas || log.filasLeft || [])).map((f: any, i: number) => (
                                              <tr key={i} className="hover:bg-slate-50/50">
                                                <td className="px-2 py-1.5 text-slate-700 font-medium font-sans">
                                                  {f.producto || f.ruta || f.proceso || f.camion || f.ingreso || f.colaborador || f.codigoInsumo || f.codigo || `Fila ${i + 1}`}
                                                </td>
                                                <td className="px-2 py-1.5 text-center text-slate-500 font-mono">
                                                  {f.noTicketInterno || f.noPaseTraslado || f.noPaseSalida || f.noLoteProveedor || f.puesto || f.unidadMedida || f.medida || '—'}
                                                </td>
                                                <td className="px-2 py-1.5 text-right font-bold text-slate-850">
                                                  {f.peso !== undefined ? `${f.peso} lbs` : 
                                                   f.pesaje !== undefined ? `${f.pesaje} lbs` : 
                                                   f.libras !== undefined ? `${f.libras} lbs` :
                                                   f.cantidad !== undefined ? f.cantidad : 
                                                   f.cantidadPacas !== undefined ? f.cantidadPacas : 
                                                   f.existenciaReal !== undefined ? `${f.existenciaReal} (Física)` : '—'}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Confirmation Modal for Clearing Database */}
      {showClearConfirm && (
        <div id="modal-clear-confirm" className="fixed inset-0 bg-[#1A1C1E]/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-[#E2E8F0] max-w-md w-full p-6 space-y-4 text-center">
            <div className="flex justify-center">
              <div className="bg-red-50 p-3 rounded-full text-red-600">
                <AlertTriangle className="w-8 h-8 animate-bounce" />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <h3 className="font-bold text-base text-[#1E293B]">¿Está completamente seguro de vaciar el sistema?</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Esta acción es destructiva e irreversible. Eliminará todos los registros históricos de las 9 bitácoras disponibles en la base de datos de Firebase.
              </p>
            </div>

            <div className="bg-red-50/50 p-3 rounded text-left space-y-2 border border-red-100">
              <label className="block text-[10px] font-bold text-red-700 uppercase">
                Para confirmar la eliminación, escriba la palabra <span className="underline select-all">ELIMINAR</span> a continuación:
              </label>
              <input
                id="input-clear-confirm"
                type="text"
                value={clearConfirmText}
                onChange={(e) => setClearConfirmText(e.target.value)}
                placeholder="Escriba ELIMINAR"
                className="w-full bg-white border border-red-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-xs px-3 py-1.5 rounded uppercase font-bold text-center outline-none"
              />
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  setShowClearConfirm(false);
                  setClearConfirmText('');
                }}
                disabled={clearing}
                className="flex-1 bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] font-bold text-xs text-gray-700 py-1.5 rounded transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleVacuumAllData}
                disabled={clearing || clearConfirmText !== 'ELIMINAR'}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 font-bold text-xs text-white py-1.5 rounded transition flex items-center justify-center gap-1"
              >
                {clearing ? 'Vaciando...' : 'Sí, Vaciar Todo'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
