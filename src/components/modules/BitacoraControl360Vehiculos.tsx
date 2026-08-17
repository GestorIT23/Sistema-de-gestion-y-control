import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, limit } from 'firebase/firestore';
import type { BitacoraControl360Vehiculos, EstadoCumplimiento360 } from '../../types';
import FormHeader from '../FormHeader';
import FormFooter from '../FormFooter';
import { 
  Truck, 
  Calendar, 
  User, 
  ArrowLeft, 
  Database, 
  ShieldCheck, 
  AlertCircle, 
  FileSpreadsheet, 
  FileText, 
  CheckSquare, 
  Clock, 
  ShieldAlert, 
  MapPin, 
  CheckCircle2, 
  Sparkles, 
  Printer, 
  Trash2, 
  Info,
  Scale,
  Droplets,
  HelpCircle,
  FileCheck,
  PackageCheck
} from 'lucide-react';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';
import { generateAndDownloadExcel } from '../../utils/excelGenerator';
import { sanitizeBiotrashObject, sanitizeBiotrashText } from '../../utils/textSanitizer';
import { isAuthorizedToDelete } from '../../utils/authUtils';

interface Props {
  onBack: () => void;
  userEmail: string;
}

// Data Definition for Decision Tree and Matrices
const CENTROS_RUTAS = [
  {
    id: 'quetzaltenango',
    nombre: 'QUETZALTENANGO',
    rutas: [
      { codigo: 'XELA-OCC', nombre: 'Occidente', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] },
      { codigo: 'XELA-AP1', nombre: 'Apoyo1', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] },
      { codigo: 'XELA-AT1', nombre: 'Atanacio1', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] },
      { codigo: 'XELA-M5', nombre: 'Moto5', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] }
    ]
  },
  {
    id: 'villa_nueva_1',
    nombre: 'VILLA NUEVA 1',
    rutas: [
      { codigo: 'VN1-BLA', nombre: 'Blanca', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] },
      { codigo: 'VN1-NAR', nombre: 'Naranja', dias: ['Lunes', 'Martes', 'Miércoles', 'Viernes'] },
      { codigo: 'VN1-AZU', nombre: 'Azul', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] },
      { codigo: 'VN1-IND', nombre: 'Industria', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] },
      { codigo: 'VN1-M03', nombre: 'Moto03', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] },
      { codigo: 'VN1-M09', nombre: 'Moto09', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] }
    ]
  },
  {
    id: 'villa_nueva_2',
    nombre: 'VILLA NUEVA 2',
    rutas: [
      { codigo: 'VN2-TC1', nombre: 'Tecun1', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] },
      { codigo: 'VN2-TC2', nombre: 'Tecun2', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] },
      { codigo: 'VN2-TC3', nombre: 'Tecun3', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] },
      { codigo: 'VN2-TC4', nombre: 'Tecun4', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] },
      { codigo: 'VN2-TCPM', nombre: 'TecunPM', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] },
      { codigo: 'VN2-M01', nombre: 'Moto01', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] },
      { codigo: 'VN2-M02', nombre: 'Moto02', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] },
      { codigo: 'VN2-M04', nombre: 'Moto04', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] },
      { codigo: 'VN2-M07', nombre: 'Moto07', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] },
      { codigo: 'VN2-M09', nombre: 'Moto09', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] },
      { codigo: 'VN2-M10', nombre: 'Moto10', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] }
    ]
  },
  {
    id: 'escuintla',
    nombre: 'ESCUINTLA',
    rutas: [
      { codigo: 'ESC-COS1', nombre: 'Costa', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] },
      { codigo: 'ESC-COS2', nombre: 'Costa2', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] },
      { codigo: 'ESC-GRI', nombre: 'Gris', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] },
      { codigo: 'ESC-AT2', nombre: 'Atanacio2', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] }
    ]
  },
  {
    id: 'traslados',
    nombre: 'TRASLADOS',
    rutas: [
      { codigo: 'TR-FUR', nombre: 'Furgon', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] },
      { codigo: 'TR-VOL1', nombre: 'Volteo1', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] },
      { codigo: 'TR-VOL2', nombre: 'Volteo2', dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] }
    ]
  }
];

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Placas Catalog (21 Activas, 20 En Espera)
const PLACAS_ACTIVAS = [
  '564BVW', '528BSV', '693BRL', '190BQL', '641BVP', '385JLN', '036BTT',
  '638BVP', '639BVP', '640BVP', '730GWG', '037BTT', '293JLN', '294JLN',
  '295JLN', '760GSD', '565BVW', '793BWM', '239HPK', '754BSY', '448BYY'
];

const PLACAS_EN_ESPERA = [
  '446BYY', '447BYY', '362BVD', '725BXD', '726BXD', '987BFS', '963BSV',
  '527BSV', '094BRS', '259BWK', '334BSM', 'C-066BZP', '514CBP', '518CBP',
  '515CBP', '513CBP', '517CBP', '516CBP', '473CBN', '472CBN'
];

export default function BitacoraControl360Vehiculos({ onBack, userEmail }: Props) {
  const [activeTab, setActiveTab] = useState<'formulario' | 'arbol' | 'matriz' | 'placas' | 'norma' | 'historial'>('formulario');
  
  // Árbol de decisión state
  const [selectedCentroArbol, setSelectedCentroArbol] = useState<string>('villa_nueva_1');
  const [selectedDiaArbol, setSelectedDiaArbol] = useState<string>('Lunes');

  // Control Form State
  const [fecha, setFecha] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [turno, setTurno] = useState<'AM' | 'PM' | 'Nocturno'>('AM');
  const [folio, setFolio] = useState<string>(() => `CTR-360-${Math.floor(1000 + Math.random() * 9000)}`);
  const [centro, setCentro] = useState<string>('VILLA NUEVA 1');
  const [ruta, setRuta] = useState<string>('Blanca');
  const [placa, setPlaca] = useState<string>('564BVW');
  const [tipoVehiculo, setTipoVehiculo] = useState<string>('Camion');
  const [conductor, setConductor] = useState<string>('');
  const [noLicencia, setNoLicencia] = useState<string>('');
  
  // Section B Mechanical & Biosafety Checklists (4-state values)
  const [frenos, setFrenos] = useState<EstadoCumplimiento360>('Cumple');
  const [llantas, setLlantas] = useState<EstadoCumplimiento360>('Cumple');
  const [luces, setLuces] = useState<EstadoCumplimiento360>('Cumple');
  const [extintor, setExtintor] = useState<EstadoCumplimiento360>('Cumple');
  const [cinturones, setCinturones] = useState<EstadoCumplimiento360>('Cumple');
  const [espejos, setEspejos] = useState<EstadoCumplimiento360>('Cumple');
  const [combustible, setCombustible] = useState<EstadoCumplimiento360>('Cumple');
  const [botiquin, setBotiquin] = useState<EstadoCumplimiento360>('Cumple');

  const [selloHermetico, setSelloHermetico] = useState<EstadoCumplimiento360>('Cumple');
  const [biohazardVisible, setBiohazardVisible] = useState<EstadoCumplimiento360>('Cumple');
  const [desinfeccionPrevia, setDesinfeccionPrevia] = useState<EstadoCumplimiento360>('Cumple');
  const [kitDerrame, setKitDerrame] = useState<EstadoCumplimiento360>('Cumple');
  const [eppCompleto, setEppCompleto] = useState<EstadoCumplimiento360>('Cumple');

  // Cantidad de contenedores rojos limpios y vacíos a bordo
  const [contenedoresRojosLimpiosVacios, setContenedoresRojosLimpiosVacios] = useState<number>(0);

  const [horaSalida, setHoraSalida] = useState<string>('06:00');
  const [kmSalida, setKmSalida] = useState<number>(125400);
  const [obsSalida, setObsSalida] = useState<string>('');

  // Section C Delivery at Treatment Plant
  const [horaLlegadaPlanta, setHoraLlegadaPlanta] = useState<string>('14:30');
  const [pesoEntregadoLbs, setPesoEntregadoLbs] = useState<number>(0);
  const [recibidoPorPlanta, setRecibidoPorPlanta] = useState<string>('');

  // Section D Post-Operational Inspection & Disinfection
  const [descargaCompleta, setDescargaCompleta] = useState<boolean>(true);
  const [limpiezaInterior, setLimpiezaInterior] = useState<boolean>(true);
  const [desinfectanteUtilizado, setDesinfectanteUtilizado] = useState<string>('Hipoclorito de Sodio 1% (10,000 ppm)');
  const [tiempoContactoMinutos, setTiempoContactoMinutos] = useState<number>(10);
  const [horaFinDesinfeccion, setHoraFinDesinfeccion] = useState<string>('15:15');
  const [kmLlegada, setKmLlegada] = useState<number>(125480);
  const [horaLlegadaFinal, setHoraLlegadaFinal] = useState<string>('15:30');

  // Section E Final Validation & Notes
  const [novedadesRuta, setNovedadesRuta] = useState<string>('Sin novedades durante la jornada.');
  const [accionesCorrectivas, setAccionesCorrectivas] = useState<string>('Ninguna');
  const [firmaConductor, setFirmaConductor] = useState<string>('');
  const [firmaSupervisor, setFirmaSupervisor] = useState<string>('');
  const [firmaPlanta, setFirmaPlanta] = useState<string>('');

  // Historical Records state
  const [registros, setRegistros] = useState<BitacoraControl360Vehiculos[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Delete modal state
  const [recordToDelete, setRecordToDelete] = useState<BitacoraControl360Vehiculos | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [deleteFeedback, setDeleteFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Filter placa state for Placas tab
  const [filterPlacaTipo, setFilterPlacaTipo] = useState<'todas' | 'activas' | 'espera'>('todas');

  // Calculate critical checklist completion (must be 'Cumple' or 'N/A')
  const criticalItems = [
    { name: 'Frenos', val: frenos },
    { name: 'Llantas', val: llantas },
    { name: 'Extintor ABC', val: extintor },
    { name: 'Sello Hermético', val: selloHermetico },
    { name: 'Señalización Biohazard', val: biohazardVisible },
    { name: 'Desinfección Previa', val: desinfeccionPrevia },
    { name: 'Kit de Derrames', val: kitDerrame },
    { name: 'EPP Completo', val: eppCompleto }
  ];
  const criticalFailed = criticalItems.filter(item => item.val === 'No Cumple');
  const criticalCountMissing = criticalFailed.length;
  const isCriticalApproved = criticalCountMissing === 0;

  const kmRecorridosCalculado = Math.max(0, (Number(kmLlegada) || 0) - (Number(kmSalida) || 0));

  // Determine if selected placa is in "En Espera"
  const isPlacaEnEspera = PLACAS_EN_ESPERA.includes(placa);

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'bitacora_control_360_vehiculos'), orderBy('fechaRegistro', 'desc'), limit(50));
      const snap = await getDocs(q);
      const list: BitacoraControl360Vehiculos[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as BitacoraControl360Vehiculos);
      });
      setRegistros(list);
    } catch (e) {
      console.warn("Could not fetch 360 vehicle logs:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveForm = async () => {
    if (!conductor.trim()) {
      alert('Por favor ingrese el nombre del conductor.');
      return;
    }

    try {
      setSaving(true);
      const docData: BitacoraControl360Vehiculos = {
        fechaRegistro: new Date().toISOString(),
        fecha,
        responsable: userEmail || 'operador@biotrash.net',
        observaciones: novedadesRuta,
        elaboro: conductor || 'Conductor de Ruta',
        reviso: firmaSupervisor || 'Supervisor de Flota',
        aprobo: 'Gerente de Logística y Operaciones',
        cambioControl: [
          {
            version: '4.2',
            fecha: new Date().toISOString().split('T')[0],
            seccion: 'Control Integral 360',
            cambio: 'Registro y validación de salida/llegada operativa con 4 estados de cumplimiento',
            solicitante: userEmail || 'Sistema SGI'
          }
        ],
        turno,
        folio,
        centro,
        ruta,
        placa,
        estadoPlaca: isPlacaEnEspera ? 'En Espera' : 'Activa',
        tipoVehiculo,
        conductor,
        noLicencia,
        contenedoresRojosLimpiosVacios: Number(contenedoresRojosLimpiosVacios) || 0,
        checklistMecanico: {
          frenos,
          llantas,
          luces,
          extintor,
          cinturones,
          espejos,
          combustible,
          botiquin
        },
        checklistBioseguridad: {
          selloHermetico,
          biohazardVisible,
          desinfeccionPrevia,
          kitDerrame,
          eppCompleto
        },
        horaSalida,
        kmSalida: Number(kmSalida) || 0,
        obsSalida,
        todosCriticosAprobados: isCriticalApproved,
        horaLlegadaPlanta,
        pesoEntregadoLbs: Number(pesoEntregadoLbs) || 0,
        pesoEntregadoKg: Number(pesoEntregadoLbs) || 0,
        totalPesoLbs: Number(pesoEntregadoLbs) || 0,
        recibidoPorPlanta,
        descargaCompleta,
        limpiezaInterior,
        desinfectanteUtilizado,
        tiempoContactoMinutos: Number(tiempoContactoMinutos) || 10,
        horaFinDesinfeccion,
        kmLlegada: Number(kmLlegada) || 0,
        kmRecorridos: kmRecorridosCalculado,
        horaLlegadaFinal,
        novedadesRuta,
        accionesCorrectivas,
        firmaConductor: firmaConductor || conductor,
        firmaSupervisor: firmaSupervisor || 'Supervisor SGI',
        firmaPlanta: firmaPlanta || recibidoPorPlanta
      };

      const cleanDoc = sanitizeBiotrashObject(docData);
      await addDoc(collection(db, 'bitacora_control_360_vehiculos'), cleanDoc);
      alert('¡Control 360° de Vehículo guardado con éxito en el Sistema SGI!');
      
      // Refresh list and generate new folio
      setFolio(`CTR-360-${Math.floor(1000 + Math.random() * 9000)}`);
      fetchRegistros();
      setActiveTab('historial');
    } catch (e: any) {
      console.error('Error guardando control 360:', e);
      alert(`Error al guardar: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete?.id) return;
    try {
      setDeleteLoading(true);
      await deleteDoc(doc(db, 'bitacora_control_360_vehiculos', recordToDelete.id));
      setRegistros(prev => prev.filter(r => r.id !== recordToDelete.id));
      setDeleteFeedback({ msg: `Boleta ${recordToDelete.folio || ''} eliminada exitosamente.`, type: 'success' });
      setRecordToDelete(null);
      setTimeout(() => setDeleteFeedback(null), 4000);
    } catch (e: any) {
      console.error('Error eliminando boleta:', e);
      setDeleteFeedback({ msg: `Error al eliminar boleta: ${e.message}`, type: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExportPDF = () => {
    const docForExport: BitacoraControl360Vehiculos = {
      fechaRegistro: new Date().toISOString(),
      fecha,
      responsable: userEmail,
      observaciones: novedadesRuta,
      elaboro: conductor,
      reviso: firmaSupervisor,
      aprobo: 'Gerente General',
      cambioControl: [],
      turno,
      folio,
      centro,
      ruta,
      placa,
      estadoPlaca: isPlacaEnEspera ? 'En Espera' : 'Activa',
      tipoVehiculo,
      conductor,
      noLicencia,
      contenedoresRojosLimpiosVacios: Number(contenedoresRojosLimpiosVacios) || 0,
      checklistMecanico: { frenos, llantas, luces, extintor, cinturones, espejos, combustible, botiquin },
      checklistBioseguridad: { selloHermetico, biohazardVisible, desinfeccionPrevia, kitDerrame, eppCompleto },
      horaSalida,
      kmSalida: Number(kmSalida) || 0,
      obsSalida,
      todosCriticosAprobados: isCriticalApproved,
      horaLlegadaPlanta,
      pesoEntregadoLbs: Number(pesoEntregadoLbs) || 0,
      pesoEntregadoKg: Number(pesoEntregadoLbs) || 0,
      totalPesoLbs: Number(pesoEntregadoLbs) || 0,
      recibidoPorPlanta,
      descargaCompleta,
      limpiezaInterior,
      desinfectanteUtilizado,
      tiempoContactoMinutos: Number(tiempoContactoMinutos) || 10,
      horaFinDesinfeccion,
      kmLlegada: Number(kmLlegada) || 0,
      kmRecorridos: kmRecorridosCalculado,
      horaLlegadaFinal,
      novedadesRuta,
      accionesCorrectivas,
      firmaConductor,
      firmaSupervisor,
      firmaPlanta
    };
    generateAndDownloadPDF('control_360_vehiculos', docForExport);
  };

  const handleExportExcel = () => {
    if (registros.length === 0) {
      alert('No hay registros en el historial para exportar.');
      return;
    }
    generateAndDownloadExcel('control_360_vehiculos', { results: registros });
  };

  // Get current center object for tree
  const currentCentroObj = CENTROS_RUTAS.find(c => c.id === selectedCentroArbol) || CENTROS_RUTAS[0];
  const rutasOperan = currentCentroObj.rutas.filter(r => r.dias.includes(selectedDiaArbol));
  const rutasNoOperan = currentCentroObj.rutas.filter(r => !r.dias.includes(selectedDiaArbol));

  return (
    <div id="modulo-control-360-vehiculos" className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fade-in text-[#1A1C1E]">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div className="flex items-center gap-3">
          <button 
            id="btn-back-dashboard"
            onClick={onBack}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition cursor-pointer"
            title="Volver al menú de módulos"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#1A3A5C] text-white text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                F-OPR-000-17 · TR-360
              </span>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                Acuerdo 509-2001 MSPAS
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#1A3A5C] flex items-center gap-2 mt-1">
              <Truck className="w-6 h-6 text-[#1A7A4A]" /> Sistema de Control 360° de Vehículos
            </h1>
            <p className="text-xs text-slate-500">
              Transporte, bioseguridad, trazabilidad de recolección y cumplimiento legal de RPBI
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded flex items-center gap-1.5 transition cursor-pointer"
          >
            <FileText className="w-4 h-4 text-rose-400" /> Exportar PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-2 rounded flex items-center gap-1.5 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" /> Exportar Excel
          </button>
          <button
            onClick={() => window.print()}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2 rounded border border-slate-300 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Imprimir A4
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 gap-1 bg-white p-1 rounded-lg shadow-sm">
        <button
          onClick={() => setActiveTab('formulario')}
          className={`px-4 py-2 text-xs font-bold rounded transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'formulario'
              ? 'bg-[#1A3A5C] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileCheck className="w-4 h-4" /> Formulario 360°
        </button>

        <button
          onClick={() => setActiveTab('arbol')}
          className={`px-4 py-2 text-xs font-bold rounded transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'arbol'
              ? 'bg-[#1A3A5C] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-4 h-4" /> Árbol de Decisión
        </button>

        <button
          onClick={() => setActiveTab('matriz')}
          className={`px-4 py-2 text-xs font-bold rounded transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'matriz'
              ? 'bg-[#1A3A5C] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" /> Matriz de Rutas
        </button>

        <button
          onClick={() => setActiveTab('placas')}
          className={`px-4 py-2 text-xs font-bold rounded transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'placas'
              ? 'bg-[#1A3A5C] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-4 h-4" /> Control de Placas
        </button>

        <button
          onClick={() => setActiveTab('norma')}
          className={`px-4 py-2 text-xs font-bold rounded transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'norma'
              ? 'bg-[#1A3A5C] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> Norma 509-2001
        </button>

        <button
          onClick={() => setActiveTab('historial')}
          className={`px-4 py-2 text-xs font-bold rounded transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'historial'
              ? 'bg-[#1A3A5C] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4" /> Historial de Boletas ({registros.length})
        </button>
      </div>

      {/* ====================================================================
           TAB 1: FORMULARIO 360°
           ==================================================================== */}
      {activeTab === 'formulario' && (
        <div className="space-y-6">

          {/* Banner de Estado Crítico */}
          <div className={`p-4 rounded-lg border flex items-center justify-between transition-all ${
            isCriticalApproved 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
              : 'bg-rose-50 border-rose-400 text-rose-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isCriticalApproved ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'}`}>
                {isCriticalApproved ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              </div>
              <div>
                <h4 className="font-bold text-sm">
                  {isCriticalApproved 
                    ? '✅ UNIDAD AUTORIZADA PARA SALIDA OPERATIVA' 
                    : '⛔ BLOQUEO PRE-OPERACIONAL DE SALIDA ACTIVO'}
                </h4>
                <p className="text-xs">
                  {isCriticalApproved
                    ? 'Todos los 8 ítems críticos mecánicos y de bioseguridad han sido verificados con éxito.'
                    : `El vehículo no puede salir a ruta. Faltan ${criticalCountMissing} ítems críticos obligatorios por verificar.`}
                </p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isCriticalApproved ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}>
              {isCriticalApproved ? 'APROBADO' : `${criticalCountMissing} PENDIENTES`}
            </span>
          </div>

          {/* Form Header Component */}
          <FormHeader 
            codigo="BIOTRASH 4.2. F-OPR-000-17"
            titulo="CONTROL 360° DE VEHÍCULOS - TRANSPORTE DE DESECHOS BIOINFECCIOSOS"
            version="4.2"
          />

          {/* SECCIÓN A: IDENTIFICACIÓN */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-slate-100 to-white px-5 py-3 border-b-2 border-[#1A3A5C] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#1A3A5C] uppercase tracking-wide flex items-center gap-2">
                <Truck className="w-4 h-4" /> SECCIÓN A — Identificación del Vehículo y Ruta
              </h3>
              <span className="text-xs font-semibold text-slate-500 font-mono">Folio: {folio}</span>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha de Operación *</label>
                <input 
                  type="date" 
                  value={fecha} 
                  onChange={e => setFecha(e.target.value)} 
                  className="w-full border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Turno *</label>
                <select 
                  value={turno} 
                  onChange={e => setTurno(e.target.value as any)} 
                  className="w-full border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                >
                  <option value="AM">Diurno / AM</option>
                  <option value="PM">Vespertino / PM</option>
                  <option value="Nocturno">Nocturno</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Centro / Distribuidora *</label>
                <select 
                  value={centro} 
                  onChange={e => {
                    setCentro(e.target.value);
                    const c = CENTROS_RUTAS.find(x => x.nombre === e.target.value);
                    if (c && c.rutas.length > 0) setRuta(c.rutas[0].nombre);
                  }} 
                  className="w-full border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                >
                  {CENTROS_RUTAS.map(c => (
                    <option key={c.id} value={c.nombre}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ruta Asignada *</label>
                <select 
                  value={ruta} 
                  onChange={e => setRuta(e.target.value)} 
                  className="w-full border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                >
                  {CENTROS_RUTAS.find(c => c.nombre === centro)?.rutas.map(r => (
                    <option key={r.codigo} value={r.nombre}>{r.codigo} - {r.nombre}</option>
                  )) || <option value={ruta}>{ruta}</option>}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">No. de Placa *</label>
                <select 
                  value={placa} 
                  onChange={e => setPlaca(e.target.value)} 
                  className="w-full border border-slate-300 rounded p-2 text-xs font-mono font-bold focus:ring-1 focus:ring-blue-500"
                >
                  <optgroup label="🟢 Placas Activas (Despacho Inmediato)">
                    {PLACAS_ACTIVAS.map(p => (
                      <option key={p} value={p}>{p} (Activa)</option>
                    ))}
                  </optgroup>
                  <optgroup label="🟠 Placas En Espera (Requiere Autorización)">
                    {PLACAS_EN_ESPERA.map(p => (
                      <option key={p} value={p}>{p} (En Espera)</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Vehículo *</label>
                <select 
                  value={tipoVehiculo} 
                  onChange={e => setTipoVehiculo(e.target.value)} 
                  className="w-full border border-slate-300 rounded p-2 text-xs bg-white font-medium"
                >
                  <option value="Camion">Camion</option>
                  <option value="Pickup">Pickup</option>
                  <option value="Motocicleta">Motocicleta</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre Conductor *</label>
                <input 
                  type="text" 
                  value={conductor} 
                  onChange={e => setConductor(e.target.value)} 
                  className="w-full border border-slate-300 rounded p-2 text-xs" 
                  placeholder="Nombre y Apellidos" 
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kilometraje Inicial *</label>
                <input 
                  type="number" 
                  value={kmSalida || ''} 
                  onChange={e => setKmSalida(Number(e.target.value))} 
                  className="w-full border border-slate-300 rounded p-2 text-xs font-mono font-bold text-slate-800" 
                  placeholder="Ej. 125400" 
                />
              </div>

              {isPlacaEnEspera && (
                <div className="col-span-full p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded text-xs flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <strong>UNIDAD EN ESPERA:</strong> La placa seleccionada requiere validación formal del Jefe de Flota antes de emitir la salida a ruta.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECCIÓN B: INSPECCIÓN PRE-OPERACIONAL */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-slate-100 to-white px-5 py-3 border-b-2 border-[#1A3A5C] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#1A3A5C] uppercase tracking-wide flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> SECCIÓN B — Inspección Pre-Operacional (Checklist 360° y Contenedores)
              </h3>
              <span className="text-xs font-semibold text-slate-600">4 Estados: Cumple · Parcial · No Cumple · N/A</span>
            </div>

            <div className="p-5 space-y-6">

              {/* Campo para Indicar la Cantidad de Contenedores Rojos Limpios y Vacíos */}
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-100 text-rose-700 rounded-lg shrink-0">
                    <PackageCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <label className="block font-bold text-xs text-rose-950 mb-0.5">
                      📦 Cantidad de Contenedores Rojos Limpios y Vacíos a Bordo *
                    </label>
                    <p className="text-[11px] text-rose-800">
                      Número de recipientes rígidos rojos desinfectados y vacíos disponibles en la unidad para intercambio en la ruta.
                    </p>
                  </div>
                </div>
                <div className="w-full sm:w-36 shrink-0">
                  <input 
                    type="number" 
                    min="0"
                    value={contenedoresRojosLimpiosVacios} 
                    onChange={e => setContenedoresRojosLimpiosVacios(Math.max(0, parseInt(e.target.value) || 0))} 
                    className="w-full bg-white border-2 border-rose-300 rounded p-2 text-center text-base font-bold text-rose-900 focus:ring-2 focus:ring-rose-500 font-mono" 
                    placeholder="0" 
                  />
                </div>
              </div>

              {/* Grid de Checklist Mecánico y Bioseguridad con 4 Estados */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Grupo 1: Mecánico */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 text-xs">
                  <h4 className="font-bold text-slate-800 border-b pb-2 flex items-center justify-between">
                    <span>⚙️ 1. Estado Mecánico y Seguridad Vial</span>
                    <span className="text-[10px] text-slate-500">8 Puntos</span>
                  </h4>

                  {/* Helper renderer for items */}
                  {[
                    { id: 'check-frenos', label: 'Frenos (Servicio y Emergencia)', crit: 'CRÍTICO' as const, val: frenos, set: setFrenos },
                    { id: 'check-llantas', label: 'Llantas (Presión y Labrado)', crit: 'CRÍTICO' as const, val: llantas, set: setLlantas },
                    { id: 'check-luces', label: 'Luces (Altas, Bajas, Pide-Vías, Retroceso)', crit: 'REQUERIDO' as const, val: luces, set: setLuces },
                    { id: 'check-extintor', label: 'Extintor ABC Vigente', crit: 'CRÍTICO' as const, val: extintor, set: setExtintor },
                    { id: 'check-cinturones', label: 'Cinturones de Seguridad', crit: 'REQUERIDO' as const, val: cinturones, set: setCinturones },
                    { id: 'check-espejos', label: 'Espejos Retrovisores', crit: 'OBSERVAR' as const, val: espejos, set: setEspejos },
                    { id: 'check-combustible', label: 'Nivel de Combustible y Fluidos', crit: 'OBSERVAR' as const, val: combustible, set: setCombustible },
                    { id: 'check-botiquin', label: 'Botiquín de Primeros Auxilios', crit: 'REQUERIDO' as const, val: botiquin, set: setBotiquin },
                  ].map(item => (
                    <div key={item.id} className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-800 text-xs">{item.label}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                          item.crit === 'CRÍTICO' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                          item.crit === 'REQUERIDO' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-blue-100 text-blue-700 border-blue-200'
                        }`}>
                          {item.crit === 'CRÍTICO' ? '🔴 CRÍTICO' : item.crit === 'REQUERIDO' ? '🟡 REQUERIDO' : '🔵 OBSERVAR'}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {(['Cumple', 'Parcial', 'No Cumple', 'N/A'] as EstadoCumplimiento360[]).map(op => {
                          const isSelected = item.val === op;
                          let btnStyle = 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100';
                          if (isSelected) {
                            if (op === 'Cumple') btnStyle = 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-sm';
                            else if (op === 'Parcial') btnStyle = 'bg-amber-500 text-white font-bold border-amber-500 shadow-sm';
                            else if (op === 'No Cumple') btnStyle = 'bg-rose-600 text-white font-bold border-rose-600 shadow-sm';
                            else if (op === 'N/A') btnStyle = 'bg-slate-600 text-white font-bold border-slate-600 shadow-sm';
                          }
                          return (
                            <button
                              key={op}
                              type="button"
                              onClick={() => item.set(op)}
                              className={`py-1 px-1 rounded text-[10px] font-semibold border text-center transition cursor-pointer ${btnStyle}`}
                            >
                              {op}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Grupo 2: Bioseguridad y Compartimento */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 text-xs">
                  <h4 className="font-bold text-slate-800 border-b pb-2 flex items-center justify-between">
                    <span>☣️ 2. Bioseguridad y Compartimento de Carga</span>
                    <span className="text-[10px] text-slate-500">5 Puntos</span>
                  </h4>

                  {[
                    { id: 'check-sello', label: 'Sello Hermético de Caja / Furgón', crit: 'CRÍTICO' as const, val: selloHermetico, set: setSelloHermetico },
                    { id: 'check-biohazard', label: 'Señalización Biohazard Visible', crit: 'CRÍTICO' as const, val: biohazardVisible, set: setBiohazardVisible },
                    { id: 'check-desinfeccion', label: 'Desinfección Previa Verificada', crit: 'CRÍTICO' as const, val: desinfeccionPrevia, set: setDesinfeccionPrevia },
                    { id: 'check-kit', label: 'Kit de Derrames Completo (Absorbente)', crit: 'CRÍTICO' as const, val: kitDerrame, set: setKitDerrame },
                    { id: 'check-epp', label: 'EPP Completo a Bordo', crit: 'CRÍTICO' as const, val: eppCompleto, set: setEppCompleto },
                  ].map(item => (
                    <div key={item.id} className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-800 text-xs">{item.label}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                          item.crit === 'CRÍTICO' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                          item.crit === 'REQUERIDO' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-blue-100 text-blue-700 border-blue-200'
                        }`}>
                          {item.crit === 'CRÍTICO' ? '🔴 CRÍTICO' : item.crit === 'REQUERIDO' ? '🟡 REQUERIDO' : '🔵 OBSERVAR'}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {(['Cumple', 'Parcial', 'No Cumple', 'N/A'] as EstadoCumplimiento360[]).map(op => {
                          const isSelected = item.val === op;
                          let btnStyle = 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100';
                          if (isSelected) {
                            if (op === 'Cumple') btnStyle = 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-sm';
                            else if (op === 'Parcial') btnStyle = 'bg-amber-500 text-white font-bold border-amber-500 shadow-sm';
                            else if (op === 'No Cumple') btnStyle = 'bg-rose-600 text-white font-bold border-rose-600 shadow-sm';
                            else if (op === 'N/A') btnStyle = 'bg-slate-600 text-white font-bold border-slate-600 shadow-sm';
                          }
                          return (
                            <button
                              key={op}
                              type="button"
                              onClick={() => item.set(op)}
                              className={`py-1 px-1 rounded text-[10px] font-semibold border text-center transition cursor-pointer ${btnStyle}`}
                            >
                              {op}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs border-t pt-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hora de Salida *</label>
                  <input type="time" value={horaSalida} onChange={e => setHoraSalida(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-xs" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Observaciones de Salida</label>
                  <input type="text" value={obsSalida} onChange={e => setObsSalida(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-xs" placeholder="Novedad mecánica o de EPP" />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN C, D, E GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* SECCIÓN C: ENTREGA EN PLANTA */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden space-y-3">
              <div className="bg-gradient-to-r from-slate-100 to-white px-4 py-2.5 border-b-2 border-[#1A3A5C]">
                <h3 className="font-bold text-xs text-[#1A3A5C] uppercase tracking-wide flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-emerald-600" /> SECCIÓN C — Entrega en Planta
                </h3>
              </div>
              <div className="p-4 space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hora Llegada a Planta</label>
                  <input type="time" value={horaLlegadaPlanta} onChange={e => setHoraLlegadaPlanta(e.target.value)} className="w-full border rounded p-1.5" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Peso Entregado en Báscula (libras / lb)</label>
                  <input type="number" step="0.01" value={pesoEntregadoLbs} onChange={e => setPesoEntregadoLbs(Number(e.target.value))} className="w-full border rounded p-1.5 font-bold font-mono" placeholder="0.00" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Recibido en Planta por</label>
                  <input type="text" value={recibidoPorPlanta} onChange={e => setRecibidoPorPlanta(e.target.value)} className="w-full border rounded p-1.5" placeholder="Nombre Operador de Rampa" />
                </div>
              </div>
            </div>

            {/* SECCIÓN D: POST-OPERACIONAL Y DESINFECCIÓN */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden space-y-3">
              <div className="bg-gradient-to-r from-slate-100 to-white px-4 py-2.5 border-b-2 border-[#1A3A5C]">
                <h3 className="font-bold text-xs text-[#1A3A5C] uppercase tracking-wide flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-sky-600" /> SECCIÓN D — Desinfección Final
                </h3>
              </div>
              <div className="p-4 space-y-3 text-xs">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={descargaCompleta} onChange={e => setDescargaCompleta(e.target.checked)} className="w-4 h-4 text-emerald-600" />
                    Descarga completa verificada (100%)
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={limpiezaInterior} onChange={e => setLimpiezaInterior(e.target.checked)} className="w-4 h-4 text-emerald-600" />
                    Lavado interior de furgón completado
                  </label>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Desinfectante Aplicado</label>
                  <select value={desinfectanteUtilizado} onChange={e => setDesinfectanteUtilizado(e.target.value)} className="w-full border rounded p-1.5">
                    <option value="Hipoclorito de Sodio 1% (10,000 ppm)">Hipoclorito de Sodio 1% (10,000 ppm)</option>
                    <option value="Amonio Cuaternario de 5ta Gen">Amonio Cuaternario de 5ta Gen</option>
                    <option value="Glutaraldehído 2%">Glutaraldehído 2%</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Km Llegada</label>
                    <input type="number" value={kmLlegada} onChange={e => setKmLlegada(Number(e.target.value))} className="w-full border rounded p-1.5" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Km Recorridos</label>
                    <input type="text" value={`${kmRecorridosCalculado} km`} readOnly className="w-full border rounded p-1.5 bg-slate-100 font-bold text-center" />
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN E: CIERRE Y FIRMAS */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden space-y-3">
              <div className="bg-gradient-to-r from-slate-100 to-white px-4 py-2.5 border-b-2 border-[#1A3A5C]">
                <h3 className="font-bold text-xs text-[#1A3A5C] uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" /> SECCIÓN E — Cierre y Validación
                </h3>
              </div>
              <div className="p-4 space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Novedades de la Jornada</label>
                  <input type="text" value={novedadesRuta} onChange={e => setNovedadesRuta(e.target.value)} className="w-full border rounded p-1.5" placeholder="Incidentes, retrasos, etc." />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Firma Conductor (Nombre)</label>
                  <input type="text" value={firmaConductor} onChange={e => setFirmaConductor(e.target.value)} className="w-full border rounded p-1.5" placeholder={conductor || 'Nombre Conductor'} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Firma Supervisor de Flota</label>
                  <input type="text" value={firmaSupervisor} onChange={e => setFirmaSupervisor(e.target.value)} className="w-full border rounded p-1.5" placeholder="Supervisor de Turno" />
                </div>
                <div className="p-2 bg-slate-50 border rounded text-[11px] text-slate-600">
                  ⚖️ Conforme al <strong>Art. 15 del Acuerdo 509-2001</strong>, este registro debe archivarse por un mínimo de <strong>5 años</strong> para auditoría.
                </div>
              </div>
            </div>

          </div>

          {/* Action Bar */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={handleSaveForm}
              disabled={saving}
              className="bg-[#1A7A4A] hover:bg-emerald-800 text-white font-bold text-sm px-6 py-2.5 rounded-lg shadow flex items-center gap-2 transition cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              {saving ? 'Guardando en Firebase...' : 'Guardar y Validar Boleta 360°'}
            </button>
          </div>

          {/* Form Footer */}
          <FormFooter 
            elaboroCargo="Gerente de Logística y Flota"
            revisoCargo="Comité de Bioseguridad e Higiene SGI"
            aproboCargo="Gerente General"
          />

        </div>
      )}

      {/* ====================================================================
           TAB 2: ÁRBOL DE DECISIÓN DE RUTAS
           ==================================================================== */}
      {activeTab === 'arbol' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-[#1A3A5C] flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" /> Árbol de Decisión de Rutas Operativas
            </h2>
            <p className="text-xs text-slate-500">
              Filtre interactivamente por centro de distribución y día de la semana para evaluar salidas autorizadas.
            </p>
          </div>

          {/* Paso 1: Centros */}
          <div>
            <label className="block font-bold text-xs uppercase tracking-wider text-slate-700 mb-2">
              1. Seleccione el Centro o Distribuidora:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {CENTROS_RUTAS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCentroArbol(c.id)}
                  className={`p-3 rounded-lg text-xs font-bold transition border text-center cursor-pointer ${
                    selectedCentroArbol === c.id
                      ? 'bg-[#1A3A5C] text-white border-[#1A3A5C] shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* Paso 2: Días */}
          <div>
            <label className="block font-bold text-xs uppercase tracking-wider text-slate-700 mb-2">
              2. Seleccione el Día de la Semana:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {DIAS_SEMANA.map(d => {
                const hasAnyRoute = currentCentroObj.rutas.some(r => r.dias.includes(d));
                return (
                  <button
                    key={d}
                    disabled={!hasAnyRoute}
                    onClick={() => setSelectedDiaArbol(d)}
                    className={`p-2.5 rounded-lg text-xs font-bold transition border text-center cursor-pointer ${
                      !hasAnyRoute 
                        ? 'opacity-40 line-through bg-slate-200 border-slate-300 text-slate-500 cursor-not-allowed'
                        : selectedDiaArbol === d
                          ? 'bg-[#1A7A4A] text-white border-[#1A7A4A] shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resultados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
            {/* Rutas que SÍ Operan */}
            <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-4 space-y-3">
              <h3 className="font-bold text-sm text-emerald-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Rutas que SÍ Operan
                </span>
                <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded text-xs font-mono font-bold">
                  {rutasOperan.length}
                </span>
              </h3>

              {rutasOperan.length === 0 ? (
                <p className="text-xs text-emerald-700 italic">No hay rutas programadas para este día en el centro seleccionado.</p>
              ) : (
                <div className="space-y-2">
                  {rutasOperan.map(r => (
                    <div key={r.codigo} className="bg-white p-3 rounded border border-emerald-200 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{r.codigo} - {r.nombre}</div>
                        <div className="text-[11px] text-slate-500">Días: {r.dias.join(', ')}</div>
                      </div>
                      <button
                        onClick={() => {
                          setCentro(currentCentroObj.nombre);
                          setRuta(r.nombre);
                          setActiveTab('formulario');
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded text-[11px] transition cursor-pointer"
                      >
                        Asignar ➔
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rutas que NO Operan */}
            <div className="bg-rose-50 border border-rose-300 rounded-lg p-4 space-y-3">
              <h3 className="font-bold text-sm text-rose-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-700" /> Rutas que NO Operan
                </span>
                <span className="bg-rose-200 text-rose-900 px-2 py-0.5 rounded text-xs font-mono font-bold">
                  {rutasNoOperan.length}
                </span>
              </h3>

              {rutasNoOperan.length === 0 ? (
                <p className="text-xs text-rose-700 italic">Todas las rutas de este centro operan el día seleccionado.</p>
              ) : (
                <div className="space-y-2">
                  {rutasNoOperan.map(r => (
                    <div key={r.codigo} className="bg-white p-3 rounded border border-rose-200 text-xs">
                      <div className="font-bold text-slate-900">{r.codigo} - {r.nombre}</div>
                      <div className="text-[11px] text-slate-500">Días de atención: {r.dias.join(', ')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
           TAB 3: MATRIZ DE RUTAS
           ==================================================================== */}
      {activeTab === 'matriz' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-[#1A3A5C] flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" /> Matriz Consolidada de Rutas y Frecuencias Semanales
            </h2>
            <p className="text-xs text-slate-500">
              Programación oficial de frecuencias por centro de distribución para transporte de RPBI.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-[#1A3A5C] text-white">
                  <th className="p-2 border border-slate-300 text-left">Código</th>
                  <th className="p-2 border border-slate-300 text-left">Nombre de la Ruta</th>
                  <th className="p-2 border border-slate-300 text-center w-12">L</th>
                  <th className="p-2 border border-slate-300 text-center w-12">M</th>
                  <th className="p-2 border border-slate-300 text-center w-12">Mi</th>
                  <th className="p-2 border border-slate-300 text-center w-12">J</th>
                  <th className="p-2 border border-slate-300 text-center w-12">V</th>
                  <th className="p-2 border border-slate-300 text-center w-12">S</th>
                  <th className="p-2 border border-slate-300 text-center w-12">D</th>
                  <th className="p-2 border border-slate-300 text-center w-16">Frecuencia</th>
                </tr>
              </thead>
              <tbody>
                {CENTROS_RUTAS.map(centro => (
                  <React.Fragment key={centro.id}>
                    <tr className="bg-slate-800 text-white font-bold">
                      <td colSpan={10} className="p-2 text-xs uppercase tracking-wider">
                        📍 Centro: {centro.nombre}
                      </td>
                    </tr>
                    {centro.rutas.map(r => (
                      <tr key={r.codigo} className="hover:bg-slate-50 border-b">
                        <td className="p-2 font-mono font-bold text-slate-700 border border-slate-200">{r.codigo}</td>
                        <td className="p-2 text-slate-900 border border-slate-200">{r.nombre}</td>
                        {DIAS_SEMANA.map(dia => {
                          const active = r.dias.includes(dia);
                          return (
                            <td 
                              key={dia} 
                              className={`p-2 text-center border border-slate-200 font-bold ${
                                active ? 'bg-emerald-100 text-emerald-800' : 'text-slate-300'
                              }`}
                            >
                              {active ? 'X' : '-'}
                            </td>
                          );
                        })}
                        <td className="p-2 text-center font-bold text-slate-700 border border-slate-200 font-mono">
                          {r.dias.length} d/sem
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====================================================================
           TAB 4: CONTROL DE PLACAS
           ==================================================================== */}
      {activeTab === 'placas' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#1A3A5C] flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" /> Catálogo y Estado de Flota Vehicular
              </h2>
              <p className="text-xs text-slate-500">
                Total de 41 unidades registradas (21 Activas de despacho inmediato y 20 En Espera de mantenimiento/autorización).
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilterPlacaTipo('todas')}
                className={`px-3 py-1.5 text-xs font-bold rounded cursor-pointer ${
                  filterPlacaTipo === 'todas' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Todas (41)
              </button>
              <button
                onClick={() => setFilterPlacaTipo('activas')}
                className={`px-3 py-1.5 text-xs font-bold rounded cursor-pointer ${
                  filterPlacaTipo === 'activas' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Activas (21)
              </button>
              <button
                onClick={() => setFilterPlacaTipo('espera')}
                className={`px-3 py-1.5 text-xs font-bold rounded cursor-pointer ${
                  filterPlacaTipo === 'espera' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                En Espera (20)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
            {(filterPlacaTipo === 'todas' || filterPlacaTipo === 'activas') &&
              PLACAS_ACTIVAS.map(p => (
                <div 
                  key={p} 
                  onClick={() => {
                    setPlaca(p);
                    setActiveTab('formulario');
                  }}
                  className="p-3 bg-emerald-50 border-2 border-emerald-400 rounded-lg text-center cursor-pointer hover:bg-emerald-600 hover:text-white transition group shadow-sm"
                >
                  <div className="font-mono font-bold text-sm text-emerald-900 group-hover:text-white">{p}</div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 group-hover:text-emerald-100 block mt-1">
                    🟢 Activa
                  </span>
                </div>
              ))}

            {(filterPlacaTipo === 'todas' || filterPlacaTipo === 'espera') &&
              PLACAS_EN_ESPERA.map(p => (
                <div 
                  key={p} 
                  onClick={() => {
                    setPlaca(p);
                    setActiveTab('formulario');
                  }}
                  className="p-3 bg-amber-50 border-2 border-amber-400 rounded-lg text-center cursor-pointer hover:bg-amber-600 hover:text-white transition group shadow-sm"
                >
                  <div className="font-mono font-bold text-sm text-amber-900 group-hover:text-white">{p}</div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 group-hover:text-amber-100 block mt-1">
                    🟠 En Espera
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ====================================================================
           TAB 5: NORMATIVA 509-2001
           ==================================================================== */}
      {activeTab === 'norma' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-[#1A3A5C] flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" /> Resumen Normativo: Acuerdo Gubernativo 509-2001
            </h2>
            <p className="text-xs text-slate-500">
              Reglamento para el Manejo de Desechos Sólidos Hospitalarios (Ministerio de Salud Pública y Asistencia Social de Guatemala).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
              <span className="bg-[#1A3A5C] text-white px-2 py-0.5 rounded font-bold text-[10px]">Art. 12</span>
              <h3 className="font-bold text-slate-800 text-sm">Vehículos de Transporte</h3>
              <p className="text-slate-600 leading-relaxed">
                Deben ser de uso exclusivo para desechos hospitalarios, caja cerrada hermética, interior liso y lavable, sistema de retención de líquidos y señalización exterior visible de riesgo biológico.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
              <span className="bg-[#1A3A5C] text-white px-2 py-0.5 rounded font-bold text-[10px]">Art. 13</span>
              <h3 className="font-bold text-slate-800 text-sm">Manifiesto de Transporte</h3>
              <p className="text-slate-600 leading-relaxed">
                Cada recolección requiere un manifiesto en triplicado firmado por el generador, transportista y destinatario en planta de tratamiento, especificando tipo, peso y número de bultos.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
              <span className="bg-[#1A3A5C] text-white px-2 py-0.5 rounded font-bold text-[10px]">Art. 14</span>
              <h3 className="font-bold text-slate-800 text-sm">Desinfección de Unidades</h3>
              <p className="text-slate-600 leading-relaxed">
                Todo vehículo debe ser lavado y desinfectado después de cada jornada de descarga en la planta de tratamiento antes de iniciar nuevas rutas.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
              <span className="bg-[#1A3A5C] text-white px-2 py-0.5 rounded font-bold text-[10px]">Art. 15</span>
              <h3 className="font-bold text-slate-800 text-sm">Archivo y Custodia (5 Años)</h3>
              <p className="text-slate-600 leading-relaxed">
                Las empresas recolectoras deben archivar todos los manifiestos y boletas de control vehicular por un periodo mínimo de cinco (5) años para auditorías del MSPAS y MARN.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
              <span className="bg-[#1A3A5C] text-white px-2 py-0.5 rounded font-bold text-[10px]">Art. 16</span>
              <h3 className="font-bold text-slate-800 text-sm">Plan de Contingencias</h3>
              <p className="text-slate-600 leading-relaxed">
                Los transportistas deben portar un kit de derrames para contención inmediata de líquidos o rotura de bolsas, botiquín y extintor vigentes.
              </p>
            </div>

            <div className="bg-rose-50 p-4 rounded-lg border border-rose-300 space-y-2">
              <span className="bg-rose-600 text-white px-2 py-0.5 rounded font-bold text-[10px]">Art. 20-22</span>
              <h3 className="font-bold text-rose-900 text-sm">Régimen Sancionatorio</h3>
              <p className="text-rose-800 leading-relaxed">
                El incumplimiento conlleva multas de Q5,000 a Q100,000, suspensión de licencias y responsabilidad penal por delitos contra la salud pública.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
           TAB 6: HISTORIAL DE BOLETAS
           ==================================================================== */}
      {activeTab === 'historial' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#1A3A5C] flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" /> Boletas de Control 360° Guardadas en SGI
              </h2>
              <p className="text-xs text-slate-500">
                Historial de inspecciones vehiculares y registros de bioseguridad.
              </p>
            </div>

            <button
              onClick={fetchRegistros}
              disabled={loading}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2 rounded border transition cursor-pointer"
            >
              {loading ? 'Actualizando...' : 'Recargar Registros'}
            </button>
          </div>

          {deleteFeedback && (
            <div className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between ${
              deleteFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              <span>{deleteFeedback.msg}</span>
              <button onClick={() => setDeleteFeedback(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-2">✕</button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Cargando boletas de control 360°...</div>
          ) : registros.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs border border-dashed rounded-lg">
              No hay boletas de control vehicular registradas aún. Diligencie una nueva en la pestaña Formulario 360°.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="p-2 border text-left">Folio</th>
                    <th className="p-2 border text-left">Fecha</th>
                    <th className="p-2 border text-left">Centro</th>
                    <th className="p-2 border text-left">Placa</th>
                    <th className="p-2 border text-left">Conductor</th>
                    <th className="p-2 border text-center">Críticos</th>
                    <th className="p-2 border text-center">Bolsas</th>
                    <th className="p-2 border text-right">Peso Total</th>
                    <th className="p-2 border text-center">Km Rec.</th>
                    <th className="p-2 border text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-2 border font-mono font-bold text-blue-700">{r.folio}</td>
                      <td className="p-2 border font-mono">{r.fecha}</td>
                      <td className="p-2 border font-medium">{r.centro}</td>
                      <td className="p-2 border font-mono font-bold">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                          r.estadoPlaca === 'En Espera' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {r.placa}
                        </span>
                      </td>
                      <td className="p-2 border">{r.conductor || r.elaboro}</td>
                      <td className="p-2 border text-center font-bold">
                        {r.todosCriticosAprobados ? (
                          <span className="text-emerald-700">✅ 8/8</span>
                        ) : (
                          <span className="text-rose-700">⛔ Incompleto</span>
                        )}
                      </td>
                      <td className="p-2 border text-center font-mono">{r.totalBolsas || 0}</td>
                      <td className="p-2 border text-right font-mono font-bold text-slate-800">
                        {(r.pesoEntregadoLbs !== undefined ? r.pesoEntregadoLbs : (r.pesoEntregadoKg || r.totalPesoKg || 0)).toFixed(2)} lb
                      </td>
                      <td className="p-2 border text-center font-mono">{r.kmRecorridos || 0} km</td>
                      <td className="p-2 border text-center">
                        <button
                          type="button"
                          onClick={() => setRecordToDelete(r)}
                          className="p-1.5 text-rose-500 hover:text-white hover:bg-rose-600 rounded transition cursor-pointer flex items-center justify-center mx-auto"
                          title="Eliminar boleta"
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
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {recordToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="p-2.5 bg-rose-100 rounded-full shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-800">¿Eliminar Boleta de Control?</h3>
                <p className="text-xs text-slate-500">Esta acción removerá el registro de la base de datos.</p>
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5 mb-5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Folio:</span>
                <span className="font-mono font-bold text-slate-800">{recordToDelete.folio}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Fecha:</span>
                <span className="font-medium text-slate-800">{recordToDelete.fecha}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Placa / Conductor:</span>
                <span className="font-medium text-slate-800">{recordToDelete.placa} — {recordToDelete.conductor || recordToDelete.elaboro}</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg shadow transition cursor-pointer flex items-center gap-1.5"
              >
                {deleteLoading ? (
                  <span>Eliminando...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> Confirmar Eliminación
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
