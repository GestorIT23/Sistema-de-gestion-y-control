import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, limit } from 'firebase/firestore';
import type { BitacoraMantenimientoAutoclaves } from '../../types';
import FormHeader from '../FormHeader';
import FormFooter from '../FormFooter';
import BulkUploadPanel from '../BulkUploadPanel';
import * as XLSX from 'xlsx';
import { 
  ShieldCheck, 
  Calendar, 
  User, 
  ArrowLeft, 
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
  Wrench,
  Download,
  Upload,
  Check,
  X,
  Gauge,
  Thermometer,
  Layers
} from 'lucide-react';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';
import { downloadMantenimientoAutoclavesTemplate } from '../../utils/excelGenerator';
import { sanitizeBiotrashObject } from '../../utils/textSanitizer';
import { isAuthorizedToDelete } from '../../utils/authUtils';
import GestorItDeleteModuleRecords from '../GestorItDeleteModuleRecords';

interface Props {
  onBack: () => void;
  userEmail: string;
}

export default function BitacoraMantenimientoAutoclaves({ onBack, userEmail }: Props) {
  const [activeTab, setActiveTab] = useState<'formulario' | 'carga_excel' | 'historico'>('formulario');
  const [registros, setRegistros] = useState<BitacoraMantenimientoAutoclaves[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalRegistro, setModalRegistro] = useState<BitacoraMantenimientoAutoclaves | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<BitacoraMantenimientoAutoclaves>>({
    fecha: new Date().toISOString().split('T')[0],
    turno: 'Turno 1',
    equipoId: 'AUTO CLAVE 1',
    tipoMantenimiento: 'Preventivo Periódico',
    horometro: 6120,
    tecnicoResponsable: userEmail,
    presionVaporCalderaPsi: 75,
    presionCamaraPsi: 35,
    temperaturaC: 134,
    tiempoCicloMin: 50,
    pruebaVacioResultado: 'Conforme',
    drenajeCondensadosTrampa: 'Conforme',
    estadoEmpaquePuerta: 'Excelente',
    valvulasSeguridadAlivio: 'Bueno',
    manometrosCalibracion: 'Bueno',
    transmisoresPt100: 'Bueno',
    filtroCanastaDescarga: 'Limpio',
    engraseBrazosCierre: 'Realizado',
    descripcionIntervencion: 'Limpieza de filtro canasta de descarga, prueba de vacío y verificación de hermeticidad con empaque nuevo.',
    repuestosCalibraciones: 'Empaque de silicón para autoclave de 1.80m de diámetro',
    estadoFinal: 'Operativa al 100%',
    firmaTecnico: userEmail,
    firmaSupervisor: 'Ing. Manuel López — Gerente de Planta'
  });

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'bitacora_mantenimiento_autoclaves'), orderBy('fecha', 'desc'), limit(100));
      const snap = await getDocs(q);
      const docs: BitacoraMantenimientoAutoclaves[] = [];
      snap.forEach(d => {
        docs.push({ id: d.id, ...d.data() } as BitacoraMantenimientoAutoclaves);
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
      const folio = `MTO-AUTO-${Date.now().toString().slice(-6)}`;
      const docData = sanitizeBiotrashObject({
        ...formData,
        folio,
        responsable: formData.tecnicoResponsable || userEmail,
        observaciones: formData.descripcionIntervencion || 'Mantenimiento preventivo de autoclave'
      });

      await addDoc(collection(db, 'bitacora_mantenimiento_autoclaves'), docData);
      setFeedback({ text: `¡Mantenimiento de Autoclave guardado con éxito! Folio: ${folio}`, type: 'success' });
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
    if (!confirm("¿Está seguro de eliminar esta bitácora?")) return;
    try {
      await deleteDoc(doc(db, 'bitacora_mantenimiento_autoclaves', id));
      fetchRegistros();
      if (modalRegistro?.id === id) setModalRegistro(null);
    } catch (err: any) {
      alert("Error al eliminar: " + err.message);
    }
  };

  const handleExportPDF = () => {
    if (registros.length === 0) {
      alert("No hay registros para exportar.");
      return;
    }
    generateAndDownloadPDF('mantenimiento_autoclaves', registros[0]);
  };

  const handleExportExcel = () => {
    if (registros.length === 0) {
      alert("No hay registros para exportar.");
      return;
    }
    const data = registros.map(r => ({
      Folio: r.folio || '',
      Fecha: r.fecha,
      Turno: r.turno,
      Autoclave: r.equipoId,
      TipoMantenimiento: r.tipoMantenimiento,
      Horometro: r.horometro,
      TecnicoResponsable: r.tecnicoResponsable,
      PresionVaporPsi: r.presionVaporCalderaPsi,
      PresionCamaraPsi: r.presionCamaraPsi,
      TemperaturaC: r.temperaturaC,
      TiempoCicloMin: r.tiempoCicloMin,
      PruebaVacio: r.pruebaVacioResultado,
      EmpaquePuerta: r.estadoEmpaquePuerta,
      EstadoFinal: r.estadoFinal,
      Intervencion: r.descripcionIntervencion
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MTO_Autoclaves');
    XLSX.writeFile(wb, `Mantenimiento_Autoclaves_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredRegistros = registros.filter(r => {
    const q = searchTerm.toLowerCase();
    return (
      r.folio?.toLowerCase().includes(q) ||
      r.equipoId?.toLowerCase().includes(q) ||
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
            onClick={downloadMantenimientoAutoclavesTemplate}
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
        titulo="BITÁCORA DE MANTENIMIENTO Y CONTROL DE AUTOCLAVES (DSH)"
        codigo="BIOTRASH 4.2. BIT-MTO-AUTO-001"
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
              ? 'border-blue-600 text-blue-800 bg-blue-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wrench className="w-4 h-4 text-blue-600" /> Formulario de Mantenimiento
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
              ? 'border-blue-600 text-blue-800 bg-blue-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4 text-blue-600" /> Histórico ({registros.length})
        </button>
      </div>

      {/* TAB 1: FORMULARIO */}
      {activeTab === 'formulario' && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-b-xl p-6 shadow-sm space-y-8">
          {/* 1. Datos Generales */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase text-blue-900 tracking-wider flex items-center gap-2 border-b border-blue-200 pb-2">
              <Info className="w-4 h-4 text-blue-600" /> 1. Datos de Identificación y Parámetros Operativos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fecha</label>
                <input 
                  type="date" 
                  value={formData.fecha}
                  onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-slate-50"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Turno</label>
                <select 
                  value={formData.turno}
                  onChange={e => setFormData({ ...formData, turno: e.target.value as any })}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Turno 1">Turno 1 (Matutino)</option>
                  <option value="Turno 2">Turno 2 (Vespertino)</option>
                  <option value="Turno 3">Turno 3 (Nocturno)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Autoclave Tag</label>
                <select 
                  value={formData.equipoId}
                  onChange={e => setFormData({ ...formData, equipoId: e.target.value as any })}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="AUTO CLAVE 1">AUTO CLAVE 1 (Capacidad Mayor)</option>
                  <option value="AUTO CLAVE 2">AUTO CLAVE 2 (Intermedia)</option>
                  <option value="AUTO CLAVE 3">AUTO CLAVE 3 (Reserva Operativa)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Horómetro (hrs)</label>
                <input 
                  type="number" 
                  value={formData.horometro}
                  onChange={e => setFormData({ ...formData, horometro: Number(e.target.value) })}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Mantenimiento</label>
                <select 
                  value={formData.tipoMantenimiento}
                  onChange={e => setFormData({ ...formData, tipoMantenimiento: e.target.value as any })}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Inspección Operativa Turno">Inspección Operativa Turno</option>
                  <option value="Preventivo Periódico">Preventivo Periódico</option>
                  <option value="Correctivo y Calibración">Correctivo y Calibración</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Técnico Responsable</label>
                <input 
                  type="text" 
                  value={formData.tecnicoResponsable}
                  onChange={e => setFormData({ ...formData, tecnicoResponsable: e.target.value })}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Presión Vapor Caldera (PSI)</label>
                <input 
                  type="number" 
                  value={formData.presionVaporCalderaPsi}
                  onChange={e => setFormData({ ...formData, presionVaporCalderaPsi: Number(e.target.value) })}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Temperatura Cámara (°C)</label>
                <input 
                  type="number" 
                  value={formData.temperaturaC}
                  onChange={e => setFormData({ ...formData, temperaturaC: Number(e.target.value) })}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>

          {/* 2. Inspección Técnica y Calibración */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" /> 2. Checklist Técnico de Autoclave
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border space-y-2">
                <span className="font-bold text-slate-800 block">Estanqueidad y Presión</span>
                <label className="flex justify-between items-center">
                  <span>Prueba de Vacío:</span>
                  <select 
                    value={formData.pruebaVacioResultado}
                    onChange={e => setFormData({ ...formData, pruebaVacioResultado: e.target.value as any })}
                    className="p-1 border rounded bg-white font-bold"
                  >
                    <option value="Conforme">Conforme (-0.8 bar)</option>
                    <option value="No Conforme">Fuga en vacío</option>
                  </select>
                </label>
                <label className="flex justify-between items-center">
                  <span>Drenaje Condensados:</span>
                  <select 
                    value={formData.drenajeCondensadosTrampa}
                    onChange={e => setFormData({ ...formData, drenajeCondensadosTrampa: e.target.value as any })}
                    className="p-1 border rounded bg-white font-bold"
                  >
                    <option value="Conforme">Conforme / Desazolve OK</option>
                    <option value="No Conforme">Obstruido</option>
                  </select>
                </label>
                <label className="flex justify-between items-center">
                  <span>Empaque de Compuerta:</span>
                  <select 
                    value={formData.estadoEmpaquePuerta}
                    onChange={e => setFormData({ ...formData, estadoEmpaquePuerta: e.target.value as any })}
                    className="p-1 border rounded bg-white font-bold"
                  >
                    <option value="Excelente">Excelente</option>
                    <option value="Bueno">Bueno</option>
                    <option value="Desgastado">Desgastado</option>
                    <option value="Fuga Detectada">Fuga Detectada</option>
                  </select>
                </label>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border space-y-2">
                <span className="font-bold text-slate-800 block">Seguridad y Alivio</span>
                <label className="flex justify-between items-center">
                  <span>Válvula de Alivio:</span>
                  <select 
                    value={formData.valvulasSeguridadAlivio}
                    onChange={e => setFormData({ ...formData, valvulasSeguridadAlivio: e.target.value })}
                    className="p-1 border rounded bg-white font-bold"
                  >
                    <option value="Bueno">Bueno / Prueba Disparo OK</option>
                    <option value="Regular">Regular</option>
                    <option value="Malo">Malo / Fuga</option>
                  </select>
                </label>
                <label className="flex justify-between items-center">
                  <span>Manómetros Calibrados:</span>
                  <select 
                    value={formData.manometrosCalibracion}
                    onChange={e => setFormData({ ...formData, manometrosCalibracion: e.target.value })}
                    className="p-1 border rounded bg-white font-bold"
                  >
                    <option value="Bueno">Bueno / Calibrado</option>
                    <option value="Regular">Desviación &lt; 2 psi</option>
                    <option value="Malo">Descalibrado</option>
                  </select>
                </label>
                <label className="flex justify-between items-center">
                  <span>Sensor Temp PT100:</span>
                  <select 
                    value={formData.transmisoresPt100}
                    onChange={e => setFormData({ ...formData, transmisoresPt100: e.target.value })}
                    className="p-1 border rounded bg-white font-bold"
                  >
                    <option value="Bueno">Bueno / Precisión ±0.5°C</option>
                    <option value="Regular">Regular</option>
                    <option value="Malo">Falla señal</option>
                  </select>
                </label>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border space-y-2">
                <span className="font-bold text-slate-800 block">Limpieza y Mecánica</span>
                <label className="flex justify-between items-center">
                  <span>Filtro Canasta:</span>
                  <select 
                    value={formData.filtroCanastaDescarga}
                    onChange={e => setFormData({ ...formData, filtroCanastaDescarga: e.target.value })}
                    className="p-1 border rounded bg-white font-bold"
                  >
                    <option value="Limpio">Limpio sin residuos</option>
                    <option value="Obstruido">Obstruido</option>
                  </select>
                </label>
                <label className="flex justify-between items-center">
                  <span>Engrase Brazos Cierre:</span>
                  <select 
                    value={formData.engraseBrazosCierre}
                    onChange={e => setFormData({ ...formData, engraseBrazosCierre: e.target.value })}
                    className="p-1 border rounded bg-white font-bold"
                  >
                    <option value="Realizado">Realizado</option>
                    <option value="Pendiente">Pendiente</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          {/* 3. Intervenciones y Dictamen */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
              <Wrench className="w-4 h-4 text-blue-600" /> 3. Detalle de Intervenciones y Calibraciones
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Descripción Técnica del Servicio</label>
              <textarea 
                rows={3}
                value={formData.descripcionIntervencion}
                onChange={e => setFormData({ ...formData, descripcionIntervencion: e.target.value })}
                className="w-full text-xs font-medium p-2.5 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-blue-500"
                placeholder="Detalle de trabajos, cambio de empaque, limpieza de trampa de vapor..."
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Estado Final de Operatividad</label>
                <select 
                  value={formData.estadoFinal}
                  onChange={e => setFormData({ ...formData, estadoFinal: e.target.value as any })}
                  className="text-xs font-black p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Operativa al 100%">Operativa al 100%</option>
                  <option value="Observaciones Menores">Operativa con Observaciones Menores</option>
                  <option value="Fuera de Servicio">Fuera de Servicio (Bloqueo LOTO)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Guardar Bitácora de Autoclave
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: CARGA MASIVA */}
      {activeTab === 'carga_excel' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-slate-950 text-white p-6 rounded-2xl shadow-md border border-blue-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider mb-2">
                <FileSpreadsheet className="w-3.5 h-3.5" /> Módulo de Carga Masiva Oficial SGI
              </span>
              <h3 className="text-xl font-black text-white">Importación de Mantenimiento de Autoclaves DSH</h3>
              <p className="text-xs text-slate-300 max-w-2xl mt-1">
                Descargue la plantilla estandarizada en Excel (.xlsx), complete los registros de servicios preventivos, correctivos y calibraciones de autoclave y súbala para sincronizarla en Firestore.
              </p>
            </div>
            <button
              type="button"
              onClick={downloadMantenimientoAutoclavesTemplate}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md transition whitespace-nowrap cursor-pointer"
            >
              <Download className="w-4 h-4" /> Descargar Modelo de Carga (.xlsx)
            </button>
          </div>

          <BulkUploadPanel
            tipo="mantenimiento_autoclaves"
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
                placeholder="Buscar por folio, autoclave, fecha..."
                className="w-full text-xs font-semibold pl-9 pr-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
              />
            </div>
            <button
              onClick={fetchRegistros}
              className="p-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
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
                  <th className="p-3">Autoclave</th>
                  <th className="p-3">Turno</th>
                  <th className="p-3">Presión Vapor</th>
                  <th className="p-3">Temp °C</th>
                  <th className="p-3">Técnico</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRegistros.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-400 font-medium">
                      No se encontraron registros de mantenimiento.
                    </td>
                  </tr>
                ) : (
                  filteredRegistros.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-mono font-bold text-blue-800">{r.folio || 'S/N'}</td>
                      <td className="p-3 font-semibold">{r.fecha}</td>
                      <td className="p-3 font-bold">{r.equipoId}</td>
                      <td className="p-3">{r.turno}</td>
                      <td className="p-3">{r.presionVaporCalderaPsi} PSI</td>
                      <td className="p-3 font-mono">{r.temperaturaC} °C</td>
                      <td className="p-3">{r.tecnicoResponsable}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.estadoFinal === 'Operativa al 100%'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.estadoFinal === 'Observaciones Menores'
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
                        {isAuthorizedToDelete(userEmail) && (
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded text-[11px] font-bold transition cursor-pointer"
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

      {/* Modal */}
      {modalRegistro && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-mono text-blue-700 font-bold uppercase">{modalRegistro.folio}</span>
                <h4 className="text-base font-black text-slate-900">{modalRegistro.equipoId}</h4>
              </div>
              <button onClick={() => setModalRegistro(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2 bg-slate-50 rounded">
                <span className="text-slate-500 block">Fecha:</span>
                <span className="font-bold">{modalRegistro.fecha}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded">
                <span className="text-slate-500 block">Presión Vapor:</span>
                <span className="font-bold">{modalRegistro.presionVaporCalderaPsi} PSI</span>
              </div>
              <div className="p-2 bg-slate-50 rounded">
                <span className="text-slate-500 block">Temperatura:</span>
                <span className="font-bold text-blue-700">{modalRegistro.temperaturaC} °C</span>
              </div>
              <div className="p-2 bg-slate-50 rounded">
                <span className="text-slate-500 block">Estado:</span>
                <span className="font-bold">{modalRegistro.estadoFinal}</span>
              </div>
            </div>

            <div className="text-xs space-y-1">
              <span className="font-bold text-slate-700">Trabajos y Calibraciones:</span>
              <p className="p-3 bg-slate-50 rounded border text-slate-800">{modalRegistro.descripcionIntervencion || 'Sin detalles registrados.'}</p>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button onClick={() => setModalRegistro(null)} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IT Bulk Deletion Tool */}
      <GestorItDeleteModuleRecords
        collectionName="bitacora_mantenimiento_autoclaves"
        moduleName="Bitácora de Mantenimiento Autoclaves DSH"
        userEmail={userEmail}
        onDeleted={fetchRegistros}
      />

      {/* Footer */}
      <FormFooter />
    </div>
  );
}
