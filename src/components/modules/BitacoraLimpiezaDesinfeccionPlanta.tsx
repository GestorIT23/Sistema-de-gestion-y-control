import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, limit } from 'firebase/firestore';
import type { BitacoraLimpiezaDesinfeccionPlanta } from '../../types';
import FormHeader from '../FormHeader';
import FormFooter from '../FormFooter';
import BulkUploadPanel from '../BulkUploadPanel';
import * as XLSX from 'xlsx';
import { 
  Sparkles, 
  Calendar, 
  User, 
  ArrowLeft, 
  ShieldCheck, 
  Info, 
  AlertCircle, 
  FileSpreadsheet, 
  FileText, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  Trash2, 
  Search, 
  RefreshCw,
  Download,
  Upload,
  Check,
  X,
  Droplets,
  Layers
} from 'lucide-react';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';
import { downloadLimpiezaDesinfeccionPlantaTemplate } from '../../utils/excelGenerator';
import { sanitizeBiotrashObject } from '../../utils/textSanitizer';
import { isAuthorizedToDelete } from '../../utils/authUtils';
import GestorItDeleteModuleRecords from '../GestorItDeleteModuleRecords';

interface Props {
  onBack: () => void;
  userEmail: string;
}

const ZONAS_DEFAULT = [
  { area: 'Bahía de Descarga y Recepción DSH', frecuencia: 'Por Turno', tipoLimpieza: 'Desinfección de Choque' as const, hora: '06:30', estatus: 'Conforme' as const, operador: 'Mario Pérez' },
  { area: 'Cuarto Frío / Almacenamiento Temporal', frecuencia: 'Diario', tipoLimpieza: 'Limpieza Profunda' as const, hora: '07:00', estatus: 'Conforme' as const, operador: 'Mario Pérez' },
  { area: 'Área de Autoclaves y Esterilización', frecuencia: 'Por Ciclo', tipoLimpieza: 'Desinfección de Choque' as const, hora: '07:30', estatus: 'Conforme' as const, operador: 'Luis Gómez' },
  { area: 'Área de Incineración DSH', frecuencia: 'Diario', tipoLimpieza: 'Rutinaria' as const, hora: '08:00', estatus: 'Conforme' as const, operador: 'Luis Gómez' },
  { area: 'Área de Trituración y Molienda', frecuencia: 'Por Turno', tipoLimpieza: 'Desinfección de Choque' as const, hora: '08:30', estatus: 'Conforme' as const, operador: 'Estuardo Xicay' },
  { area: 'Área de Compactadora y Prensa', frecuencia: 'Por Turno', tipoLimpieza: 'Rutinaria' as const, hora: '09:00', estatus: 'Conforme' as const, operador: 'Estuardo Xicay' },
  { area: 'Túnel de Lavado de Contenedores', frecuencia: 'Continuo', tipoLimpieza: 'Limpieza Profunda' as const, hora: '09:30', estatus: 'Conforme' as const, operador: 'Mario Pérez' },
  { area: 'Área de Caldera y Servicios Auxiliares', frecuencia: 'Diario', tipoLimpieza: 'Rutinaria' as const, hora: '10:00', estatus: 'Conforme' as const, operador: 'Luis Gómez' }
];

export default function BitacoraLimpiezaDesinfeccionPlanta({ onBack, userEmail }: Props) {
  const [activeTab, setActiveTab] = useState<'formulario' | 'carga_excel' | 'historico'>('formulario');
  const [registros, setRegistros] = useState<BitacoraLimpiezaDesinfeccionPlanta[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalRegistro, setModalRegistro] = useState<BitacoraLimpiezaDesinfeccionPlanta | null>(null);

  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<BitacoraLimpiezaDesinfeccionPlanta>>({
    fecha: new Date().toISOString().split('T')[0],
    turno: 'Mañana',
    supervisorResponsable: 'Ing. Astrid Guzmán (Supervisora HSE)',
    cuadrillaOperadores: 'Cuadrilla A (Mario Pérez, Luis Gómez, Estuardo Xicay)',
    productoQuimico: 'Amonio Cuaternario 5ta Generación (Biotrash Shield)',
    loteProducto: 'L-AQ-2026-09',
    concentracionObjetivoPpm: 400,
    concentracionMedidaPpm: 405,
    horaPreparacion: '06:15',
    zonas: ZONAS_DEFAULT,
    eppGuantesNitrilo: true,
    eppBotasImpermeables: true,
    eppTrajeTyvekMandil: true,
    eppRespiradorVapores: true,
    eppCaretaFacial: true,
    panosMopasLímpias: true,
    desviacionesNovedades: 'Desinfección de choque completada con tiempo de contacto mínimo de 15 minutos en bahía de descarga.',
    accionesCorrectivas: 'Ninguna requerida, parámetros en cumplimiento estricto.',
    veredictoCumplimiento: 'Cumplimiento Total (100%)',
    firmaOperadorLider: '',
    firmaSupervisorHse: ''
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'bitacora_limpieza_desinfeccion_planta'), orderBy('fecha', 'desc'), limit(5000));
      const snap = await getDocs(q);
      const docs: BitacoraLimpiezaDesinfeccionPlanta[] = [];
      snap.forEach(d => {
        docs.push({ id: d.id, ...d.data() } as BitacoraLimpiezaDesinfeccionPlanta);
      });
      setRegistros(docs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistros();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const folio = `LIM-DES-${Date.now().toString().slice(-6)}`;
      const docData = sanitizeBiotrashObject({
        ...formData,
        folio,
        responsable: formData.supervisorResponsable || '',
        observaciones: formData.desviacionesNovedades || 'Control diario de sanitización registrado'
      });

      await addDoc(collection(db, 'bitacora_limpieza_desinfeccion_planta'), docData);
      setFeedback({ text: `¡Control de Limpieza y Desinfección guardado exitosamente! Folio: ${folio}`, type: 'success' });
      fetchRegistros();
      setActiveTab('historico');
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ text: `Error al guardar registro: ${err.message}`, type: 'error' });
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredRegistros.length && filteredRegistros.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRegistros.map(r => r.id!)));
    }
  };

  const handleDownloadSelectedPDF = async () => {
    const selectedItems = registros.filter(r => selectedIds.has(r.id!));
    if (selectedItems.length === 0) {
      alert("Seleccione al menos un registro para descargar sus reportes PDF.");
      return;
    }
    setIsBulkDownloading(true);
    setDownloadProgress({ current: 0, total: selectedItems.length });
    try {
      for (let i = 0; i < selectedItems.length; i++) {
        setDownloadProgress({ current: i + 1, total: selectedItems.length });
        await generateAndDownloadPDF('limpieza_desinfeccion_planta', selectedItems[i]);
        if (i < selectedItems.length - 1) {
          await new Promise(res => setTimeout(res, 500));
        }
      }
    } catch (err: any) {
      alert("Error al generar PDF: " + err.message);
    } finally {
      setIsBulkDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handleDownloadAllFormularioPDF = async () => {
    if (registros.length === 0) {
      alert("No hay registros en esta bitácora para descargar.");
      return;
    }
    setIsBulkDownloading(true);
    setDownloadProgress({ current: 0, total: registros.length });
    try {
      for (let i = 0; i < registros.length; i++) {
        setDownloadProgress({ current: i + 1, total: registros.length });
        await generateAndDownloadPDF('limpieza_desinfeccion_planta', registros[i]);
        if (i < registros.length - 1) {
          await new Promise(res => setTimeout(res, 500));
        }
      }
    } catch (err: any) {
      alert("Error al descargar formulario completo: " + err.message);
    } finally {
      setIsBulkDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAuthorizedToDelete(userEmail)) {
      alert('Solo Gestor IT o Administradores autorizados pueden eliminar registros.');
      return;
    }
    if (window.confirm('¿Está seguro de eliminar este registro del historial? Esta acción no se puede deshacer.')) {
      try {
        await deleteDoc(doc(db, 'bitacora_limpieza_desinfeccion_planta', id));
        fetchRegistros();
      } catch (err) {
        alert('Error al eliminar registro');
      }
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(registros.map(r => ({
      Folio: r.folio || 'N/A',
      Fecha: r.fecha,
      Turno: r.turno,
      'Supervisor HSE': r.supervisorResponsable,
      Cuadrilla: r.cuadrillaOperadores,
      'Producto Químico': r.productoQuimico,
      'Lote Químico': r.loteProducto,
      'PPM Objetivo': r.concentracionObjetivoPpm,
      'PPM Medida': r.concentracionMedidaPpm,
      'Hora Prep': r.horaPreparacion,
      'Veredicto Cumplimiento': r.veredictoCumplimiento,
      'Firma Líder': r.firmaOperadorLider,
      'Firma Supervisor': r.firmaSupervisorHse
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Limpieza y Desinfección');
    XLSX.writeFile(wb, `Reporte_Limpieza_Desinfeccion_Planta_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = (r: BitacoraLimpiezaDesinfeccionPlanta) => {
    generateAndDownloadPDF('limpieza_desinfeccion_planta', r);
  };

  const handleZoneStatusChange = (index: number, estatus: 'Conforme' | 'No Conforme') => {
    const currentZonas = [...(formData.zonas || ZONAS_DEFAULT)];
    currentZonas[index] = { ...currentZonas[index], estatus };
    setFormData({ ...formData, zonas: currentZonas });
  };

  const handleZoneHoraChange = (index: number, hora: string) => {
    const currentZonas = [...(formData.zonas || ZONAS_DEFAULT)];
    currentZonas[index] = { ...currentZonas[index], hora };
    setFormData({ ...formData, zonas: currentZonas });
  };

  const filteredRegistros = registros.filter(r => 
    (r.folio && r.folio.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.supervisorResponsable && r.supervisorResponsable.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.turno && r.turno.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.productoQuimico && r.productoQuimico.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Tablero
          </button>

          {/* Action buttons: Download template & Upload */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={downloadLimpiezaDesinfeccionPlantaTemplate}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 shadow-sm transition-colors"
              title="Descargar plantilla de Excel oficial para importar datos"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              Descargar Modelo (.xlsx)
            </button>
            <button
              onClick={() => setActiveTab('carga_excel')}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md shadow-sm transition-colors ${
                activeTab === 'carga_excel'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Upload className="w-4 h-4" />
              Subir Archivo Excel
            </button>
          </div>
        </div>

        {/* Form Header */}
        <FormHeader
          codigo="BIOTRASH 4.2. BIT-LIM-DES-001"
          titulo="CONTROL DIARIO DE LIMPIEZA Y DESINFECCIÓN DE PLANTA"
        />

        {/* Feedback message */}
        {feedback && (
          <div className={`mt-4 p-4 rounded-md flex items-center gap-3 ${
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
            <p className="text-sm font-medium">{feedback.text}</p>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="flex border-b border-gray-200 mt-6 mb-6">
          <button
            onClick={() => setActiveTab('formulario')}
            className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'formulario'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Formulario de Registro
          </button>
          <button
            onClick={() => setActiveTab('carga_excel')}
            className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'carga_excel'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Carga Masiva Excel
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'historico'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Histórico de Registros ({registros.length})
          </button>
        </div>

        {/* TAB 1: FORMULARIO */}
        {activeTab === 'formulario' && (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-8">
            {/* Header info */}
            <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  Registro Diario de Desinfección y Sanitización de Instalaciones
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  Control estricto de concentración de biocidas, barrido de zonas operativas y cumplimiento de EPP conforme a normas de bioseguridad.
                </p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                BIT-LIM-DES-001
              </span>
            </div>

            {/* SECCIÓN 1: DATOS GENERALES */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-gray-700 border-b pb-2 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                1. Información Operativa y Turno
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={formData.fecha}
                    onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Turno</label>
                  <select
                    value={formData.turno}
                    onChange={e => setFormData({ ...formData, turno: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="Mañana">Mañana (06:00 - 14:00)</option>
                    <option value="Tarde">Tarde (14:00 - 22:00)</option>
                    <option value="Noche">Noche (22:00 - 06:00)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Supervisor Responsable</label>
                  <input
                    type="text"
                    required
                    value={formData.supervisorResponsable}
                    onChange={e => setFormData({ ...formData, supervisorResponsable: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cuadrilla de Operadores</label>
                  <input
                    type="text"
                    required
                    value={formData.cuadrillaOperadores}
                    onChange={e => setFormData({ ...formData, cuadrillaOperadores: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: PARÁMETROS DE LA SOLUCIÓN DESINFECTANTE */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-gray-700 border-b pb-2 mb-4 flex items-center gap-2">
                <Droplets className="w-4 h-4 text-cyan-600" />
                2. Parámetros de Preparación de la Solución Biocida
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-cyan-50/40 p-4 rounded-lg border border-cyan-100">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Producto Químico Biocida</label>
                  <input
                    type="text"
                    required
                    value={formData.productoQuimico}
                    onChange={e => setFormData({ ...formData, productoQuimico: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Lote del Producto</label>
                  <input
                    type="text"
                    required
                    value={formData.loteProducto}
                    onChange={e => setFormData({ ...formData, loteProducto: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Conc. Objetivo (PPM)</label>
                  <input
                    type="number"
                    required
                    value={formData.concentracionObjetivoPpm}
                    onChange={e => setFormData({ ...formData, concentracionObjetivoPpm: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Conc. Medida (PPM)</label>
                  <input
                    type="number"
                    required
                    value={formData.concentracionMedidaPpm}
                    onChange={e => setFormData({ ...formData, concentracionMedidaPpm: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: CONTROL POR ZONAS */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-gray-700 border-b pb-2 mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                3. Matriz de Limpieza y Sanitización por Zonas de Planta
              </h4>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-100 font-semibold text-gray-700">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Área / Zona de Planta</th>
                      <th className="py-2.5 px-3 text-left">Frecuencia</th>
                      <th className="py-2.5 px-3 text-left">Tipo de Acción</th>
                      <th className="py-2.5 px-3 text-center">Hora</th>
                      <th className="py-2.5 px-3 text-center">Estatus</th>
                      <th className="py-2.5 px-3 text-left">Operador Asignado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {(formData.zonas || ZONAS_DEFAULT).map((zona, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="py-2.5 px-3 font-medium text-gray-900">{zona.area}</td>
                        <td className="py-2.5 px-3 text-gray-600">{zona.frecuencia}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            zona.tipoLimpieza === 'Desinfección de Choque' ? 'bg-purple-100 text-purple-800' :
                            zona.tipoLimpieza === 'Limpieza Profunda' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {zona.tipoLimpieza}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="time"
                            value={zona.hora}
                            onChange={e => handleZoneHoraChange(idx, e.target.value)}
                            className="px-2 py-1 text-xs border border-gray-300 rounded"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <select
                            value={zona.estatus}
                            onChange={e => handleZoneStatusChange(idx, e.target.value as any)}
                            className={`px-2 py-1 text-xs font-semibold rounded border ${
                              zona.estatus === 'Conforme' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-red-50 text-red-800 border-red-300'
                            }`}
                          >
                            <option value="Conforme">✓ Conforme</option>
                            <option value="No Conforme">✗ No Conforme</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3 text-gray-700">{zona.operador}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECCIÓN 4: CHECKLIST EPP E INSUMOS */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-gray-700 border-b pb-2 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                4. Verificación de EPP y Disponibilidad de Insumos
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.eppGuantesNitrilo}
                    onChange={e => setFormData({ ...formData, eppGuantesNitrilo: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  Guantes de Nitrilo Gruesos / Alta Resistencia
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.eppBotasImpermeables}
                    onChange={e => setFormData({ ...formData, eppBotasImpermeables: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  Botas de Hule Impermeables con Puntera
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.eppTrajeTyvekMandil}
                    onChange={e => setFormData({ ...formData, eppTrajeTyvekMandil: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  Mandil Impermeable / Traje Tyvek Biológico
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.eppRespiradorVapores}
                    onChange={e => setFormData({ ...formData, eppRespiradorVapores: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  Respirador con Filtros para Vapores Orgánicos/Ácidos
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.eppCaretaFacial}
                    onChange={e => setFormData({ ...formData, eppCaretaFacial: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  Careta Facial Transparente / Goggles de Seguridad
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.panosMopasLímpias}
                    onChange={e => setFormData({ ...formData, panosMopasLímpias: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  Paños y Mopas Limpias / Desinfectadas Exclusivas
                </label>
              </div>
            </div>

            {/* SECCIÓN 5: OBSERVACIONES, DICTAMEN Y FIRMAS */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-gray-700 border-b pb-2 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                5. Novedades, Dictamen y Validación
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Novedades o Desviaciones Encontradas</label>
                  <textarea
                    rows={3}
                    value={formData.desviacionesNovedades}
                    onChange={e => setFormData({ ...formData, desviacionesNovedades: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Describa cualquier novedad ocurrida durante la jornada de sanitización..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Acciones Correctivas Implementadas</label>
                  <textarea
                    rows={3}
                    value={formData.accionesCorrectivas}
                    onChange={e => setFormData({ ...formData, accionesCorrectivas: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Acciones inmediatas ante desviaciones..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-emerald-50/30 p-4 rounded-lg border border-emerald-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Veredicto de Cumplimiento</label>
                  <select
                    value={formData.veredictoCumplimiento}
                    onChange={e => setFormData({ ...formData, veredictoCumplimiento: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm font-bold border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="Cumplimiento Total (100%)">Cumplimiento Total (100%)</option>
                    <option value="Cumplimiento Parcial">Cumplimiento Parcial</option>
                    <option value="No Conforme">No Conforme</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Firma Operador Líder</label>
                  <input
                    type="text"
                    required
                    value={formData.firmaOperadorLider}
                    onChange={e => setFormData({ ...formData, firmaOperadorLider: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Firma Supervisor HSE</label>
                  <input
                    type="text"
                    required
                    value={formData.firmaSupervisorHse}
                    onChange={e => setFormData({ ...formData, firmaSupervisorHse: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Submit button */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Guardar Registro de Limpieza y Desinfección
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: CARGA MASIVA EXCEL */}
        {activeTab === 'carga_excel' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-6 flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div>
                <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  Módulo de Carga Masiva desde Hoja de Cálculo (.xlsx)
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  Suba registros diarios de sanitización por lotes. El sistema valida columnas y almacena los datos en Firestore.
                </p>
              </div>
              <button
                onClick={downloadLimpiezaDesinfeccionPlantaTemplate}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-700 bg-white border border-indigo-300 rounded-md hover:bg-indigo-50 shadow-sm"
              >
                <Download className="w-4 h-4 text-indigo-600" />
                Descargar Plantilla Oficial (.xlsx)
              </button>
            </div>

            <BulkUploadPanel
              tipo="limpieza_desinfeccion_planta"
              userEmail={userEmail}
              onSuccess={() => {
                fetchRegistros();
                setActiveTab('historico');
                setFeedback({ text: '¡Datos de limpieza y desinfección importados exitosamente desde Excel!', type: 'success' });
              }}
            />
          </div>
        )}

        {/* TAB 3: HISTÓRICO */}
        {activeTab === 'historico' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-200">
              <div>
                <h3 className="text-base font-bold text-gray-800">
                  Histórico de Registros de Limpieza y Desinfección
                </h3>
                <p className="text-xs text-gray-500">
                  Total de auditorías y controles sanitarios registrados en planta.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Botón Descargar Seleccionados */}
                <button
                  type="button"
                  onClick={handleDownloadSelectedPDF}
                  disabled={selectedIds.size === 0 || isBulkDownloading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-md transition shadow-xs cursor-pointer"
                  title="Genera y descarga en PDF los registros seleccionados"
                >
                  <FileText className="w-4 h-4" />
                  Descargar Seleccionados ({selectedIds.size})
                </button>

                {/* Botón Descargar Formulario Completo */}
                <button
                  type="button"
                  onClick={handleDownloadAllFormularioPDF}
                  disabled={registros.length === 0 || isBulkDownloading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-md transition shadow-xs cursor-pointer"
                  title="Descarga en PDF todos los registros de este formulario"
                >
                  <Download className="w-4 h-4" />
                  Descargar Formulario PDF ({registros.length})
                </button>

                <button
                  type="button"
                  onClick={exportToExcel}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-md hover:bg-emerald-100 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Exportar Excel
                </button>
                <button
                  type="button"
                  onClick={fetchRegistros}
                  className="p-1.5 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md bg-white hover:bg-gray-50 cursor-pointer"
                  title="Actualizar datos"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Banner de selección activa */}
            {selectedIds.size > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center justify-between text-xs text-blue-900">
                <span className="font-semibold">
                  {selectedIds.size} {selectedIds.size === 1 ? 'registro seleccionado' : 'registros seleccionados'} para generar PDF oficial
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-[11px] text-blue-700 underline font-semibold hover:text-blue-900 cursor-pointer"
                >
                  Deseleccionar todos
                </button>
              </div>
            )}

            {/* Search Filter */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por folio, supervisor, turno o químico..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50 font-semibold text-gray-600">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredRegistros.length > 0 && selectedIds.size === filteredRegistros.length}
                        onChange={handleToggleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                        title="Seleccionar todos"
                      />
                    </th>
                    <th className="py-2.5 px-3 text-left">Folio</th>
                    <th className="py-2.5 px-3 text-left">Fecha</th>
                    <th className="py-2.5 px-3 text-left">Turno</th>
                    <th className="py-2.5 px-3 text-left">Supervisor HSE</th>
                    <th className="py-2.5 px-3 text-left">Producto Químico</th>
                    <th className="py-2.5 px-center text-center">PPM (Obj / Med)</th>
                    <th className="py-2.5 px-3 text-center">Cumplimiento</th>
                    <th className="py-2.5 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredRegistros.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-500 italic">
                        {loading ? 'Cargando registros...' : 'No se encontraron registros de limpieza y desinfección.'}
                      </td>
                    </tr>
                  ) : (
                    filteredRegistros.map(r => (
                      <tr key={r.id} className={`hover:bg-gray-50 ${selectedIds.has(r.id!) ? 'bg-blue-50/40' : ''}`}>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(r.id!)}
                            onChange={() => handleToggleSelect(r.id!)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-gray-900">{r.folio || r.id?.slice(0, 8)}</td>
                        <td className="py-2.5 px-3 text-gray-600">{r.fecha}</td>
                        <td className="py-2.5 px-3 font-semibold text-gray-800">{r.turno}</td>
                        <td className="py-2.5 px-3 text-gray-700">{r.supervisorResponsable || '—'}</td>
                        <td className="py-2.5 px-3 text-gray-700">{r.productoQuimico || '—'}</td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {r.concentracionObjetivoPpm !== '' && r.concentracionObjetivoPpm !== undefined ? r.concentracionObjetivoPpm : '—'} / <span className="font-bold text-emerald-600">{r.concentracionMedidaPpm !== '' && r.concentracionMedidaPpm !== undefined ? r.concentracionMedidaPpm : '—'}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            r.veredictoCumplimiento === 'Cumplimiento Total (100%)' ? 'bg-emerald-100 text-emerald-800' :
                            r.veredictoCumplimiento === 'Cumplimiento Parcial' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {r.veredictoCumplimiento}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setModalRegistro(r)}
                              className="px-2 py-1 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded font-semibold"
                            >
                              Ver
                            </button>
                            <button
                              onClick={() => handleExportPDF(r)}
                              className="p-1 text-gray-500 hover:text-red-600 rounded hover:bg-gray-100"
                              title="Exportar PDF Oficial"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            {isAuthorizedToDelete(userEmail) && (
                              <button
                                onClick={() => r.id && handleDelete(r.id)}
                                className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100"
                                title="Eliminar registro"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Gestor IT Deletion tool */}
            <GestorItDeleteModuleRecords
              collectionName="bitacora_limpieza_desinfeccion_planta"
              moduleTitle="Control Diario de Limpieza y Desinfección de Planta"
              userEmail={userEmail}
              onDeleted={fetchRegistros}
            />
          </div>
        )}

        {/* Modal Detalle */}
        {modalRegistro && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  Detalle del Control de Limpieza — Folio: {modalRegistro.folio || modalRegistro.id}
                </h3>
                <button
                  onClick={() => setModalRegistro(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="font-semibold text-gray-500">Fecha:</span> {modalRegistro.fecha}</div>
                <div><span className="font-semibold text-gray-500">Turno:</span> {modalRegistro.turno}</div>
                <div><span className="font-semibold text-gray-500">Supervisor HSE:</span> {modalRegistro.supervisorResponsable}</div>
                <div><span className="font-semibold text-gray-500">Cuadrilla:</span> {modalRegistro.cuadrillaOperadores}</div>
                <div><span className="font-semibold text-gray-500">Producto Químico:</span> {modalRegistro.productoQuimico}</div>
                <div><span className="font-semibold text-gray-500">Lote Químico:</span> {modalRegistro.loteProducto}</div>
                <div><span className="font-semibold text-gray-500">PPM Objetivo:</span> {modalRegistro.concentracionObjetivoPpm} PPM</div>
                <div><span className="font-semibold text-gray-500">PPM Medida:</span> {modalRegistro.concentracionMedidaPpm} PPM</div>
                <div><span className="font-semibold text-gray-500">Hora de Preparación:</span> {modalRegistro.horaPreparacion}</div>
                <div><span className="font-semibold text-gray-500">Veredicto Cumplimiento:</span> {modalRegistro.veredictoCumplimiento}</div>
              </div>

              <div className="border-t pt-3">
                <span className="font-semibold text-gray-700 text-xs block mb-1">Novedades / Desviaciones:</span>
                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">{modalRegistro.desviacionesNovedades || 'Ninguna registrada'}</p>
              </div>

              <div>
                <span className="font-semibold text-gray-700 text-xs block mb-1">Acciones Correctivas:</span>
                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">{modalRegistro.accionesCorrectivas || 'Ninguna requerida'}</p>
              </div>

              <div className="border-t pt-3 flex justify-between items-center">
                <div className="text-[11px] text-gray-500">
                  Firmas: <strong>{modalRegistro.firmaOperadorLider}</strong> / <strong>{modalRegistro.firmaSupervisorHse}</strong>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExportPDF(modalRegistro)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded flex items-center gap-1.5"
                  >
                    <FileText className="w-4 h-4" />
                    Exportar PDF
                  </button>
                  <button
                    onClick={() => setModalRegistro(null)}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8">
          <FormFooter />
        </div>
      </div>
    </div>
  );
}
