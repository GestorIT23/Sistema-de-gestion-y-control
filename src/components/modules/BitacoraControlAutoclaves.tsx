import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { BitacoraControlAutoclaves } from '../../types';
import FormHeader from '../FormHeader';
import FormFooter from '../FormFooter';
import { Calendar, User, ArrowLeft, Download, Database, ShieldCheck, Heart, AlertCircle, Info, FileText, FileSpreadsheet } from 'lucide-react';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';
import { generateAndDownloadExcel } from '../../utils/excelGenerator';

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
  const [pesoProceso, setPesoProceso] = useState(650); // Lbs of waste sterilized
  const [responsable, setResponsable] = useState(userEmail || 'Líder de Control Biológico');
  const [noProceso, setNoProceso] = useState('NPA-9920');
  const [lineaUtilizada, setLineaUtilizada] = useState('Línea 01');

  // Indicators Checkboxes
  const [biologico, setBiologico] = useState(false);
  const [quimico, setQuimico] = useState(true);
  
  const [identificacionIndicador, setIdentificacionIndicador] = useState('Cinta Testigo Químico Virado');
  const [resultadoIndicador, setResultadoIndicador] = useState('NEGATIVO (SIN CRECIMIENTO - APTO)');
  const [noLoteFabricante, setNoLoteFabricante] = useState('LOTE-2025-X12');
  const [tempIncubacion, setTempIncubacion] = useState('120 grados y 21 minutos');

  // Autoclave parameters checks
  const [temperatura, setTemperatura] = useState(true);
  const [presion, setPresion] = useState(true);
  const [tiempoProceso, setTiempoProceso] = useState(true);

  const [observacionesParameters, setObservacionesParameters] = useState('Presión estable a 75 Psi. Proceso cumplulado en 21 min estándar.');
  const [observaciones, setObservaciones] = useState('');
  
  const [firmaSupervisor, setFirmaSupervisor] = useState('Ing. Daniel Marroquín');
  const [firmaCoordinador, setFirmaCoordinador] = useState('Licda. Ana Sofía de León');

  // Verify SGI compliance
  const isCompliant = (quimico || biologico) && temperatura && presion && tiempoProceso && (!biologico || (biologico && resultadoIndicador.includes('NEGATIVO')));

  useEffect(() => {
    fetchRegistros();
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
      parametrosOperacion: { temperatura, presion, tiempoProceso },
      firmaSupervisor,
      firmaCoordinador,
      observacionesGeneralesProceso: observacionesParameters,
      observaciones,
      elaboro: 'Gerente Comercial Industrial',
      reviso: 'Comité ISO',
      aprobo: 'Gerente General',
      cambioControl: [
        { version: '1.0', fecha: '13/06/2025', seccion: 'Todas', cambio: 'Establecimiento de protocolo químico-biológico para liberación de residuos estériles y virado de cinta testigo SGI', solicitante: 'Comité de Calidad' }
      ]
    };

    try {
      await addDoc(collection(db, 'bitacora_control_autoclaves'), nuevoRegistro);
      generateAndDownloadPDF('control_autoclaves', nuevoRegistro);
      setMsg({ text: 'Los resultados de control químico/biológico se han guardado exitosamente en Firestore y ya se generó el PDF oficial SGC.', type: 'success' });
      setObservaciones('');
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
                  onChange={(e) => setNoProceso(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-semibold outline-none text-center"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Peso del Proceso (Lbs):</label>
                <input
                  id="peso-proceso-val"
                  type="number"
                  value={pesoProceso}
                  onChange={(e) => setPesoProceso(parseInt(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-bold outline-none text-center"
                />
              </div>

              <div className="space-y-1 md:col-span-3">
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
                    <h5 className="font-bold uppercase">Lote Aprobado para Liberación (SGC BIOTRASH)</h5>
                    <p>La lectura biológica de 48 horas no muestra crecimiento. El integrador químico viró correctamente a fase de esterilidad.</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
                  <div className="text-xs">
                    <h5 className="font-bold uppercase text-red-700">Lote RECHAZADO / PROTOCOLO BIOLÓGICO NO CUMPLIDO</h5>
                    <p>Uno o más parámetros operacionales fallaron o el vial muestra turbidez positiva. DETENGA LA SALIDA DE RESIDUOS!</p>
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

            {/* General Observations */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">Observaciones Generales de Laboratorio:</label>
              <textarea
                id="observaciones-autoclave"
                rows={3}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Introduzca anomalías sobre las tiras indicadoras de calor o cualquier comportamiento secundario observativo..."
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
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white space-y-3 shadow-md">
            <h3 className="font-extrabold text-xs uppercase text-slate-300 tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-450" /> Laboratorio BIOTRASH SGC
            </h3>
            <p className="text-xs text-slate-400 leading-normal">
              La comprobación científica de la efectividad del proceso de esterilización asegura el aseguramiento total de la eliminación de la carga patógena clínica de los RPBI.
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
                    <div className="text-slate-500 mt-1 font-mono text-[9px] truncate">Máq: {reg.noAutoclave}</div>
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
                           <FileText className="w-2.5 h-2.5 text-rose-500" /> PDF SGC
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
