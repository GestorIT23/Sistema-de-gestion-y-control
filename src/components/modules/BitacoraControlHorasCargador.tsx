import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { BitacoraControlHorasCargador } from '../../types';
import FormHeader from '../FormHeader';
import FormFooter from '../FormFooter';
import { 
  Calendar, 
  User, 
  ArrowLeft, 
  Download, 
  Database, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  FileSpreadsheet, 
  FileText, 
  Gauge, 
  Clock, 
  Flame, 
  Truck, 
  ClipboardCheck,
  CheckSquare
} from 'lucide-react';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';
import { generateAndDownloadExcel } from '../../utils/excelGenerator';

interface Props {
  onBack: () => void;
  userEmail: string;
}

export default function BitacoraControlHorasCargadorModule({ onBack, userEmail }: Props) {
  const [registros, setRegistros] = useState<BitacoraControlHorasCargador[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Form Fields - 1. Datos Generales
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [turno, setTurno] = useState('Día');
  const [noReporte, setNoReporte] = useState('');

  // 2. Identificación del Equipo
  const [codigoUnidad, setCodigoUnidad] = useState('CF-01');
  const [marcaModelo, setMarcaModelo] = useState('Caterpillar 924K');
  const [anio, setAnio] = useState('2019');

  // 3. Operador
  const [nombreOperador, setNombreOperador] = useState('');
  const [codigoEmpleado, setCodigoEmpleado] = useState('');
  const [areaAsignada, setAreaAsignada] = useState('Rampa de Recepción y Trituración');
  const [supervisorCargo, setSupervisorCargo] = useState('');

  // 4. Horómetro y Horas de Operación
  const [lecturaInicialHorometro, setLecturaInicialHorometro] = useState<number>(0);
  const [lecturaFinalHorometro, setLecturaFinalHorometro] = useState<number>(0);
  const [horaInicio, setHoraInicio] = useState('06:00');
  const [horaTermino, setHoraTermino] = useState('14:00');
  const [horasPausaInactividad, setHorasPausaInactividad] = useState<number>(0);

  // Calculated: Total operado (hrs)
  const totalOperadoHoras = Math.max(0, Number((lecturaFinalHorometro - lecturaInicialHorometro).toFixed(2)));

  // Calculated: Horas Efectivas de Trabajo del Operador (Reloj)
  const getHorasEfectivas = () => {
    if (!horaInicio || !horaTermino) return 0;
    try {
      const [hIni, mIni] = horaInicio.split(':').map(Number);
      const [hFin, mFin] = horaTermino.split(':').map(Number);
      let diffMs = (hFin * 60 + mFin) - (hIni * 60 + mIni);
      if (diffMs < 0) {
        diffMs += 24 * 60; // overnight
      }
      const diffHours = diffMs / 60;
      return Math.max(0, Number((diffHours - (Number(horasPausaInactividad) || 0)).toFixed(2)));
    } catch (e) {
      return 0;
    }
  };
  const horasEfectivasTrabajo = getHorasEfectivas();

  // 5. Actividades Realizadas
  const [tipoActividadPrincipal, setTipoActividadPrincipal] = useState('Alimentación de Tolva de Trituradora');
  const [tipoMaterialTrabajado, setTipoMaterialTrabajado] = useState('Residuos Clínicos y Hospitalarios Sólidos (RPBI)');
  const [descripcionActividades, setDescripcionActividades] = useState('');

  // 6. Combustible
  const [nivelCombustibleInicio, setNivelCombustibleInicio] = useState('1/2');
  const [litrosCargados, setLitrosCargados] = useState<number>(0);
  const [nivelCombustibleFinal, setNivelCombustibleFinal] = useState('Full');

  // 7. Estado del Equipo
  const [estadoEquipo, setEstadoEquipo] = useState<BitacoraControlHorasCargador['estadoEquipo']>('Bueno — sin novedades');
  const [descripcionFallasObservaciones, setDescripcionFallasObservaciones] = useState('');

  // 8. Checklist de Revisión Previa al Turno
  const [checklist, setChecklist] = useState({
    nivelAceiteMotor: true,
    nivelRefrigerante: true,
    presionLlantas: true,
    estadoCucharaBalde: true,
    lucesSenales: true,
    frenos: true,
    cinturonSeguridad: true,
    bocinaAlarmaReversa: true,
    extintorAbordo: true,
    documentosEquipo: true
  });

  // 9. Observaciones y Firma
  const [observaciones, setObservaciones] = useState('');
  const [firmaOperador, setFirmaOperador] = useState('');
  const [firmaSupervisor, setFirmaSupervisor] = useState('');

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'bitacora_control_horas_cargador'), 
        orderBy('fechaRegistro', 'desc'), 
        limit(15)
      );
      const querySnapshot = await getDocs(q);
      const docs: BitacoraControlHorasCargador[] = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as BitacoraControlHorasCargador);
      });
      setRegistros(docs);
    } catch (e) {
      console.error('Error fetching registers:', e);
      const fallback = localStorage.getItem('biotrash_horas_cargador_bk');
      if (fallback) {
        setRegistros(JSON.parse(fallback));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: 'Almacenando bitácora de control de horas...', type: 'info' });

    const nuevoRegistro: BitacoraControlHorasCargador = {
      fechaRegistro: new Date().toISOString(),
      fecha,
      turno,
      noReporte: noReporte || `REP-${Date.now().toString().slice(-6)}`,
      responsable: userEmail || '',
      observaciones: observaciones || 'Sin anomalías. Operación completada con normalidad.',
      
      // Equipo
      codigoUnidad,
      marcaModelo,
      anio,

      // Operador
      nombreOperador: nombreOperador || userEmail.split('@')[0],
      codigoEmpleado: codigoEmpleado || 'N/A',
      areaAsignada,
      supervisorCargo: supervisorCargo || 'Supervisor de Planta',

      // Horas
      lecturaInicialHorometro: Number(lecturaInicialHorometro) || 0,
      lecturaFinalHorometro: Number(lecturaFinalHorometro) || 0,
      totalOperadoHoras,
      horaInicio,
      horaTermino,
      horasPausaInactividad: Number(horasPausaInactividad) || 0,
      horasTrabajoCalculadas: horasEfectivasTrabajo,

      // Actividades
      tipoActividadPrincipal,
      tipoMaterialTrabajado,
      descripcionActividades: descripcionActividades || 'Operación regular del cargador frontal sin incidentes.',

      // Combustible
      nivelCombustibleInicio,
      litrosCargados: Number(litrosCargados) || 0,
      nivelCombustibleFinal,

      // Estado Equipo
      estadoEquipo,
      descripcionFallasObservaciones: descripcionFallasObservaciones || 'Sin fallas detectadas.',

      // Checklist
      checklistPrevia: checklist,

      // Firmas
      firmaOperador: firmaOperador || nombreOperador || 'Firma Digital Operador',
      firmaSupervisor: firmaSupervisor || supervisorCargo || 'Firma Digital Supervisor',

      elaboro: 'Operador de Cargador Frontal / Planta',
      reviso: 'Supervisor de Rampa de Operaciones',
      aprobo: 'Director de Aseguramiento de Calidad SGI',
      cambioControl: [
        {
          version: '1.0',
          fecha: '02/07/2026',
          seccion: 'Todas',
          cambio: 'Creación del formato de control de horas de cargador frontal bajo normas ISO 14001 y ISO 9001',
          solicitante: 'Coordinación SGI'
        }
      ]
    };

    try {
      await addDoc(collection(db, 'bitacora_control_horas_cargador'), nuevoRegistro);
      setMsg({ text: '¡Bitácora del Cargador Frontal guardada con éxito!', type: 'success' });
      
      // Reset form variables
      setNoReporte('');
      setNombreOperador('');
      setCodigoEmpleado('');
      setSupervisorCargo('');
      setLecturaInicialHorometro(0);
      setLecturaFinalHorometro(0);
      setHorasPausaInactividad(0);
      setDescripcionActividades('');
      setLitrosCargados(0);
      setDescripcionFallasObservaciones('');
      setObservaciones('');
      setFirmaOperador('');
      setFirmaSupervisor('');
      
      fetchRegistros();
    } catch (err) {
      console.error(err);
      const currentBackup = [nuevoRegistro, ...registros];
      localStorage.setItem('biotrash_horas_cargador_bk', JSON.stringify(currentBackup));
      setRegistros(currentBackup);
      setMsg({ text: 'Guardado localmente debido a una interrupción en la red celular.', type: 'success' });
    } finally {
      setSaving(false);
    }
  };

  const toggleChecklist = (key: keyof typeof checklist) => {
    setChecklist({ ...checklist, [key]: !checklist[key] });
  };

  const handleExportExcel = (reg: BitacoraControlHorasCargador) => {
    generateAndDownloadExcel('control_horas_cargador', reg);
  };

  return (
    <div id="bitacora-control-horas-cargador-root" className="max-w-7xl mx-auto px-4 py-4 space-y-6 animate-fade-in text-slate-800">
      
      {/* Header action panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-slate-600 hover:text-[#1A1C1E] flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al Tablero
        </button>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> ISO 9001 / ISO 14001 Certificado
        </div>
      </div>

      <FormHeader 
        codigo="F-OPR-000-14" 
        titulo="CONTROL DE HORAS DE TRABAJO - CARGADOR FRONTAL" 
        version="1.0"
        fechaElaboracion="02/07/2026"
        fechaVersion="02/07/2026"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: input form */}
        <form onSubmit={handleGuardar} className="lg:col-span-7 bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-6">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" /> Registro Diario de Operación
            </h3>
            <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded font-mono">
              F-OPR-000-14
            </span>
          </div>

          {/* 1. DATOS GENERALES */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 text-blue-700 border-b border-blue-50 pb-1">
              <Calendar className="w-3.5 h-3.5" /> 1. Datos Generales
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha de Operación *</label>
                <input
                  type="date"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Turno *</label>
                <select
                  value={turno}
                  onChange={(e) => setTurno(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Día">Día (06:00 - 14:00)</option>
                  <option value="Tarde">Tarde (14:00 - 22:00)</option>
                  <option value="Noche">Noche (22:00 - 06:00)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Número de Reporte</label>
                <input
                  type="text"
                  placeholder="Autogenerado si está vacío"
                  value={noReporte}
                  onChange={(e) => setNoReporte(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* 2. IDENTIFICACIÓN DEL EQUIPO */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 text-blue-700 border-b border-blue-50 pb-1">
              <Truck className="w-3.5 h-3.5" /> 2. Identificación del Equipo
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Código / No. Unidad *</label>
                <input
                  type="text"
                  required
                  value={codigoUnidad}
                  onChange={(e) => setCodigoUnidad(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Marca y Modelo</label>
                <input
                  type="text"
                  value={marcaModelo}
                  onChange={(e) => setMarcaModelo(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Año</label>
                <input
                  type="text"
                  value={anio}
                  onChange={(e) => setAnio(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 3. OPERADOR */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 text-blue-700 border-b border-blue-50 pb-1">
              <User className="w-3.5 h-3.5" /> 3. Operador
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre Completo del Operador *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Carlos López"
                  value={nombreOperador}
                  onChange={(e) => setNombreOperador(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Código / No. Empleado</label>
                <input
                  type="text"
                  placeholder="Ej. EMP-992"
                  value={codigoEmpleado}
                  onChange={(e) => setCodigoEmpleado(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Área o Zona Asignada *</label>
                <input
                  type="text"
                  required
                  value={areaAsignada}
                  onChange={(e) => setAreaAsignada(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Supervisor a Cargo</label>
                <input
                  type="text"
                  placeholder="Ej. Ing. Mario Gómez"
                  value={supervisorCargo}
                  onChange={(e) => setSupervisorCargo(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 4. HORÓMETRO Y HORAS DE OPERACIÓN */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 text-blue-700 border-b border-blue-50 pb-1">
              <Clock className="w-3.5 h-3.5" /> 4. Horómetro y Horas de Operación
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Lectura Inicial (hrs)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={lecturaInicialHorometro}
                  onChange={(e) => setLecturaInicialHorometro(Number(e.target.value))}
                  className="w-full text-xs bg-white border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Lectura Final (hrs)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={lecturaFinalHorometro}
                  onChange={(e) => setLecturaFinalHorometro(Number(e.target.value))}
                  className="w-full text-xs bg-white border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold"
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded p-2 text-center flex flex-col justify-center">
                <span className="block text-[9px] font-bold text-amber-700 uppercase tracking-wider">Total Operado (hrs)</span>
                <span className="text-base font-black text-amber-900 font-mono mt-0.5">
                  {totalOperadoHoras} hrs
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hora de Inicio *</label>
                <input
                  type="time"
                  required
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hora de Término *</label>
                <input
                  type="time"
                  required
                  value={horaTermino}
                  onChange={(e) => setHoraTermino(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Horas Pausa / Inactividad</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={horasPausaInactividad}
                  onChange={(e) => setHorasPausaInactividad(Number(e.target.value))}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
                <span className="text-[8px] text-slate-450 block mt-1 leading-none">Incluye traslados, esperas y paros</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded p-2 text-center flex flex-col justify-center">
                <span className="block text-[9px] font-bold text-emerald-700 uppercase tracking-wider">Horas Trabajo (Reloj)</span>
                <span className="text-base font-black text-emerald-900 font-mono mt-0.5">
                  {horasEfectivasTrabajo} hrs
                </span>
                <span className="text-[8px] text-emerald-650 block leading-none">Neto (Inicio a Término - Pausa)</span>
              </div>
            </div>
          </div>

          {/* 5. ACTIVIDADES REALIZADAS */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 text-blue-700 border-b border-blue-50 pb-1">
              <ClipboardCheck className="w-3.5 h-3.5" /> 5. Actividades Realizadas
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo de Actividad Principal *</label>
                <input
                  type="text"
                  required
                  value={tipoActividadPrincipal}
                  onChange={(e) => setTipoActividadPrincipal(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo de Material Trabajado</label>
                <input
                  type="text"
                  value={tipoMaterialTrabajado}
                  onChange={(e) => setTipoMaterialTrabajado(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descripción de Actividades</label>
              <textarea
                placeholder="Describa a detalle las horas laboradas, traslados, zonas trituradas o material apilado."
                value={descripcionActividades}
                onChange={(e) => setDescripcionActividades(e.target.value)}
                rows={3}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 6. COMBUSTIBLE */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 text-blue-700 border-b border-blue-50 pb-1">
              <Flame className="w-3.5 h-3.5" /> 6. Combustible
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nivel al Inicio</label>
                <select
                  value={nivelCombustibleInicio}
                  onChange={(e) => setNivelCombustibleInicio(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                >
                  <option value="Reserva">Reserva</option>
                  <option value="1/4">1/4</option>
                  <option value="1/2">1/2</option>
                  <option value="3/4">3/4</option>
                  <option value="Full">Full (Lleno)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Litros Cargados</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={litrosCargados}
                  onChange={(e) => setLitrosCargados(Number(e.target.value))}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nivel al Final</label>
                <select
                  value={nivelCombustibleFinal}
                  onChange={(e) => setNivelCombustibleFinal(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                >
                  <option value="Reserva">Reserva</option>
                  <option value="1/4">1/4</option>
                  <option value="1/2">1/2</option>
                  <option value="3/4">3/4</option>
                  <option value="Full">Full (Lleno)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 7. ESTADO DEL EQUIPO */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 text-blue-700 border-b border-blue-50 pb-1">
              <Gauge className="w-3.5 h-3.5" /> 7. Estado del Equipo
            </h4>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
              <label className="block text-[10px] font-bold text-slate-600 uppercase">Clasificación de Estado Operacional:</label>
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                {[
                  { value: 'Bueno — sin novedades', color: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100', activeColor: 'bg-emerald-600 text-white border-emerald-600' },
                  { value: 'Falla leve — operativo', color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100', activeColor: 'bg-amber-500 text-white border-amber-500' },
                  { value: 'Falla grave — revisión', color: 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100', activeColor: 'bg-rose-600 text-white border-rose-600' },
                  { value: 'Equipo parado', color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100', activeColor: 'bg-purple-600 text-white border-purple-600' }
                ].map((item) => {
                  const isActive = estadoEquipo === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setEstadoEquipo(item.value as any)}
                      className={`text-[10px] font-bold p-2.5 rounded border transition text-center flex items-center justify-center cursor-pointer ${
                        isActive ? item.activeColor : `${item.color} border-slate-200`
                      }`}
                    >
                      {item.value}
                    </button>
                  );
                })}
              </div>

              <div className="pt-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descripción de fallas u observaciones del equipo</label>
                <textarea
                  placeholder="Detalle fallos mecánicos, niveles bajos, ruidos extraños o desgaste observado en cuchara/balde."
                  value={descripcionFallasObservaciones}
                  onChange={(e) => setDescripcionFallasObservaciones(e.target.value)}
                  rows={2}
                  className="w-full text-xs bg-white border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 8. CHECKLIST DE REVISIÓN PREVIA AL TURNO */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 text-blue-700 border-b border-blue-50 pb-1">
              <CheckSquare className="w-3.5 h-3.5" /> 8. Checklist de Revisión Previa al Turno
            </h4>
            
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <p className="text-[10px] text-slate-500 mb-3 italic">
                Verifique físicamente cada componente antes de arrancar el motor del cargador frontal:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {[
                  { key: 'nivelAceiteMotor', label: 'Nivel de aceite motor' },
                  { key: 'nivelRefrigerante', label: 'Nivel de refrigerante' },
                  { key: 'presionLlantas', label: 'Presión de llantas' },
                  { key: 'estadoCucharaBalde', label: 'Estado de la cuchara / balde' },
                  { key: 'lucesSenales', label: 'Luces y señales direccionales' },
                  { key: 'frenos', label: 'Frenos de servicio y de mano' },
                  { key: 'cinturonSeguridad', label: 'Cinturón de seguridad' },
                  { key: 'bocinaAlarmaReversa', label: 'Bocina y alarma de reversa' },
                  { key: 'extintorAbordo', label: 'Extintor a bordo (vigencia)' },
                  { key: 'documentosEquipo', label: 'Documentos y tarjeta del equipo' }
                ].map((item) => (
                  <label 
                    key={item.key} 
                    className="flex items-center gap-3.5 bg-white p-2.5 rounded border border-slate-200/60 cursor-pointer hover:bg-blue-50/20 transition"
                  >
                    <input
                      type="checkbox"
                      checked={checklist[item.key as keyof typeof checklist]}
                      onChange={() => toggleChecklist(item.key as keyof typeof checklist)}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-xs font-medium text-slate-700 select-none">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 9. OBSERVACIONES Y FIRMAS */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 text-blue-700 border-b border-blue-50 pb-1">
              <ClipboardCheck className="w-3.5 h-3.5" /> 9. Observaciones y Firmas de Conformidad
            </h4>
            
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Observaciones Generales del Turno</label>
                <textarea
                  placeholder="Observaciones de seguridad ambiental o incidencias generales."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={2}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Firma del Operador *</label>
                  <input
                    type="text"
                    required
                    placeholder="Escriba su nombre completo para firmar"
                    value={firmaOperador}
                    onChange={(e) => setFirmaOperador(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold border-b-2 border-b-blue-300"
                  />
                  <span className="text-[8px] text-slate-400 block mt-1">Garantiza inspección previa de 10 puntos</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Firma del Supervisor</label>
                  <input
                    type="text"
                    placeholder="Escriba el nombre del supervisor para validar"
                    value={firmaSupervisor}
                    onChange={(e) => setFirmaSupervisor(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold border-b-2 border-b-slate-300"
                  />
                  <span className="text-[8px] text-slate-400 block mt-1">Conformidad operacional SGI</span>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Msg */}
          {msg.text && (
            <div className={`p-3 rounded text-xs flex items-center gap-2 ${
              msg.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 
              msg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 
              'bg-blue-50 text-blue-800 border border-blue-100'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{msg.text}</span>
            </div>
          )}

          <div className="text-right">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#1A1C1E] hover:bg-[#2D2F31] text-white disabled:opacity-50 text-xs font-bold px-6 py-2.5 rounded transition shadow cursor-pointer focus:ring-2 focus:ring-offset-2 focus:ring-slate-800"
            >
              {saving ? 'Guardando...' : 'Guardar en Base de Datos SGI'}
            </button>
          </div>
        </form>

        {/* Right column: recent registers log */}
        <div className="lg:col-span-5 bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-500" /> Últimos Reportes de Horas
            </h3>
            <span className="bg-blue-500/15 text-blue-600 font-mono text-[9px] px-2 py-0.5 rounded-full font-bold">LIVE</span>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A1C1E] mx-auto"></div>
              <p className="text-xs text-slate-500 mt-2 font-mono">Cargando bitácoras históricas...</p>
            </div>
          ) : registros.length === 0 ? (
            <div className="text-center py-12 bg-white rounded border border-dashed border-slate-200 text-slate-400">
              <Info className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs mt-2 font-medium">No se han guardado registros hoy.</p>
              <p className="text-[10px] mt-0.5">Utilice el formulario de la izquierda para registrar horas de cargador.</p>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[750px] overflow-y-auto pr-1">
              {registros.map((reg) => (
                <div key={reg.id} className="bg-white p-4 rounded border border-slate-200 hover:border-slate-300 shadow-sm transition">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        F-OPR-000-14
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 mt-1.5 flex items-center gap-1">
                        {reg.fecha} <span className="text-slate-400 text-[10px] font-normal">({reg.turno})</span>
                      </h4>
                    </div>
                    <span className="text-[9px] font-bold text-slate-650 bg-slate-100 px-2 py-0.5 rounded">
                      {reg.codigoUnidad}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 mt-2 font-mono space-y-1">
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" /> Op: {reg.nombreOperador}
                    </div>
                    <div className="flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-slate-400" /> Horómetro: {reg.lecturaInicialHorometro} - {reg.lecturaFinalHorometro} hrs
                    </div>
                  </div>

                  {/* Status Indicator Pill */}
                  <div className="mt-2.5">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      reg.estadoEquipo === 'Bueno — sin novedades' ? 'bg-emerald-50 text-emerald-700' :
                      reg.estadoEquipo === 'Falla leve — operativo' ? 'bg-amber-50 text-amber-700' :
                      reg.estadoEquipo === 'Falla grave — revisión' ? 'bg-rose-50 text-rose-700' :
                      'bg-purple-50 text-purple-700'
                    }`}>
                      Estado: {reg.estadoEquipo}
                    </span>
                  </div>

                  {/* Operational metrics pills */}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                    <span className="bg-amber-50 text-amber-700 text-[9px] px-2 py-0.5 rounded-full font-bold">
                      {reg.totalOperadoHoras} Hrs Horómetro
                    </span>
                    <span className="bg-emerald-50 text-emerald-700 text-[9px] px-2 py-0.5 rounded-full font-bold">
                      {reg.horasTrabajoCalculadas ?? reg.totalOperadoHoras} Hrs Trabajo (Reloj)
                    </span>
                    <span className="bg-slate-100 text-slate-700 text-[9px] px-2 py-0.5 rounded-full font-medium">
                      Actividad: {reg.tipoActividadPrincipal.slice(0, 22)}...
                    </span>
                    <span className="bg-slate-100 text-slate-700 text-[9px] px-2 py-0.5 rounded-full font-medium">
                      Combustible: {reg.nivelCombustibleInicio} → {reg.nivelCombustibleFinal}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500 italic mt-3 bg-slate-50 p-2 rounded border border-slate-100 leading-normal">
                    "{reg.observaciones}"
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleExportExcel(reg)}
                      className="text-cyan-600 hover:text-cyan-900 font-bold text-[10px] cursor-pointer flex items-center gap-1"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => generateAndDownloadPDF('control_horas_cargador', reg)}
                      className="text-red-700 hover:text-red-900 font-bold text-[10px] cursor-pointer flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5 text-red-500" /> PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <FormFooter 
        elaboroCargo="Operador de Cargador Frontal / Planta"
        revisoCargo="Supervisor de Rampa de Operaciones"
        aproboCargo="Director de Aseguramiento de Calidad SGI"
        cambios={[
          {
            version: '1.0',
            fecha: '02/07/2026',
            seccion: 'Todas',
            cambio: 'Creación del formato de control de horas de cargador frontal bajo normas ISO 14001 y ISO 9001',
            solicitante: 'Coordinación SGI'
          }
        ]}
      />
    </div>
  );
}
