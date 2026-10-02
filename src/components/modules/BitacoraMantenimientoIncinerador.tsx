import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, limit } from 'firebase/firestore';
import type { BitacoraMantenimientoIncinerador } from '../../types';
import FormHeader from '../FormHeader';
import FormFooter from '../FormFooter';
import BulkUploadPanel from '../BulkUploadPanel';
import * as XLSX from 'xlsx';
import { 
  Flame, 
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
  AlertTriangle, 
  Trash2, 
  Plus, 
  Search, 
  RefreshCw,
  Wrench,
  Download,
  Upload,
  Check,
  X
} from 'lucide-react';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';
import { downloadMantenimientoIncineradorTemplate } from '../../utils/excelGenerator';
import { sanitizeBiotrashObject } from '../../utils/textSanitizer';
import { isAuthorizedToDelete } from '../../utils/authUtils';
import GestorItDeleteModuleRecords from '../GestorItDeleteModuleRecords';

interface Props {
  onBack: () => void;
  userEmail: string;
}

export default function BitacoraMantenimientoIncinerador({ onBack, userEmail }: Props) {
  const [activeTab, setActiveTab] = useState<'formulario' | 'carga_excel' | 'historico'>('formulario');
  const [registros, setRegistros] = useState<BitacoraMantenimientoIncinerador[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalRegistro, setModalRegistro] = useState<BitacoraMantenimientoIncinerador | null>(null);

  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<BitacoraMantenimientoIncinerador>>({
    fecha: new Date().toISOString().split('T')[0],
    equipoId: 'INC-01',
    nombreEquipo: 'Incinerador Industrial de RPBI 01',
    tipoMantenimiento: 'Preventivo Programado',
    horaInicio: '07:30',
    horaFin: '12:00',
    horasOperacion: 4250,
    tecnicoResponsable: userEmail,
    supervisadoPor: 'Ing. Manuel López — Gerente de Planta',
    lotoCandadeo: true,
    temperaturaMenor40: true,
    purgaCorteCombustible: true,
    ventilacionCamaras: true,
    checklistCamaras: {
      revestimientoCamaraPrimaria: 'Bueno',
      revestimientoCamaraSecundaria: 'Bueno',
      sellosPuertas: 'Bueno',
      mirillasInspeccion: 'Bueno',
      estructuraExteriorCarter: 'Bueno'
    },
    checklistCombustion: {
      boquillasInyectores: 'Bueno',
      electrodosIgnicion: 'Bueno',
      detectoresLlama: 'Bueno',
      filtrosCombustible: 'Bueno',
      valvulasSolenoides: 'Bueno',
      valvulaCorteSlamOff: 'Bueno'
    },
    checklistInstrumentacion: {
      termocuplaCamaraPrimaria: 'Bueno',
      termocuplaCamaraSecundaria: 'Bueno',
      manometrosPresion: 'Bueno',
      panelPlcAlarmas: 'Bueno'
    },
    repuestosUtilizados: [
      { cantidad: 1, codigo: 'EMPQ-INC-01', descripcion: 'Empaque de fibra cerámica para compuerta de carga', causaReemplazo: 'Desgaste térmico preventivo' }
    ],
    descripcionTrabajos: 'Limpieza profunda de toberas de quemador principal, calibración de electrodos de chispa y sustitución de empaquetadura de compuerta.',
    pruebasHermeticidad: true,
    pruebasInterlocks: true,
    modulacionLlama: true,
    tempConsignaSecundariaAlcanzada: true,
    tiroNegativoVerificado: true,
    estadoFinal: 'Operativo Conforme',
    firmaTecnico: userEmail,
    firmaSupervisor: 'Ing. Manuel López — Gerente de Planta'
  });

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'bitacora_mantenimiento_incinerador'), orderBy('fecha', 'desc'), limit(100));
      const snap = await getDocs(q);
      const docs: BitacoraMantenimientoIncinerador[] = [];
      snap.forEach(d => {
        docs.push({ id: d.id, ...d.data() } as BitacoraMantenimientoIncinerador);
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
      const folio = `MTO-INC-${Date.now().toString().slice(-6)}`;
      const docData = sanitizeBiotrashObject({
        ...formData,
        folio,
        responsable: formData.tecnicoResponsable || userEmail,
        observaciones: formData.descripcionTrabajos || 'Mantenimiento preventivo registrado'
      });

      await addDoc(collection(db, 'bitacora_mantenimiento_incinerador'), docData);
      setFeedback({ text: `¡Bitácora de mantenimiento guardada exitosamente! Folio: ${folio}`, type: 'success' });
      fetchRegistros();
      setActiveTab('historico');
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ text: `Error al guardar: ${err.message}`, type: 'error' });
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!isAuthorizedToDelete(userEmail)) {
      alert("No cuenta con permisos de Gestor IT o Administrador para eliminar registros.");
      return;
    }
    if (!confirm("¿Está seguro de eliminar esta bitácora de mantenimiento? Esta acción no se puede deshacer.")) return;
    try {
      await deleteDoc(doc(db, 'bitacora_mantenimiento_incinerador', id));
      fetchRegistros();
      if (modalRegistro?.id === id) setModalRegistro(null);
    } catch (err: any) {
      alert("Error al eliminar: " + err.message);
    }
  };

  const handleExportPDF = (targetRecord?: BitacoraMantenimientoIncinerador) => {
    const dataToExport = targetRecord || modalRegistro || (registros.length > 0 ? registros[0] : formData);
    generateAndDownloadPDF('mantenimiento_incinerador', dataToExport);
  };

  const handleExportExcel = () => {
    if (registros.length === 0) {
      alert("No hay registros para exportar.");
      return;
    }
    const data = registros.map(r => ({
      Folio: r.folio || '',
      Fecha: r.fecha,
      Equipo: r.equipoId,
      NombreEquipo: r.nombreEquipo,
      TipoMantenimiento: r.tipoMantenimiento,
      HoraInicio: r.horaInicio,
      HoraFin: r.horaFin,
      HorasOperacion: r.horasOperacion,
      TecnicoResponsable: r.tecnicoResponsable,
      SupervisadoPor: r.supervisadoPor,
      LOTO: r.lotoCandadeo ? 'Si' : 'No',
      TempMenor40: r.temperaturaMenor40 ? 'Si' : 'No',
      EstadoFinal: r.estadoFinal,
      DescripcionTrabajos: r.descripcionTrabajos
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MTO_Incinerador');
    XLSX.writeFile(wb, `Mantenimiento_Incinerador_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredRegistros = registros.filter(r => {
    const q = searchTerm.toLowerCase();
    return (
      r.folio?.toLowerCase().includes(q) ||
      r.equipoId?.toLowerCase().includes(q) ||
      r.tipoMantenimiento?.toLowerCase().includes(q) ||
      r.tecnicoResponsable?.toLowerCase().includes(q) ||
      r.fecha?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold text-xs sm:text-sm px-3 py-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Tablero SGI
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            type="button"
            onClick={downloadMantenimientoIncineradorTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold text-xs shadow-xs transition cursor-pointer"
            title="Descargar modelo / plantilla oficial en Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" /> Descargar Modelo (.xlsx)
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('carga_excel')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg font-bold text-xs shadow-xs transition cursor-pointer"
            title="Subir archivo Excel con registros masivos"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" /> Subir Archivo Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar Excel
          </button>
        </div>
      </div>

      {/* Official SGI Header */}
      <FormHeader
        titulo="BITÁCORA DE MANTENIMIENTO PREVENTIVO Y CORRECTIVO - INCINERADOR RPBI"
        codigo="BIOTRASH 4.2. BIT-MTO-INC-001"
        version="1.2"
        fechaVersion="28/09/2026"
      />

      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
            : 'bg-red-50 text-red-800 border-red-300'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Navigation tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('formulario')}
          className={`px-4 py-2.5 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'formulario'
              ? 'border-orange-600 text-orange-700 bg-orange-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wrench className="w-4 h-4 text-orange-600" /> Formulario de Mantenimiento
        </button>
        <button
          onClick={() => setActiveTab('carga_excel')}
          className={`px-4 py-2.5 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'carga_excel'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Carga Manual / Masiva Excel
        </button>
        <button
          onClick={() => setActiveTab('historico')}
          className={`px-4 py-2.5 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'historico'
              ? 'border-orange-600 text-orange-700 bg-orange-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4 text-orange-600" /> Histórico de Mantenimientos ({registros.length})
        </button>
      </div>

      {/* TAB 1: FORMULARIO OFICIAL */}
      {activeTab === 'formulario' && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-b-xl p-6 shadow-sm space-y-8">
          {/* 1. Registro General del Servicio */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase text-orange-800 tracking-wider flex items-center gap-2 border-b border-orange-200 pb-2">
              <Info className="w-4 h-4 text-orange-600" /> 1. Registro General del Servicio y Equipo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fecha del Servicio</label>
                <input 
                  type="date" 
                  value={formData.fecha}
                  onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-slate-50"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Equipo ID</label>
                <select 
                  value={formData.equipoId}
                  onChange={e => setFormData({ 
                    ...formData, 
                    equipoId: e.target.value,
                    nombreEquipo: e.target.value === 'INC-02' ? 'Incinerador Pirolítico Industrial 02' : 'Incinerador Pirolítico Industrial 01'
                  })}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="INC-01">INC-01 — Incinerador Primario</option>
                  <option value="INC-02">INC-02 — Incinerador Secundario</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Mantenimiento</label>
                <select 
                  value={formData.tipoMantenimiento}
                  onChange={e => setFormData({ ...formData, tipoMantenimiento: e.target.value as any })}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Preventivo Programado">Preventivo Programado</option>
                  <option value="Correctivo">Correctivo</option>
                  <option value="Emergencia">Emergencia</option>
                  <option value="Calibración e Instrumentación">Calibración e Instrumentación</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Horómetro Actual (hrs)</label>
                <input 
                  type="number" 
                  value={formData.horasOperacion}
                  onChange={e => setFormData({ ...formData, horasOperacion: Number(e.target.value) })}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hora Inicio</label>
                <input 
                  type="time" 
                  value={formData.horaInicio}
                  onChange={e => setFormData({ ...formData, horaInicio: e.target.value })}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hora Fin</label>
                <input 
                  type="time" 
                  value={formData.horaFin}
                  onChange={e => setFormData({ ...formData, horaFin: e.target.value })}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Técnico / Responsable</label>
                <input 
                  type="text" 
                  value={formData.tecnicoResponsable}
                  onChange={e => setFormData({ ...formData, tecnicoResponsable: e.target.value })}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Supervisado Por</label>
                <input 
                  type="text" 
                  value={formData.supervisadoPor}
                  onChange={e => setFormData({ ...formData, supervisadoPor: e.target.value })}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>

          {/* 2. Protocolo de Seguridad Previo (LOTO) */}
          <div className="space-y-4 bg-amber-50/50 p-4 rounded-xl border border-amber-200">
            <h3 className="text-sm font-black uppercase text-amber-900 tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" /> 2. Protocolo de Seguridad Previo al Trabajo (LOTO y Riesgo Térmico)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.lotoCandadeo}
                  onChange={e => setFormData({ ...formData, lotoCandadeo: e.target.checked })}
                  className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                />
                <span className="font-semibold text-slate-800">Candadeo y Etiquetado LOTO activado</span>
              </label>
              <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.temperaturaMenor40}
                  onChange={e => setFormData({ ...formData, temperaturaMenor40: e.target.checked })}
                  className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                />
                <span className="font-semibold text-slate-800">Temp interna &lt; 40 °C verificada</span>
              </label>
              <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.purgaCorteCombustible}
                  onChange={e => setFormData({ ...formData, purgaCorteCombustible: e.target.checked })}
                  className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                />
                <span className="font-semibold text-slate-800">Purga y corte combustible gas/diésel</span>
              </label>
              <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.ventilacionCamaras}
                  onChange={e => setFormData({ ...formData, ventilacionCamaras: e.target.checked })}
                  className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                />
                <span className="font-semibold text-slate-800">Ventilación forzada de cámaras realizada</span>
              </label>
            </div>
          </div>

          {/* 3. Checklist de Inspección y Mantenimiento */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> 3. Checklist de Inspección Técnica
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Sección A: Cámaras y Refractarios */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <h4 className="text-xs font-black uppercase text-orange-900">A. Cámaras y Refractarios</h4>
                {['revestimientoCamaraPrimaria', 'revestimientoCamaraSecundaria', 'sellosPuertas', 'mirillasInspeccion', 'estructuraExteriorCarter'].map((field) => (
                  <div key={field} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 capitalize">{field.replace(/([A-Z])/g, ' $1')}</span>
                    <select
                      value={(formData.checklistCamaras as any)?.[field] || 'Bueno'}
                      onChange={e => setFormData({
                        ...formData,
                        checklistCamaras: {
                          ...formData.checklistCamaras!,
                          [field]: e.target.value
                        }
                      })}
                      className="text-xs font-semibold p-1 border border-slate-300 rounded bg-white"
                    >
                      <option value="Bueno">Bueno</option>
                      <option value="Regular">Regular</option>
                      <option value="Malo">Malo</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </div>
                ))}
              </div>

              {/* Sección B: Combustión y Quemadores */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <h4 className="text-xs font-black uppercase text-orange-900">B. Combustión y Quemadores</h4>
                {['boquillasInyectores', 'electrodosIgnicion', 'detectoresLlama', 'filtrosCombustible', 'valvulasSolenoides', 'valvulaCorteSlamOff'].map((field) => (
                  <div key={field} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 capitalize">{field.replace(/([A-Z])/g, ' $1')}</span>
                    <select
                      value={(formData.checklistCombustion as any)?.[field] || 'Bueno'}
                      onChange={e => setFormData({
                        ...formData,
                        checklistCombustion: {
                          ...formData.checklistCombustion!,
                          [field]: e.target.value
                        }
                      })}
                      className="text-xs font-semibold p-1 border border-slate-300 rounded bg-white"
                    >
                      <option value="Bueno">Bueno</option>
                      <option value="Regular">Regular</option>
                      <option value="Malo">Malo</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </div>
                ))}
              </div>

              {/* Sección C: Instrumentación y Control */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <h4 className="text-xs font-black uppercase text-orange-900">C. Instrumentación y Control</h4>
                {['termocuplaCamaraPrimaria', 'termocuplaCamaraSecundaria', 'manometrosPresion', 'panelPlcAlarmas'].map((field) => (
                  <div key={field} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 capitalize">{field.replace(/([A-Z])/g, ' $1')}</span>
                    <select
                      value={(formData.checklistInstrumentacion as any)?.[field] || 'Bueno'}
                      onChange={e => setFormData({
                        ...formData,
                        checklistInstrumentacion: {
                          ...formData.checklistInstrumentacion!,
                          [field]: e.target.value
                        }
                      })}
                      className="text-xs font-semibold p-1 border border-slate-300 rounded bg-white"
                    >
                      <option value="Bueno">Bueno</option>
                      <option value="Regular">Regular</option>
                      <option value="Malo">Malo</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Descripción de Trabajos y Repuestos */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
              <Wrench className="w-4 h-4 text-orange-600" /> 4. Descripción de Trabajos Realizados y Repuestos
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Procedimiento Detallado de Mantenimiento</label>
              <textarea 
                rows={3}
                value={formData.descripcionTrabajos}
                onChange={e => setFormData({ ...formData, descripcionTrabajos: e.target.value })}
                className="w-full text-xs font-medium p-2.5 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-orange-500"
                placeholder="Describa el trabajo ejecutado, anomalías encontradas y acciones correctivas aplicadas..."
              />
            </div>
          </div>

          {/* 5. Pruebas de Arranque y Veredicto */}
          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 5. Pruebas de Arranque y Verificación Operativa
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.pruebasHermeticidad}
                  onChange={e => setFormData({ ...formData, pruebasHermeticidad: e.target.checked })}
                  className="rounded text-emerald-600 w-4 h-4"
                />
                <span className="font-semibold text-slate-700">Hermeticidad</span>
              </label>
              <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.pruebasInterlocks}
                  onChange={e => setFormData({ ...formData, pruebasInterlocks: e.target.checked })}
                  className="rounded text-emerald-600 w-4 h-4"
                />
                <span className="font-semibold text-slate-700">Interlocks / Alarmas</span>
              </label>
              <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.modulacionLlama}
                  onChange={e => setFormData({ ...formData, modulacionLlama: e.target.checked })}
                  className="rounded text-emerald-600 w-4 h-4"
                />
                <span className="font-semibold text-slate-700">Modulación de Llama</span>
              </label>
              <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.tempConsignaSecundariaAlcanzada}
                  onChange={e => setFormData({ ...formData, tempConsignaSecundariaAlcanzada: e.target.checked })}
                  className="rounded text-emerald-600 w-4 h-4"
                />
                <span className="font-semibold text-slate-700">Temp Sec &gt; 1000 °C</span>
              </label>
              <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.tiroNegativoVerificado}
                  onChange={e => setFormData({ ...formData, tiroNegativoVerificado: e.target.checked })}
                  className="rounded text-emerald-600 w-4 h-4"
                />
                <span className="font-semibold text-slate-700">Tiro Negativo Verificado</span>
              </label>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Estado Final de Operatividad</label>
                <select 
                  value={formData.estadoFinal}
                  onChange={e => setFormData({ ...formData, estadoFinal: e.target.value as any })}
                  className="text-xs font-black p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Operativo Conforme">Operativo Conforme</option>
                  <option value="Operativo con Observaciones">Operativo con Observaciones</option>
                  <option value="Fuera de Servicio">Fuera de Servicio (Bloqueo LOTO Activo)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Guardar Bitácora de Mantenimiento
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: CARGA MASIVA / POR EXCEL */}
      {activeTab === 'carga_excel' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-orange-950 via-slate-900 to-slate-950 text-white p-6 rounded-2xl shadow-md border border-orange-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/20 text-orange-300 border border-orange-400/30 uppercase tracking-wider mb-2">
                <FileSpreadsheet className="w-3.5 h-3.5" /> Módulo de Carga Masiva Oficial SGI
              </span>
              <h3 className="text-xl font-black text-white">Importación de Mantenimiento de Incinerador RPBI</h3>
              <p className="text-xs text-slate-300 max-w-2xl mt-1">
                Descargue la plantilla estandarizada en Excel (.xlsx), complete los registros de servicios preventivos y correctivos del incinerador y súbala para sincronizarla directamente en la base de datos oficial SGI.
              </p>
            </div>
            <button
              type="button"
              onClick={downloadMantenimientoIncineradorTemplate}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md transition whitespace-nowrap cursor-pointer"
            >
              <Download className="w-4 h-4" /> Descargar Modelo de Carga (.xlsx)
            </button>
          </div>

          <BulkUploadPanel
            tipo="mantenimiento_incinerador"
            userEmail={userEmail}
            onSuccess={() => {
              fetchRegistros();
              setActiveTab('historico');
            }}
          />
        </div>
      )}

      {/* TAB 3: HISTÓRICO */}
      {activeTab === 'historico' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por folio, equipo, técnico, tipo de mantenimiento o fecha..."
                className="w-full text-xs font-semibold pl-9 pr-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
              />
            </div>
            <button
              onClick={fetchRegistros}
              className="p-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              title="Recargar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Folio</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Equipo</th>
                  <th className="p-3">Tipo Mantenimiento</th>
                  <th className="p-3">Horas Op.</th>
                  <th className="p-3">Técnico</th>
                  <th className="p-3">Estado Final</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRegistros.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400 font-medium">
                      No se encontraron registros de mantenimiento registrados.
                    </td>
                  </tr>
                ) : (
                  filteredRegistros.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-mono font-bold text-orange-800">{r.folio || 'S/N'}</td>
                      <td className="p-3 font-semibold">{r.fecha}</td>
                      <td className="p-3 font-semibold">{r.equipoId}</td>
                      <td className="p-3">{r.tipoMantenimiento}</td>
                      <td className="p-3">{r.horasOperacion} hrs</td>
                      <td className="p-3">{r.tecnicoResponsable}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.estadoFinal === 'Operativo Conforme'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.estadoFinal === 'Operativo con Observaciones'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {r.estadoFinal}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          onClick={() => setModalRegistro(r)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold transition cursor-pointer"
                        >
                          Ver
                        </button>
                        <button
                          onClick={() => handleExportPDF(r)}
                          className="px-2 py-1 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 rounded text-[11px] font-bold transition cursor-pointer"
                          title="Descargar PDF Oficial"
                        >
                          <FileText className="w-3.5 h-3.5 inline text-red-600 mr-0.5" /> PDF
                        </button>
                        {isAuthorizedToDelete(userEmail) && (
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded text-[11px] font-bold transition cursor-pointer"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Detalle */}
      {modalRegistro && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-mono text-orange-700 font-bold uppercase tracking-wider">{modalRegistro.folio}</span>
                <h4 className="text-base font-black text-slate-900">{modalRegistro.nombreEquipo}</h4>
              </div>
              <button 
                onClick={() => setModalRegistro(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500 block">Fecha:</span>
                <span className="font-bold text-slate-800">{modalRegistro.fecha}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500 block">Horario:</span>
                <span className="font-bold text-slate-800">{modalRegistro.horaInicio} - {modalRegistro.horaFin}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500 block">Horómetro:</span>
                <span className="font-bold text-slate-800">{modalRegistro.horasOperacion} hrs</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500 block">Tipo:</span>
                <span className="font-bold text-slate-800">{modalRegistro.tipoMantenimiento}</span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <span className="font-bold text-slate-700">Trabajos Realizados:</span>
              <p className="p-3 bg-slate-50 rounded-lg border text-slate-800 leading-relaxed font-medium">
                {modalRegistro.descripcionTrabajos || 'Sin descripción detallada registrada.'}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => handleExportPDF(modalRegistro)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" /> Descargar PDF
              </button>
              <button
                onClick={() => setModalRegistro(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IT Bulk Deletion Tool */}
      <GestorItDeleteModuleRecords
        collectionName="bitacora_mantenimiento_incinerador"
        moduleName="Bitácora de Mantenimiento Incinerador RPBI"
        userEmail={userEmail}
        onDeleted={fetchRegistros}
      />

      {/* Official SGI Footer */}
      <FormFooter />
    </div>
  );
}
