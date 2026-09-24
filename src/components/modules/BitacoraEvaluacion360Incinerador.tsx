import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, limit } from 'firebase/firestore';
import type { Evaluacion360Incinerador, ItemEvaluacion360, AccionCorrectiva360 } from '../../types';
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
  Flame, 
  Gauge, 
  Award, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  Eye, 
  RefreshCw,
  Search,
  Thermometer,
  Zap,
  Activity,
  Droplets,
  Layers,
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
import { sanitizeBiotrashObject, sanitizeBiotrashText } from '../../utils/textSanitizer';
import { isAuthorizedToDelete } from '../../utils/authUtils';
import GestorItDeleteModuleRecords from '../GestorItDeleteModuleRecords';
import DeleteSingleRecordModal from '../DeleteSingleRecordModal';
import { sortRecordsByDateDesc } from '../../utils/dateUtils';
import { 
  EQUIPOS_INCINERADOR, 
  DEFAULT_ITEMS_INCINERADOR, 
  calculateCategoryScore, 
  calculateEvaluationSummary 
} from '../../utils/evaluacion360Data';

interface Props {
  onBack: () => void;
  userEmail: string;
  onNavigateToEquipment?: (equipmentModulo: string) => void;
}

export default function BitacoraEvaluacion360Incinerador({ onBack, userEmail, onNavigateToEquipment }: Props) {
  const [activeTab, setActiveTab] = useState<'formulario' | 'historico' | 'analitica'>('formulario');
  const [categoryTab, setCategoryTab] = useState<'seguridad' | 'mecanico' | 'hidraulicoCombustion' | 'electricoControl' | 'bioseguridadLimpieza' | 'operatividad'>('seguridad');
  
  const [registros, setRegistros] = useState<Evaluacion360Incinerador[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<Evaluacion360Incinerador | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<Evaluacion360Incinerador | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form general state
  const [folio, setFolio] = useState(() => 'EV360-INC-' + Math.floor(1000 + Math.random() * 9000));
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [turno, setTurno] = useState<'Matutino' | 'Vespertino' | 'Nocturno'>('Matutino');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(EQUIPOS_INCINERADOR[0]);
  const [horometroActual, setHorometroActual] = useState(3840);
  const [operadorAsignado, setOperadorAsignado] = useState('Juan Carlos Méndez (Técnico Operador Térmico)');
  const [inspectorSgi, setInspectorSgi] = useState(userEmail || 'Auditor SGI Calidad y HSE');
  const [observacionesGenerales, setObservacionesGenerales] = useState('Evaluación 360 integral de horno incinerador pirolítico conforme a requisitos ISO 14001 y NOM-087.');

  // Equipment specific operational parameters
  const [tempCamaraPrimariaC, setTempCamaraPrimariaC] = useState(850);
  const [tempCamaraSecundariaC, setTempCamaraSecundariaC] = useState(1050);
  const [presionCombustibleBar, setPresionCombustibleBar] = useState(3.2);
  const [opacidadHumoPorc, setOpacidadHumoPorc] = useState(5);
  const [tipoCombustible, setTipoCombustible] = useState('Diésel Bajo Azufre (LSD)');

  // Dynamic evaluation items
  const [itemsSeguridad, setItemsSeguridad] = useState<ItemEvaluacion360[]>(DEFAULT_ITEMS_INCINERADOR.seguridad);
  const [itemsMecanico, setItemsMecanico] = useState<ItemEvaluacion360[]>(DEFAULT_ITEMS_INCINERADOR.mecanico);
  const [itemsHidraulicoCombustion, setItemsHidraulicoCombustion] = useState<ItemEvaluacion360[]>(DEFAULT_ITEMS_INCINERADOR.hidraulicoCombustion);
  const [itemsElectricoControl, setItemsElectricoControl] = useState<ItemEvaluacion360[]>(DEFAULT_ITEMS_INCINERADOR.electricoControl);
  const [itemsBioseguridadLimpieza, setItemsBioseguridadLimpieza] = useState<ItemEvaluacion360[]>(DEFAULT_ITEMS_INCINERADOR.bioseguridadLimpieza);
  const [itemsOperatividad, setItemsOperatividad] = useState<ItemEvaluacion360[]>(DEFAULT_ITEMS_INCINERADOR.operatividad);

  // Corrective Actions Plan
  const [accionesCorrectivas, setAccionesCorrectivas] = useState<AccionCorrectiva360[]>([]);

  // Signatures
  const [firmaInspector, setFirmaInspector] = useState(userEmail || 'Auditor Líder SGI');
  const [firmaOperador, setFirmaOperador] = useState('Juan Carlos Méndez');
  const [firmaSupervisor, setFirmaSupervisor] = useState('Ing. Manuel López — Gerente de Operaciones');

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'bitacora_evaluacion_360_incinerador'), orderBy('fechaRegistro', 'desc'), limit(30));
      const querySnapshot = await getDocs(q);
      const docs: Evaluacion360Incinerador[] = [];
      querySnapshot.forEach((docSnap) => {
        const docData = sanitizeBiotrashObject(docSnap.data());
        docs.push({ id: docSnap.id, ...docData } as Evaluacion360Incinerador);
      });
      setRegistros(sortRecordsByDateDesc(docs, 'fecha'));
    } catch (e) {
      console.warn('Error fetching 360 incinerador records:', e);
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

  // Handle item qualification update (1-5)
  const handleItemRatingChange = (
    category: 'seguridad' | 'mecanico' | 'hidraulicoCombustion' | 'electricoControl' | 'bioseguridadLimpieza' | 'operatividad',
    idx: number,
    rating: number
  ) => {
    const updater = (prev: ItemEvaluacion360[]) => {
      const copy = [...prev];
      const target = copy[idx];
      target.calificacion = rating;
      if (rating >= 4) {
        target.estado = 'Conforme';
      } else if (rating === 3) {
        target.estado = 'Observación';
      } else {
        target.estado = 'Crítico';
      }
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

  // Add corrective action row
  const handleAddAccion = () => {
    setAccionesCorrectivas(prev => [
      ...prev,
      {
        id: 'AC-' + Date.now(),
        itemAfectado: 'Quemador / Refractario',
        descripcionDesviacion: 'Desviación detectada durante inspección visual 360',
        accionPropuesta: 'Ajuste mecánico y calibración inmediata por equipo de mantenimiento',
        responsableEjecucion: 'Jefe de Mantenimiento / Técnico Especialista',
        plazoDias: 2,
        prioridad: 'Alta',
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
      const nuevoRegistro: Omit<Evaluacion360Incinerador, 'id'> = {
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
        tempCamaraPrimariaC: Number(tempCamaraPrimariaC) || 0,
        tempCamaraSecundariaC: Number(tempCamaraSecundariaC) || 0,
        presionCombustibleBar: Number(presionCombustibleBar) || 0,
        opacidadHumoPorc: Number(opacidadHumoPorc) || 0,
        tipoCombustible,

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
            cambio: 'Evaluación 360° digital de horno incinerador industrial de residuos DSH',
            solicitante: 'Comité de Calidad y SGI'
          }
        ]
      };

      const sanitized = sanitizeBiotrashObject(nuevoRegistro);
      const docRef = await addDoc(collection(db, 'bitacora_evaluacion_360_incinerador'), sanitized);
      setRegistros(prev => [{ id: docRef.id, ...sanitized } as Evaluacion360Incinerador, ...prev]);

      setMsg({ text: '¡Auditoría 360° de Incinerador guardada exitosamente en la base de datos SGI!', type: 'success' });
      setFolio('EV360-INC-' + Math.floor(1000 + Math.random() * 9000));
    } catch (err) {
      console.error('Error saving 360 incinerador:', err);
      setMsg({ text: 'Error al registrar la evaluación en el servidor.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete?.id) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'bitacora_evaluacion_360_incinerador', recordToDelete.id));
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
    { subject: 'Combustión (20%)', valor: scoreHidraulico, fullMark: 100 },
    { subject: 'Eléctrico (15%)', valor: scoreElectrico, fullMark: 100 },
    { subject: 'Bioseguridad (10%)', valor: scoreBioseguridad, fullMark: 100 },
    { subject: 'Operación (10%)', valor: scoreOperatividad, fullMark: 100 }
  ];

  const filteredRegistros = registros.filter(r => 
    (r.folio && r.folio.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.equipoId && r.equipoId.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.operadorAsignado && r.operadorAsignado.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.veredictoOperacional && r.veredictoOperacional.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 font-sans text-[#1A1C1E]">
      {/* Header and Back navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Tablero SGI
        </button>

        {/* Quick switcher between the 4 360 Equipment Evaluations */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold overflow-x-auto">
          <span className="text-[10px] uppercase font-bold text-slate-500 px-2 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-[#1A7A4A]" /> Auditorías 360°:
          </span>
          <button 
            className="px-2.5 py-1 rounded-lg bg-orange-600 text-white font-bold shadow-sm flex items-center gap-1.5"
          >
            <Flame className="w-3.5 h-3.5" /> Incinerador
          </button>
          {onNavigateToEquipment && (
            <>
              <button 
                onClick={() => onNavigateToEquipment('evaluacion_360_tunel_lavado')}
                className="px-2.5 py-1 rounded-lg text-slate-700 hover:bg-white transition flex items-center gap-1.5"
              >
                <Droplets className="w-3.5 h-3.5 text-cyan-600" /> Túnel Lavado
              </button>
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

      {/* Official SGI Document Header */}
      <FormHeader 
        titulo="EVALUACIÓN 360° DE INCINERADOR DSH (HORNO TÉRMICO PIROLÍTICO)"
        codigo="BIOTRASH 4.2. F-OPR-000-19"
        version="1.0"
        fechaElaboracion="24/09/2026"
        fechaVersion="24/09/2026"
      />

      {/* Navigation tabs */}
      <div className="flex border-b border-slate-200 mb-6 bg-white rounded-t-xl px-4 pt-2 shadow-xs">
        <button
          onClick={() => setActiveTab('formulario')}
          className={`px-4 py-2.5 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition ${
            activeTab === 'formulario'
              ? 'border-orange-600 text-orange-700 bg-orange-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Flame className="w-4 h-4 text-orange-600" /> Formulario de Auditoría 360°
        </button>
        <button
          onClick={() => setActiveTab('historico')}
          className={`px-4 py-2.5 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition ${
            activeTab === 'historico'
              ? 'border-orange-600 text-orange-700 bg-orange-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4 text-slate-600" /> Histórico ({registros.length})
        </button>
        <button
          onClick={() => setActiveTab('analitica')}
          className={`px-4 py-2.5 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition ${
            activeTab === 'analitica'
              ? 'border-orange-600 text-orange-700 bg-orange-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4 text-amber-500" /> Radar de Confiabilidad 360°
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

      {/* TAB 1: FORMULARIO */}
      {activeTab === 'formulario' && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Top Operational Status Bar */}
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
                <Gauge className="w-6 h-6 text-orange-600" />
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
                <p className="text-[11px] font-bold uppercase text-slate-500">Cámara Primaria / Secundaria</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">
                  {tempCamaraPrimariaC}°C / {tempCamaraSecundariaC}°C
                </p>
              </div>
              <Thermometer className="w-6 h-6 text-red-500" />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-500">Presión / Opacidad</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">
                  {presionCombustibleBar} bar | {opacidadHumoPorc}% humo
                </p>
              </div>
              <Zap className="w-6 h-6 text-amber-500" />
            </div>
          </div>

          {/* Section 1: Equipment Identification & Conditions */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-orange-600" /> I. Identificación de Equipo y Condiciones de Auditoría
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Folio Auditoría:</label>
                <input 
                  type="text" 
                  value={folio} 
                  onChange={e => setFolio(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Equipo a Evaluar:</label>
                <select
                  value={equipoSeleccionado.id}
                  onChange={e => {
                    const match = EQUIPOS_INCINERADOR.find(eq => eq.id === e.target.value);
                    if (match) setEquipoSeleccionado(match);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold"
                >
                  {EQUIPOS_INCINERADOR.map(eq => (
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
                <label className="block font-bold text-slate-700 mb-1">Horómetro Actual (Horas):</label>
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

            {/* Sub-parameters for Incineration */}
            <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs bg-orange-50/40 p-3 rounded-xl border border-orange-200">
              <div>
                <label className="block font-bold text-orange-950 mb-1">Temp. Cámara Primaria (°C):</label>
                <input 
                  type="number" 
                  value={tempCamaraPrimariaC} 
                  onChange={e => setTempCamaraPrimariaC(Number(e.target.value))} 
                  className="w-full px-2.5 py-1.5 bg-white border border-orange-300 rounded-lg font-bold"
                />
                <span className="text-[10px] text-slate-500">Rango: 800 - 950 °C</span>
              </div>

              <div>
                <label className="block font-bold text-orange-950 mb-1">Temp. Postcombustión (°C):</label>
                <input 
                  type="number" 
                  value={tempCamaraSecundariaC} 
                  onChange={e => setTempCamaraSecundariaC(Number(e.target.value))} 
                  className="w-full px-2.5 py-1.5 bg-white border border-orange-300 rounded-lg font-bold text-red-600"
                />
                <span className="text-[10px] text-slate-500">Norma: ≥1,000 °C</span>
              </div>

              <div>
                <label className="block font-bold text-orange-950 mb-1">Presión Combustible (bar):</label>
                <input 
                  type="number" 
                  step="0.1" 
                  value={presionCombustibleBar} 
                  onChange={e => setPresionCombustibleBar(Number(e.target.value))} 
                  className="w-full px-2.5 py-1.5 bg-white border border-orange-300 rounded-lg font-bold"
                />
                <span className="text-[10px] text-slate-500">Nominal: 2.8 - 3.5 bar</span>
              </div>

              <div>
                <label className="block font-bold text-orange-950 mb-1">Opacidad de Humo (%):</label>
                <input 
                  type="number" 
                  value={opacidadHumoPorc} 
                  onChange={e => setOpacidadHumoPorc(Number(e.target.value))} 
                  className="w-full px-2.5 py-1.5 bg-white border border-orange-300 rounded-lg font-bold"
                />
                <span className="text-[10px] text-slate-500">Ringelmann &lt; 20%</span>
              </div>

              <div>
                <label className="block font-bold text-orange-950 mb-1">Combustible Utilizado:</label>
                <input 
                  type="text" 
                  value={tipoCombustible} 
                  onChange={e => setTipoCombustible(e.target.value)} 
                  className="w-full px-2.5 py-1.5 bg-white border border-orange-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Section 2: 360 Matrix by Categories */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-orange-600" /> II. Matriz de Auditoría 360° por Sistemas
              </h3>
              
              <div className="flex flex-wrap gap-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setCategoryTab('seguridad')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    categoryTab === 'seguridad' ? 'bg-orange-600 text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Seguridad ({scoreSeguridad}%)
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryTab('mecanico')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    categoryTab === 'mecanico' ? 'bg-orange-600 text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Mecánico ({scoreMecanico}%)
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryTab('hidraulicoCombustion')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    categoryTab === 'hidraulicoCombustion' ? 'bg-orange-600 text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Combustión ({scoreHidraulico}%)
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryTab('electricoControl')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    categoryTab === 'electricoControl' ? 'bg-orange-600 text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Eléctrico ({scoreElectrico}%)
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryTab('bioseguridadLimpieza')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    categoryTab === 'bioseguridadLimpieza' ? 'bg-orange-600 text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Bioseguridad ({scoreBioseguridad}%)
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryTab('operatividad')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    categoryTab === 'operatividad' ? 'bg-orange-600 text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Desempeño ({scoreOperatividad}%)
                </button>
              </div>
            </div>

            {/* List of questions for the selected category */}
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

                    {/* Score Buttons 1 to 5 */}
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
                      placeholder="Observación o hallazgo específico (si aplica)..."
                      value={item.hallazgo || ''}
                      onChange={e => handleItemHallazgoChange(categoryTab, idx, e.target.value)}
                      className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Plan de Acción Correctiva */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-orange-600" /> III. Plan de Acciones Correctivas Inmediatas
              </h3>
              <button
                type="button"
                onClick={handleAddAccion}
                className="px-3 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded-lg font-bold text-xs flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Acción Correctiva
              </button>
            </div>

            {accionesCorrectivas.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg border border-slate-200">
                No hay acciones correctivas requeridas actualmente. El equipo cumple con los estándares operativos SGI.
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

          {/* Section 4: Signatures & Observaciones */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
              <FileCheckIcon className="w-4 h-4 text-orange-600" /> IV. Observaciones Generales y Firmas SGI
            </h3>

            <div className="mb-4">
              <label className="block font-bold text-slate-700 text-xs mb-1">Observaciones Generales de la Auditoría:</label>
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
                <span className="text-[10px] text-slate-500 mt-1 block">Firma digital acreditada</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="block font-bold text-slate-700 mb-1">Operador Responsable:</label>
                <input 
                  type="text" 
                  value={firmaOperador} 
                  onChange={e => setFirmaOperador(e.target.value)} 
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-800"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Firma del operador en turno</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="block font-bold text-slate-700 mb-1">Vo.Bo. Supervisor de Planta:</label>
                <input 
                  type="text" 
                  value={firmaSupervisor} 
                  onChange={e => setFirmaSupervisor(e.target.value)} 
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-800"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Aprobación gerencial SGI</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-2 text-xs sm:text-sm transition disabled:opacity-50"
            >
              <CheckSquare className="w-4 h-4" /> {saving ? 'Guardando Auditoría...' : 'Guardar Evaluación 360°'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: HISTÓRICO DE AUDITORÍAS */}
      {activeTab === 'historico' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por folio, equipo, operador o veredicto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => generateAndDownloadExcel('evaluacion_360_incinerador', { results: registros })}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar Excel
              </button>

              {isAuthorizedToDelete(userEmail) && (
                <GestorItDeleteModuleRecords 
                  collectionName="bitacora_evaluacion_360_incinerador"
                  moduleName="Evaluación 360 Incinerador"
                  onDeleted={() => {
                    setRegistros([]);
                    setMsg({ text: 'Todos los registros de evaluación 360 de incinerador fueron eliminados.', type: 'success' });
                  }}
                  userEmail={userEmail}
                />
              )}
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-orange-600" /> Cargando auditorías de incinerador...
            </div>
          ) : filteredRegistros.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs italic bg-slate-50 rounded-xl border border-slate-200">
              No se encontraron registros de auditoría 360 para incineradores.
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
                            onClick={() => generateAndDownloadPDF('evaluacion_360_incinerador', reg)}
                            title="Descargar PDF Oficial"
                            className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => generateAndDownloadExcel('evaluacion_360_incinerador', reg)}
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

      {/* TAB 3: ANALÍTICA Y RADAR */}
      {activeTab === 'analitica' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-orange-600" /> Evaluación Radial 360° de Confiabilidad
            </h3>
            <div className="h-80 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#CBD5E1" />
                  <Radar name="Conformidad (%)" dataKey="valor" stroke="#EA580C" fill="#FB923C" fillOpacity={0.45} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-3">Resumen de Parámetros Clave</h4>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <span className="font-semibold text-slate-700">Seguridad & EPP</span>
                  <span className="font-bold text-orange-600">{scoreSeguridad}%</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <span className="font-semibold text-slate-700">Integridad Mecánica</span>
                  <span className="font-bold text-orange-600">{scoreMecanico}%</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <span className="font-semibold text-slate-700">Combustión & Postcombustión</span>
                  <span className="font-bold text-orange-600">{scoreHidraulico}%</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <span className="font-semibold text-slate-700">Eléctrico & Controles</span>
                  <span className="font-bold text-orange-600">{scoreElectrico}%</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <span className="font-semibold text-slate-700">Bioseguridad & Cenizas</span>
                  <span className="font-bold text-orange-600">{scoreBioseguridad}%</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <span className="font-semibold text-slate-700">Desempeño & Emisiones</span>
                  <span className="font-bold text-orange-600">{scoreOperatividad}%</span>
                </div>
              </div>
            </div>

            <div className="bg-orange-50/60 border border-orange-200 rounded-xl p-4 text-xs text-orange-950">
              <h5 className="font-bold flex items-center gap-1.5 mb-1.5">
                <ShieldCheck className="w-4 h-4 text-orange-600" /> Criterio de Acreditación SGI
              </h5>
              <p className="leading-relaxed text-[11.5px] text-slate-700">
                La operación continua requiere una calificación global igual o superior al <strong>85%</strong> y ningún ítem calificado en nivel crítico (&le;2). De no cumplirse, el equipo pasará a estado de paro preventivo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <DeleteSingleRecordModal 
          isOpen={!!recordToDelete}
          itemIdentifier={recordToDelete.folio || recordToDelete.id || ''}
          title="¿Eliminar evaluación 360° de incinerador?"
          description="Esta acción eliminará permanentemente la auditoría de la base de datos."
          isDeleting={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setRecordToDelete(null)}
        />
      )}

      {/* Official SGI Document Footer */}
      <div className="mt-8">
        <FormFooter 
          elaboroCargo="Comité SGI / HSE"
          revisoCargo="Jefatura de Mantenimiento"
          aproboCargo="Gerencia de Operaciones"
        />
      </div>
    </div>
  );
}

function FileCheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      {...props} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  );
}
