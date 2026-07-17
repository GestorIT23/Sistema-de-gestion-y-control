import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { BitacoraControlAutoclaves } from '../../types';
import FormHeader from '../FormHeader';
import FormFooter from '../FormFooter';
import { Calendar, User, ArrowLeft, Download, Database, ShieldCheck, Heart, AlertCircle, Info, FileText, FileSpreadsheet, Camera, Trash2, RefreshCw, Video } from 'lucide-react';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';
import { generateAndDownloadExcel } from '../../utils/excelGenerator';
import BulkUploadPanel from '../BulkUploadPanel';

interface Props {
  onBack: () => void;
  userEmail: string;
}

export default function BitacoraControlAutoclavesModule({ onBack, userEmail }: Props) {
  const [registros, setRegistros] = useState<BitacoraControlAutoclaves[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Form Fields
  const [noAutoclave, setNoAutoclave] = useState('1');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [pesoBruto1, setPesoBruto1] = useState(300);
  const [pesoBruto2, setPesoBruto2] = useState(300);
  const [pesoBruto3, setPesoBruto3] = useState(300);
  const [pesoBruto4, setPesoBruto4] = useState(300);
  const [pesoBruto5, setPesoBruto5] = useState(300);
  const [pesoBruto6, setPesoBruto6] = useState(230);

  const calcNeto = (gross: number) => {
    return gross > 0 ? Math.max(0, gross - 180) : 0;
  };

  const pesoNeto1 = calcNeto(pesoBruto1);
  const pesoNeto2 = calcNeto(pesoBruto2);
  const pesoNeto3 = calcNeto(pesoBruto3);
  const pesoNeto4 = calcNeto(pesoBruto4);
  const pesoNeto5 = calcNeto(pesoBruto5);
  const pesoNeto6 = calcNeto(pesoBruto6);

  const pesoBrutoTotal = pesoBruto1 + pesoBruto2 + pesoBruto3 + pesoBruto4 + pesoBruto5 + pesoBruto6;
  const pesoProceso = pesoNeto1 + pesoNeto2 + pesoNeto3 + pesoNeto4 + pesoNeto5 + pesoNeto6;
  const [responsable, setResponsable] = useState(userEmail || 'Líder de Control Biológico');
  const [noProceso, setNoProceso] = useState('');
  const [lineaUtilizada, setLineaUtilizada] = useState('Línea 01');

  // Indicators Checkboxes
  const [biologico, setBiologico] = useState(false);
  const [quimico, setQuimico] = useState(true);
  const [cintaTestigoColor, setCintaTestigoColor] = useState<'verde' | 'cafe'>('cafe');
  
  const [identificacionIndicador, setIdentificacionIndicador] = useState('Cinta Testigo Químico Virado');
  const [resultadoIndicador, setResultadoIndicador] = useState('NEGATIVO (SIN CRECIMIENTO - APTO)');
  const [noLoteFabricante, setNoLoteFabricante] = useState('LOTE-2025-X12');
  const [tempIncubacion, setTempIncubacion] = useState('120 grados y 21 minutos');

  // Autoclave parameters checks
  const [temperatura, setTemperatura] = useState(true);
  const [presion, setPresion] = useState(true);
  const [tiempoProceso, setTiempoProceso] = useState(true);
  const [bombaVacio, setBombaVacio] = useState(true);

  const [observacionesParameters, setObservacionesParameters] = useState('Presión estable a 75 Psi. Proceso acumulado en 21 min estándar.');
  const [observaciones, setObservaciones] = useState('');
  const [capturaPanelAutoclave, setCapturaPanelAutoclave] = useState('');

  // Camera state
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 150);
    } catch (err: any) {
      console.error('Error al acceder a la cámara:', err);
      setCameraError('No se pudo acceder a la cámara. Verifique los permisos o si otro dispositivo la está usando.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturaPanelAutoclave(dataUrl);
        stopCamera();
      }
    }
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);
  
  const [firmaSupervisor, setFirmaSupervisor] = useState('Ing. Daniel Marroquín');
  const [firmaCoordinador, setFirmaCoordinador] = useState('Licda. Ana Sofía de León');

  // Verify SGI compliance - lot approved if temp, pressure, time are met, chemical/biological indicator reports negative, and indicator tape is brown
  const isCompliant = temperatura && presion && tiempoProceso && resultadoIndicador.includes('NEGATIVO') && cintaTestigoColor === 'cafe';

  useEffect(() => {
    fetchRegistros();
    // System auto-assigned process number
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const datePart = new Date().toISOString().split('T')[0].replace(/-/g, '').slice(2);
    setNoProceso(`NPA-${datePart}-${randomNum}`);
  }, []);

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'bitacora_control_autoclaves'), orderBy('fechaRegistro', 'desc'), limit(15));
      const querySnapshot = await getDocs(q);
      const docs: BitacoraControlAutoclaves[] = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as BitacoraControlAutoclaves);
      });
      setRegistros(docs);
    } catch (e) {
      console.error(e);
      const fallback = localStorage.getItem('biotrash_auto_bk');
      if (fallback) setRegistros(JSON.parse(fallback));
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    setMsg({ text: 'Guardando reporte de laboratorio autoclaves en Firebase...', type: 'info' });

    const nuevoRegistro: BitacoraControlAutoclaves = {
      fechaRegistro: new Date().toISOString(),
      fecha,
      responsable,
      noAutoclave,
      pesoProceso,
      noProceso,
      lineaUtilizada,
      tipoIndicador: { biologico, quimico },
      identificacionIndicador,
      resultadoIndicador,
      noLoteFabricante,
      tempIncubacion,
      cintaTestigoColor,
      parametrosOperacion: { temperatura, presion, tiempoProceso, bombaVacio },
      firmaSupervisor,
      firmaCoordinador,
      observacionesGeneralesProceso: observacionesParameters,
      observaciones,
      pesoBruto1,
      pesoBruto2,
      pesoBruto3,
      pesoBruto4,
      pesoBruto5,
      pesoBruto6,
      pesoNeto1,
      pesoNeto2,
      pesoNeto3,
      pesoNeto4,
      pesoNeto5,
      pesoNeto6,
      pesoBrutoTotal,
      capturaPanelAutoclave,
      elaboro: 'Gerente Comercial Industrial',
      reviso: 'Comité ISO',
      aprobo: 'Gerente General',
      cambioControl: [
        { version: '1.1', fecha: '09/07/2026', seccion: 'Sección de Pesajes', cambio: 'Actualización a 6 carritos de metal individuales, restando 180 lbs de tara por carrito', solicitante: 'Comité de Calidad' }
      ]
    };

    try {
      await addDoc(collection(db, 'bitacora_control_autoclaves'), nuevoRegistro);
      generateAndDownloadPDF('control_autoclaves', nuevoRegistro);
      setMsg({ text: 'Los resultados de control químico/biológico se han guardado exitosamente en Firestore y ya se generó el PDF oficial SGI con el registro individual de 6 carritos.', type: 'success' });
      setObservaciones('');
      setCapturaPanelAutoclave('');
      
      // Reset carritos weight inputs to defaults
      setPesoBruto1(300);
      setPesoBruto2(300);
      setPesoBruto3(300);
      setPesoBruto4(300);
      setPesoBruto5(300);
      setPesoBruto6(230);
      
      // Generate a new process number for the next entry
      const nextRandomNum = Math.floor(1000 + Math.random() * 9000);
      const nextDatePart = new Date().toISOString().split('T')[0].replace(/-/g, '').slice(2);
      setNoProceso(`NPA-${nextDatePart}-${nextRandomNum}`);
      
      fetchRegistros();
    } catch (err) {
      console.error(err);
      const updatedList = [nuevoRegistro, ...registros];
      setRegistros(updatedList);
      localStorage.setItem('biotrash_auto_bk', JSON.stringify(updatedList));
      generateAndDownloadPDF('control_autoclaves', nuevoRegistro);
      setMsg({ text: 'Guardado localmente y PDF generado con éxito. La base de datos no está disponible temporalmente.', type: 'warning' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = (registro: BitacoraControlAutoclaves) => {
    generateAndDownloadExcel('control_autoclaves', registro);
  };

  return (
    <div id="bitacora-autoclaves-root" className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/* Return Line */}
      <div className="flex items-center justify-between">
        <button
          id="btn-back"
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Tablero Principal
        </button>
        <span className="text-[11px] font-semibold uppercase font-mono tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Módulo E F-OPR-000 / Format N° 8
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Core Form (col-span-3) */}
        <div className="lg:col-span-3 space-y-6">
          <form id="bitacora-autoclaves-form" onSubmit={handleFormSubmit} className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-6">
            
            <FormHeader titulo="Bitácora de Control Químico / Biológico de Auto Claves" />

            {/* Sub-header parameters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">N° Autoclave:</label>
                <select
                  id="autoclave-val"
                  value={noAutoclave}
                  onChange={(e) => setNoAutoclave(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-bold outline-none text-xs"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Fecha de Proceso:</label>
                <input
                  id="fecha-proceso-val"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-bold outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Línea Utilizada:</label>
                <input
                  id="linea-utilizada-val"
                  type="text"
                  value={lineaUtilizada}
                  onChange={(e) => setLineaUtilizada(e.target.value)}
                  placeholder="Línea 01"
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-bold outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">N° de Proceso Autoclave:</label>
                <input
                  id="no-proceso-val"
                  type="text"
                  value={noProceso}
                  readOnly
                  disabled
                  title="Asignado automáticamente por el sistema"
                  className="w-full bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-slate-600 font-bold outline-none text-center opacity-80 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1 md:col-span-4">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Nombre Del Responsable de Pruebas:</label>
                <input
                  id="responsable-val"
                  type="text"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-semibold outline-none"
                  required
                />
              </div>
            </div>

            {/* PESAJES DE CARRITOS METÁLICOS */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-3 gap-2">
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2 text-emerald-800">
                  <Database className="w-5 h-5 text-emerald-600 animate-pulse" />
                  Registro de Pesajes por Carrito Metálico (Libras)
                </h4>
                <div className="text-[10px] text-slate-500 font-mono font-bold bg-white border px-2.5 py-1 rounded">
                  TARA POR CARRITO: 180 LBS
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {[
                  { label: 'Carrito 1', val: pesoBruto1, set: setPesoBruto1, net: pesoNeto1 },
                  { label: 'Carrito 2', val: pesoBruto2, set: setPesoBruto2, net: pesoNeto2 },
                  { label: 'Carrito 3', val: pesoBruto3, set: setPesoBruto3, net: pesoNeto3 },
                  { label: 'Carrito 4', val: pesoBruto4, set: setPesoBruto4, net: pesoNeto4 },
                  { label: 'Carrito 5', val: pesoBruto5, set: setPesoBruto5, net: pesoNeto5 },
                  { label: 'Carrito 6', val: pesoBruto6, set: setPesoBruto6, net: pesoNeto6 },
                ].map((cart, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 text-center shadow-xs">
                    <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-tight">{cart.label}</span>
                    <div className="space-y-1 font-mono">
                      <label className="block text-[9px] text-slate-400 font-bold uppercase">P. Bruto (lbs):</label>
                      <input
                        type="number"
                        value={cart.val}
                        onChange={(e) => cart.set(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 font-bold text-center text-xs focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div className="pt-1.5 border-t border-slate-100 font-mono">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">P. Neto:</span>
                      <span className="text-xs font-extrabold text-emerald-700">{cart.net} lbs</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Summary Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-emerald-900 text-white rounded-lg font-mono text-center shadow-xs">
                <div>
                  <span className="text-[10px] uppercase text-emerald-300 font-bold block">Total Peso Bruto</span>
                  <span className="text-lg font-extrabold">{pesoBrutoTotal} Lbs</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-emerald-300 font-bold block">Total Tara Restada</span>
                  <span className="text-lg font-extrabold">{pesoBrutoTotal - pesoProceso} Lbs</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-emerald-300 font-bold block">Total Peso Neto (Proceso)</span>
                  <span className="text-lg font-extrabold text-emerald-400">{pesoProceso} Lbs</span>
                </div>
              </div>
            </div>

            {/* Layout split on 2 columns: left is indicators test metadata, right is operational parameters checkboxes */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
              
              {/* Left Column Indicators inputs (Col span 7) */}
              <div className="md:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b pb-2 text-emerald-700">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" /> Identificación y Resultados de Microbiología
                </h4>

                <div className="space-y-3 text-xs font-mono">
                  {/* Tipo de Indicador Checkboxes */}
                  <div className="p-3 bg-white rounded-lg border space-y-2">
                    <p className="text-[10px] text-slate-400 leading-tight">Nota SGI: Los indicadores biológicos y químicos pueden ser usados de forma simultánea, indistinta, o seleccionar solo el que esté en uso en este momento (Ej: Cinta Testigo Químico).</p>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          id="chk-biologico"
                          type="checkbox"
                          checked={biologico}
                          onChange={(e) => setBiologico(e.target.checked)}
                          className="h-4.5 w-4.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="font-bold text-slate-700 block text-[10px]">Indicador Biológico:</span>
                          <span className="text-[9px] text-slate-400">G. stearothermophilus</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          id="chk-quimico"
                          type="checkbox"
                          checked={quimico}
                          onChange={(e) => setQuimico(e.target.checked)}
                          className="h-4.5 w-4.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="font-bold text-slate-700 block text-[10px]">Indicador Químico:</span>
                          <span className="text-[9px] text-slate-400">Integrador o Cinta Testigo</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Identificación Del Indicador:</label>
                      <input
                        id="id-vial"
                        type="text"
                        value={identificacionIndicador}
                        onChange={(e) => setIdentificacionIndicador(e.target.value)}
                        placeholder="Ej. Cinta testigo Lote A-01 o Ampolleta autococida"
                        className="w-full bg-white border border-slate-300 rounded p-1.5"
                      />
                    </div>

                    {/* Cinta Testigo Apartado */}
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                      <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider text-emerald-850">Apartado de Cinta Testigo (Virado de Calor):</span>
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 p-2 rounded border border-slate-150 transition">
                          <input
                            id="cinta-cafe"
                            type="checkbox"
                            checked={cintaTestigoColor === 'cafe'}
                            onChange={() => setCintaTestigoColor('cafe')}
                            className="h-4.5 w-4.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-slate-700 block text-[10px]">Color Café:</span>
                            <span className="text-[9px] text-emerald-600 font-extrabold">Proceso Correcto</span>
                          </div>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 p-2 rounded border border-slate-150 transition">
                          <input
                            id="cinta-verde"
                            type="checkbox"
                            checked={cintaTestigoColor === 'verde'}
                            onChange={() => setCintaTestigoColor('verde')}
                            className="h-4.5 w-4.5 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-slate-700 block text-[10px]">Color Verde:</span>
                            <span className="text-[9px] text-rose-600 font-extrabold">Proceso Fallido</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Resultado Microbiológico para Lote:</label>
                      <select
                        id="select-resultado"
                        value={resultadoIndicador}
                        onChange={(e) => setResultadoIndicador(e.target.value)}
                        className={`w-full border rounded p-1.5 font-bold ${resultadoIndicador.includes('NEGATIVO') ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-red-50 text-red-800 border-red-300'}`}
                      >
                        <option value="NEGATIVO (SIN CRECIMIENTO - APTO)">NEGATIVO (SIN CRECIMIENTO - APTO / VIRADO CORRECTO)</option>
                        <option value="POSITIVO (FALLA DE ESTERILIZACIÓN - RETENER LOTE)">POSITIVO (FALLA DE ESTERILIZACIÓN - RETENER LOTE)</option>
                      </select>
                      <p className="text-[9px] text-slate-400">Debe reportar negativo/apto para liberar el lote operado sin inconvenientes.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-[#F1F5F9]/50 p-2 rounded-lg border border-[#E2E8F0]">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">
                          Lote Fabricante: {!biologico && <span className="text-amber-600 font-extrabold">(N/A - Solo Biológico)</span>}
                        </label>
                        <input
                          id="lote-vial"
                          type="text"
                          disabled={!biologico}
                          value={biologico ? noLoteFabricante : 'No aplica (Solo Biológico)'}
                          onChange={(e) => setNoLoteFabricante(e.target.value)}
                          className="w-full bg-white disabled:bg-slate-100 disabled:text-slate-400 border border-slate-300 rounded p-1 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">
                          Condición de Incubación: {!biologico && <span className="text-amber-600 font-extrabold">(N/A - Solo Biológico)</span>}
                        </label>
                        <input
                          id="temp-incu"
                          type="text"
                          disabled={!biologico}
                          value={biologico ? tempIncubacion : 'No aplica (Solo Biológico)'}
                          onChange={(e) => setTempIncubacion(e.target.value)}
                          className="w-full bg-white disabled:bg-slate-100 disabled:text-slate-400 border border-slate-300 rounded p-1 text-xs"
                        />
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Right column autoclave operation parameters checkboxes (Col span 5) */}
              <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b pb-2 text-emerald-700">
                  <Heart className="w-5 h-5 text-emerald-500" /> Parámetros de Operación
                </h4>

                <div className="space-y-3">
                  {[
                    { label: 'Temperatura validada (121°C)', state: temperatura, set: setTemperatura, doc: 'Cámara interior esterilizada a vapor saturado.' },
                    { label: 'Presión validada 0.5 Mpa (75 Psi)', state: presion, set: setPresion, doc: 'Eficacia de vapor saturado.' },
                    { label: 'Tiempo de esterilización (21 minutos)', state: tiempoProceso, set: setTiempoProceso, doc: 'Duración bajo estrés térmico continuo.' },
                  ].map((param, i) => (
                    <label key={i} className="flex items-start gap-2.5 p-2 bg-white rounded border border-slate-150 hover:border-slate-300 transition cursor-pointer text-xs">
                      <input
                        id={`param-checkbox-${i}`}
                        type="checkbox"
                        checked={param.state}
                        onChange={(e) => param.set(e.target.checked)}
                        className="mt-0.5 h-4.5 w-4.5 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block text-[10px]">{param.label}</span>
                        <span className="text-[9px] text-slate-400">{param.doc}</span>
                      </div>
                    </label>
                  ))}

                  {/* Vacuum pump state */}
                  <label className="flex items-start gap-2.5 p-2 bg-white rounded border border-slate-150 hover:border-slate-300 transition cursor-pointer text-xs">
                    <input
                      id="bomba-vacio-checkbox"
                      type="checkbox"
                      checked={bombaVacio}
                      onChange={(e) => setBombaVacio(e.target.checked)}
                      className="mt-0.5 h-4.5 w-4.5 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block text-[10px]">Bomba de vacío (Correcto)</span>
                      <span className="text-[9px] text-slate-400">Estado de funcionamiento de la bomba de vacío (no afecta liberación).</span>
                    </div>
                  </label>

                  {/* Warning if vacuum pump fails */}
                  {!bombaVacio && (
                    <div className="p-2.5 bg-amber-50 border border-amber-300 text-amber-950 rounded text-[10px] font-bold flex items-start gap-2 animate-pulse leading-tight">
                      <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>ALERTA DE EQUIPO: La bomba de vacío presenta estado inestable o fallido. Reportar a mantenimiento.</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1 font-mono text-xs">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Observaciones Operacionales Autoclave:</label>
                  <textarea
                    id="obs-params"
                    rows={2}
                    value={observacionesParameters}
                    onChange={(e) => setObservacionesParameters(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs"
                  />
                </div>
              </div>

            </div>

            {/* Autoclave special verification status */}
            <div className={`p-4 rounded-xl border flex items-center gap-3 ${isCompliant ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              {isCompliant ? (
                <>
                  <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div className="text-xs">
                    <h5 className="font-bold uppercase">Lote Aprobado para Liberación (SGI BIOTRASH)</h5>
                    <p>La lectura biológica de 48 horas no muestra crecimiento. El integrador químico y cinta testigo viraron correctamente a fase de esterilidad.</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
                  <div className="text-xs">
                    <h5 className="font-bold uppercase text-red-700">Lote RECHAZADO / PROTOCOLO QUÍMICO-BIOLÓGICO NO CUMPLIDO</h5>
                    <p>Uno o más parámetros operacionales fallaron, la cinta testigo reporta color incorrecto, o el vial muestra turbidez/virado positivo. DETENGA LA SALIDA DE RESIDUOS!</p>
                  </div>
                </>
              )}
            </div>

            {/* Custom supervisor and coordinator names matching PDF form signatures */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-200 p-4 rounded-lg bg-slate-50">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Firma Supervisor Técnico:</label>
                <input
                  id="firma-sup"
                  type="text"
                  value={firmaSupervisor}
                  onChange={(e) => setFirmaSupervisor(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800 outline-none text-center italic font-semibold text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Firma Coordinador de Procesos:</label>
                <input
                  id="firma-coord"
                  type="text"
                  value={firmaCoordinador}
                  onChange={(e) => setFirmaCoordinador(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800 outline-none text-center italic font-semibold text-xs"
                />
              </div>
            </div>

            {/* Captura de Panel de Autoclave */}
            <div className="space-y-2 border border-slate-200 p-4 rounded-lg bg-slate-50">
              <label className="block text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" /> Captura de Panel de Autoclave:
              </label>
              
              {capturaPanelAutoclave ? (
                <div className="relative group rounded-lg overflow-hidden border border-slate-300 bg-black">
                  <img
                    src={capturaPanelAutoclave}
                    alt="Captura de panel de autoclave"
                    className="w-full max-h-80 object-contain mx-auto"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-3 py-1.5 bg-white text-slate-800 rounded-md text-xs font-semibold flex items-center gap-1 shadow-sm hover:bg-slate-100 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Tomar Otra Foto
                    </button>
                    <button
                      type="button"
                      onClick={() => setCapturaPanelAutoclave('')}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-md text-xs font-semibold flex items-center gap-1 shadow-sm hover:bg-red-700 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </div>
                  <div className="bg-slate-900 text-white p-2 text-xs flex justify-between items-center">
                    <span className="font-mono text-[10px]">✓ Foto de panel registrada</span>
                    <button
                      type="button"
                      onClick={() => setCapturaPanelAutoclave('')}
                      className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1 text-[11px]"
                    >
                      <Trash2 className="w-3 h-3" /> Borrar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 bg-white text-center">
                  {cameraActive ? (
                    <div className="space-y-4">
                      <div className="relative rounded-lg overflow-hidden bg-black max-w-md mx-auto">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-64 object-cover"
                        />
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                          <button
                            type="button"
                            onClick={capturePhoto}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-5 py-2 text-xs font-bold flex items-center gap-1.5 shadow-md transition"
                          >
                            <Camera className="w-4 h-4" /> Capturar Foto
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="bg-slate-800 hover:bg-slate-700 text-white rounded-full px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-md transition"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Alinee la cámara con el panel indicador de temperatura/presión del autoclave
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <Camera className="w-6 h-6" />
                      </div>
                      <div className="text-xs text-slate-500 max-w-sm mx-auto">
                        Presione el botón para activar la cámara de su dispositivo y documentar el panel del autoclave.
                      </div>
                      {cameraError && (
                        <div className="text-red-600 text-xs font-medium bg-red-50 p-2 rounded border border-red-100 max-w-md mx-auto">
                          {cameraError}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={startCamera}
                        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 mx-auto transition shadow-sm"
                      >
                        <Video className="w-4 h-4 text-emerald-450" /> Iniciar Cámara / Tomar Foto
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* General Observations */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">Observaciones Generales de Laboratorio:</label>
              <textarea
                id="observaciones-autoclave"
                rows={3}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Introduzca anomalías sobre las tiras indicadoras de calor o cualquier comportamiento secundario observado..."
                className="w-full bg-slate-50 border border-slate-300 rounded p-2.5 text-xs md:text-sm outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            <FormFooter />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              {msg.text && (
                <div id="autoclave-feedback-msg" className="flex-1 text-xs px-4 py-2 rounded-lg font-medium bg-emerald-50 text-emerald-850 border border-emerald-250">
                  {msg.text}
                </div>
              )}
              <button
                id="submit-vial-register"
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs md:text-sm px-6 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Guardar y Liberar'}
              </button>
            </div>

          </form>
        </div>

        {/* Sidebar History (col-span-1) */}
        <div className="lg:col-span-1 space-y-6">
          <BulkUploadPanel tipo="control_autoclaves" userEmail={userEmail} onSuccess={fetchRegistros} />

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white space-y-3 shadow-md">
            <h3 className="font-extrabold text-xs uppercase text-slate-300 tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-450" /> Laboratorio BIOTRASH SGI
            </h3>
            <p className="text-xs text-slate-400 leading-normal">
              La comprobación científica de la efectividad del proceso de esterilización demuestra el aseguramiento total de la eliminación de la carga patógena clínica de los RPBI.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide border-b pb-2">Controles de Autoclaves</h3>

            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div>
              </div>
            ) : registros.length === 0 ? (
              <div className="py-6 text-center text-slate-400 italic text-xs">No hay controles de autoclaves archivados en Firebase.</div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {registros.map((reg) => (
                  <div key={reg.id} className="border border-slate-100 hover:border-emerald-250 rounded-lg p-3 bg-slate-50 transition text-xs">
                    <div className="flex items-center justify-between font-mono font-semibold">
                      <span>{reg.fecha}</span>
                      <span className="text-emerald-700 font-bold">{reg.pesoProceso} Lbs</span>
                    </div>
                    <div className="text-slate-500 mt-1 font-mono text-[9px] truncate flex items-center justify-between">
                      <span>Máq: {reg.noAutoclave} | Proc: {reg.noProceso}</span>
                      {reg.capturaPanelAutoclave && (
                        <span className="text-emerald-600 font-bold flex items-center gap-0.5" title="Captura de panel disponible">
                          <Camera className="w-2.5 h-2.5" /> Foto
                        </span>
                      )}
                    </div>
                     <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200/50">
                       <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono ${reg.resultadoIndicador.includes('NEGATIVO') ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-850'}`}>
                         {reg.resultadoIndicador.includes('NEGATIVO') ? 'LIBERADO' : 'RETENIDO'}
                       </span>
                       <div className="flex gap-2">
                         <button
                           type="button"
                           onClick={() => handleExportExcel(reg)}
                           className="text-emerald-700 hover:text-emerald-950 font-bold text-[10px] cursor-pointer flex items-center gap-0.5"
                         >
                           <FileSpreadsheet className="w-3 h-3 text-emerald-600" /> Excel
                         </button>
                         <span className="text-slate-300 font-mono text-[10px]">|</span>
                         <button
                           type="button"
                           onClick={() => generateAndDownloadPDF('control_autoclaves', reg)}
                           className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-0.5 text-[10px] cursor-pointer"
                         >
                           <FileText className="w-2.5 h-2.5 text-rose-500" /> PDF SGI
                         </button>
                       </div>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
