import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { BitacoraCuartoFrio } from '../../types';
import FormHeader from '../FormHeader';
import FormFooter from '../FormFooter';
import { Calendar, User, ArrowLeft, Download, Database, Snowflake, AlertTriangle, CheckSquare, FileText } from 'lucide-react';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';

interface Props {
  onBack: () => void;
  userEmail: string;
}

export default function BitacoraCuartoFrioModule({ onBack, userEmail }: Props) {
  const [registros, setRegistros] = useState<BitacoraCuartoFrio[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Form Fields
  const [cuartoFrio, setCuartoFrio] = useState('Sección Fría Norte / Cámara A');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [horaInspeccion, setHoraInspeccion] = useState('07:30');
  const [responsable, setResponsable] = useState(userEmail || 'Auditor de Calidad');
  const [cantidadCongeladoresActivos, setCantidadCongeladoresActivos] = useState(6);

  // Temperatures
  const [tempEntrada, setTempEntrada] = useState(2.1); // <= 3.00 C
  const [tempSalida, setTempSalida] = useState(2.4);  // <= 3.00 C
  const [congelador01, setCongelador01] = useState(-5.0); // <= 0.00 C
  const [congelador02, setCongelador02] = useState(-4.2);
  const [congelador03, setCongelador03] = useState(-4.8);
  const [congelador04, setCongelador04] = useState(-6.1);
  const [congelador05, setCongelador05] = useState(-5.5);
  const [congelador06, setCongelador06] = useState(-4.0);

  // Checkboxes
  const [limpiezaParedesExteriores, setLimpiezaParedesExteriores] = useState(true);
  const [limpiezaParedesInteriores, setLimpiezaParedesInteriores] = useState(true);
  const [limpiezaPiso, setLimpiezaPiso] = useState(true);
  const [funcionamientoEvaporadores, setFuncionamientoEvaporadores] = useState(true);
  const [funcionamientoCondensadores, setFuncionamientoCondensadores] = useState(true);
  const [funcionamientoLucesInteriores, setFuncionamientoLucesInteriores] = useState(true);
  const [limpiezaTecho, setLimpiezaTecho] = useState(true);
  const [limpiezaExteriorTecho, setLimpiezaExteriorTecho] = useState(true);
  const [residuoOrdenado, setResiduoOrdenado] = useState(true);

  const [observaciones, setObservaciones] = useState('');

  // Check alerting variables
  const isColdRoomAlert = tempEntrada > 3.0 || tempSalida > 3.0;
  const isFreezerAlert = [congelador01, congelador02, congelador03, congelador04, congelador05, congelador06].some(t => t > 0);

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'bitacora_cuarto_frio'), orderBy('fechaRegistro', 'desc'), limit(15));
      const querySnapshot = await getDocs(q);
      const docs: BitacoraCuartoFrio[] = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as BitacoraCuartoFrio);
      });
      setRegistros(docs);
    } catch (e) {
      console.error(e);
      const fallback = localStorage.getItem('biotrash_fr_bk');
      if (fallback) setRegistros(JSON.parse(fallback));
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    setMsg({ text: 'Sincronizando reporte de cuarto frío con Firebase...', type: 'info' });

    const nuevoRegistro: BitacoraCuartoFrio = {
      fechaRegistro: new Date().toISOString(),
      fecha,
      responsable,
      cuartoFrio,
      horaInspeccion,
      cantidadCongeladoresActivos: parseInt(cantidadCongeladoresActivos as any) || 6,
      tempEntrada,
      tempSalida,
      tempCongeladores: {
        congelador01,
        congelador02,
        congelador03,
        congelador04,
        congelador05,
        congelador06
      },
      inspeccion: {
        limpiezaParedesExteriores,
        limpiezaParedesInteriores,
        limpiezaPiso,
        funcionamientoEvaporadores,
        funcionamientoCondensadores,
        funcionamientoLucesInteriores,
        limpiezaTecho,
        limpiezaExteriorTecho,
        residuoOrdenado
      },
      observaciones,
      elaboro: 'Gerente Comercial Industrial',
      reviso: 'Comité ISO',
      aprobo: 'Gerente General',
      cambioControl: [
        { version: '1.0', fecha: '13/06/2026', seccion: 'Todas', cambio: 'Ajuste de límites térmico-sanitarios según norma del cuarto fío (SGC)', solicitante: 'Comité de Calidad' }
      ]
    };

    try {
      await addDoc(collection(db, 'bitacora_cuarto_frio'), nuevoRegistro);
      generateAndDownloadPDF('cuarto_frio', nuevoRegistro);
      setMsg({ text: 'La bitácora de refrigeración y congelación se ha guardado exitosamente en Firestore y ya se generó el PDF oficial SGC.', type: 'success' });
      setObservaciones('');
      fetchRegistros();
    } catch (err) {
      console.error(err);
      const updatedList = [nuevoRegistro, ...registros];
      setRegistros(updatedList);
      localStorage.setItem('biotrash_fr_bk', JSON.stringify(updatedList));
      generateAndDownloadPDF('cuarto_frio', nuevoRegistro);
      setMsg({ text: 'Guardado localmente y PDF generado con éxito. La base de datos no está disponible temporalmente.', type: 'warning' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = (registro: BitacoraCuartoFrio) => {
    let csv = `BIOTRASH - Bitacora de Control de Cuarto Frio y Congeladores\n`;
    csv += `Cuarto Frio,Fecha,Hora,Nombre Responsable,Congeladores Activos\n`;
    csv += `"${registro.cuartoFrio}",${registro.fecha},${registro.horaInspeccion},${registro.responsable},${registro.cantidadCongeladoresActivos}\n`;
    csv += `Temp Entrada C,Temp Salida C,Congelador 01 C,Congelador 02 C,Congelador 03 C,Congelador 04 C,Congelador 05 C,Congelador 06 C\n`;
    csv += `${registro.tempEntrada},${registro.tempSalida},${registro.tempCongeladores.congelador01},${registro.tempCongeladores.congelador02},${registro.tempCongeladores.congelador03},${registro.tempCongeladores.congelador04},${registro.tempCongeladores.congelador05},${registro.tempCongeladores.congelador06}\n\n`;
    csv += `Inspeccion,Estado\n`;
    csv += `Limpieza paredes ext,${registro.inspeccion.limpiezaParedesExteriores ? 'APROBADO' : 'FALLA'}\n`;
    csv += `Limpieza paredes int,${registro.inspeccion.limpiezaParedesInteriores ? 'APROBADO' : 'FALLA'}\n`;
    csv += `Limpieza piso,${registro.inspeccion.limpiezaPiso ? 'APROBADO' : 'FALLA'}\n`;
    csv += `Funcionamiento evaporadores,${registro.inspeccion.funcionamientoEvaporadores ? 'APROBADO' : 'FALLA'}\n`;
    csv += `Funcionamiento condensadores,${registro.inspeccion.funcionamientoCondensadores ? 'APROBADO' : 'FALLA'}\n`;
    csv += `Residuo ordenado,${registro.inspeccion.residuoOrdenado ? 'APROBADO' : 'FALLA'}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cuarto_frio_${registro.fecha}.csv`);
    link.click();
  };

  return (
    <div id="bitacora-frio-root" className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/* Return Row */}
      <div className="flex items-center justify-between">
        <button
          id="btn-back"
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Tablero Principal
        </button>
        <span className="text-[11px] font-semibold uppercase font-mono tracking-wider text-sky-600 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
          Módulo I F-OPR-000 / Format N° 6
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Core Form */}
        <div className="lg:col-span-3 space-y-6">
          <form id="bitacora-frio-form" onSubmit={handleFormSubmit} className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-6">
            
            <FormHeader titulo="Bitácora de Control de Cuarto Frío y Congeladores" />

            {/* Sub-header controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Cuarto Frío:</label>
                <input
                  id="cuartofrio-name"
                  type="text"
                  value={cuartoFrio}
                  onChange={(e) => setCuartoFrio(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-semibold outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Fecha de Inspección:</label>
                <input
                  id="fecha-inspeccion"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-semibold outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Hora de Inspección:</label>
                <input
                  id="hora-inspeccion"
                  type="time"
                  value={horaInspeccion}
                  onChange={(e) => setHoraInspeccion(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-semibold outline-none"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Nombre Del Responsable de Inspección:</label>
                <input
                  id="nombre-responsable"
                  type="text"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-semibold outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Congeladores Activos:</label>
                <input
                  id="congeladores-activos"
                  type="number"
                  min={0}
                  max={6}
                  value={cantidadCongeladoresActivos}
                  onChange={(e) => setCantidadCongeladoresActivos(parseInt(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-bold outline-none text-center"
                />
              </div>
            </div>

            {/* Warnings Alert Boxes */}
            {(isColdRoomAlert || isFreezerAlert) && (
              <div className="border border-amber-300 bg-amber-50 p-4 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
                  <h4 className="font-bold">Advertencia de Temperatura Fuera de Límite (ISO 14001)</h4>
                  <p>
                    {isColdRoomAlert && "• La temperatura de la cámara del cuarto frío supera el límite de <= 3.00 °C. "}
                    {isFreezerAlert && "• Uno o más congeladores de RPBI exceden la temperatura de preservación segura de <= 0.00 °C."}
                  </p>
                  <p className="mt-1 font-semibold">Active el protocolo de revisión de los compresores condensadores.</p>
                </div>
              </div>
            )}

            {/* Two blocks: Left side temperatures inputs, right side checklist checkboxes */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
              
              {/* Left temps input (Col span 6) */}
              <div className="md:col-span-6 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b pb-2 text-sky-700">
                  <Snowflake className="w-4 h-4" /> Parámetros Térmicos
                </h4>

                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-100">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Temp Entrada:</label>
                    <input
                      id="temp-entrada"
                      type="number"
                      step="0.01"
                      value={tempEntrada}
                      onChange={(e) => setTempEntrada(parseFloat(e.target.value) || 0)}
                      className={`w-full bg-slate-10 border text-base font-bold text-center rounded py-1 outline-none ${tempEntrada > 3.0 ? 'text-red-650 border-red-300 bg-red-50' : 'text-slate-800'}`}
                    />
                    <span className="block text-[9px] text-slate-400 text-center">Límite: {`<= 3.0 °C`}</span>
                  </div>

                  <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-100">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Temp Salida:</label>
                    <input
                      id="temp-salida"
                      type="number"
                      step="0.01"
                      value={tempSalida}
                      onChange={(e) => setTempSalida(parseFloat(e.target.value) || 0)}
                      className={`w-full bg-slate-10 border text-base font-bold text-center rounded py-1 outline-none ${tempSalida > 3.0 ? 'text-red-650 border-red-300 bg-red-50' : 'text-slate-800'}`}
                    />
                    <span className="block text-[9px] text-slate-400 text-center">Límite: {`<= 3.0 °C`}</span>
                  </div>
                </div>

                <div className="border-t pt-2 space-y-3 font-mono text-xs">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Temperaturas de Congeladores {"(<= 0.00 °C)"}</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Congelador 01', state: congelador01, set: setCongelador01 },
                      { label: 'Congelador 02', state: congelador02, set: setCongelador02 },
                      { label: 'Congelador 03', state: congelador03, set: setCongelador03 },
                      { label: 'Congelador 04', state: congelador04, set: setCongelador04 },
                      { label: 'Congelador 05', state: congelador05, set: setCongelador05 },
                      { label: 'Congelador 06', state: congelador06, set: setCongelador06 },
                    ].map((cong, i) => (
                      <div key={i} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-md border border-slate-150">
                        <span className="text-[10px] font-bold text-slate-500">{cong.label}:</span>
                        <input
                          id={`cong-input-${i}`}
                          type="number"
                          step="0.1"
                          value={cong.state}
                          onChange={(e) => cong.set(parseFloat(e.target.value) || 0)}
                          className={`w-16 text-center font-bold font-mono text-xs rounded border ${cong.state > 0 ? 'text-red-700 bg-red-50 border-red-200' : 'text-slate-700 bg-slate-50 border-slate-150'}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right checklist block (Col span 6) */}
              <div className="md:col-span-6 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                  <CheckSquare className="w-4 h-4 text-sky-500" /> Checklist SGC de Preservación
                </h4>

                <div className="space-y-2 grid grid-cols-1 gap-1">
                  {[
                    { label: 'Limpieza de paredes exteriores', state: limpiezaParedesExteriores, set: setLimpiezaParedesExteriores },
                    { label: 'Limpieza de paredes interiores', state: limpiezaParedesInteriores, set: setLimpiezaParedesInteriores },
                    { label: 'Limpieza de piso', state: limpiezaPiso, set: setLimpiezaPiso },
                    { label: 'Funcionamiento de evaporadores', state: funcionamientoEvaporadores, set: setFuncionamientoEvaporadores },
                    { label: 'Funcionamiento de condensadores', state: funcionamientoCondensadores, set: setFuncionamientoCondensadores },
                    { label: 'Funcionamiento de luces interiores', state: funcionamientoLucesInteriores, set: setFuncionamientoLucesInteriores },
                    { label: 'Limpieza de techo', state: limpiezaTecho, set: setLimpiezaTecho },
                    { label: 'Limpieza exterior del techo', state: limpiezaExteriorTecho, set: setLimpiezaExteriorTecho },
                    { label: 'Residuo ordenado', state: residuoOrdenado, set: setResiduoOrdenado },
                  ].map((chk, i) => (
                    <label key={i} className="flex items-center gap-2.5 p-2 bg-white rounded border border-slate-150 hover:border-slate-300 transition cursor-pointer text-xs">
                      <input
                        id={`chk-inspeccion-${i}`}
                        type="checkbox"
                        checked={chk.state}
                        onChange={(e) => chk.set(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      <span className="font-medium text-slate-700">{chk.label}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>

            {/* Obs */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">Observaciones Generales:</label>
              <textarea
                id="observaciones-cuarto-frio"
                rows={3}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Rellene con mermas mecánicas de la puerta de cierre hidráulico, presencia de condensación en el techo o retrasos en la sanitización..."
                className="w-full bg-slate-50 border border-slate-300 rounded p-2.5 text-xs md:text-sm outline-none focus:bg-white focus:ring-1 focus:ring-sky-500 transition"
              />
            </div>

            {/* Signatures & version */}
            <FormFooter />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              {msg.text && (
                <div id="frio-feedback-msg" className="flex-1 text-xs px-4 py-2 rounded-lg font-medium bg-sky-50 text-sky-850 border border-sky-200">
                  {msg.text}
                </div>
              )}
              <button
                id="btn-save-frio"
                type="submit"
                disabled={saving}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs md:text-sm px-6 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Guardar Inspección'}
              </button>
            </div>

          </form>
        </div>

        {/* Sidebar History */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white space-y-3">
            <h3 className="font-extrabold text-xs uppercase text-slate-300 tracking-wider flex items-center gap-2">
              <Snowflake className="w-4 h-4 text-sky-450 animate-spin-slow" /> Control de Vacío Térmico
            </h3>
            <p className="text-xs text-slate-400 leading-normal">
              Preservar el RPBI a menos de 4°C inhibe la proliferación bacteriana y la emanación de gases nocivos. Se requiere controles diarios obligatorios de SGC.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide border-b pb-2">Inspecciones Recientes</h3>

            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-600"></div>
              </div>
            ) : registros.length === 0 ? (
              <div className="py-6 text-center text-slate-400 italic text-xs">Sin bitácoras térmicas archivadas en Firebase.</div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {registros.map((reg) => (
                  <div key={reg.id} className="border border-slate-100 hover:border-sky-200 rounded-lg p-3 bg-slate-50 transition text-xs">
                    <div className="flex items-center justify-between font-mono font-semibold">
                      <span>{reg.fecha}</span>
                      <span className="text-sky-600 font-bold">{reg.horaInspeccion}</span>
                    </div>
                    <div className="text-slate-500 mt-1 font-mono text-[10px] truncate">Sala: {reg.cuartoFrio}</div>
                    <div className="italic mt-1 font-mono text-[10px] text-slate-400">
                      Ent: {reg.tempEntrada}°C / Sal: {reg.tempSalida}°C
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/50">
                      <button
                        type="button"
                        onClick={() => handleExportCSV(reg)}
                        className="text-sky-700 hover:text-sky-900 font-bold text-[10px] cursor-pointer"
                      >
                        Descargar CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => generateAndDownloadPDF('cuarto_frio', reg)}
                        className="text-[#3B82F6] hover:text-blue-800 flex items-center gap-1 font-bold text-[10px] cursor-pointer"
                      >
                        <FileText className="w-3 h-3 text-blue-500" /> Descargar PDF (SGC)
                      </button>
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
