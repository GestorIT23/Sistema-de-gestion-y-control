import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, limit } from 'firebase/firestore';
import type { 
  BitacoraControlCaldera, 
  ParametrosTurnoCaldera, 
  ChecklistMantenimientoCaldera, 
  FilaEventoCaldera 
} from '../../types';
import FormHeader from '../FormHeader';
import FormFooter from '../FormFooter';
import { 
  Flame, 
  Calendar, 
  User, 
  ArrowLeft, 
  Database, 
  ShieldCheck, 
  Info, 
  AlertCircle, 
  FileSpreadsheet, 
  FileText, 
  CheckSquare, 
  Clock, 
  ShieldAlert, 
  MapPin, 
  CheckCircle2, 
  Gauge, 
  Award, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  Search, 
  RefreshCw,
  Droplets,
  Zap,
  Activity,
  Wrench,
  Check,
  X
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';
import { generateAndDownloadExcel } from '../../utils/excelGenerator';
import { sanitizeBiotrashObject } from '../../utils/textSanitizer';
import { isAuthorizedToDelete } from '../../utils/authUtils';
import GestorItDeleteModuleRecords from '../GestorItDeleteModuleRecords';
import DeleteSingleRecordModal from '../DeleteSingleRecordModal';
import { sortRecordsByDateDesc } from '../../utils/dateUtils';

interface Props {
  onBack: () => void;
  userEmail: string;
}

const PRESET_CALDERAS = [
  { id: 'CALD-01', nombre: 'Caldera Pirotubular Principal Cleaver-Brooks 100 HP', modelo: 'CB-100-Packaged', ubicacion: 'Casa de Máquinas y Calderas' },
  { id: 'CALD-02', nombre: 'Caldera Vertical Auxiliar Fulton 60 HP', modelo: 'Fulton Classic-60', ubicacion: 'Nave de Generación Térmica' }
];

const DEFAULT_TURNO_1: ParametrosTurnoCaldera = {
  presionVaporPsi: 105,
  tempAguaAlimentacionC: 85,
  tempGasesChimeneaC: 195,
  nivelAguaVisorOk: true,
  presionCombustibleGasPsi: 35,
  purgaColumnaNivel: true,
  purgaFondoLodos: true,
  dosificacionQuimicosPpm: 1.5,
  tdsConductividadAgua: 2200,
  inspeccionFugasOk: true
};

const DEFAULT_TURNO_2: ParametrosTurnoCaldera = {
  presionVaporPsi: 110,
  tempAguaAlimentacionC: 87,
  tempGasesChimeneaC: 200,
  nivelAguaVisorOk: true,
  presionCombustibleGasPsi: 36,
  purgaColumnaNivel: true,
  purgaFondoLodos: true,
  dosificacionQuimicosPpm: 1.5,
  tdsConductividadAgua: 2350,
  inspeccionFugasOk: true
};

const DEFAULT_CHECKLIST: ChecklistMantenimientoCaldera = {
  limpiezaFiltrosCombustibleTrampasAgua: true,
  limpiezaFotoceldaElectrodoIgnicion: true,
  pruebaParadaBajoNivelAguaCutOff: true,
  inspeccionTrampasVaporRetornoCondensados: true,
  limpiezaMallaVentilacionQuemador: true,

  inspeccionQuemadorBoquillas: true,
  verificacionPresostatosLimiteAlto: true,
  inspeccionTubosGasesRegistroHollin: true,
  inspeccionBombasAlimentacionSellos: true,
  accionamientoManualValvulasSeguridad: true,

  inspeccionLadoAguaDesincrustacion: false,
  limpiezaMecanicaTubosRefractario: false,
  calibracionValvulasSeguridadAcreditado: true,
  analisisGasesCombustionEficiencia: true,
  pruebaHidrostaticaEspesoresNorma: false
};

export default function BitacoraControlCaldera({ onBack, userEmail }: Props) {
  const [activeTab, setActiveTab] = useState<'formulario' | 'historico' | 'analitica'>('formulario');
  const [registros, setRegistros] = useState<BitacoraControlCaldera[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [recordToDelete, setRecordToDelete] = useState<BitacoraControlCaldera | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<'Turno 1' | 'Turno 2' | 'Ambos Turnos'>('Ambos Turnos');
  const [identificacionCaldera, setIdentificacionCaldera] = useState(PRESET_CALDERAS[0].nombre);
  const [operadorResponsable, setOperadorResponsable] = useState(userEmail || 'Operador de Caldera SGI');

  // Turnos data
  const [turno1, setTurno1] = useState<ParametrosTurnoCaldera>(DEFAULT_TURNO_1);
  const [turno2, setTurno2] = useState<ParametrosTurnoCaldera>(DEFAULT_TURNO_2);

  // Checklist
  const [checklist, setChecklist] = useState<ChecklistMantenimientoCaldera>(DEFAULT_CHECKLIST);

  // Events & Maintenance log
  const [eventos, setEventos] = useState<FilaEventoCaldera[]>([]);

  // Comments, Dictamen & Status
  const [comentarios, setComentarios] = useState('Parámetros de vapor, purgas y temperatura de gases dentro de rangos operativos autorizados.');
  const [dictamenTecnico, setDictamenTecnico] = useState('Caldera operando con alta eficiencia y confiabilidad en suministro de vapor a autoclaves.');
  const [estadoOperacional, setEstadoOperacional] = useState<'Operativo / Conforme' | 'Operativo con Mantenimiento Pendiente' | 'Fuera de Servicio / Bloqueado'>('Operativo / Conforme');
  const [firmaResponsable, setFirmaResponsable] = useState(userEmail || 'Operador Calificado de Caldera');
  const [firmaSupervisor, setFirmaSupervisor] = useState('Ing. Manuel López — Gerente de Operaciones');

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'bitacora_control_caldera'), orderBy('fechaRegistro', 'desc'), limit(30));
      const querySnapshot = await getDocs(q);
      const docs: BitacoraControlCaldera[] = [];
      querySnapshot.forEach((docSnap) => {
        const docData = sanitizeBiotrashObject(docSnap.data());
        docs.push({ id: docSnap.id, ...docData } as BitacoraControlCaldera);
      });
      setRegistros(sortRecordsByDateDesc(docs, 'fecha'));
    } catch (e) {
      console.warn('Error fetching caldera records:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvento = () => {
    setEventos(prev => [
      ...prev,
      {
        id: 'EV-' + Date.now(),
        fecha: new Date().toISOString().split('T')[0],
        componente: 'Bomba de Alimentación #1',
        falla: 'Goteo ligero en empaque mecánico',
        accion: 'Ajuste de prensaestopas y lubricación',
        repuesto: 'Empaquetadura trenzada grafito',
        proveedor: 'Servicios Industriales y Bombas S.A.'
      }
    ]);
  };

  const handleRemoveEvento = (index: number) => {
    setEventos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: '', type: '' });

    try {
      const nuevoRegistro: Omit<BitacoraControlCaldera, 'id'> = {
        fecha,
        turnoSeleccionado,
        identificacionCaldera,
        operadorResponsable,
        fechaRegistro: new Date().toISOString(),
        responsable: operadorResponsable,
        observaciones: comentarios,
        turno1,
        turno2,
        checklist,
        eventos,
        comentarios,
        dictamenTecnico,
        estadoOperacional,
        firmaResponsable,
        firmaSupervisor,
        cambioControl: [
          {
            version: '4.2',
            fecha: '24/09/2026',
            seccion: 'Todas',
            cambio: 'Digitalización de Bitácora Diaria de Operación y Control de Caldera',
            solicitante: 'Comité de Mantenimiento y Calderas'
          }
        ]
      };

      const sanitized = sanitizeBiotrashObject(nuevoRegistro);
      const docRef = await addDoc(collection(db, 'bitacora_control_caldera'), sanitized);
      setRegistros(prev => [{ id: docRef.id, ...sanitized } as BitacoraControlCaldera, ...prev]);

      setMsg({ text: '¡Bitácora Diaria de Caldera registrada con éxito en Firestore!', type: 'success' });
    } catch (err) {
      console.error('Error saving caldera record:', err);
      setMsg({ text: 'Error al registrar la bitácora de caldera.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete?.id) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'bitacora_control_caldera', recordToDelete.id));
      setRegistros(prev => prev.filter(r => r.id !== recordToDelete.id));
      setRecordToDelete(null);
      setMsg({ text: 'Registro de caldera eliminado.', type: 'success' });
    } catch (err) {
      console.error('Error deleting record:', err);
      setMsg({ text: 'No se pudo eliminar el registro.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredRegistros = registros.filter(r => 
    (r.identificacionCaldera && r.identificacionCaldera.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.operadorResponsable && r.operadorResponsable.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.fecha && r.fecha.includes(searchTerm)) ||
    (r.estadoOperacional && r.estadoOperacional.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Chart data from records
  const chartData = [...registros].reverse().slice(-10).map(r => ({
    fecha: r.fecha ? r.fecha.slice(5) : '—',
    presionT1: r.turno1?.presionVaporPsi || 0,
    presionT2: r.turno2?.presionVaporPsi || 0,
    tempChimeneaT1: r.turno1?.tempGasesChimeneaC || 0,
    tdsT1: r.turno1?.tdsConductividadAgua || 0
  }));

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 font-sans text-[#1A1C1E]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Tablero SGI
        </button>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg font-bold text-xs flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-600" /> Presión Nominal: 80 - 120 PSI
          </span>
        </div>
      </div>

      <FormHeader 
        titulo="BITÁCORA DIARIA DE OPERACIÓN, CONTROL Y MANTENIMIENTO DE CALDERA"
        codigo="BIOTRASH 4.2. F-OPR-000-23"
        version="1.0"
        fechaElaboracion="24/09/2026"
        fechaVersion="24/09/2026"
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 bg-white rounded-t-xl px-4 pt-2 shadow-xs">
        <button
          onClick={() => setActiveTab('formulario')}
          className={`px-4 py-2.5 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition ${
            activeTab === 'formulario'
              ? 'border-amber-600 text-amber-800 bg-amber-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Gauge className="w-4 h-4 text-amber-600" /> Formulario de Operación & Control
        </button>
        <button
          onClick={() => setActiveTab('historico')}
          className={`px-4 py-2.5 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition ${
            activeTab === 'historico'
              ? 'border-amber-600 text-amber-800 bg-amber-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4 text-slate-600" /> Histórico ({registros.length})
        </button>
        <button
          onClick={() => setActiveTab('analitica')}
          className={`px-4 py-2.5 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition ${
            activeTab === 'analitica'
              ? 'border-amber-600 text-amber-800 bg-amber-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4 text-amber-600" /> Monitoreo Operativo & Indicadores
        </button>
      </div>

      {msg.text && (
        <div className={`mb-4 p-3 rounded-xl border text-xs sm:text-sm flex items-center gap-2 ${
          msg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {activeTab === 'formulario' && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Quick Status Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-500">Presión Turno 1 / 2</p>
                <h3 className="text-xl font-black text-amber-700 mt-0.5">
                  {turno1.presionVaporPsi || 0} / {turno2.presionVaporPsi || 0} PSI
                </h3>
              </div>
              <Gauge className="w-6 h-6 text-amber-600" />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-500">Agua Alimentación</p>
                <h3 className="text-xl font-black text-slate-800 mt-0.5">
                  {turno1.tempAguaAlimentacionC || 0}°C / {turno2.tempAguaAlimentacionC || 0}°C
                </h3>
              </div>
              <Droplets className="w-6 h-6 text-blue-500" />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-500">Gases Chimenea</p>
                <h3 className="text-xl font-black text-orange-600 mt-0.5">
                  {turno1.tempGasesChimeneaC || 0}°C / {turno2.tempGasesChimeneaC || 0}°C
                </h3>
              </div>
              <Flame className="w-6 h-6 text-orange-500" />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-500">Conductividad TDS</p>
                <h3 className={`text-xl font-black ${(turno1.tdsConductividadAgua || 0) < 3000 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {turno1.tdsConductividadAgua || 0} µS/cm
                </h3>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                (turno1.tdsConductividadAgua || 0) < 3000 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {(turno1.tdsConductividadAgua || 0) < 3000 ? 'NORMAL' : 'ALTO'}
              </span>
            </div>
          </div>

          {/* Section 1: Datos Generales */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600" /> 1. Datos Generales de la Bitácora
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha de Registro:</label>
                <input 
                  type="date" 
                  value={fecha} 
                  onChange={e => setFecha(e.target.value)} 
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Turno a Registrar:</label>
                <select
                  value={turnoSeleccionado}
                  onChange={e => setTurnoSeleccionado(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold"
                >
                  <option value="Turno 1">Turno 1</option>
                  <option value="Turno 2">Turno 2</option>
                  <option value="Ambos Turnos">Ambos Turnos (1 y 2)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Identificación Caldera:</label>
                <input 
                  type="text" 
                  list="calderas-list"
                  value={identificacionCaldera} 
                  onChange={e => setIdentificacionCaldera(e.target.value)} 
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold"
                />
                <datalist id="calderas-list">
                  {PRESET_CALDERAS.map(c => (
                    <option key={c.id} value={c.nombre} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Operador Responsable:</label>
                <input 
                  type="text" 
                  value={operadorResponsable} 
                  onChange={e => setOperadorResponsable(e.target.value)} 
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Tabla de Parámetros por Turno (Exactamente del PDF) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-amber-600" /> 1. Bitácora Diaria de Operación y Control
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Este registro debe realizarse al inicio y final de cada turno por el operador a cargo.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                    <th className="p-3">Parámetro / Componente</th>
                    <th className="p-3 w-24">Unidad</th>
                    <th className="p-3 w-36">Referencia</th>
                    <th className="p-3 w-48 text-center bg-amber-50/50">Turno 1</th>
                    <th className="p-3 w-48 text-center bg-blue-50/50">Turno 2</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {/* Presión de Vapor */}
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-800">Presión de Vapor</td>
                    <td className="p-3 text-slate-600 font-mono">PSI</td>
                    <td className="p-3 font-bold text-amber-700">80 - 120</td>
                    <td className="p-2.5 bg-amber-50/20">
                      <input 
                        type="number" 
                        value={turno1.presionVaporPsi ?? ''}
                        onChange={e => setTurno1({ ...turno1, presionVaporPsi: Number(e.target.value) })}
                        placeholder="PSI T1"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-center"
                      />
                    </td>
                    <td className="p-2.5 bg-blue-50/20">
                      <input 
                        type="number" 
                        value={turno2.presionVaporPsi ?? ''}
                        onChange={e => setTurno2({ ...turno2, presionVaporPsi: Number(e.target.value) })}
                        placeholder="PSI T2"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-center"
                      />
                    </td>
                  </tr>

                  {/* Temperatura de Agua de Alimentación */}
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-800">Temperatura de Agua de Alimentación</td>
                    <td className="p-3 text-slate-600 font-mono">°C</td>
                    <td className="p-3 font-bold text-blue-700">80 - 90</td>
                    <td className="p-2.5 bg-amber-50/20">
                      <input 
                        type="number" 
                        value={turno1.tempAguaAlimentacionC ?? ''}
                        onChange={e => setTurno1({ ...turno1, tempAguaAlimentacionC: Number(e.target.value) })}
                        placeholder="°C T1"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-center"
                      />
                    </td>
                    <td className="p-2.5 bg-blue-50/20">
                      <input 
                        type="number" 
                        value={turno2.tempAguaAlimentacionC ?? ''}
                        onChange={e => setTurno2({ ...turno2, tempAguaAlimentacionC: Number(e.target.value) })}
                        placeholder="°C T2"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-center"
                      />
                    </td>
                  </tr>

                  {/* Temperatura Gases Chimenea */}
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-800">Temperatura Gases Chimenea</td>
                    <td className="p-3 text-slate-600 font-mono">°C</td>
                    <td className="p-3 font-bold text-orange-700">180 - 230</td>
                    <td className="p-2.5 bg-amber-50/20">
                      <input 
                        type="number" 
                        value={turno1.tempGasesChimeneaC ?? ''}
                        onChange={e => setTurno1({ ...turno1, tempGasesChimeneaC: Number(e.target.value) })}
                        placeholder="°C T1"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-center"
                      />
                    </td>
                    <td className="p-2.5 bg-blue-50/20">
                      <input 
                        type="number" 
                        value={turno2.tempGasesChimeneaC ?? ''}
                        onChange={e => setTurno2({ ...turno2, tempGasesChimeneaC: Number(e.target.value) })}
                        placeholder="°C T2"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-center"
                      />
                    </td>
                  </tr>

                  {/* Nivel de Agua en Visor */}
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-800">Nivel de Agua en Visor</td>
                    <td className="p-3 text-slate-600">Visual</td>
                    <td className="p-3 font-bold text-slate-700">Normal</td>
                    <td className="p-2.5 text-center bg-amber-50/20">
                      <button
                        type="button"
                        onClick={() => setTurno1({ ...turno1, nivelAguaVisorOk: !turno1.nivelAguaVisorOk })}
                        className={`px-4 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 mx-auto ${
                          turno1.nivelAguaVisorOk ? 'bg-emerald-600 text-white' : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {turno1.nivelAguaVisorOk ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        {turno1.nivelAguaVisorOk ? '[ X ] OK' : '[  ] Falla'}
                      </button>
                    </td>
                    <td className="p-2.5 text-center bg-blue-50/20">
                      <button
                        type="button"
                        onClick={() => setTurno2({ ...turno2, nivelAguaVisorOk: !turno2.nivelAguaVisorOk })}
                        className={`px-4 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 mx-auto ${
                          turno2.nivelAguaVisorOk ? 'bg-emerald-600 text-white' : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {turno2.nivelAguaVisorOk ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        {turno2.nivelAguaVisorOk ? '[ X ] OK' : '[  ] Falla'}
                      </button>
                    </td>
                  </tr>

                  {/* Presión de Combustible / Gas */}
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-800">Presión de Combustible / Gas</td>
                    <td className="p-3 text-slate-600 font-mono">PSI</td>
                    <td className="p-3 font-bold text-slate-700">Según manual</td>
                    <td className="p-2.5 bg-amber-50/20">
                      <input 
                        type="number" 
                        value={turno1.presionCombustibleGasPsi ?? ''}
                        onChange={e => setTurno1({ ...turno1, presionCombustibleGasPsi: Number(e.target.value) })}
                        placeholder="PSI T1"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-center"
                      />
                    </td>
                    <td className="p-2.5 bg-blue-50/20">
                      <input 
                        type="number" 
                        value={turno2.presionCombustibleGasPsi ?? ''}
                        onChange={e => setTurno2({ ...turno2, presionCombustibleGasPsi: Number(e.target.value) })}
                        placeholder="PSI T2"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-center"
                      />
                    </td>
                  </tr>

                  {/* Purga de Columna / Nivel */}
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-800">Purga de Columna / Nivel</td>
                    <td className="p-3 text-slate-600">Operativo</td>
                    <td className="p-3 font-bold text-slate-700">Requerido</td>
                    <td className="p-2.5 text-center bg-amber-50/20">
                      <button
                        type="button"
                        onClick={() => setTurno1({ ...turno1, purgaColumnaNivel: !turno1.purgaColumnaNivel })}
                        className={`px-4 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 mx-auto ${
                          turno1.purgaColumnaNivel ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {turno1.purgaColumnaNivel ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        {turno1.purgaColumnaNivel ? '[ X ] Sí' : '[  ] No'}
                      </button>
                    </td>
                    <td className="p-2.5 text-center bg-blue-50/20">
                      <button
                        type="button"
                        onClick={() => setTurno2({ ...turno2, purgaColumnaNivel: !turno2.purgaColumnaNivel })}
                        className={`px-4 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 mx-auto ${
                          turno2.purgaColumnaNivel ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {turno2.purgaColumnaNivel ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        {turno2.purgaColumnaNivel ? '[ X ] Sí' : '[  ] No'}
                      </button>
                    </td>
                  </tr>

                  {/* Purga de Fondo (Lodos) */}
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-800">Purga de Fondo (Lodos)</td>
                    <td className="p-3 text-slate-600">Operativo</td>
                    <td className="p-3 font-bold text-slate-700">Requerido</td>
                    <td className="p-2.5 text-center bg-amber-50/20">
                      <button
                        type="button"
                        onClick={() => setTurno1({ ...turno1, purgaFondoLodos: !turno1.purgaFondoLodos })}
                        className={`px-4 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 mx-auto ${
                          turno1.purgaFondoLodos ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {turno1.purgaFondoLodos ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        {turno1.purgaFondoLodos ? '[ X ] Sí' : '[  ] No'}
                      </button>
                    </td>
                    <td className="p-2.5 text-center bg-blue-50/20">
                      <button
                        type="button"
                        onClick={() => setTurno2({ ...turno2, purgaFondoLodos: !turno2.purgaFondoLodos })}
                        className={`px-4 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 mx-auto ${
                          turno2.purgaFondoLodos ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {turno2.purgaFondoLodos ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        {turno2.purgaFondoLodos ? '[ X ] Sí' : '[  ] No'}
                      </button>
                    </td>
                  </tr>

                  {/* Dosificación de Químicos */}
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-800">Dosificación de Químicos (Tratamiento)</td>
                    <td className="p-3 text-slate-600 font-mono">PPM / L</td>
                    <td className="p-3 font-bold text-slate-700">1.5 litros/día</td>
                    <td className="p-2.5 bg-amber-50/20">
                      <input 
                        type="number" 
                        step="0.1"
                        value={turno1.dosificacionQuimicosPpm ?? ''}
                        onChange={e => setTurno1({ ...turno1, dosificacionQuimicosPpm: Number(e.target.value) })}
                        placeholder="L/día T1"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-center"
                      />
                    </td>
                    <td className="p-2.5 bg-blue-50/20">
                      <input 
                        type="number" 
                        step="0.1"
                        value={turno2.dosificacionQuimicosPpm ?? ''}
                        onChange={e => setTurno2({ ...turno2, dosificacionQuimicosPpm: Number(e.target.value) })}
                        placeholder="L/día T2"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-center"
                      />
                    </td>
                  </tr>

                  {/* TDS / Conductividad de Agua */}
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-800">TDS / Conductividad de Agua</td>
                    <td className="p-3 text-slate-600 font-mono">µS/cm</td>
                    <td className="p-3 font-bold text-emerald-700">&lt; 3,000</td>
                    <td className="p-2.5 bg-amber-50/20">
                      <input 
                        type="number" 
                        value={turno1.tdsConductividadAgua ?? ''}
                        onChange={e => setTurno1({ ...turno1, tdsConductividadAgua: Number(e.target.value) })}
                        placeholder="µS/cm T1"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-center"
                      />
                    </td>
                    <td className="p-2.5 bg-blue-50/20">
                      <input 
                        type="number" 
                        value={turno2.tdsConductividadAgua ?? ''}
                        onChange={e => setTurno2({ ...turno2, tdsConductividadAgua: Number(e.target.value) })}
                        placeholder="µS/cm T2"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-center"
                      />
                    </td>
                  </tr>

                  {/* Inspección de Fugas (Vapor/Agua/Gas) */}
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-800">Inspección de Fugas (Vapor/Agua/Gas)</td>
                    <td className="p-3 text-slate-600">Visual</td>
                    <td className="p-3 font-bold text-slate-700">Sin fugas</td>
                    <td className="p-2.5 text-center bg-amber-50/20">
                      <button
                        type="button"
                        onClick={() => setTurno1({ ...turno1, inspeccionFugasOk: !turno1.inspeccionFugasOk })}
                        className={`px-4 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 mx-auto ${
                          turno1.inspeccionFugasOk ? 'bg-emerald-600 text-white' : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {turno1.inspeccionFugasOk ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        {turno1.inspeccionFugasOk ? '[ X ] OK' : '[  ] Fuga'}
                      </button>
                    </td>
                    <td className="p-2.5 text-center bg-blue-50/20">
                      <button
                        type="button"
                        onClick={() => setTurno2({ ...turno2, inspeccionFugasOk: !turno2.inspeccionFugasOk })}
                        className={`px-4 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 mx-auto ${
                          turno2.inspeccionFugasOk ? 'bg-emerald-600 text-white' : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {turno2.inspeccionFugasOk ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        {turno2.inspeccionFugasOk ? '[ X ] OK' : '[  ] Fuga'}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Programa de Mantenimiento Preventivo (Checklist) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-600" /> 2. Programa de Mantenimiento Preventivo (Checklist)
            </h3>

            {/* A. Mantenimiento Semanal */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2.5 flex items-center gap-1.5 text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                A. Mantenimiento Semanal
              </h4>
              <div className="space-y-2 text-xs">
                {[
                  { key: 'limpiezaFiltrosCombustibleTrampasAgua', text: 'Filtros de Combustible / Trampas de Agua: Limpieza y drenaje de sedimentos.' },
                  { key: 'limpiezaFotoceldaElectrodoIgnicion', text: 'Fotocelda y Electrodo de Ignición: Limpieza de hollín o residuos acumulados.' },
                  { key: 'pruebaParadaBajoNivelAguaCutOff', text: 'Sistemas de Parada por Bajo Nivel de Agua (Corte Cut-Off): Pruebas de simulación de falla en caliente.' },
                  { key: 'inspeccionTrampasVaporRetornoCondensados', text: 'Trampas de Vapor de Retorno de Condensados: Inspección de ciclo de descarga y retenes.' },
                  { key: 'limpiezaMallaVentilacionQuemador', text: 'Malla de Ventilación del Quemador: Limpieza de polvo para asegurar relación aire/combustible óptima.' },
                ].map(item => (
                  <label key={item.key} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                    <input 
                      type="checkbox"
                      checked={(checklist as any)[item.key]}
                      onChange={e => setChecklist({ ...checklist, [item.key]: e.target.checked })}
                      className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                    />
                    <span className="text-slate-800 font-medium">{item.text}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* B. Mantenimiento Mensual */}
            <div className="pt-2 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2.5 flex items-center gap-1.5 text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                B. Mantenimiento Mensual
              </h4>
              <div className="space-y-2 text-xs">
                {[
                  { key: 'inspeccionQuemadorBoquillas', text: 'Inspección de Quemador y Boquillas: Verificación de patrón de llama, alineación y desgaste de toberas.' },
                  { key: 'verificacionPresostatosLimiteAlto', text: 'Verificación de Presostatos: Ajuste y prueba de disparo de presostato operativo y de límite alto.' },
                  { key: 'inspeccionTubosGasesRegistroHollin', text: 'Inspección de Tubos de Gases: Apertura de tapas de registro para detectar acumulación de hollín o condensados.' },
                  { key: 'inspeccionBombasAlimentacionSellos', text: 'Inspección de Bombas de Alimentación: Revisión de sellos mecánicos, empaquetaduras y lubricación de rodamientos.' },
                  { key: 'accionamientoManualValvulasSeguridad', text: 'Accionamiento Manual de Válvulas de Seguridad: Prueba física del mecanismo de palanca para evitar agarrotamiento.' },
                ].map(item => (
                  <label key={item.key} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                    <input 
                      type="checkbox"
                      checked={(checklist as any)[item.key]}
                      onChange={e => setChecklist({ ...checklist, [item.key]: e.target.checked })}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-slate-800 font-medium">{item.text}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* C. Mantenimiento Semestral / Anual */}
            <div className="pt-2 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2.5 flex items-center gap-1.5 text-purple-800 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200">
                C. Mantenimiento Semestral / Anual
              </h4>
              <div className="space-y-2 text-xs">
                {[
                  { key: 'inspeccionLadoAguaDesincrustacion', text: 'Inspección Lado Agua (Desincrustación): Apertura de tapas de hombre/mira para inspección de depósitos calcáreos y corrosión.' },
                  { key: 'limpiezaMecanicaTubosRefractario', text: 'Limpieza Mecánica de Tubos y Refractario: Deshollinado completo e inspección del estado de refractarios de la cámara de combustión.' },
                  { key: 'calibracionValvulasSeguridadAcreditado', text: 'Calibración de Válvulas de Seguridad: Certificación por laboratorio acreditado.' },
                  { key: 'analisisGasesCombustionEficiencia', text: 'Análisis de Gases de Combustión (Eficiencia): Ajuste de curva de combustión con analizador (CO, CO2, O2, opacidad).' },
                  { key: 'pruebaHidrostaticaEspesoresNorma', text: 'Prueba Hidrostática / Inspección Ultrasónica de Espesores: De acuerdo a la normativa local de recipientes a presión.' },
                ].map(item => (
                  <label key={item.key} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                    <input 
                      type="checkbox"
                      checked={(checklist as any)[item.key]}
                      onChange={e => setChecklist({ ...checklist, [item.key]: e.target.checked })}
                      className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <span className="text-slate-800 font-medium">{item.text}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Registro de Eventos (Página 2 del PDF) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" /> 3. Registro de Eventos y Fallas
              </h3>
              <button
                type="button"
                onClick={handleAddEvento}
                className="px-3 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-lg font-bold text-xs flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Evento
              </button>
            </div>

            {eventos.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg border border-slate-200">
                Sin fallas ni eventos reportados en este ciclo operacional. Caldera operando con normalidad.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2.5 w-28">Fecha</th>
                      <th className="p-2.5">Componente</th>
                      <th className="p-2.5">Falla</th>
                      <th className="p-2.5">Acción</th>
                      <th className="p-2.5">Repuesto</th>
                      <th className="p-2.5">Proveedor</th>
                      <th className="p-2.5 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {eventos.map((ev, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2">
                          <input 
                            type="date" 
                            value={ev.fecha}
                            onChange={e => {
                              const val = e.target.value;
                              setEventos(prev => prev.map((item, i) => i === idx ? { ...item, fecha: val } : item));
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="text" 
                            value={ev.componente}
                            onChange={e => {
                              const val = e.target.value;
                              setEventos(prev => prev.map((item, i) => i === idx ? { ...item, componente: val } : item));
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="text" 
                            value={ev.falla}
                            onChange={e => {
                              const val = e.target.value;
                              setEventos(prev => prev.map((item, i) => i === idx ? { ...item, falla: val } : item));
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="text" 
                            value={ev.accion}
                            onChange={e => {
                              const val = e.target.value;
                              setEventos(prev => prev.map((item, i) => i === idx ? { ...item, accion: val } : item));
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="text" 
                            value={ev.repuesto}
                            onChange={e => {
                              const val = e.target.value;
                              setEventos(prev => prev.map((item, i) => i === idx ? { ...item, repuesto: val } : item));
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="text" 
                            value={ev.proveedor}
                            onChange={e => {
                              const val = e.target.value;
                              setEventos(prev => prev.map((item, i) => i === idx ? { ...item, proveedor: val } : item));
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveEvento(idx)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 5: Comentarios, Dictamen Técnico y Firmas */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" /> 4. Comentarios, Dictamen Técnico y Firmas
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Comentarios:</label>
                <textarea 
                  rows={3}
                  value={comentarios}
                  onChange={e => setComentarios(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dictamen Técnico:</label>
                <textarea 
                  rows={3}
                  value={dictamenTecnico}
                  onChange={e => setDictamenTecnico(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="block font-bold text-slate-700 mb-1">Estado de la Caldera:</label>
                <select
                  value={estadoOperacional}
                  onChange={e => setEstadoOperacional(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-xs"
                >
                  <option value="Operativo / Conforme">Operativo / Conforme</option>
                  <option value="Operativo con Mantenimiento Pendiente">Operativo con Mantenimiento Pendiente</option>
                  <option value="Fuera de Servicio / Bloqueado">Fuera de Servicio / Bloqueado</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="block font-bold text-slate-700 mb-1">Firma Operador Responsable:</label>
                <input 
                  type="text" 
                  value={firmaResponsable}
                  onChange={e => setFirmaResponsable(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-800"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="block font-bold text-slate-700 mb-1">Vo.Bo. Supervisor SGI:</label>
                <input 
                  type="text" 
                  value={firmaSupervisor}
                  onChange={e => setFirmaSupervisor(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-2 text-xs sm:text-sm transition disabled:opacity-50"
            >
              <CheckSquare className="w-4 h-4" /> {saving ? 'Guardando Bitácora...' : 'Guardar Bitácora de Caldera'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: HISTÓRICO */}
      {activeTab === 'historico' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por fecha, caldera, operador o estado..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => generateAndDownloadExcel('control_caldera', { results: registros })}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar Excel
              </button>

              {isAuthorizedToDelete(userEmail) && (
                <GestorItDeleteModuleRecords 
                  collectionName="bitacora_control_caldera"
                  moduleName="Control de Caldera"
                  onDeleted={() => {
                    setRegistros([]);
                    setMsg({ text: 'Registros de caldera eliminados.', type: 'success' });
                  }}
                  userEmail={userEmail}
                />
              )}
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-amber-600" /> Cargando bitácoras de caldera...
            </div>
          ) : filteredRegistros.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs italic bg-slate-50 rounded-xl border border-slate-200">
              No se encontraron registros de operación de calderas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-2.5">Fecha</th>
                    <th className="p-2.5">Caldera</th>
                    <th className="p-2.5">Turno</th>
                    <th className="p-2.5 text-center">Presión T1 / T2</th>
                    <th className="p-2.5 text-center">Temp Chimenea</th>
                    <th className="p-2.5 text-center">TDS Agua</th>
                    <th className="p-2.5">Estado</th>
                    <th className="p-2.5">Operador</th>
                    <th className="p-2.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRegistros.map(reg => (
                    <tr key={reg.id} className="hover:bg-slate-50 transition">
                      <td className="p-2.5 font-mono font-bold text-slate-800">{reg.fecha}</td>
                      <td className="p-2.5 font-semibold text-slate-800">{reg.identificacionCaldera}</td>
                      <td className="p-2.5 text-slate-600">{reg.turnoSeleccionado}</td>
                      <td className="p-2.5 text-center font-bold text-amber-700">
                        {reg.turno1?.presionVaporPsi || 0} / {reg.turno2?.presionVaporPsi || 0} PSI
                      </td>
                      <td className="p-2.5 text-center text-orange-700 font-medium">
                        {reg.turno1?.tempGasesChimeneaC || 0}°C / {reg.turno2?.tempGasesChimeneaC || 0}°C
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          (reg.turno1?.tdsConductividadAgua || 0) < 3000 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {reg.turno1?.tdsConductividadAgua || 0} µS
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          reg.estadoOperacional === 'Operativo / Conforme' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          reg.estadoOperacional === 'Operativo con Mantenimiento Pendiente' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {reg.estadoOperacional}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600">{reg.operadorResponsable}</td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => generateAndDownloadPDF('control_caldera', reg)}
                            title="Descargar PDF Oficial"
                            className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => generateAndDownloadExcel('control_caldera', reg)}
                            title="Descargar Excel"
                            className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </button>
                          {isAuthorizedToDelete(userEmail) && (
                            <button
                              onClick={() => setRecordToDelete(reg)}
                              title="Eliminar Registro"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ANALÍTICA */}
      {activeTab === 'analitica' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-600" /> Histórico de Presión de Vapor vs Rango Nominal (80 - 120 PSI)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis domain={[60, 140]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="presionT1" name="Presión Turno 1 (PSI)" stroke="#D97706" strokeWidth={2} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="presionT2" name="Presión Turno 2 (PSI)" stroke="#2563EB" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="h-48 w-full pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                Conductividad TDS del Agua de Caldera (&lt; 3,000 µS/cm)
              </h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 4000]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="tdsT1" name="TDS (µS/cm)" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-3">Parámetros Críticos SGI</h4>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-800">Presión de Operación</span>
                    <span className="font-mono text-amber-700 font-bold">80 - 120 PSI</span>
                  </div>
                  <p className="text-[11px] text-slate-600">Presión de seguridad para garantizar esterilización adecuada en autoclaves DSH.</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-800">Gases de Chimenea</span>
                    <span className="font-mono text-orange-700 font-bold">180 - 230 °C</span>
                  </div>
                  <p className="text-[11px] text-slate-600">Temperatura controlada para prevenir pérdida excesiva de calor y asegurar combustión limpia.</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-800">Límite de TDS en Agua</span>
                    <span className="font-mono text-emerald-700 font-bold">&lt; 3,000 µS/cm</span>
                  </div>
                  <p className="text-[11px] text-slate-600">Prevención de incrustaciones calcáreas y arrastre de agua con el vapor.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {recordToDelete && (
        <DeleteSingleRecordModal 
          isOpen={!!recordToDelete}
          itemIdentifier={recordToDelete.fecha || recordToDelete.id || ''}
          title="¿Eliminar registro de caldera?"
          description="Esta acción eliminará permanentemente la bitácora de la base de datos."
          isDeleting={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setRecordToDelete(null)}
        />
      )}

      <div className="mt-8">
        <FormFooter 
          elaboroCargo="Operador de Caldera"
          revisoCargo="Jefe de Mantenimiento y Vapor"
          aproboCargo="Gerencia de Operaciones de Planta"
        />
      </div>
    </div>
  );
}
