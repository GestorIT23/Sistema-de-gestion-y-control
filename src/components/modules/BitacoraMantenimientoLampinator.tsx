import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, limit } from 'firebase/firestore';
import type { BitacoraMantenimientoLampinator } from '../../types';
import FormHeader from '../FormHeader';
import FormFooter from '../FormFooter';
import BulkUploadPanel from '../BulkUploadPanel';
import * as XLSX from 'xlsx';
import { 
  Zap, 
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
  Wrench,
  Download,
  Upload,
  Check,
  X,
  Gauge
} from 'lucide-react';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';
import { downloadMantenimientoLampinatorTemplate } from '../../utils/excelGenerator';
import { sanitizeBiotrashObject } from '../../utils/textSanitizer';
import { isAuthorizedToDelete } from '../../utils/authUtils';
import GestorItDeleteModuleRecords from '../GestorItDeleteModuleRecords';

interface Props {
  onBack: () => void;
  userEmail: string;
}

export default function BitacoraMantenimientoLampinator({ onBack, userEmail }: Props) {
  const [activeTab, setActiveTab] = useState<'formulario' | 'carga_excel' | 'historico'>('formulario');
  const [registros, setRegistros] = useState<BitacoraMantenimientoLampinator[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalRegistro, setModalRegistro] = useState<BitacoraMantenimientoLampinator | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<BitacoraMantenimientoLampinator>>({
    fecha: new Date().toISOString().split('T')[0],
    equipoId: 'LAMP-01',
    nombreEquipo: 'Máquina Desmercurizadora / Recicladora Lampinator 01',
    tipoMantenimiento: 'Preventivo Programado',
    horaInicio: '08:00',
    horaFin: '11:00',
    horometro: 1850,
    tecnicoResponsable: userEmail,
    operadorTurno: 'Carlos Rodas (Operador Planta)',
    mascarillaVaporHg: true,
    pruebaFugaVaporHgPpm: 0.002,
    protocoloLoto: true,
    checklistFiltracion: {
      diferencialPresionHepa: 'Conforme',
      moduloCarbonActivadoHg: 'Conforme',
      prefiltrosPolvo: 'Conforme'
    },
    checklistMecanico: {
      desgasteMartillosCuchillas: 'Conforme',
      hermeticidadEmpaquesTolva: 'Conforme'
    },
    checklistExtraccion: {
      nivelLlenadoTamborVidrio: 'Conforme',
      inspeccionManguerasSuccion: 'Conforme'
    },
    checklistSeguridad: {
      parosEmergenciaInterlocks: 'Conforme',
      medidoresDepresionVacio: 'Conforme'
    },
    repuestosUtilizados: [
      { cantidad: 1, codigo: 'FILT-HG-PRE', repuesto: 'Prefiltro de partículas de fósforo', causa: 'Saturación programada de horas' }
    ],
    observaciones: 'Reemplazo preventivo de prefiltros y verificación de hermeticidad de sellos de compuerta sin detección de fugas de mercurio.',
    estadoFinal: 'Operativo Conforme',
    firmaTecnico: userEmail,
    firmaSupervisor: 'Ing. Manuel López — Gerente de Planta'
  });

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'bitacora_mantenimiento_lampinator'), orderBy('fecha', 'desc'), limit(100));
      const snap = await getDocs(q);
      const docs: BitacoraMantenimientoLampinator[] = [];
      snap.forEach(d => {
        docs.push({ id: d.id, ...d.data() } as BitacoraMantenimientoLampinator);
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
      const folio = `MTO-LAMP-${Date.now().toString().slice(-6)}`;
      const docData = sanitizeBiotrashObject({
        ...formData,
        folio,
        responsable: formData.tecnicoResponsable || userEmail
      });

      await addDoc(collection(db, 'bitacora_mantenimiento_lampinator'), docData);
      setFeedback({ text: `¡Mantenimiento Lampinator guardado exitosamente! Folio: ${folio}`, type: 'success' });
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
      await deleteDoc(doc(db, 'bitacora_mantenimiento_lampinator', id));
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
    generateAndDownloadPDF('mantenimiento_lampinator', registros[0]);
  };

  const handleExportExcel = () => {
    if (registros.length === 0) {
      alert("No hay registros para exportar.");
      return;
    }
    const data = registros.map(r => ({
      Folio: r.folio || '',
      Fecha: r.fecha,
      TipoMantenimiento: r.tipoMantenimiento,
      Horometro: r.horometro,
      TecnicoResponsable: r.tecnicoResponsable,
      OperadorTurno: r.operadorTurno,
      MascarillaVaporHg: r.mascarillaVaporHg ? 'Si' : 'No',
      FugaVaporHgPpm: r.pruebaFugaVaporHgPpm,
      FiltroHEPA: r.checklistFiltracion?.diferencialPresionHepa,
      ModuloCarbonActivadoHg: r.checklistFiltracion?.moduloCarbonActivadoHg,
      EstadoFinal: r.estadoFinal,
      Observaciones: r.observaciones
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MTO_Lampinator');
    XLSX.writeFile(wb, `Mantenimiento_Lampinator_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredRegistros = registros.filter(r => {
    const q = searchTerm.toLowerCase();
    return (
      r.folio?.toLowerCase().includes(q) ||
      r.tecnicoResponsable?.toLowerCase().includes(q) ||
      r.tipoMantenimiento?.toLowerCase().includes(q) ||
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
            onClick={downloadMantenimientoLampinatorTemplate}
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
        titulo="BITÁCORA DE MANTENIMIENTO: MÁQUINA LAMPINATOR (RECICLAJE HG)"
        codigo="BIOTRASH 4.2. BIT-MTO-LAMP-001"
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
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wrench className="w-4 h-4 text-indigo-600" /> Formulario de Mantenimiento
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
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4 text-indigo-600" /> Histórico ({registros.length})
        </button>
      </div>

      {/* TAB 1: FORMULARIO */}
      {activeTab === 'formulario' && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-b-xl p-6 shadow-sm space-y-8">
          {/* 1. Datos Generales */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase text-indigo-900 tracking-wider flex items-center gap-2 border-b border-indigo-200 pb-2">
              <Info className="w-4 h-4 text-indigo-600" /> 1. Datos del Servicio y Operación
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Mantenimiento</label>
                <select 
                  value={formData.tipoMantenimiento}
                  onChange={e => setFormData({ ...formData, tipoMantenimiento: e.target.value as any })}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Preventivo Programado">Preventivo Programado</option>
                  <option value="Correctivo">Correctivo</option>
                  <option value="Emergencia">Emergencia</option>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Operador de Turno</label>
                <input 
                  type="text" 
                  value={formData.operadorTurno}
                  onChange={e => setFormData({ ...formData, operadorTurno: e.target.value })}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Supervisor</label>
                <input 
                  type="text" 
                  value={formData.firmaSupervisor}
                  onChange={e => setFormData({ ...formData, firmaSupervisor: e.target.value })}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>

          {/* 2. Control Bioseguridad y Exposición Mercurio */}
          <div className="space-y-4 bg-purple-50/50 p-4 rounded-xl border border-purple-200">
            <h3 className="text-sm font-black uppercase text-purple-900 tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-600" /> 2. Control de Bioseguridad y Exposición a Mercurio (Hg)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-purple-200 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.mascarillaVaporHg}
                  onChange={e => setFormData({ ...formData, mascarillaVaporHg: e.target.checked })}
                  className="rounded text-purple-600 w-4 h-4"
                />
                <span className="font-semibold text-slate-800">Mascarilla con cartuchos vapor Hg (3M 6009)</span>
              </label>

              <div className="p-2 bg-white rounded-lg border border-purple-200">
                <label className="block font-semibold text-slate-700 mb-1">Detección Fuga Vapor Mercurio (mg/m³ o ppm)</label>
                <input 
                  type="number" 
                  step="0.001"
                  value={formData.pruebaFugaVaporHgPpm}
                  onChange={e => setFormData({ ...formData, pruebaFugaVaporHgPpm: Number(e.target.value) })}
                  className="w-full font-bold p-1 border rounded bg-slate-50"
                />
              </div>

              <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-purple-200 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.protocoloLoto}
                  onChange={e => setFormData({ ...formData, protocoloLoto: e.target.checked })}
                  className="rounded text-purple-600 w-4 h-4"
                />
                <span className="font-semibold text-slate-800">Bloqueo Eléctrico y LOTO aplicado</span>
              </label>
            </div>
          </div>

          {/* 3. Checklist Técnico */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> 3. Checklist de Mantenimiento y Filtración
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border space-y-2">
                <span className="font-bold text-indigo-900 block">Filtración</span>
                <label className="flex justify-between items-center">
                  <span>Presión Dif. HEPA</span>
                  <select 
                    value={formData.checklistFiltracion?.diferencialPresionHepa}
                    onChange={e => setFormData({
                      ...formData,
                      checklistFiltracion: { ...formData.checklistFiltracion!, diferencialPresionHepa: e.target.value }
                    })}
                    className="p-1 border rounded bg-white font-bold"
                  >
                    <option value="Conforme">Conforme</option>
                    <option value="No Conforme">No Conforme</option>
                  </select>
                </label>
                <label className="flex justify-between items-center">
                  <span>Carbón Activado Hg</span>
                  <select 
                    value={formData.checklistFiltracion?.moduloCarbonActivadoHg}
                    onChange={e => setFormData({
                      ...formData,
                      checklistFiltracion: { ...formData.checklistFiltracion!, moduloCarbonActivadoHg: e.target.value }
                    })}
                    className="p-1 border rounded bg-white font-bold"
                  >
                    <option value="Conforme">Conforme</option>
                    <option value="No Conforme">No Conforme</option>
                  </select>
                </label>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border space-y-2">
                <span className="font-bold text-indigo-900 block">Trituración</span>
                <label className="flex justify-between items-center">
                  <span>Desgaste Martillos</span>
                  <select 
                    value={formData.checklistMecanico?.desgasteMartillosCuchillas}
                    onChange={e => setFormData({
                      ...formData,
                      checklistMecanico: { ...formData.checklistMecanico!, desgasteMartillosCuchillas: e.target.value }
                    })}
                    className="p-1 border rounded bg-white font-bold"
                  >
                    <option value="Conforme">Conforme</option>
                    <option value="No Conforme">No Conforme</option>
                  </select>
                </label>
                <label className="flex justify-between items-center">
                  <span>Sellos Tolva</span>
                  <select 
                    value={formData.checklistMecanico?.hermeticidadEmpaquesTolva}
                    onChange={e => setFormData({
                      ...formData,
                      checklistMecanico: { ...formData.checklistMecanico!, hermeticidadEmpaquesTolva: e.target.value }
                    })}
                    className="p-1 border rounded bg-white font-bold"
                  >
                    <option value="Conforme">Conforme</option>
                    <option value="No Conforme">No Conforme</option>
                  </select>
                </label>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border space-y-2">
                <span className="font-bold text-indigo-900 block">Extracción</span>
                <label className="flex justify-between items-center">
                  <span>Nivel Tambor Vidrio</span>
                  <select 
                    value={formData.checklistExtraccion?.nivelLlenadoTamborVidrio}
                    onChange={e => setFormData({
                      ...formData,
                      checklistExtraccion: { ...formData.checklistExtraccion!, nivelLlenadoTamborVidrio: e.target.value }
                    })}
                    className="p-1 border rounded bg-white font-bold"
                  >
                    <option value="Conforme">Conforme</option>
                    <option value="No Conforme">No Conforme</option>
                  </select>
                </label>
                <label className="flex justify-between items-center">
                  <span>Mangueras Succión</span>
                  <select 
                    value={formData.checklistExtraccion?.inspeccionManguerasSuccion}
                    onChange={e => setFormData({
                      ...formData,
                      checklistExtraccion: { ...formData.checklistExtraccion!, inspeccionManguerasSuccion: e.target.value }
                    })}
                    className="p-1 border rounded bg-white font-bold"
                  >
                    <option value="Conforme">Conforme</option>
                    <option value="No Conforme">No Conforme</option>
                  </select>
                </label>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border space-y-2">
                <span className="font-bold text-indigo-900 block">Seguridad Eléctrica</span>
                <label className="flex justify-between items-center">
                  <span>Paros Emergencia</span>
                  <select 
                    value={formData.checklistSeguridad?.parosEmergenciaInterlocks}
                    onChange={e => setFormData({
                      ...formData,
                      checklistSeguridad: { ...formData.checklistSeguridad!, parosEmergenciaInterlocks: e.target.value }
                    })}
                    className="p-1 border rounded bg-white font-bold"
                  >
                    <option value="Conforme">Conforme</option>
                    <option value="No Conforme">No Conforme</option>
                  </select>
                </label>
                <label className="flex justify-between items-center">
                  <span>Medidores Vacío</span>
                  <select 
                    value={formData.checklistSeguridad?.medidoresDepresionVacio}
                    onChange={e => setFormData({
                      ...formData,
                      checklistSeguridad: { ...formData.checklistSeguridad!, medidoresDepresionVacio: e.target.value }
                    })}
                    className="p-1 border rounded bg-white font-bold"
                  >
                    <option value="Conforme">Conforme</option>
                    <option value="No Conforme">No Conforme</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          {/* 4. Observaciones y Estado */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
              <Wrench className="w-4 h-4 text-indigo-600" /> 4. Observaciones y Recomendaciones
            </h3>
            <div>
              <textarea 
                rows={3}
                value={formData.observaciones}
                onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
                className="w-full text-xs font-medium p-2.5 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
                placeholder="Detalle de trabajos realizados, estado de sellos, etc..."
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Estado Final de Operación</label>
                <select 
                  value={formData.estadoFinal}
                  onChange={e => setFormData({ ...formData, estadoFinal: e.target.value as any })}
                  className="text-xs font-black p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Operativo Conforme">Operativo Conforme</option>
                  <option value="Operativo Condicionado">Operativo Condicionado</option>
                  <option value="Fuera de Servicio">Fuera de Servicio (Bloqueo LOTO)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Guardar Bitácora Lampinator
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: CARGA MASIVA */}
      {activeTab === 'carga_excel' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 text-white p-6 rounded-2xl shadow-md border border-indigo-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 uppercase tracking-wider mb-2">
                <FileSpreadsheet className="w-3.5 h-3.5" /> Módulo de Carga Masiva Oficial SGI
              </span>
              <h3 className="text-xl font-black text-white">Importación de Mantenimiento Máquina Lampinator</h3>
              <p className="text-xs text-slate-300 max-w-2xl mt-1">
                Descargue la plantilla estandarizada en Excel (.xlsx), complete los registros de servicios preventivos y correctivos de la máquina Lampinator y súbala para sincronizarla en Firestore.
              </p>
            </div>
            <button
              type="button"
              onClick={downloadMantenimientoLampinatorTemplate}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md transition whitespace-nowrap cursor-pointer"
            >
              <Download className="w-4 h-4" /> Descargar Modelo de Carga (.xlsx)
            </button>
          </div>

          <BulkUploadPanel
            tipo="mantenimiento_lampinator"
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
                placeholder="Buscar por folio, fecha, técnico..."
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
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Horómetro</th>
                  <th className="p-3">Fuga Hg PPM</th>
                  <th className="p-3">Técnico</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRegistros.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400 font-medium">
                      No se encontraron registros de mantenimiento.
                    </td>
                  </tr>
                ) : (
                  filteredRegistros.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-mono font-bold text-indigo-800">{r.folio || 'S/N'}</td>
                      <td className="p-3 font-semibold">{r.fecha}</td>
                      <td className="p-3">{r.tipoMantenimiento}</td>
                      <td className="p-3">{r.horometro} hrs</td>
                      <td className="p-3 font-mono font-bold">{r.pruebaFugaVaporHgPpm ?? 0} ppm</td>
                      <td className="p-3">{r.tecnicoResponsable}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.estadoFinal === 'Operativo Conforme'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
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
                <span className="text-[10px] font-mono text-indigo-700 font-bold uppercase">{modalRegistro.folio}</span>
                <h4 className="text-base font-black text-slate-900">{modalRegistro.nombreEquipo}</h4>
              </div>
              <button onClick={() => setModalRegistro(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 bg-slate-50 rounded">
                <span className="text-slate-500 block">Fecha:</span>
                <span className="font-bold">{modalRegistro.fecha}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded">
                <span className="text-slate-500 block">Horómetro:</span>
                <span className="font-bold">{modalRegistro.horometro} hrs</span>
              </div>
              <div className="p-2 bg-slate-50 rounded">
                <span className="text-slate-500 block">Fuga Hg PPM:</span>
                <span className="font-bold text-purple-700">{modalRegistro.pruebaFugaVaporHgPpm ?? 0} ppm</span>
              </div>
              <div className="p-2 bg-slate-50 rounded">
                <span className="text-slate-500 block">Estado:</span>
                <span className="font-bold">{modalRegistro.estadoFinal}</span>
              </div>
            </div>

            <div className="text-xs space-y-1">
              <span className="font-bold text-slate-700">Observaciones:</span>
              <p className="p-3 bg-slate-50 rounded border text-slate-800">{modalRegistro.observaciones || 'Sin observaciones adicionales.'}</p>
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
        collectionName="bitacora_mantenimiento_lampinator"
        moduleName="Bitácora de Mantenimiento Máquina Lampinator"
        userEmail={userEmail}
        onDeleted={fetchRegistros}
      />

      {/* Footer */}
      <FormFooter />
    </div>
  );
}
