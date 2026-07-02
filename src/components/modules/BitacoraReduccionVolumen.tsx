import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { BitacoraReduccionVolumen } from '../../types';
import FormHeader from '../FormHeader';
import FormFooter from '../FormFooter';
import { Calendar, User, ArrowLeft, Download, Database, Settings, ToggleLeft, Gauge, FileText, FileSpreadsheet } from 'lucide-react';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';
import { generateAndDownloadExcel } from '../../utils/excelGenerator';

interface Props {
  onBack: () => void;
  userEmail: string;
}

export default function BitacoraReduccionVolumenModule({ onBack, userEmail }: Props) {
  const [registros, setRegistros] = useState<BitacoraReduccionVolumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Form Fields
  const [noTrituradora, setNoTrituradora] = useState('Trituradora Industrial Shredder-750X');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [tiempoProceso, setTiempoProceso] = useState('2.5 Horas');
  const [responsable, setResponsable] = useState(userEmail || 'Operador de Planta');
  const [noProceso, setNoProceso] = useState('NP-88390');

  const [pesoEntrada, setPesoEntrada] = useState(1200); // Lbs
  const [pesoSalida, setPesoSalida] = useState(1185);  // Lbs
  const [cantidadPacas, setCantidadPacas] = useState(15); // Number of bales

  // Trituradora machine checkboxes
  const [estadoTrituradora, setEstadoTrituradora] = useState(true);
  const [estadoCajasReductoras, setEstadoCajasReductoras] = useState(true);
  const [estadoFajas, setEstadoFajas] = useState(true);
  const [estadoElevadorCarros, setEstadoElevadorCarros] = useState(true);
  const [estadoBandaTransportadora, setEstadoBandaTransportadora] = useState(true);
  const [estadoCompactadora, setEstadoCompactadora] = useState(true);

  const [observaciones, setObservaciones] = useState('');
  const [anotacionesEspeciales, setAnotacionesEspeciales] = useState('');

  // Compaction indicator calculations
  const weightLossRatio = pesoEntrada > 0 ? ((pesoEntrada - pesoSalida) / pesoEntrada) * 100 : 0;
  const averageBaleWeight = cantidadPacas > 0 ? (pesoSalida / cantidadPacas) : 0;

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'bitacora_reduccion_volumen'), orderBy('fechaRegistro', 'desc'), limit(15));
      const querySnapshot = await getDocs(q);
      const docs: BitacoraReduccionVolumen[] = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as BitacoraReduccionVolumen);
      });
      setRegistros(docs);
    } catch (e) {
      console.error(e);
      const fallback = localStorage.getItem('biotrash_red_bk');
      if (fallback) setRegistros(JSON.parse(fallback));
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pesoEntrada <= 0 || cantidadPacas <= 0) {
      setMsg({ text: 'Por favor, ingrese un peso de entrada de material y cantidad de pacas mayor a cero.', type: 'error' });
      return;
    }

    setSaving(true);
    setMsg({ text: 'Guardando datos del proceso de compactación en Firebase...', type: 'info' });

    const nuevoRegistro: BitacoraReduccionVolumen = {
      fechaRegistro: new Date().toISOString(),
      fecha,
      responsable,
      noTrituradora,
      tiempoProceso,
      noProceso,
      pesoEntrada,
      pesoSalida,
      cantidadPacas,
      estadoTrituradora,
      estadoCajasReductoras,
      estadoFajas,
      estadoElevadorCarros,
      estadoBandaTransportadora,
      estadoCompactadora,
      anotacionesEspeciales,
      observaciones,
      elaboro: 'Gerente Comercial Industrial',
      reviso: 'Comité ISO',
      aprobo: 'Gerente General',
      cambioControl: [
        { version: '1.0', fecha: '13/06/2025', seccion: 'Todas', cambio: 'Creación de bitácora matriz para reducción de volumen y pacas', solicitante: 'Comité de Calidad' }
      ]
    };

    try {
      await addDoc(collection(db, 'bitacora_reduccion_volumen'), nuevoRegistro);
      generateAndDownloadPDF('reduccion_volumen', nuevoRegistro);
      setMsg({ text: 'El registro de reducción de volumen se archivó exitosamente en Firestore y se ha generado el PDF oficial SGI.', type: 'success' });
      setObservaciones('');
      setAnotacionesEspeciales('');
      fetchRegistros();
    } catch (err) {
      console.error(err);
      const updatedList = [nuevoRegistro, ...registros];
      setRegistros(updatedList);
      localStorage.setItem('biotrash_red_bk', JSON.stringify(updatedList));
      generateAndDownloadPDF('reduccion_volumen', nuevoRegistro);
      setMsg({ text: 'Fallo de red, guardado localmente y PDF generado con éxito.', type: 'warning' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = (registro: BitacoraReduccionVolumen) => {
    generateAndDownloadExcel('reduccion_volumen', registro);
  };

  return (
    <div id="bitacora-reduccion-root" className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/* Return Row */}
      <div className="flex items-center justify-between">
        <button
          id="btn-back"
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Tablero Principal
        </button>
        <span className="text-[11px] font-semibold uppercase font-mono tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Módulo D F-OPR-000 / Format N° 7
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Core Form */}
        <div className="lg:col-span-3 space-y-6">
          <form id="bitacora-reduccion-form" onSubmit={handleFormSubmit} className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-6">
            
            <FormHeader titulo="Bitácora de Proceso de Reducción de Volúmen y Control de Pacas" />

            {/* Sub-header parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">N° Trituradora:</label>
                <input
                  id="trituradora-val"
                  type="text"
                  value={noTrituradora}
                  onChange={(e) => setNoTrituradora(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-semibold outline-none"
                />
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
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Tiempo del Proceso:</label>
                <input
                  id="tiempo-proceso-val"
                  type="text"
                  value={tiempoProceso}
                  onChange={(e) => setTiempoProceso(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-semibold outline-none"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Nombre Del Responsable de Operación:</label>
                <input
                  id="responsable-val"
                  type="text"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-semibold outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Número de Proceso:</label>
                <input
                  id="no-proceso-val"
                  type="text"
                  value={noProceso}
                  onChange={(e) => setNoProceso(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-bold outline-none text-center"
                />
              </div>
            </div>

            {/* Layout divided: Left metrics weight inputs, Right shredder diagnostic checkboxes */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
              
              {/* Left Weight compaction (Col span 6) */}
              <div className="md:col-span-6 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b pb-2 text-emerald-700">
                  <Gauge className="w-4 h-4" /> Balanzas y Pesos de Trabajo
                </h4>

                <div className="space-y-4 font-mono text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-100">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Peso Entrada (Lbs):</label>
                      <input
                        id="peso-entrada"
                        type="number"
                        value={pesoEntrada}
                        onChange={(e) => setPesoEntrada(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-center font-bold text-base rounded py-1"
                      />
                    </div>
                    <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-100">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Peso Salida (Lbs):</label>
                      <input
                        id="peso-salida"
                        type="number"
                        value={pesoSalida}
                        onChange={(e) => setPesoSalida(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-center font-bold text-base rounded py-1"
                      />
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex items-center justify-between font-bold text-emerald-800">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase tracking-wide text-emerald-600 block">Eficiencia / Diferencia de Humedad:</span>
                      <span className="text-sm font-extrabold">Compresión de Peso</span>
                    </div>
                    <span className="text-lg">{weightLossRatio.toFixed(2)} %</span>
                  </div>

                  <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-200">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Cantidad de Pacas Realizadas:</label>
                    <input
                      id="cant-pacas"
                      type="number"
                      value={cantidadPacas}
                      onChange={(e) => setCantidadPacas(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-center font-bold text-lg rounded py-1"
                    />
                  </div>

                  <div className="flex justify-between items-center bg-slate-100 border p-2 rounded text-[10px] text-slate-500">
                    <span>Peso promedio por paca:</span>
                    <span className="font-bold text-slate-700">{averageBaleWeight.toFixed(1)} Lbs/Paca</span>
                  </div>
                </div>
              </div>

              {/* Right shredder safety diagnostic (Col span 6) */}
              <div className="md:col-span-6 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b pb-2 text-emerald-700">
                  <Settings className="w-5 h-5 animate-spin-slow" /> Diagnóstico del Equipo SGI
                </h4>

                <div className="space-y-2">
                  {[
                    { label: 'Estado general de la trituradora', state: estadoTrituradora, set: setEstadoTrituradora },
                    { label: 'Estado de las cajas reductoras', state: estadoCajasReductoras, set: setEstadoCajasReductoras },
                    { label: 'Estado general de las fajas', state: estadoFajas, set: setEstadoFajas },
                    { label: 'Estado general del elevador de carros', state: estadoElevadorCarros, set: setEstadoElevadorCarros },
                    { label: 'Estado general de la banda transportadora', state: estadoBandaTransportadora, set: setEstadoBandaTransportadora },
                    { label: 'Estado general de la compactadora', state: estadoCompactadora, set: setEstadoCompactadora },
                  ].map((eq, i) => (
                    <label key={i} className="flex items-center justify-between p-2.5 bg-white rounded border border-slate-150 hover:border-slate-350 transition cursor-pointer text-xs">
                      <span className="font-semibold text-slate-700">{eq.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${eq.state ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {eq.state ? 'ÓPTIMO' : 'FALLA'}
                        </span>
                        <input
                          id={`eq-checkbox-${i}`}
                          type="checkbox"
                          checked={eq.state}
                          onChange={(e) => eq.set(e.target.checked)}
                          className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </div>

            </div>

            {/* Special Textarea for Anotación Especial */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">Anotaciones Especiales de Seguridad:</label>
              <textarea
                id="anotaciones-especiales"
                rows={2}
                value={anotacionesEspeciales}
                onChange={(e) => setAnotacionesEspeciales(e.target.value)}
                placeholder="Presencia de metales prohibidos detectados por el imán de inducción, paradas de emergencia forzadas, etc..."
                className="w-full bg-slate-50 border border-slate-300 rounded p-2.5 text-xs md:text-sm outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            {/* General observations */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">Observaciones Generales del Proceso:</label>
              <textarea
                id="observaciones-reductora"
                rows={3}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Describa el nivel de desgaste de las cuchillas, merma lubricante o demoras mecánicas..."
                className="w-full bg-slate-50 border border-slate-300 rounded p-2.5 text-xs md:text-sm outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            <FormFooter />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              {msg.text && (
                <div id="compactor-feedback-msg" className="flex-1 text-xs px-4 py-2 rounded-lg font-medium bg-emerald-50 text-emerald-850 border border-emerald-250">
                  {msg.text}
                </div>
              )}
              <button
                id="btn-save-compactor"
                type="submit"
                disabled={saving}
                className="bg-emerald-650 hover:bg-emerald-700 text-white font-bold text-xs md:text-sm px-6 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Sincronizar Compactadora'}
              </button>
            </div>

          </form>
        </div>

        {/* Sidebar History */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white space-y-3 shadow-md">
            <h3 className="font-extrabold text-xs uppercase text-slate-300 tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-450 animate-spin-slow" /> Reducción SGI Triturado
            </h3>
            <p className="text-xs text-slate-400 leading-normal">
              La trituración volumétrica reduce el peso visual y corta cadenas plásticas de jeringas y empaques clínicos para maximizar el cubicaje del transporte final.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide border-b pb-2">Compactaciones del Shredder</h3>

            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div>
              </div>
            ) : registros.length === 0 ? (
              <div className="py-6 text-center text-slate-400 italic text-xs">Aún no existen registros de Triturado en Firebase.</div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {registros.map((reg) => (
                  <div key={reg.id} className="border border-slate-100 hover:border-emerald-250 rounded-lg p-3 bg-slate-50 transition text-xs">
                    <div className="flex items-center justify-between font-mono font-semibold">
                      <span>{reg.fecha}</span>
                      <span className="text-emerald-700 font-bold">{reg.cantidadPacas} Pacas</span>
                    </div>
                    <div className="text-slate-500 mt-1 font-mono text-[10px] truncate">Línea: {reg.noProceso}</div>
                    <div className="italic mt-1 font-mono text-[10px] text-slate-400">
                      I: {reg.pesoEntrada} lbs / O: {reg.pesoSalida} lbs
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/50">
                      <button
                        type="button"
                        onClick={() => handleExportExcel(reg)}
                        className="text-emerald-700 hover:text-emerald-900 font-bold text-[10px] cursor-pointer flex items-center gap-1"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Descargar Excel
                      </button>
                      <button
                        type="button"
                        onClick={() => generateAndDownloadPDF('reduccion_volumen', reg)}
                        className="text-indigo-600 hover:text-indigo-850 flex items-center gap-1 font-bold text-[10px] cursor-pointer"
                      >
                        <FileText className="w-3 h-3 text-indigo-500" /> Descargar PDF (SGI)
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
