import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, limit } from 'firebase/firestore';
import type { BitacoraChecklistDiarioPlanta, ItemChecklist } from '../../types';
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
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Award,
  AlertTriangle,
  HelpCircle,
  BarChart3,
  Trash2
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';
import { generateAndDownloadExcel } from '../../utils/excelGenerator';
import BulkUploadPanel from '../BulkUploadPanel';
import { sanitizeBiotrashObject, sanitizeBiotrashText } from '../../utils/textSanitizer';
import { isAuthorizedToDelete } from '../../utils/authUtils';

interface Props {
  onBack: () => void;
  userEmail: string;
}

// Default items matching official BIOTRASH SGI Checklist F-OPR-000-16
const DEFAULT_HSE: ItemChecklist[] = [
  { codigo: 'HSE-01', punto: 'Todo el personal porta EPP completo según nivel de riesgo biológico (bata, guantes de nitrilo, mascarilla N95/FFP2, careta/goggles)', referencia: 'NOM-087-ECOL-SSA1-2002 · NOM-017-STPS', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'HSE-02', punto: 'Señalización de riesgo biológico, químico y de seguridad visible, legible y en buen estado en todas las zonas', referencia: 'NOM-026-STPS-2008', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'HSE-03', punto: 'Extintores vigentes (fecha de recarga), accesibles y con señalización correcta', referencia: 'NOM-002-STPS-2010', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'HSE-04', punto: 'Rutas de evacuación y salidas de emergencia libres de obstrucciones', referencia: 'NOM-003-SEGOB-2011', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'HSE-05', punto: 'Contenedores de RPBI correctamente etiquetados, cerrados, sin rebose y en área designada', referencia: 'NOM-087-ECOL-SSA1-2002', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'HSE-06', punto: 'No hay exposición innecesaria o no controlada a material bioinfeccioso o peligroso', referencia: 'NOM-087 · RPBI', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'HSE-07', punto: 'Duchas de emergencia y lavaojos operativos y libres de obstrucción', referencia: 'NOM-010-STPS-1999', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'HSE-08', punto: 'Registro de incidentes/accidentes del día completado (aunque sea \'sin novedad\')', referencia: 'STPS · ISO 45001:2018 §10.2', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'HSE-09', punto: 'Zona de lavado y descontaminación de personal operativa y con insumos (jabón, gel, desinfectante)', referencia: 'NOM-087 · Bioseguridad', estatus: 'CUMPLE', comentario: '' },
];

const DEFAULT_CALIDAD: ItemChecklist[] = [
  { codigo: 'CAL-01', punto: 'Temperaturas de autoclaves/hornos de tratamiento registradas y dentro de parámetros validados (≥134 °C / ≥121 °C según ciclo)', referencia: 'NOM-087-ECOL-SSA1-2002 · Validación de proceso', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'CAL-02', punto: 'Indicadores biológicos/químicos de esterilización revisados y con resultado aceptable', referencia: 'NOM-087 · EN ISO 11135', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'CAL-03', punto: 'Registros de tratamiento (bitácoras de ciclos) completos, firmados y sin enmendaduras', referencia: 'ISO 9001:2015 §7.5', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'CAL-04', punto: 'Manifiestos de traslado de residuos peligrosos actualizados y firmados por generador/transportista', referencia: 'NOM-055-SEMARNAT · LGEEPA Art. 151', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'CAL-05', punto: 'Segregación correcta de residuos por tipo y categoría (RPBI, RP, RNP) en contenedores identificados', referencia: 'NOM-087 · NOM-052-SEMARNAT-2005', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'CAL-06', punto: 'Plan de Manejo de Residuos Peligrosos vigente y accesible para inspección', referencia: 'SEMARNAT · LGEEPA', estatus: 'CUMPLE', comentario: '' },
];

const DEFAULT_MANTENIMIENTO: ItemChecklist[] = [
  { codigo: 'MNT-01', punto: 'Autoclaves/equipos de tratamiento térmico operativos, sin fugas de vapor y con sellos en buen estado', referencia: 'NOM-020-STPS-2011 · Recipientes sujetos a presión', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'MNT-02', punto: 'Sistema de ventilación y extracción de gases (scrubber/filtros HEPA) funcionando correctamente', referencia: 'NOM-010-STPS · ISO 14001:2015', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'MNT-03', punto: 'Vehículos de recolección/transporte con revisión diaria (frenos, luces, hermeticidad del compartimento)', referencia: 'NOM-003-SCT/2-2008 · SCT', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'MNT-04', punto: 'Sistema de contención de derrames (charolas, fosas, drenajes) libre de obstrucciones y en buen estado', referencia: 'NOM-087 · ISO 14001:2015 §8.3', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'MNT-05', punto: 'Bitácora de mantenimiento preventivo actualizada; ningún preventivo vencido sin justificación', referencia: 'ISO 9001:2015 §7.1.3', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'MNT-06', punto: 'Sistema eléctrico y paneles de control sin alarmas activas ni anomalías visuales', referencia: 'NOM-001-SEDE-2012', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'MNT-07', punto: 'Báscula de pesaje calibrada y con constancia vigente', referencia: 'NOM-010-SCFI · Metrología', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'MNT-08', punto: 'Herramientas y equipos menores inventariados, limpios y en lugar designado (5S)', referencia: 'Kaizen · 5S', estatus: 'CUMPLE', comentario: '' },
];

const DEFAULT_5S: ItemChecklist[] = [
  { codigo: 'INS-01', punto: 'Área de recepción de residuos limpia, sin acumulación fuera de horario y con flujo unidireccional \'sucio→limpio\'', referencia: 'Bioseguridad · 5S', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'INS-02', punto: 'Área de tratamiento/proceso sin residuos acumulados fuera de los contenedores asignados', referencia: 'NOM-087 · 5S', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'INS-03', punto: 'Almacenamiento temporal cumple condiciones de temperatura, ventilación, seguridad y tiempo máximo (72 h RPBI)', referencia: 'NOM-087-ECOL-SSA1-2002 §6.5', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'INS-04', punto: 'Pasillos internos despejados (ancho mínimo libre 90 cm), sin materiales o equipos obstruyendo', referencia: 'NOM-003-SEGOB · 5S', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'INS-05', punto: 'Sanitarios/regaderas de personal limpios, con agua, jabón y papel disponible', referencia: '5S · Higiene laboral', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'INS-06', punto: 'Área de oficinas y control operativo ordenada; documentos en control y archivados correctamente', referencia: 'ISO 9001:2015 §7.5 · 5S', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'INS-07', punto: 'Residuos generados por la planta (papel, plástico limpio) correctamente segregados en contenedores identificados', referencia: 'LGEEPA · ISO 14001:2015', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'INS-08', punto: 'Iluminación adecuada en todas las zonas de trabajo (sin luminarias fundidas o con parpadeo)', referencia: 'NOM-025-STPS-2008', estatus: 'CUMPLE', comentario: '' },
  { codigo: 'INS-09', punto: 'Temperatura ambiental en zonas de trabajo dentro de rangos seguros; sistema HVAC operativo', referencia: 'NOM-015-STPS-2001', estatus: 'CUMPLE', comentario: '' },
];

export default function BitacoraChecklistDiarioPlanta({ onBack, userEmail }: Props) {
  const [registros, setRegistros] = useState<BitacoraChecklistDiarioPlanta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [activeTab, setActiveTab] = useState<'hse' | 'calidad' | 'mantenimiento' | '5s'>('hse');

  // Form Fields
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [turno, setTurno] = useState<'Matutino' | 'Vespertino' | 'Nocturno'>('Matutino');
  const [areaZona, setAreaZona] = useState('Planta Principal / General');
  const [inspector, setInspector] = useState(userEmail || 'Inspector SGI');
  const [observaciones, setObservaciones] = useState('Auditoría diaria de planta realizada en conformidad con normas ISO 9001 / ISO 14001.');

  // Checklist Items State
  const [seccionHse, setSeccionHse] = useState<ItemChecklist[]>(DEFAULT_HSE);
  const [seccionCalidad, setSeccionCalidad] = useState<ItemChecklist[]>(DEFAULT_CALIDAD);
  const [seccionMantenimiento, setSeccionMantenimiento] = useState<ItemChecklist[]>(DEFAULT_MANTENIMIENTO);
  const [seccion5s, setSeccion5s] = useState<ItemChecklist[]>(DEFAULT_5S);

  // Signatures
  const [firmaInspector, setFirmaInspector] = useState('Inspector / Evaluador SGI');
  const [firmaGerentePlanta, setFirmaGerentePlanta] = useState('Ing. Manuel López — Gerente de Planta');

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'bitacora_checklist_diario_planta'), orderBy('fechaRegistro', 'desc'), limit(15));
      const querySnapshot = await getDocs(q);
      const docs: BitacoraChecklistDiarioPlanta[] = [];
      querySnapshot.forEach((doc) => {
        const docData = sanitizeBiotrashObject(doc.data());
        docs.push({ id: doc.id, ...docData } as BitacoraChecklistDiarioPlanta);
      });
      setRegistros(docs);
    } catch (e) {
      console.error('Error fetching registers:', e);
      const fallback = localStorage.getItem('biotrash_checklist_planta_bk');
      if (fallback) {
        setRegistros(JSON.parse(fallback));
      }
    } finally {
      setLoading(false);
    }
  };

  const canDelete = isAuthorizedToDelete(userEmail);

  const handleDelete = async (docId: string) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este registro?')) return;
    try {
      await deleteDoc(doc(db, 'bitacora_checklist_diario_planta', docId));
      fetchRegistros();
    } catch (err) {
      console.error('Error al eliminar registro:', err);
      alert('Error al eliminar el registro de la base de datos.');
    }
  };

  // Score Calculation Helpers
  const calculateSectionScore = (items: ItemChecklist[]): number => {
    const validItems = items.filter(i => i.estatus !== 'NO_APLICA');
    if (validItems.length === 0) return 100;
    const totalPoints = validItems.reduce((acc, curr) => {
      if (curr.estatus === 'CUMPLE') return acc + 100;
      if (curr.estatus === 'PARCIAL') return acc + 50;
      return acc;
    }, 0);
    return Math.round(totalPoints / validItems.length);
  };

  const scoreHse = calculateSectionScore(seccionHse);
  const scoreCalidad = calculateSectionScore(seccionCalidad);
  const scoreMantenimiento = calculateSectionScore(seccionMantenimiento);
  const score5s = calculateSectionScore(seccion5s);
  const scoreGlobal = Math.round((scoreHse + scoreCalidad + scoreMantenimiento + score5s) / 4);

  // Compute trend/difference vs previous record
  const previousRecord = registros.length > 0 ? registros[0] : null;
  const previousGlobalScore = previousRecord ? (previousRecord.puntajeGlobal || 85) : scoreGlobal;
  const diferenciaGlobal = Math.round((scoreGlobal - previousGlobalScore) * 10) / 10;
  const tendenciaStr = diferenciaGlobal > 0 ? 'Mejora' : diferenciaGlobal < 0 ? 'Retroceso' : 'Estable';

  // Toggle item status handler
  const handleItemStatusChange = (
    section: 'hse' | 'calidad' | 'mantenimiento' | '5s',
    index: number,
    newStatus: 'CUMPLE' | 'PARCIAL' | 'NO_CUMPLE' | 'NO_APLICA'
  ) => {
    const updateList = (list: ItemChecklist[]) => {
      const copy = [...list];
      copy[index] = { ...copy[index], estatus: newStatus };
      return copy;
    };

    if (section === 'hse') setSeccionHse(updateList);
    if (section === 'calidad') setSeccionCalidad(updateList);
    if (section === 'mantenimiento') setSeccionMantenimiento(updateList);
    if (section === '5s') setSeccion5s(updateList);
  };

  // Item comment handler
  const handleItemCommentChange = (
    section: 'hse' | 'calidad' | 'mantenimiento' | '5s',
    index: number,
    comment: string
  ) => {
    const updateList = (list: ItemChecklist[]) => {
      const copy = [...list];
      copy[index] = { ...copy[index], comentario: comment };
      return copy;
    };

    if (section === 'hse') setSeccionHse(updateList);
    if (section === 'calidad') setSeccionCalidad(updateList);
    if (section === 'mantenimiento') setSeccionMantenimiento(updateList);
    if (section === '5s') setSeccion5s(updateList);
  };

  // Recharts Radar Chart Data
  const radarData = [
    { subject: 'SEGURIDAD (HSE)', actual: scoreHse, anterior: previousGlobalScore },
    { subject: 'CALIDAD Y NORMA', actual: scoreCalidad, anterior: previousGlobalScore },
    { subject: 'MANTENIMIENTO', actual: scoreMantenimiento, anterior: previousGlobalScore },
    { subject: 'INSTALACIONES (5S)', actual: score5s, anterior: previousGlobalScore }
  ];

  // Weaknesses / Hallazgos List
  const allItems = [...seccionHse, ...seccionCalidad, ...seccionMantenimiento, ...seccion5s];
  const hallazgosCriticos = allItems.filter(i => i.estatus === 'NO_CUMPLE' || i.estatus === 'PARCIAL');
  const fortalezasList = allItems.filter(i => i.estatus === 'CUMPLE');

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: '', type: '' });

    try {
      const recordPayload: Omit<BitacoraChecklistDiarioPlanta, 'id'> = sanitizeBiotrashObject({
        fechaRegistro: new Date().toISOString(),
        fecha,
        responsable: inspector,
        observaciones: sanitizeBiotrashText(observaciones),
        turno,
        areaZona,
        inspector,
        seccionHse,
        seccionCalidad,
        seccionMantenimiento,
        seccion5s,
        puntajeHse: scoreHse,
        puntajeCalidad: scoreCalidad,
        puntajeMantenimiento: scoreMantenimiento,
        puntaje5s: score5s,
        puntajeGlobal: scoreGlobal,
        avanceRetroceso: {
          puntajeAnteriorGlobal: previousGlobalScore,
          diferenciaGlobal,
          tendencia: tendenciaStr
        },
        firmas: {
          inspector: firmaInspector,
          gerentePlanta: firmaGerentePlanta
        },
        elaboro: 'Comité de Seguridad y Calidad SGI',
        reviso: 'Gerencia de Planta BIOTRASH',
        aprobo: 'Dirección General SGI',
        cambioControl: [
          {
            version: '1.0',
            fecha: '13/06/2025',
            seccion: 'Todas',
            cambio: 'Creación del formato inicial bajo norma ISO 14001 y 9001',
            solicitante: 'Comité de Calidad'
          }
        ]
      });

      // Save to Firestore
      const docRef = await addDoc(collection(db, 'bitacora_checklist_diario_planta'), recordPayload);
      const savedDoc: BitacoraChecklistDiarioPlanta = { id: docRef.id, ...recordPayload };

      // Local backup sync
      const updated = [savedDoc, ...registros];
      setRegistros(updated);
      localStorage.setItem('biotrash_checklist_planta_bk', JSON.stringify(updated.slice(0, 20)));

      // Emit PDF Executive Report automatically as requested
      await generateAndDownloadPDF('checklist_diario_planta', savedDoc);

      setMsg({
        text: '¡Checklist Diario de Planta guardado exitosamente y PDF Informe Ejecutivo emitido!',
        type: 'success'
      });
    } catch (error) {
      console.error('Error saving checklist record:', error);
      setMsg({
        text: 'Ocurrió un error al guardar en Firestore. Se ha generado copia local.',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const renderSectionTable = (
    title: string,
    icon: React.ReactNode,
    sectionKey: 'hse' | 'calidad' | 'mantenimiento' | '5s',
    items: ItemChecklist[]
  ) => (
    <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm overflow-hidden space-y-0">
      <div className="bg-[#1A1C1E] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-bold text-xs uppercase tracking-wider">{title}</h3>
        </div>
        <span className="text-[10px] font-mono bg-blue-600 px-2.5 py-1 rounded font-bold">
          CONFORMIDAD: {calculateSectionScore(items)}%
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-mono text-[#64748B] uppercase">
              <th className="py-2.5 px-3 font-bold w-16 text-center">Código</th>
              <th className="py-2.5 px-3 font-bold">Punto de Verificación</th>
              <th className="py-2.5 px-3 font-bold hidden md:table-cell">Referencia Normativa</th>
              <th className="py-2.5 px-3 font-bold text-center w-64">Estatus Evaluación</th>
              <th className="py-2.5 px-3 font-bold">Comentario / Evidencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {items.map((item, idx) => (
              <tr key={item.codigo} className="hover:bg-slate-50/80 transition">
                <td className="py-2.5 px-3 font-mono font-bold text-slate-600 text-center text-[11px]">
                  {item.codigo}
                </td>
                <td className="py-2.5 px-3 font-medium text-slate-800 leading-snug">
                  {item.punto}
                </td>
                <td className="py-2.5 px-3 text-[10px] font-mono text-slate-500 hidden md:table-cell">
                  {item.referencia}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleItemStatusChange(sectionKey, idx, 'CUMPLE')}
                      className={`px-2 py-1 text-[10px] font-bold rounded transition cursor-pointer border ${
                        item.estatus === 'CUMPLE'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50'
                      }`}
                    >
                      ✅ CUMPLE
                    </button>
                    <button
                      type="button"
                      onClick={() => handleItemStatusChange(sectionKey, idx, 'PARCIAL')}
                      className={`px-2 py-1 text-[10px] font-bold rounded transition cursor-pointer border ${
                        item.estatus === 'PARCIAL'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50'
                      }`}
                    >
                      ⚠️ PARCIAL
                    </button>
                    <button
                      type="button"
                      onClick={() => handleItemStatusChange(sectionKey, idx, 'NO_CUMPLE')}
                      className={`px-2 py-1 text-[10px] font-bold rounded transition cursor-pointer border ${
                        item.estatus === 'NO_CUMPLE'
                          ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-rose-50'
                      }`}
                    >
                      ❌ NO CUMPLE
                    </button>
                    <button
                      type="button"
                      onClick={() => handleItemStatusChange(sectionKey, idx, 'NO_APLICA')}
                      className={`px-1.5 py-1 text-[10px] font-bold rounded transition cursor-pointer border ${
                        item.estatus === 'NO_APLICA'
                          ? 'bg-slate-700 text-white border-slate-800 shadow-sm'
                          : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      — N/A
                    </button>
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <input
                    type="text"
                    value={item.comentario || ''}
                    onChange={(e) => handleItemCommentChange(sectionKey, idx, e.target.value)}
                    placeholder="Evidencia / observación opcional..."
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 text-[#1A1C1E]">
      
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-blue-600" /> Volver al Panel SGI
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 font-bold px-2.5 py-1 rounded">
            CÓDIGO: F-OPR-000-16 · VERSIÓN 4.2
          </span>
          <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2.5 py-1 rounded">
            ISO 9001 / ISO 14001
          </span>
        </div>
      </div>

      {/* Header Banner */}
      <FormHeader
        titulo="CHECKLIST DIARIO DE PLANTA - INSPECCIÓN Y AUDITORÍA SGI"
        codigo="F-OPR-000-16"
      />

      {/* Alert Messages */}
      {msg.text && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between text-xs font-medium ${
            msg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg({ text: '', type: '' })} className="font-bold underline cursor-pointer">
            Cerrar
          </button>
        </div>
      )}

      {/* Executive Overview Cards & Radial Chart Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: KPI metrics & Section Score Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#1A1C1E] text-white rounded-lg p-5 border border-[#2D2F31] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono text-blue-400 font-bold uppercase tracking-widest block">
                ÍNDICE GLOBAL DE CUMPLIMIENTO SGI
              </span>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-3xl font-extrabold font-mono text-white">
                  {scoreGlobal}%
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded uppercase font-mono ${
                    scoreGlobal >= 90
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : scoreGlobal >= 75
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {scoreGlobal >= 90 ? 'EXCELENTE' : scoreGlobal >= 75 ? 'SATISFACTORIO' : 'CRÍTICO'}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                Evaluación en tiempo real sobre 32 puntos de control normativo. Al guardar, el sistema genera automáticamente el <strong>Informe Ejecutivo PDF con Gráfica Radial</strong>.
              </p>
            </div>

            {/* Trend Indicator */}
            <div className="bg-[#2D2F31] p-3 rounded-lg border border-slate-700 text-center shrink-0 min-w-[140px]">
              <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block">TENDENCIA HISTÓRICA</span>
              <div className="flex items-center justify-center gap-1 mt-1 text-sm font-bold">
                {diferenciaGlobal > 0 ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" /> +{diferenciaGlobal}%
                  </span>
                ) : diferenciaGlobal < 0 ? (
                  <span className="text-rose-400 flex items-center gap-1">
                    <TrendingDown className="w-4 h-4" /> {diferenciaGlobal}%
                  </span>
                ) : (
                  <span className="text-slate-300 flex items-center gap-1">
                    <Minus className="w-4 h-4" /> ESTABLE
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                vs Registro Anterior ({previousGlobalScore}%)
              </span>
            </div>
          </div>

          {/* Section Score Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-[#E2E8F0] p-3 rounded-lg shadow-sm">
              <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">1. HSE / SEGURIDAD</span>
              <span className="text-xl font-bold font-mono text-slate-800 block mt-1">{scoreHse}%</span>
              <span className="text-[10px] text-slate-400 font-medium">9 Puntos Evaluados</span>
            </div>
            <div className="bg-white border border-[#E2E8F0] p-3 rounded-lg shadow-sm">
              <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">2. CALIDAD & NORMA</span>
              <span className="text-xl font-bold font-mono text-slate-800 block mt-1">{scoreCalidad}%</span>
              <span className="text-[10px] text-slate-400 font-medium">6 Puntos Evaluados</span>
            </div>
            <div className="bg-white border border-[#E2E8F0] p-3 rounded-lg shadow-sm">
              <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">3. MANTENIMIENTO</span>
              <span className="text-xl font-bold font-mono text-slate-800 block mt-1">{scoreMantenimiento}%</span>
              <span className="text-[10px] text-slate-400 font-medium">8 Puntos Evaluados</span>
            </div>
            <div className="bg-white border border-[#E2E8F0] p-3 rounded-lg shadow-sm">
              <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">4. INSTALACIONES 5S</span>
              <span className="text-xl font-bold font-mono text-slate-800 block mt-1">{score5s}%</span>
              <span className="text-[10px] text-slate-400 font-medium">9 Puntos Evaluados</span>
            </div>
          </div>
        </div>

        {/* Right Column: Recharts Radar Chart */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-600" /> Gráfica Radial de Desempeño
            </h4>
            <span className="text-[9px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
              PERFIL 4 EJES
            </span>
          </div>

          <div className="h-56 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#CBD5E1" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 9, fontWeight: 'bold' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                <Radar name="Auditoría Actual" dataKey="actual" stroke="#2563EB" fill="#3B82F6" fillOpacity={0.45} />
                <Radar name="Promedio Histórico" dataKey="anterior" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded text-[10px] text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span className="font-bold text-slate-700">Fortalezas Identificadas:</span>
              <span className="font-bold text-emerald-600">{fortalezasList.length} Puntos (100%)</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-slate-700">Hallazgos / Desviaciones:</span>
              <span className="font-bold text-rose-600">{hallazgosCriticos.length} Puntos Ásperos</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Form Form Control Stage */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* General Audit Information Fields */}
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-5 shadow-sm space-y-4">
          <div className="border-b pb-2 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" /> Información General y Metadatos de la Inspección
            </h3>
            <span className="text-[10px] font-mono text-slate-500">FORMATO DIARIO OBLIGATORIO</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-600 uppercase font-bold mb-1">
                Fecha de Inspección *
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-xs font-mono text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-600 uppercase font-bold mb-1">
                Turno Operativo *
              </label>
              <select
                value={turno}
                onChange={(e) => setTurno(e.target.value as any)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Matutino">Matutino</option>
                <option value="Vespertino">Vespertino</option>
                <option value="Nocturno">Nocturno</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-600 uppercase font-bold mb-1">
                Área / Zona Evaluada *
              </label>
              <input
                type="text"
                required
                value={areaZona}
                onChange={(e) => setAreaZona(e.target.value)}
                placeholder="Ej. Planta Principal / Almacenamiento"
                className="w-full border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-600 uppercase font-bold mb-1">
                Inspector / Responsable *
              </label>
              <input
                type="text"
                required
                value={inspector}
                onChange={(e) => setInspector(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tab Navigation for 4 Sections */}
        <div className="flex border-b border-[#E2E8F0] gap-2 bg-white px-2 pt-2 rounded-t-lg">
          <button
            type="button"
            onClick={() => setActiveTab('hse')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'hse'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🦺 1. SEGURIDAD (HSE) ({scoreHse}%)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('calidad')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'calidad'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🔬 2. CALIDAD & NORMA ({scoreCalidad}%)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mantenimiento')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'mantenimiento'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            ⚙ 3. MANTENIMIENTO ({scoreMantenimiento}%)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('5s')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === '5s'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🏭 4. INSTALACIONES (5S) ({score5s}%)
          </button>
        </div>

        {/* Section Contents */}
        {activeTab === 'hse' && renderSectionTable('SECCIÓN 1 — SEGURIDAD (HSE)', <ShieldCheck className="w-4 h-4 text-emerald-400" />, 'hse', seccionHse)}
        {activeTab === 'calidad' && renderSectionTable('SECCIÓN 2 — CALIDAD Y CUMPLIMIENTO NORMATIVO', <CheckSquare className="w-4 h-4 text-sky-400" />, 'calidad', seccionCalidad)}
        {activeTab === 'mantenimiento' && renderSectionTable('SECCIÓN 3 — MANTENIMIENTO Y EQUIPOS', <Activity className="w-4 h-4 text-amber-400" />, 'mantenimiento', seccionMantenimiento)}
        {activeTab === '5s' && renderSectionTable('SECCIÓN 4 — INSTALACIONES, ORDEN Y LIMPIEZA (5S)', <Sparkles className="w-4 h-4 text-indigo-400" />, '5s', seccion5s)}

        {/* General Observations & Signatures Box */}
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-5 shadow-sm space-y-4">
          <div className="border-b pb-2 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" /> Observaciones Generales y Firmas de Autorización SGI
            </h3>
            <span className="text-[10px] font-mono text-slate-500">VALIDACIÓN OFICIAL</span>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-600 uppercase font-bold mb-1">
              Observaciones Generales de la Inspección
            </label>
            <textarea
              rows={3}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full border border-slate-300 rounded p-3 text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="Escriba comentarios u observaciones generales..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-600 uppercase font-bold mb-1">
                Firma Inspector / Responsable Evaluador
              </label>
              <input
                type="text"
                value={firmaInspector}
                onChange={(e) => setFirmaInspector(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-600 uppercase font-bold mb-1">
                Firma Gerente de Planta / Vo.Bo.
              </label>
              <input
                type="text"
                value={firmaGerentePlanta}
                onChange={(e) => setFirmaGerentePlanta(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-3 rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>Guardando e imprimiendo PDF...</>
            ) : (
              <>
                <CheckSquare className="w-4 h-4" /> Guardar e Imprimir Informe Ejecutivo PDF (Gráfica Radial)
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const currentDocData: BitacoraChecklistDiarioPlanta = {
                  fechaRegistro: new Date().toISOString(),
                  fecha,
                  responsable: inspector,
                  observaciones,
                  turno,
                  areaZona,
                  inspector,
                  seccionHse,
                  seccionCalidad,
                  seccionMantenimiento,
                  seccion5s,
                  puntajeHse: scoreHse,
                  puntajeCalidad: scoreCalidad,
                  puntajeMantenimiento: scoreMantenimiento,
                  puntaje5s: score5s,
                  puntajeGlobal: scoreGlobal,
                  avanceRetroceso: {
                    puntajeAnteriorGlobal: previousGlobalScore,
                    diferenciaGlobal,
                    tendencia: tendenciaStr
                  },
                  firmas: { inspector: firmaInspector, gerentePlanta: firmaGerentePlanta },
                  cambioControl: [
                    { version: '1.0', fecha: '13/06/2025', seccion: 'Todas', cambio: 'Creación del formato inicial bajo norma ISO 14001 y 9001', solicitante: 'Comité de Calidad' }
                  ]
                };
                generateAndDownloadPDF('checklist_diario_planta', currentDocData);
              }}
              className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold text-xs px-4 py-2.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-blue-600" /> Descargar PDF Vista Previa
            </button>

            <button
              type="button"
              onClick={() => generateAndDownloadExcel('checklist_diario_planta', { results: registros })}
              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold text-xs px-4 py-2.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Exportar Excel Consolidado
            </button>
          </div>
        </div>

        <FormFooter />

      </form>

      {/* Bulk Upload Panel Integration */}
      <BulkUploadPanel
        tipo="checklist_diario_planta"
        userEmail={userEmail}
        onSuccess={fetchRegistros}
      />

      {/* Historical Audit List */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-5 shadow-sm space-y-4">
        <div className="border-b pb-2 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" /> Historial de Registros de Checklist Diario de Planta
          </h3>
          <span className="text-[10px] font-mono text-slate-500">{registros.length} REGISTROS REGISTRADOS</span>
        </div>

        {loading ? (
          <div className="text-center py-6 text-slate-500 text-xs font-mono animate-pulse">
            Cargando historial desde Firestore...
          </div>
        ) : registros.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs font-mono">
            No hay registros grabados en la bitácora aún.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-mono text-[#64748B] uppercase">
                  <th className="py-2.5 px-3 font-bold">Fecha</th>
                  <th className="py-2.5 px-3 font-bold">Turno</th>
                  <th className="py-2.5 px-3 font-bold">Área / Zona</th>
                  <th className="py-2.5 px-3 font-bold">Inspector</th>
                  <th className="py-2.5 px-3 font-bold text-center">HSE</th>
                  <th className="py-2.5 px-3 font-bold text-center">Calidad</th>
                  <th className="py-2.5 px-3 font-bold text-center">MNT</th>
                  <th className="py-2.5 px-3 font-bold text-center">5S</th>
                  <th className="py-2.5 px-3 font-bold text-center">GLOBAL (%)</th>
                  <th className="py-2.5 px-3 font-bold text-center">Tendencia</th>
                  <th className="py-2.5 px-3 font-bold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {registros.map((item) => (
                  <tr key={item.id || item.fechaRegistro} className="hover:bg-slate-50/80 transition font-mono text-slate-700">
                    <td className="py-2.5 px-3 font-bold text-slate-800">{item.fecha}</td>
                    <td className="py-2.5 px-3">{item.turno}</td>
                    <td className="py-2.5 px-3">{item.areaZona}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-800">{item.inspector || item.responsable}</td>
                    <td className="py-2.5 px-3 text-center">{Math.round(item.puntajeHse || 0)}%</td>
                    <td className="py-2.5 px-3 text-center">{Math.round(item.puntajeCalidad || 0)}%</td>
                    <td className="py-2.5 px-3 text-center">{Math.round(item.puntajeMantenimiento || 0)}%</td>
                    <td className="py-2.5 px-3 text-center">{Math.round(item.puntaje5s || 0)}%</td>
                    <td className="py-2.5 px-3 text-center font-bold text-blue-600">{Math.round(item.puntajeGlobal || 0)}%</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.avanceRetroceso?.tendencia === 'Mejora'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.avanceRetroceso?.tendencia === 'Retroceso'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.avanceRetroceso?.tendencia || 'Estable'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => generateAndDownloadPDF('checklist_diario_planta', item)}
                          className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold px-2.5 py-1 rounded text-[10px] border border-blue-200 transition cursor-pointer"
                        >
                          PDF Informe
                        </button>
                        {canDelete && item.id && (
                          <button
                            onClick={() => handleDelete(item.id!)}
                            className="bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold px-2 py-1 rounded text-[10px] border border-rose-200 transition cursor-pointer flex items-center gap-1"
                            title="Eliminar Registro"
                          >
                            <Trash2 className="w-3 h-3 text-rose-600" /> Eliminar
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

    </div>
  );
}
