import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, limit } from 'firebase/firestore';
import type { Evaluacion360TunelLavado, ItemEvaluacion360, AccionCorrectiva360 } from '../../types';
import FormHeader from '../FormHeader';
import FormFooter from '../FormFooter';
import { 
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
  Droplets, 
  Gauge, 
  Award, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  Search, 
  RefreshCw,
  Flame,
  Layers,
  Activity,
  Compass
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer 
} from 'recharts';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';
import { generateAndDownloadExcel } from '../../utils/excelGenerator';
import { sanitizeBiotrashObject } from '../../utils/textSanitizer';
import { isAuthorizedToDelete } from '../../utils/authUtils';
import GestorItDeleteModuleRecords from '../GestorItDeleteModuleRecords';
import DeleteSingleRecordModal from '../DeleteSingleRecordModal';
import { sortRecordsByDateDesc } from '../../utils/dateUtils';
import { 
  EQUIPOS_TUNEL_LAVADO, 
  DEFAULT_ITEMS_TUNEL_LAVADO, 
  calculateCategoryScore, 
  calculateEvaluationSummary 
} from '../../utils/evaluacion360Data';

interface Props {
  onBack: () => void;
  userEmail: string;
  onNavigateToEquipment?: (equipmentModulo: string) => void;
}

export default function BitacoraEvaluacion360TunelLavado({ onBack, userEmail, onNavigateToEquipment }: Props) {
  const [activeTab, setActiveTab] = useState<'formulario' | 'historico' | 'analitica'>('formulario');
  const [categoryTab, setCategoryTab] = useState<'seguridad' | 'mecanico' | 'hidraulicoCombustion' | 'electricoControl' | 'bioseguridadLimpieza' | 'operatividad'>('seguridad');
  
  const [registros, setRegistros] = useState<Evaluacion360TunelLavado[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [recordToDelete, setRecordToDelete] = useState<Evaluacion360TunelLavado | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form general state
  const [folio, setFolio] = useState(() => 'EV360-TUN-' + Math.floor(1000 + Math.random() * 9000));
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [turno, setTurno] = useState<'Matutino' | 'Vespertino' | 'Nocturno'>('Matutino');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(EQUIPOS_TUNEL_LAVADO[0]);
  const [horometroActual, setHorometroActual] = useState(2490);
  const [operadorAsignado, setOperadorAsignado] = useState('Carlos Eduardo Gómez (Operador Túnel de Lavado)');
  const [inspectorSgi, setInspectorSgi] = useState(userEmail || 'Auditor SGI Bioseguridad');
  const [observacionesGenerales, setObservacionesGenerales] = useState('Evaluación 360 integral de túnel hidrolavador de contenedores y roll-offs bajo norma ISO 14001.');

  // Equipment specific operational parameters
  const [presionBombaLavadoPsi, setPresionBombaLavadoPsi] = useState(1850);
  const [ppmDesinfectante, setPpmDesinfectante] = useState(200);
  const [temperaturaAguaC, setTemperaturaAguaC] = useState(60);
  const [velocidadCadenaMetrosMin, setVelocidadCadenaMetrosMin] = useState(3.5);
  const [quimicoDosificado, setQuimicoDosificado] = useState('Amonio Cuaternario 5ta Gen / Ácido Peracético');

  // Dynamic evaluation items
  const [itemsSeguridad, setItemsSeguridad] = useState<ItemEvaluacion360[]>(DEFAULT_ITEMS_TUNEL_LAVADO.seguridad);
  const [itemsMecanico, setItemsMecanico] = useState<ItemEvaluacion360[]>(DEFAULT_ITEMS_TUNEL_LAVADO.mecanico);
  const [itemsHidraulicoCombustion, setItemsHidraulicoCombustion] = useState<ItemEvaluacion360[]>(DEFAULT_ITEMS_TUNEL_LAVADO.hidraulicoCombustion);
  const [itemsElectricoControl, setItemsElectricoControl] = useState<ItemEvaluacion360[]>(DEFAULT_ITEMS_TUNEL_LAVADO.electricoControl);
  const [itemsBioseguridadLimpieza, setItemsBioseguridadLimpieza] = useState<ItemEvaluacion360[]>(DEFAULT_ITEMS_TUNEL_LAVADO.bioseguridadLimpieza);
  const [itemsOperatividad, setItemsOperatividad] = useState<ItemEvaluacion360[]>(DEFAULT_ITEMS_TUNEL_LAVADO.operatividad);

  // Corrective Actions Plan
  const [accionesCorrectivas, setAccionesCorrectivas] = useState<AccionCorrectiva360[]>([]);

  // Signatures
  const [firmaInspector, setFirmaInspector] = useState(userEmail || 'Auditor SGI Líder');
  const [firmaOperador, setFirmaOperador] = useState('Carlos Eduardo Gómez');
  const [firmaSupervisor, setFirmaSupervisor] = useState('Ing. Manuel López — Gerente de Planta');

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'bitacora_evaluacion_360_tunel_lavado'), orderBy('fechaRegistro', 'desc'), limit(30));
      const querySnapshot = await getDocs(q);
      const docs: Evaluacion360TunelLavado[] = [];
      querySnapshot.forEach((docSnap) => {
        const docData = sanitizeBiotrashObject(docSnap.data());
        docs.push({ id: docSnap.id, ...docData } as Evaluacion360TunelLavado);
      });
      setRegistros(sortRecordsByDateDesc(docs, 'fecha'));
    } catch (e) {
      console.warn('Error fetching 360 tunel lavado records:', e);
    } finally {
      setLoading(false);
    }
  };

  // Scores computation
  const scoreSeguridad = calculateCategoryScore(itemsSeguridad);
  const scoreMecanico = calculateCategoryScore(itemsMecanico);
  const scoreHidraulico = calculateCategoryScore(itemsHidraulicoCombustion);
  const scoreElectrico = calculateCategoryScore(itemsElectricoControl);
  const scoreBioseguridad = calculateCategoryScore(itemsBioseguridadLimpieza);
  const scoreOperatividad = calculateCategoryScore(itemsOperatividad);

  const allItems = [
    ...itemsSeguridad,
    ...itemsMecanico,
    ...itemsHidraulicoCombustion,
    ...itemsElectricoControl,
    ...itemsBioseguridadLimpieza,
    ...itemsOperatividad
  ];

  const summary = calculateEvaluationSummary({
    seguridad: scoreSeguridad,
    mecanico: scoreMecanico,
    hidraulicoCombustion: scoreHidraulico,
    electricoControl: scoreElectrico,
    bioseguridadLimpieza: scoreBioseguridad,
    operatividad: scoreOperatividad
  }, allItems);

  const handleItemRatingChange = (
    category: 'seguridad' | 'mecanico' | 'hidraulicoCombustion' | 'electricoControl' | 'bioseguridadLimpieza' | 'operatividad',
    idx: number,
    rating: number
  ) => {
    const updater = (prev: ItemEvaluacion360[]) => {
      const copy = [...prev];
      const target = copy[idx];
      target.calificacion = rating;
      if (rating >= 4) target.estado = 'Conforme';
      else if (rating === 3) target.estado = 'Observación';
      else target.estado = 'Crítico';
      return copy;
    };

    if (category === 'seguridad') setItemsSeguridad(updater);
    else if (category === 'mecanico') setItemsMecanico(updater);
    else if (category === 'hidraulicoCombustion') setItemsHidraulicoCombustion(updater);
    else if (category === 'electricoControl') setItemsElectricoControl(updater);
    else if (category === 'bioseguridadLimpieza') setItemsBioseguridadLimpieza(updater);
    else if (category === 'operatividad') setItemsOperatividad(updater);
  };

  const handleItemHallazgoChange = (
    category: 'seguridad' | 'mecanico' | 'hidraulicoCombustion' | 'electricoControl' | 'bioseguridadLimpieza' | 'operatividad',
    idx: number,
    text: string
  ) => {
    const updater = (prev: ItemEvaluacion360[]) => {
      const copy = [...prev];
      copy[idx].hallazgo = text;
      return copy;
    };

    if (category === 'seguridad') setItemsSeguridad(updater);
    else if (category === 'mecanico') setItemsMecanico(updater);
    else if (category === 'hidraulicoCombustion') setItemsHidraulicoCombustion(updater);
    else if (category === 'electricoControl') setItemsElectricoControl(updater);
    else if (category === 'bioseguridadLimpieza') setItemsBioseguridadLimpieza(updater);
    else if (category === 'operatividad') setItemsOperatividad(updater);
  };

  const handleAddAccion = () => {
    setAccionesCorrectivas(prev => [
      ...prev,
      {
        id: 'AC-' + Date.now(),
        itemAfectado: 'Boquillas / Presión',
        descripcionDesviacion: 'Boquillas inferiores con calcificación ligera',
        accionPropuesta: 'Limpieza con desincrustante y alineación de toberas de aspersión',
        responsableEjecucion: 'Técnico de Mantenimiento / Operador Túnel',
        plazoDias: 1,
        prioridad: 'Media',
        estado: 'Pendiente'
      }
    ]);
  };

  const handleRemoveAccion = (index: number) => {
    setAccionesCorrectivas(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: '', type: '' });

    try {
      const nuevoRegistro: Omit<Evaluacion360TunelLavado, 'id'> = {
        folio,
        equipoId: equipoSeleccionado.id,
        nombreEquipo: equipoSeleccionado.nombre,
        modeloSerie: `${equipoSeleccionado.modelo} | S/N: ${equipoSeleccionado.serie}`,
        ubicacionPlanta: equipoSeleccionado.ubicacion,
        fecha,
        turno,
        horometroActual: Number(horometroActual) || 0,
        operadorAsignado,
        inspectorSgi,
        fechaRegistro: new Date().toISOString(),
        responsable: inspectorSgi,
        observaciones: observacionesGenerales,
        observacionesGenerales,
        presionBombaLavadoPsi: Number(presionBombaLavadoPsi) || 0,
        ppmDesinfectante: Number(ppmDesinfectante) || 0,
        temperaturaAguaC: Number(temperaturaAguaC) || 0,
        velocidadCadenaMetrosMin: Number(velocidadCadenaMetrosMin) || 0,
        quimicoDosificado,

        itemsSeguridad,
        itemsMecanico,
        itemsHidraulicoCombustion,
        itemsElectricoControl,
        itemsBioseguridadLimpieza,
        itemsOperatividad,

        puntajeSeguridad: scoreSeguridad,
        puntajeMecanico: scoreMecanico,
        puntajeHidraulicoCombustion: scoreHidraulico,
        puntajeElectricoControl: scoreElectrico,
        puntajeBioseguridadLimpieza: scoreBioseguridad,
        puntajeOperatividad: scoreOperatividad,
        puntajeGlobal: summary.puntajeGlobal,

        veredictoOperacional: summary.veredictoOperacional,
        nivelRiesgo: summary.nivelRiesgo,
        accionesCorrectivas,

        firmas: {
          inspector: firmaInspector,
          operador: firmaOperador,
          supervisor: firmaSupervisor
        },
        cambioControl: [
          {
            version: '4.2',
            fecha: '24/09/2026',
            seccion: 'Todas',
            cambio: 'Evaluación 360° digital de túnel de lavado continuo de contenedores',
            solicitante: 'Comité de Calidad y Bioseguridad'
          }
        ]
      };

      const sanitized = sanitizeBiotrashObject(nuevoRegistro);
      const docRef = await addDoc(collection(db, 'bitacora_evaluacion_360_tunel_lavado'), sanitized);
      setRegistros(prev => [{ id: docRef.id, ...sanitized } as Evaluacion360TunelLavado, ...prev]);

      setMsg({ text: '¡Auditoría 360° de Túnel de Lavado guardada exitosamente!', type: 'success' });
      setFolio('EV360-TUN-' + Math.floor(1000 + Math.random() * 9000));
    } catch (err) {
      console.error('Error saving 360 tunel lavado:', err);
      setMsg({ text: 'Error al registrar la evaluación en la base de datos.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete?.id) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'bitacora_evaluacion_360_tunel_lavado', recordToDelete.id));
      setRegistros(prev => prev.filter(r => r.id !== recordToDelete.id));
      setRecordToDelete(null);
      setMsg({ text: 'Registro eliminado con éxito.', type: 'success' });
    } catch (err) {
      console.error('Error deleting record:', err);
      setMsg({ text: 'No se pudo eliminar el registro.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const radarData = [
    { subject: 'Seguridad (25%)', valor: scoreSeguridad, fullMark: 100 },
    { subject: 'Mecánico (20%)', valor: scoreMecanico, fullMark: 100 },
    { subject: 'Hidráulica (20%)', valor: scoreHidraulico, fullMark: 100 },
    { subject: 'Eléctrico (15%)', valor: scoreElectrico, fullMark: 100 },
    { subject: 'Bioseguridad (10%)', valor: scoreBioseguridad, fullMark: 100 },
    { subject: 'Calidad Lavado (10%)', valor: scoreOperatividad, fullMark: 100 }
  ];

  const filteredRegistros = registros.filter(r => 
    (r.folio && r.folio.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.equipoId && r.equipoId.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.operadorAsignado && r.operadorAsignado.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.veredictoOperacional && r.veredictoOperacional.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 font-sans text-[#1A1C1E]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Tablero SGI
        </button>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold overflow-x-auto">
          <span className="text-[10px] uppercase font-bold text-slate-500 px-2 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-[#1A7A4A]" /> Auditorías 360°:
          </span>
          {onNavigateToEquipment && (
            <button 
              onClick={() => onNavigateToEquipment('evaluacion_360_incinerador')}
              className="px-2.5 py-1 rounded-lg text-slate-700 hover:bg-white transition flex items-center gap-1.5"
            >
              <Flame className="w-3.5 h-3.5 text-orange-600" /> Incinerador
            </button>
          )}
          <button className="px-2.5 py-1 rounded-lg bg-cyan-700 text-white font-bold shadow-sm flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5" /> Túnel Lavado
          </button>
          {onNavigateToEquipment && (
            <>
              <button 
                onClick={() => onNavigateToEquipment('evaluacion_360_compactadora')}
                className="px-2.5 py-1 rounded-lg text-slate-700 hover:bg-white transition flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-amber-600" /> Compactadora
              </button>
              <button 
                onClick={() => onNavigateToEquipment('evaluacion_360_trituradora')}
                className="px-2.5 py-1 rounded-lg text-slate-700 hover:bg-white transition flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-600" /> Trituradora
              </button>
            </>
          )}
        </div>
      </div>

      <FormHeader 
        titulo="EVALUACIÓN 360° DE TÚNEL DE LAVADO Y DESINFECCIÓN DE CONTENEDORES"
        codigo="BIOTRASH 4.2. F-OPR-000-20"
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
              ? 'border-cyan-600 text-cyan-800 bg-cyan-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Droplets className="w-4 h-4 text-cyan-600" /> Formulario de Auditoría 360°
        </button>
        <button
          onClick={() => setActiveTab('historico')}
          className={`px-4 py-2.5 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition ${
            activeTab === 'historico'
              ? 'border-cyan-600 text-cyan-800 bg-cyan-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4 text-slate-600" /> Histórico ({registros.length})
        </button>
        <button
          onClick={() => setActiveTab('analitica')}
          className={`px-4 py-2.5 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition ${
            activeTab === 'analitica'
              ? 'border-cyan-600 text-cyan-800 bg-cyan-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4 text-cyan-600" /> Radar de Confiabilidad 360°
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
          {/* KPI Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-500">Calificación 360°</p>
                <h3 className={`text-2xl font-black ${
                  summary.puntajeGlobal >= 85 ? 'text-emerald-600' : summary.puntajeGlobal >= 70 ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {summary.puntajeGlobal}%
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center">
                <Gauge className="w-6 h-6 text-cyan-600" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-500">Veredicto Operativo</p>
                <h4 className="text-sm font-black text-slate-800 mt-1">
                  {summary.veredictoOperacional}
                </h4>
              </div>
              <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${
                summary.veredictoOperacional === 'Aprobado para Operar' ? 'bg-emerald-100 text-emerald-800' :
                summary.veredictoOperacional === 'Condicionado con Acciones' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {summary.nivelRiesgo} RIESGO
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-500">Presión / Concentración</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">
                  {presionBombaLavadoPsi} PSI | {ppmDesinfectante} ppm
                </p>
              </div>
              <Droplets className="w-6 h-6 text-cyan-600" />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-500">Velocidad / Temp.</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">
                  {velocidadCadenaMetrosMin} m/min | {temperaturaAguaC}°C
                </p>
              </div>
              <Clock className="w-6 h-6 text-slate-500" />
            </div>
          </div>

          {/* Identification */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-600" /> I. Identificación de Túnel de Lavado y Condiciones
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Folio:</label>
                <input 
                  type="text" 
                  value={folio} 
                  onChange={e => setFolio(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Túnel a Evaluar:</label>
                <select
                  value={equipoSeleccionado.id}
                  onChange={e => {
                    const match = EQUIPOS_TUNEL_LAVADO.find(eq => eq.id === e.target.value);
                    if (match) setEquipoSeleccionado(match);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold"
                >
                  {EQUIPOS_TUNEL_LAVADO.map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.nombre} ({eq.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha de Inspección:</label>
                <input 
                  type="date" 
                  value={fecha} 
                  onChange={e => setFecha(e.target.value)} 
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Turno:</label>
                <select
                  value={turno}
                  onChange={e => setTurno(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                >
                  <option value="Matutino">Turno Matutino</option>
                  <option value="Vespertino">Turno Vespertino</option>
                  <option value="Nocturno">Turno Nocturno</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Horómetro (Horas):</label>
                <input 
                  type="number" 
                  value={horometroActual} 
                  onChange={e => setHorometroActual(Number(e.target.value))} 
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ubicación en Planta:</label>
                <input 
                  type="text" 
                  value={equipoSeleccionado.ubicacion} 
                  readOnly
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Operador a Cargo:</label>
                <input 
                  type="text" 
                  value={operadorAsignado} 
                  onChange={e => setOperadorAsignado(e.target.value)} 
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Inspector / Auditor SGI:</label>
                <input 
                  type="text" 
                  value={inspectorSgi} 
                  onChange={e => setInspectorSgi(e.target.value)} 
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            {/* Operational Parameters Specific to Washing Tunnel */}
            <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs bg-cyan-50/40 p-3 rounded-xl border border-cyan-200">
              <div>
                <label className="block font-bold text-cyan-950 mb-1">Presión Bomba (PSI):</label>
                <input 
                  type="number" 
                  value={presionBombaLavadoPsi} 
                  onChange={e => setPresionBombaLavadoPsi(Number(e.target.value))} 
                  className="w-full px-2.5 py-1.5 bg-white border border-cyan-300 rounded-lg font-bold"
                />
                <span className="text-[10px] text-slate-500">Rango: 1600 - 2200 PSI</span>
              </div>

              <div>
                <label className="block font-bold text-cyan-950 mb-1">Dosis Germicida (PPM):</label>
                <input 
                  type="number" 
                  value={ppmDesinfectante} 
                  onChange={e => setPpmDesinfectante(Number(e.target.value))} 
                  className="w-full px-2.5 py-1.5 bg-white border border-cyan-300 rounded-lg font-bold text-cyan-800"
                />
                <span className="text-[10px] text-slate-500">Norma: 200 - 400 ppm</span>
              </div>

              <div>
                <label className="block font-bold text-cyan-950 mb-1">Temp. Agua Lavado (°C):</label>
                <input 
                  type="number" 
                  value={temperaturaAguaC} 
                  onChange={e => setTemperaturaAguaC(Number(e.target.value))} 
                  className="w-full px-2.5 py-1.5 bg-white border border-cyan-300 rounded-lg font-bold"
                />
                <span className="text-[10px] text-slate-500">55 - 70 °C</span>
              </div>

              <div>
                <label className="block font-bold text-cyan-950 mb-1">Velocidad Cadena (m/min):</label>
                <input 
                  type="number" 
                  step="0.1" 
                  value={velocidadCadenaMetrosMin} 
                  onChange={e => setVelocidadCadenaMetrosMin(Number(e.target.value))} 
                  className="w-full px-2.5 py-1.5 bg-white border border-cyan-300 rounded-lg font-bold"
                />
                <span className="text-[10px] text-slate-500">3.0 - 4.5 m/min</span>
              </div>

              <div>
                <label className="block font-bold text-cyan-950 mb-1">Agente Químico:</label>
                <input 
                  type="text" 
                  value={quimicoDosificado} 
                  onChange={e => setQuimicoDosificado(e.target.value)} 
                  className="w-full px-2.5 py-1.5 bg-white border border-cyan-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Matrix by Categories */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-cyan-600" /> II. Matriz de Auditoría 360° de Túnel
              </h3>
              
              <div className="flex flex-wrap gap-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setCategoryTab('seguridad')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    categoryTab === 'seguridad' ? 'bg-cyan-700 text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Seguridad ({scoreSeguridad}%)
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryTab('mecanico')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    categoryTab === 'mecanico' ? 'bg-cyan-700 text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Mecánico ({scoreMecanico}%)
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryTab('hidraulicoCombustion')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    categoryTab === 'hidraulicoCombustion' ? 'bg-cyan-700 text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Hidráulica ({scoreHidraulico}%)
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryTab('electricoControl')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    categoryTab === 'electricoControl' ? 'bg-cyan-700 text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Eléctrico ({scoreElectrico}%)
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryTab('bioseguridadLimpieza')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    categoryTab === 'bioseguridadLimpieza' ? 'bg-cyan-700 text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Bioseguridad ({scoreBioseguridad}%)
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryTab('operatividad')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    categoryTab === 'operatividad' ? 'bg-cyan-700 text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Calidad Lavado ({scoreOperatividad}%)
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {(categoryTab === 'seguridad' ? itemsSeguridad :
                categoryTab === 'mecanico' ? itemsMecanico :
                categoryTab === 'hidraulicoCombustion' ? itemsHidraulicoCombustion :
                categoryTab === 'electricoControl' ? itemsElectricoControl :
                categoryTab === 'bioseguridadLimpieza' ? itemsBioseguridadLimpieza : itemsOperatividad
              ).map((item, idx) => (
                <div key={item.codigo} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-800 font-mono text-[10px] font-bold rounded">
                        {item.codigo}
                      </span>
                      <p className="text-xs sm:text-sm font-semibold text-slate-900">{item.criterio}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-bold mr-1">Calificación:</span>
                      {[1, 2, 3, 4, 5].map(pts => (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => handleItemRatingChange(categoryTab, idx, pts)}
                          className={`w-7 h-7 text-xs font-bold rounded-lg border transition ${
                            item.calificacion === pts
                              ? pts >= 4 ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : pts === 3 ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-rose-600 text-white border-rose-600 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {pts}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-200/60 text-xs">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.estado === 'Conforme' ? 'bg-emerald-100 text-emerald-800' :
                      item.estado === 'Observación' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {item.estado}
                    </span>
                    <input 
                      type="text"
                      placeholder="Observaciones de inspección..."
                      value={item.hallazgo || ''}
                      onChange={e => handleItemHallazgoChange(categoryTab, idx, e.target.value)}
                      className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Corrective Actions */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-cyan-600" /> III. Plan de Acciones Correctivas
              </h3>
              <button
                type="button"
                onClick={handleAddAccion}
                className="px-3 py-1.5 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-200 rounded-lg font-bold text-xs flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Acción Correctiva
              </button>
            </div>

            {accionesCorrectivas.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg border border-slate-200">
                Túnel de lavado operando dentro de los parámetros de bioseguridad. No hay desviaciones pendientes.
              </p>
            ) : (
              <div className="space-y-3">
                {accionesCorrectivas.map((ac, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs items-center">
                    <div className="sm:col-span-3">
                      <label className="block font-bold text-slate-700 mb-1">Ítem Afectado:</label>
                      <input 
                        type="text" 
                        value={ac.itemAfectado} 
                        onChange={e => {
                          const val = e.target.value;
                          setAccionesCorrectivas(prev => prev.map((item, i) => i === idx ? { ...item, itemAfectado: val } : item));
                        }}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block font-bold text-slate-700 mb-1">Desviación:</label>
                      <input 
                        type="text" 
                        value={ac.descripcionDesviacion} 
                        onChange={e => {
                          const val = e.target.value;
                          setAccionesCorrectivas(prev => prev.map((item, i) => i === idx ? { ...item, descripcionDesviacion: val } : item));
                        }}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block font-bold text-slate-700 mb-1">Acción Propuesta:</label>
                      <input 
                        type="text" 
                        value={ac.accionPropuesta} 
                        onChange={e => {
                          const val = e.target.value;
                          setAccionesCorrectivas(prev => prev.map((item, i) => i === idx ? { ...item, accionPropuesta: val } : item));
                        }}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Plazo (Días):</label>
                      <input 
                        type="number" 
                        value={ac.plazoDias} 
                        onChange={e => {
                          const val = Number(e.target.value);
                          setAccionesCorrectivas(prev => prev.map((item, i) => i === idx ? { ...item, plazoDias: val } : item));
                        }}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveAccion(idx)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Signatures */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-600" /> IV. Observaciones y Firmas SGI
            </h3>

            <div className="mb-4">
              <label className="block font-bold text-slate-700 text-xs mb-1">Observaciones Generales:</label>
              <textarea 
                rows={2}
                value={observacionesGenerales}
                onChange={e => setObservacionesGenerales(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="block font-bold text-slate-700 mb-1">Auditor / Inspector SGI:</label>
                <input 
                  type="text" 
                  value={firmaInspector} 
                  onChange={e => setFirmaInspector(e.target.value)} 
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-800"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="block font-bold text-slate-700 mb-1">Operador Responsable:</label>
                <input 
                  type="text" 
                  value={firmaOperador} 
                  onChange={e => setFirmaOperador(e.target.value)} 
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-800"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="block font-bold text-slate-700 mb-1">Vo.Bo. Supervisor de Planta:</label>
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
              className="px-6 py-2.5 bg-cyan-700 hover:bg-cyan-800 text-white font-bold rounded-xl shadow-sm flex items-center gap-2 text-xs sm:text-sm transition disabled:opacity-50"
            >
              <CheckSquare className="w-4 h-4" /> {saving ? 'Guardando Evaluación...' : 'Guardar Evaluación 360°'}
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
                placeholder="Buscar por folio, equipo, operador..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => generateAndDownloadExcel('evaluacion_360_tunel_lavado', { results: registros })}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar Excel
              </button>

              {isAuthorizedToDelete(userEmail) && (
                <GestorItDeleteModuleRecords 
                  collectionName="bitacora_evaluacion_360_tunel_lavado"
                  moduleName="Evaluación 360 Túnel de Lavado"
                  onDeleted={() => {
                    setRegistros([]);
                    setMsg({ text: 'Registros de evaluación 360 de túnel de lavado eliminados.', type: 'success' });
                  }}
                  userEmail={userEmail}
                />
              )}
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-cyan-600" /> Cargando auditorías de túnel...
            </div>
          ) : filteredRegistros.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs italic bg-slate-50 rounded-xl border border-slate-200">
              No se encontraron registros de auditoría para túnel de lavado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-2.5">Folio</th>
                    <th className="p-2.5">Fecha / Turno</th>
                    <th className="p-2.5">Equipo</th>
                    <th className="p-2.5 text-center">Calificación</th>
                    <th className="p-2.5">Veredicto</th>
                    <th className="p-2.5">Riesgo</th>
                    <th className="p-2.5">Operador</th>
                    <th className="p-2.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRegistros.map(reg => (
                    <tr key={reg.id} className="hover:bg-slate-50 transition">
                      <td className="p-2.5 font-mono font-bold text-slate-800">{reg.folio}</td>
                      <td className="p-2.5 text-slate-600">{reg.fecha} ({reg.turno})</td>
                      <td className="p-2.5 font-semibold text-slate-800">{reg.nombreEquipo}</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          (reg.puntajeGlobal || 0) >= 85 ? 'bg-emerald-100 text-emerald-800' :
                          (reg.puntajeGlobal || 0) >= 70 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {reg.puntajeGlobal}%
                        </span>
                      </td>
                      <td className="p-2.5 font-medium">{reg.veredictoOperacional}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          reg.nivelRiesgo === 'Bajo' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          reg.nivelRiesgo === 'Medio' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {reg.nivelRiesgo}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600">{reg.operadorAsignado}</td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => generateAndDownloadPDF('evaluacion_360_tunel_lavado', reg)}
                            title="Descargar PDF Oficial"
                            className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => generateAndDownloadExcel('evaluacion_360_tunel_lavado', reg)}
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
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-cyan-600" /> Evaluación Radial 360° Túnel de Lavado
            </h3>
            <div className="h-80 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#CBD5E1" />
                  <Radar name="Conformidad (%)" dataKey="valor" stroke="#0891B2" fill="#06B6D4" fillOpacity={0.45} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-3">Conformidad por Subsistemas</h4>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <span className="font-semibold text-slate-700">Seguridad & EPP</span>
                  <span className="font-bold text-cyan-700">{scoreSeguridad}%</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <span className="font-semibold text-slate-700">Mecánica & Cadena Arrastre</span>
                  <span className="font-bold text-cyan-700">{scoreMecanico}%</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <span className="font-semibold text-slate-700">Hidráulica & Boquillas 360°</span>
                  <span className="font-bold text-cyan-700">{scoreHidraulico}%</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <span className="font-semibold text-slate-700">Eléctrico IP65 & Sensores</span>
                  <span className="font-bold text-cyan-700">{scoreElectrico}%</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <span className="font-semibold text-slate-700">Bioseguridad & Drenaje</span>
                  <span className="font-bold text-cyan-700">{scoreBioseguridad}%</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <span className="font-semibold text-slate-700">Calidad de Lavado Contenedor</span>
                  <span className="font-bold text-cyan-700">{scoreOperatividad}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {recordToDelete && (
        <DeleteSingleRecordModal 
          isOpen={!!recordToDelete}
          itemIdentifier={recordToDelete.folio || recordToDelete.id || ''}
          title="¿Eliminar evaluación 360° de túnel de lavado?"
          description="Esta acción eliminará permanentemente la auditoría de la base de datos."
          isDeleting={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setRecordToDelete(null)}
        />
      )}

      <div className="mt-8">
        <FormFooter 
          elaboroCargo="Comité SGI / Bioseguridad"
          revisoCargo="Jefatura de Operaciones de Planta"
          aproboCargo="Gerencia General SGI"
        />
      </div>
    </div>
  );
}
