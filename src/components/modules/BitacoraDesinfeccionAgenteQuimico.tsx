import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit , deleteDoc, doc} from 'firebase/firestore';
import { BitacoraDesinfeccionAgenteQuimico } from '../../types';
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
  Droplets, 
  CheckSquare, 
  Square, 
  Clock, 
  ShieldAlert, 
  MapPin, 
  CheckCircle2,
  Sparkles
, Trash2} from 'lucide-react';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';
import { generateAndDownloadExcel } from '../../utils/excelGenerator';
import BulkUploadPanel from '../BulkUploadPanel';
import { sanitizeBiotrashObject, sanitizeBiotrashText } from '../../utils/textSanitizer';
import { isAuthorizedToDelete } from '../../utils/authUtils';

interface Props {
  onBack: () => void;
  userEmail: string;
}

export default function BitacoraDesinfeccionAgenteQuimicoModule({ onBack, userEmail }: Props) {
  const [registros, setRegistros] = useState<BitacoraDesinfeccionAgenteQuimico[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Form Fields
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [responsable, setResponsable] = useState(userEmail || '');
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFin, setHoraFin] = useState('08:30');

  // Chemical Parameters
  const [quimico, setQuimico] = useState('Innibith');
  const [dosis, setDosis] = useState('50.00%');
  const [cantidadGl, setCantidadGl] = useState(10.00);

  // Application Method
  const [metodoManualMochila, setMetodoManualMochila] = useState(true);
  const [metodoAspersion, setMetodoAspersion] = useState(true);

  // Areas Checklist
  const [areas, setAreas] = useState({
    recepcion: true,
    cuartoFrio: false,
    autoclaves: false,
    trituradoras: false,
    compactadora: false,
    lavado: false,
    incinerador: false,
    patioManiobras: false,
    ingreso: false,
    lavanderia: false,
    muroPerimetral: false,
    comedor: false,
    taller: false,
  });

  // Instruction & Traceability
  const [identificacionInsumos, setIdentificacionInsumos] = useState('Especificar claramente el tipo de desinfectante a usar, registrar la preparación exacta (relación agua-químico) para certificar la concentración efectiva contra patógenos.');
  const [trazabilidadCargasLote, setTrazabilidadCargasLote] = useState('Si la aspersión se realiza sobre las bolsas rojas o contenedores rojos, antes del proceso principal (incineración, autoclave), vincular el pesaje correspondiente en la columna de lote.');

  // EPP Safety Verification Checklist
  const [epp, setEpp] = useState({
    respiradorCartuchos: true,
    trajeImpermeable: true,
    careta: true,
    guantesNitriloNeopreno: true,
  });

  const [observaciones, setObservaciones] = useState('Desinfección por aspersión efectuada cumpliendo las normas biosanitarias SGI.');

  // Signatures
  const [firmaOperador, setFirmaOperador] = useState('Ing. Daniel Marroquín');
  const [firmaSupervisor, setFirmaSupervisor] = useState('Licda. Ana Sofía de León');

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'bitacora_desinfeccion_agente_quimico'), orderBy('fechaRegistro', 'desc'), limit(15));
      const querySnapshot = await getDocs(q);
      const docs: BitacoraDesinfeccionAgenteQuimico[] = [];
      querySnapshot.forEach((doc) => {
        const docData = sanitizeBiotrashObject(doc.data());
        docs.push({ id: doc.id, ...docData } as BitacoraDesinfeccionAgenteQuimico);
      });
      setRegistros(docs);
    } catch (e) {
      console.error('Error fetching registers:', e);
      const fallback = localStorage.getItem('biotrash_desinfeccion_quimico_bk');
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
      await deleteDoc(doc(db, 'bitacora_desinfeccion_agente_quimico', docId));
      fetchRegistros();
    } catch (err) {
      console.error('Error al eliminar registro:', err);
      alert('Error al eliminar el registro de la base de datos.');
    }
  };


  const handleToggleArea = (key: keyof typeof areas) => {
    setAreas((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAllAreas = (value: boolean) => {
    setAreas({
      recepcion: value,
      cuartoFrio: value,
      autoclaves: value,
      trituradoras: value,
      compactadora: value,
      lavado: value,
      incinerador: value,
      patioManiobras: value,
      ingreso: value,
      lavanderia: value,
      muroPerimetral: value,
      comedor: value,
      taller: value,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quimico.trim() || cantidadGl <= 0) {
      setMsg({ text: 'Por favor complete el nombre del químico y una cantidad en galones válida.', type: 'error' });
      return;
    }

    setSaving(true);
    setMsg({ text: 'Guardando registro de desinfección...', type: 'info' });

    const nuevoRegistro: Omit<BitacoraDesinfeccionAgenteQuimico, 'id'> = {
      fechaRegistro: new Date().toISOString(),
      fecha: sanitizeBiotrashText(fecha),
      responsable: sanitizeBiotrashText(responsable),
      horaInicio,
      horaFin,
      quimico: sanitizeBiotrashText(quimico),
      dosis: sanitizeBiotrashText(dosis),
      cantidadGl,
      metodoAplicacion: {
        manualMochila: metodoManualMochila,
        aspersion: metodoAspersion,
      },
      areasTratadas: areas,
      identificacionInsumos: sanitizeBiotrashText(identificacionInsumos),
      trazabilidadCargasLote: sanitizeBiotrashText(trazabilidadCargasLote),
      verificacionEPP: epp,
      observaciones: sanitizeBiotrashText(observaciones),
      firmaOperador: sanitizeBiotrashText(firmaOperador),
      firmaSupervisor: sanitizeBiotrashText(firmaSupervisor),
      elaboro: 'Gerente Comercial Industrial',
      reviso: 'Comité ISO',
      aprobo: 'Gerente General',
      cambioControl: [
        {
          version: '1.0',
          fecha: '23/10/2018',
          seccion: 'Sección Inicial',
          cambio: 'Emisión inicial de la bitácora de desinfección y aplicación de agente químico F-OPR-000',
          solicitante: 'Comité ISO'
        }
      ]
    };

    try {
      await addDoc(collection(db, 'bitacora_desinfeccion_agente_quimico'), nuevoRegistro);
      generateAndDownloadPDF('desinfeccion_agente_quimico', nuevoRegistro);
      setMsg({ 
        text: '¡Registro de desinfección guardado exitosamente en Firestore y PDF oficial generado!', 
        type: 'success' 
      });
      fetchRegistros();
    } catch (err: any) {
      console.warn('Firestore write failed, caching locally:', err);
      const existing = JSON.parse(localStorage.getItem('biotrash_desinfeccion_quimico_bk') || '[]');
      const localRecord = { id: 'LOCAL_' + Date.now(), ...nuevoRegistro };
      localStorage.setItem('biotrash_desinfeccion_quimico_bk', JSON.stringify([localRecord, ...existing]));
      generateAndDownloadPDF('desinfeccion_agente_quimico', nuevoRegistro);
      setMsg({ text: 'Guardado localmente y PDF generado.', type: 'success' });
      fetchRegistros();
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadExcelAll = () => {
    if (registros.length === 0) {
      setMsg({ text: 'No hay registros para exportar.', type: 'error' });
      return;
    }
    generateAndDownloadExcel('desinfeccion_agente_quimico', registros);
  };

  const listaAreasNames = [
    { key: 'recepcion', label: 'Recepción' },
    { key: 'cuartoFrio', label: 'Cuarto frío' },
    { key: 'autoclaves', label: 'Auto claves' },
    { key: 'trituradoras', label: 'Trituradoras' },
    { key: 'compactadora', label: 'Compactadora' },
    { key: 'lavado', label: 'Lavado' },
    { key: 'incinerador', label: 'Incinerador' },
    { key: 'patioManiobras', label: 'Patio maniobras' },
    { key: 'ingreso', label: 'Ingreso' },
    { key: 'lavanderia', label: 'Lavandería' },
    { key: 'muroPerimetral', label: 'Muro perimetral' },
    { key: 'comedor', label: 'Comedor' },
    { key: 'taller', label: 'Taller' },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 font-semibold text-sm transition"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Tablero Principal
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadExcelAll}
            disabled={registros.length === 0}
            className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar Todo a Excel
          </button>
        </div>
      </div>

      {/* SGI Official Form Header */}
      <FormHeader
        codigo="F-OPR-000-15"
        titulo="CONTROL DE APLICACIÓN DE AGENTE QUÍMICO / BITÁCORA DE DESINFECCIÓN"
        version="1"
        fechaElaboracion="23/10/2018"
        fechaVersion="23/10/2018"
      />

      {/* Notification Banner */}
      {msg.text && (
        <div className={`p-4 rounded-lg text-sm font-medium flex items-center gap-2 ${
          msg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
          msg.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
          'bg-sky-50 text-sky-800 border border-sky-200'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Primary Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wide">
                <Droplets className="w-5 h-5 text-emerald-400" /> Registro de Aplicación de Agente Químico Desinfectante
              </div>
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-2.5 py-0.5 rounded-full uppercase">
                ISO 14001 / SGI
              </span>
            </div>

            <div className="p-6 space-y-6">
              {/* Section I: General Metadata */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" /> I. Datos Generales de Ejecución
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha:</label>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Hora Inicio:</label>
                    <input
                      type="time"
                      value={horaInicio}
                      onChange={(e) => setHoraInicio(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Hora Termina:</label>
                    <input
                      type="time"
                      value={horaFin}
                      onChange={(e) => setHoraFin(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Operador Responsable de Aplicación:</label>
                  <input
                    type="text"
                    value={responsable}
                    onChange={(e) => setResponsable(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Nombre o correo del responsable"
                    required
                  />
                </div>
              </div>

              {/* Section II: Chemical Parameters & Method */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-emerald-600" /> II. Parámetros del Desinfectante y Método
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Químico / Desinfectante:</label>
                    <input
                      type="text"
                      value={quimico}
                      onChange={(e) => setQuimico(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="Ej. Innibith, Cloro 5%, Amonio Cuaternario"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Dosis / Concentración:</label>
                    <input
                      type="text"
                      value={dosis}
                      onChange={(e) => setDosis(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="Ej. 50.00%, 1:100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cantidad (Galones - Gl):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={cantidadGl}
                      onChange={(e) => setCantidadGl(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Método de Aplicación:</label>
                  <div className="flex flex-wrap items-center gap-6 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={metodoManualMochila}
                        onChange={(e) => setMetodoManualMochila(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span>Manual (mochila)</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={metodoAspersion}
                        onChange={(e) => setMetodoAspersion(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span>Aspersión</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Section III: Areas / Plant Checklist */}
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" /> III. Áreas y Ubicaciones Tratadas
                  </h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAllAreas(true)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded font-bold transition"
                    >
                      Marcar Todas
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectAllAreas(false)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded font-bold transition"
                    >
                      Desmarcar Todas
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {listaAreasNames.map((item) => {
                    const isChecked = areas[item.key as keyof typeof areas];
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleToggleArea(item.key as keyof typeof areas)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}
                        <span className="text-xs">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section IV: Instructions & Traceability Key Points */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                  <Info className="w-4 h-4 text-emerald-600" /> IV. Puntos Clave e Instrucciones de Llenado
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Identificación de Insumos (Especificación y Relación Agua-Químico):
                    </label>
                    <textarea
                      rows={2}
                      value={identificacionInsumos}
                      onChange={(e) => setIdentificacionInsumos(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Trazabilidad de Cargas (Vinculación de Lote en Bolsas / Contenedores Rojos):
                    </label>
                    <textarea
                      rows={2}
                      value={trazabilidadCargasLote}
                      onChange={(e) => setTrazabilidadCargasLote(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section V: EPP Safety Verification */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-emerald-600" /> V. Verificación de Seguridad (EPP Exigido)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/50 p-4 rounded-xl border border-amber-200/80">
                  <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={epp.respiradorCartuchos}
                      onChange={(e) => setEpp((prev) => ({ ...prev, respiradorCartuchos: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span>Respirador con cartuchos para vapores orgánicos/ácidos</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={epp.trajeImpermeable}
                      onChange={(e) => setEpp((prev) => ({ ...prev, trajeImpermeable: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span>Traje impermeable de protección</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={epp.careta}
                      onChange={(e) => setEpp((prev) => ({ ...prev, careta: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span>Careta de protección facial</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={epp.guantesNitriloNeopreno}
                      onChange={(e) => setEpp((prev) => ({ ...prev, guantesNitriloNeopreno: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span>Guantes de nitrilo / neopreno</span>
                  </label>
                </div>
              </div>

              {/* Section VI: Observations & Signatures */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" /> VI. Observaciones y Firmas de Control SGI
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observaciones Generales:</label>
                  <textarea
                    rows={2}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Detalles sobre el proceso de desinfección o novedades de las áreas..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Firma Operador / Aplicador:</label>
                    <input
                      type="text"
                      value={firmaOperador}
                      onChange={(e) => setFirmaOperador(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Firma Supervisor SGI / Revisó:</label>
                    <input
                      type="text"
                      value={firmaSupervisor}
                      onChange={(e) => setFirmaSupervisor(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-6 py-3 rounded-lg shadow-sm flex items-center justify-center gap-2 transition"
                >
                  <FileText className="w-4 h-4" />
                  {saving ? 'Guardando Registro...' : 'Guardar y Generar PDF Oficial'}
                </button>
              </div>
            </div>
          </form>

          {/* Bulk Upload CSV/JSON Panel */}
          <BulkUploadPanel
            tipo="desinfeccion_agente_quimico"
            userEmail={userEmail}
            onSuccess={fetchRegistros}
          />
        </div>

        {/* Sidebar: Historical Records */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" /> Historial de Desinfecciones
              </span>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {registros.length}
              </span>
            </h3>

            {loading ? (
              <div className="text-center py-8 text-xs text-slate-500 animate-pulse">
                Cargando historial de registros...
              </div>
            ) : registros.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No hay registros guardados en Firestore.
              </div>
            ) : (
              <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                {registros.map((reg) => {
                  const totalAreasCount = Object.values(reg.areasTratadas || {}).filter(Boolean).length;
                  return (
                    <div
                      key={reg.id}
                      className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-200 transition space-y-2 text-xs"
                    >
                      <div className="flex justify-between items-start font-bold text-slate-800">
                        <span className="flex items-center gap-1.5 text-emerald-800">
                          <Droplets className="w-3.5 h-3.5 text-emerald-600" /> {reg.quimico}
                        </span>
                        <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                          {reg.dosis}
                        </span>
                      </div>

                      <div className="text-slate-600 text-[11px] grid grid-cols-2 gap-1 font-mono">
                        <div>Fecha: {reg.fecha}</div>
                        <div>Cantidad: {reg.cantidadGl} Gl</div>
                        <div>Horario: {reg.horaInicio} - {reg.horaFin}</div>
                        <div>Áreas: {totalAreasCount} / 13</div>
                      </div>

                      <div className="text-[10px] text-slate-500 truncate italic">
                        Resp: {reg.responsable}
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                        <button
                          onClick={() => generateAndDownloadPDF('desinfeccion_agente_quimico', reg)}
                          className="text-[10px] bg-slate-800 hover:bg-slate-900 text-white font-bold px-2.5 py-1 rounded flex items-center gap-1 transition"
                        >
                          <FileText className="w-3 h-3 text-emerald-400" /> PDF
                        </button>
                        {canDelete && reg.id && (
                          <>
                            <span className="text-slate-300 font-mono text-[10px]">|</span>
                            <button
                              type="button"
                              onClick={() => handleDelete(reg.id!)}
                              className="text-rose-700 hover:text-rose-900 font-bold flex items-center gap-0.5 text-[10px] cursor-pointer"
                              title="Eliminar Registro"
                            >
                              <Trash2 className="w-3 h-3 text-rose-600" /> Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <FormFooter />
    </div>
  );
}
