import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { BitacoraGeneracionAlmacenamiento, FilaGeneracionTicket } from '../../types';
import FormHeader from '../FormHeader';
import FormFooter from '../FormFooter';
import { Calendar, MapPin, ArrowLeft, Download, Database, Plus, Trash2, LayoutList, Scale, FileText } from 'lucide-react';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';

interface Props {
  onBack: () => void;
  userEmail: string;
}

export default function BitacoraGeneracionAlmacenamientoModule({ onBack, userEmail }: Props) {
  const [registros, setRegistros] = useState<BitacoraGeneracionAlmacenamiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Form Fields
  const [enteGenerador, setEnteGenerador] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [pesoTicketBascula, setPesoTicketBascula] = useState(0); // Lbs or Kgs
  const [ubicacion, setUbicacion] = useState('Área de Recepción de Rampa A');
  const [noTicketBascula, setNoTicketBascula] = useState('');

  // Tipo de Residuo Checks
  const [inorganico, setInorganico] = useState(false);
  const [punzoCortante, setPunzoCortante] = useState(false);
  const [patologico, setPatologico] = useState(false);

  // Tipo de Embalaje Checks
  const [contenedor, setContenedor] = useState(false);
  const [tonelMetalico, setTonelMetalico] = useState(false);
  const [congelador, setCongelador] = useState(false);

  // Left & Right double tables as physically designed in PDF
  const [filasLeft, setFilasLeft] = useState<FilaGeneracionTicket[]>([]);

  const [filasRight, setFilasRight] = useState<FilaGeneracionTicket[]>([]);

  // Form temporary row fields
  const [newTicketId, setNewTicketId] = useState('');
  const [newWeight, setNewWeight] = useState(0);
  const [tableSide, setTableSide] = useState<'left' | 'right'>('left');

  const [observaciones, setObservaciones] = useState('');

  // Auto Calculations
  const sumLeft = filasLeft.reduce((a, b) => a + (Number(b.peso) || 0), 0);
  const sumRight = filasRight.reduce((a, b) => a + (Number(b.peso) || 0), 0);
  const totalPesoTickets = sumLeft + sumRight;
  const scaleDeviation = Math.abs(totalPesoTickets - pesoTicketBascula);
  const scaleDeviationPct = pesoTicketBascula > 0 ? (scaleDeviation / pesoTicketBascula) * 100 : 0;

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'bitacora_generacion_almacenamiento'), orderBy('fechaRegistro', 'desc'), limit(15));
      const querySnapshot = await getDocs(q);
      const docs: BitacoraGeneracionAlmacenamiento[] = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as BitacoraGeneracionAlmacenamiento);
      });
      setRegistros(docs);
    } catch (e) {
      console.error(e);
      const fallback = localStorage.getItem('biotrash_gen_bk');
      if (fallback) setRegistros(JSON.parse(fallback));
    } finally {
      setLoading(false);
    }
  };

  const handleAddTicket = () => {
    if (!newTicketId || newWeight <= 0) {
      setMsg({ text: 'Rellene código de ticket y un peso mayor a cero.', type: 'error' });
      return;
    }
    const newRow = { noTicketInterno: newTicketId, peso: newWeight };
    if (tableSide === 'left') {
      setFilasLeft([...filasLeft, newRow]);
    } else {
      setFilasRight([...filasRight, newRow]);
    }
    setNewTicketId('');
    setNewWeight(0);
    setMsg({ text: '', type: '' });
  };

  const handleRemoveLeft = (idx: number) => {
    setFilasLeft(filasLeft.filter((_, i) => i !== idx));
  };

  const handleRemoveRight = (idx: number) => {
    setFilasRight(filasRight.filter((_, i) => i !== idx));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalPesoTickets === 0) {
      setMsg({ text: 'Debe ingresar al menos un ticket interno de pesaje.', type: 'error' });
      return;
    }

    setSaving(true);
    setMsg({ text: 'Almacenando reporte de recepción en Firebase...', type: 'info' });

    const nuevoRegistro: BitacoraGeneracionAlmacenamiento = {
      fechaRegistro: new Date().toISOString(),
      fecha,
      responsable: userEmail || 'Verificador de Puerta',
      enteGenerador,
      pesoTicketBascula,
      ubicacion,
      noTicketBascula,
      tipoResiduo: { inorganico, punzoCortante, patologico },
      tipoEmbalaje: { contenedor, tonelMetalico, congelador },
      filasLeft,
      filasRight,
      totalPesoTickets,
      observaciones,
      elaboro: 'Gerente Comercial Industrial',
      reviso: 'Comité ISO',
      aprobo: 'Gerente General',
      cambioControl: [
        { version: '1.0', fecha: '13/06/2026', seccion: 'Todas', cambio: 'Creación de bitácora patrón de trazabilidad de tickets internos e ingreso', solicitante: 'Comité de Calidad' }
      ]
    };

    try {
      await addDoc(collection(db, 'bitacora_generacion_almacenamiento'), nuevoRegistro);
      generateAndDownloadPDF('generacion_almacenamiento', nuevoRegistro);
      setMsg({ text: 'El reporte de recepción y almacenamiento se guardó exitosamente en Firestore y ya se generó el PDF oficial SGC.', type: 'success' });
      setObservaciones('');
      fetchRegistros();
    } catch (err) {
      console.error(err);
      const updatedList = [nuevoRegistro, ...registros];
      setRegistros(updatedList);
      localStorage.setItem('biotrash_gen_bk', JSON.stringify(updatedList));
      generateAndDownloadPDF('generacion_almacenamiento', nuevoRegistro);
      setMsg({ text: 'Guardado offline localmente y PDF generado con éxito.', type: 'warning' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = (registro: BitacoraGeneracionAlmacenamiento) => {
    let csv = `BIOTRASH - Bitacora de Generacion y Almacenamiento Temporal de RPBI\n`;
    csv += `Ente Generador,Fecha Recoleccion,Peso Bascula Official,Ubicacion,No Ticket Bascula\n`;
    csv += `"${registro.enteGenerador}",${registro.fecha},${registro.pesoTicketBascula},"${registro.ubicacion}","${registro.noTicketBascula}"\n\n`;
    csv += `Tipo de Residuo\n`;
    csv += `Inorganico: ${registro.tipoResiduo?.inorganico ? 'SÍ' : 'NO'}, Punzo Cortante: ${registro.tipoResiduo?.punzoCortante ? 'SÍ' : 'NO'}, Patologico: ${registro.tipoResiduo?.patologico ? 'SÍ' : 'NO'}\n`;
    csv += `Tipo de Embalaje\n`;
    csv += `Contenedor: ${registro.tipoEmbalaje?.contenedor ? 'SÍ' : 'NO'}, Tonel Metalico: ${registro.tipoEmbalaje?.tonelMetalico ? 'SÍ' : 'NO'}, Congelador: ${registro.tipoEmbalaje?.congelador ? 'SÍ' : 'NO'}\n\n`;
    csv += `Ticket Interno,Peso\n`;
    const allRows = [...(registro.filasLeft || []), ...(registro.filasRight || [])];
    allRows.forEach(f => {
      csv += `"${f.noTicketInterno}",${f.peso}\n`;
    });
    csv += `Total Peso Tickets,${registro.totalPesoTickets}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `recepcion_${registro.fecha}.csv`);
    link.click();
  };

  return (
    <div id="bitacora-generacion-root" className="max-w-6xl mx-auto px-4 py-6 space-y-8 font-sans">
      {/* Back breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          id="btn-back"
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Tablero Principal
        </button>
        <span className="text-[11px] font-semibold uppercase font-mono tracking-wider text-cyan-600 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-200">
          Módulo C F-OPR-000 / Format N° 9
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Core Form (col-span-3) */}
        <div className="lg:col-span-3 space-y-6">
          <form id="bitacora-generacion-form" onSubmit={handleFormSubmit} className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-6">
            
            <FormHeader titulo="Bitácora de Generación y Almacenamiento Temporal de RPBI (Ingreso)" />

            {/* Subheader info fields matching original tables */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Ente Generador:</label>
                <input
                  id="ente-generador"
                  type="text"
                  value={enteGenerador}
                  onChange={(e) => setEnteGenerador(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-semibold outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Fecha Recolección:</label>
                <input
                  id="fecha-recoleccion"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-semibold outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-slate-400" /> Peso Báscula (Oficial):
                </label>
                <input
                  id="peso-oficial"
                  type="number"
                  step="0.1"
                  value={pesoTicketBascula}
                  onChange={(e) => setPesoTicketBascula(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-850 font-bold outline-none text-center"
                  required
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> Ubicación en Planta:
                </label>
                <input
                  id="ubicacion"
                  type="text"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-semibold outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">No. Ticket Báscula:</label>
                <input
                  id="ticket-bascula"
                  type="text"
                  value={noTicketBascula}
                  onChange={(e) => setNoTicketBascula(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-bold outline-none text-center"
                  required
                />
              </div>
            </div>

            {/* Checkboxes layout: Residue and Packaging */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Residue types */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider border-b pb-2 text-cyan-700">
                  Tipo de Residuo Recibido
                </h4>
                <div className="space-y-1 grid grid-cols-1">
                  {[
                    { label: 'Inorgánico común clínico', state: inorganico, set: setInorganico },
                    { label: 'Punzo Cortante (Guardianes)', state: punzoCortante, set: setPunzoCortante },
                    { label: 'Patológico orgánico infeccioso', state: patologico, set: setPatologico },
                  ].map((res, i) => (
                    <label key={i} className="flex items-center gap-2.5 p-2 bg-white rounded border border-slate-150 hover:border-slate-300 transition cursor-pointer text-xs font-semibold">
                      <input
                        id={`residuo-checkbox-${i}`}
                        type="checkbox"
                        checked={res.state}
                        onChange={(e) => res.set(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <span className="text-slate-700">{res.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Packaging types */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider border-b pb-2 text-cyan-700">
                  Tipo de Embalaje / Preservación
                </h4>
                <div className="space-y-1 grid grid-cols-1">
                  {[
                    { label: 'Contenedor Rojo Logística', state: contenedor, set: setContenedor },
                    { label: 'Tonel Metálico Saborizante', state: tonelMetalico, set: setTonelMetalico },
                    { label: 'Congelador Móvil Frío', state: congelador, set: setCongelador },
                  ].map((emb, i) => (
                    <label key={i} className="flex items-center gap-2.5 p-2 bg-white rounded border border-slate-150 hover:border-slate-300 transition cursor-pointer text-xs font-semibold">
                      <input
                        id={`embalaje-checkbox-${i}`}
                        type="checkbox"
                        checked={emb.state}
                        onChange={(e) => emb.set(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <span className="text-slate-700">{emb.label}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>

            {/* Grid Double Columns of Tickets */}
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-2 border-slate-150 gap-2">
                <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wide flex items-center gap-1.5 text-cyan-700">
                  <LayoutList className="w-4 h-4" /> Relación de Tickets Internos de Pesaje
                </h3>
                
                {/* Embedded row addition bar */}
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs shrink-0 self-end">
                  <input
                    id="add-ticket-id"
                    type="text"
                    value={newTicketId}
                    onChange={(e) => setNewTicketId(e.target.value)}
                    placeholder="TI-XXXX"
                    className="bg-white border rounded px-2 py-1 w-24 outline-none font-mono"
                  />
                  <input
                    id="add-ticket-weight"
                    type="number"
                    step="0.01"
                    value={newWeight || ''}
                    onChange={(e) => setNewWeight(parseFloat(e.target.value) || 0)}
                    placeholder="Peso"
                    className="bg-white border rounded px-1.5 py-1 w-16 text-center font-bold"
                  />
                  <select
                    id="add-ticket-side"
                    value={tableSide}
                    onChange={(e) => setTableSide(e.target.value as any)}
                    className="bg-white border rounded px-1 py-1 text-[11px]"
                  >
                    <option value="left">Tabla Izq</option>
                    <option value="right">Tabla Der</option>
                  </select>
                  <button
                    id="btn-add-ticket"
                    type="button"
                    onClick={handleAddTicket}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white rounded p-1 flex items-center justify-center transition shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Split responsive grid mimicking physical Double Table columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Side Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
                  <table id="tickets-left-table" className="w-full text-xs text-left text-slate-600">
                    <thead className="bg-[#ecfeff] text-cyan-800 uppercase p-2 font-bold text-[9px] border-b">
                      <tr>
                        <th className="px-3 py-1.5 border-r border-slate-350">No. DE TICKET´S INTERNOS</th>
                        <th className="px-3 py-1.5 text-center w-24 border-r">PESO</th>
                        <th className="px-1 py-1 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {filasLeft.map((f, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-3 py-1.5 border-r font-bold text-slate-700">{f.noTicketInterno}</td>
                          <td className="px-3 py-1.5 text-center border-r font-semibold">{f.peso.toFixed(1)}</td>
                          <td className="px-1 py-1 text-center">
                            <button
                              id={`del-left-${i}`}
                              type="button"
                              onClick={() => handleRemoveLeft(i)}
                              className="text-red-500 hover:text-red-700 focus:outline-none"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filasLeft.length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-center py-6 text-slate-400 italic text-[11px]">En espera de registros izquierdo...</td>
                        </tr>
                      )}
                      <tr className="bg-slate-50 font-bold border-t border-slate-300">
                        <td className="px-3 py-1.5 border-r uppercase text-[9px]">Sumatoria Columna Izq:</td>
                        <td className="px-3 py-1.5 text-center text-cyan-800">{sumLeft.toFixed(1)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Right Side Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
                  <table id="tickets-right-table" className="w-full text-xs text-left text-slate-600">
                    <thead className="bg-[#ecfeff] text-cyan-800 uppercase p-2 font-bold text-[9px] border-b">
                      <tr>
                        <th className="px-3 py-1.5 border-r border-slate-350">No. DE TICKET´S INTERNOS</th>
                        <th className="px-3 py-1.5 text-center w-24 border-r">PESO</th>
                        <th className="px-1 py-1 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {filasRight.map((f, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-3 py-1.5 border-r font-bold text-slate-700">{f.noTicketInterno}</td>
                          <td className="px-3 py-1.5 text-center border-r font-semibold">{f.peso.toFixed(1)}</td>
                          <td className="px-1 py-1 text-center">
                            <button
                              id={`del-right-${i}`}
                              type="button"
                              onClick={() => handleRemoveRight(i)}
                              className="text-red-500 hover:text-red-700 focus:outline-none"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filasRight.length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-center py-6 text-slate-400 italic text-[11px]">En espera de registros derecho...</td>
                        </tr>
                      )}
                      <tr className="bg-slate-50 font-bold border-t border-slate-300">
                        <td className="px-3 py-1.5 border-r uppercase text-[9px]">Sumatoria Columna Der:</td>
                        <td className="px-3 py-1.5 text-center text-cyan-800">{sumRight.toFixed(1)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

              </div>

              {/* Total combined and reconciliation matching original template totals flow */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50 font-mono text-xs mt-3">
                <div>
                  <span className="block text-[9px] font-bold text-slate-500 uppercase">Total Peso Combinado (Tickets):</span>
                  <span className="text-base font-extrabold text-cyan-800">{totalPesoTickets.toFixed(1)} LBS / KGS</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-500 uppercase">Peso Oficial Báscula:</span>
                  <span className="text-base font-extrabold text-slate-700">{pesoTicketBascula.toFixed(1)} LBS / KGS</span>
                </div>
                <div className={`p-1.5 rounded-lg border flex flex-col justify-center ${scaleDeviationPct > 3 ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                  <span className="block text-[9px] font-bold uppercase">Desviación de Báscula:</span>
                  <span className="text-sm font-extrabold">{scaleDeviationPct.toFixed(2)} % ({scaleDeviation.toFixed(1)})</span>
                </div>
              </div>
            </div>

            {/* Observaciones */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">Observaciones Generales de Recepción:</label>
              <textarea
                id="observaciones-generales"
                rows={3}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Declare estado de rotulación de los tanques, mermas de fluidos clínicos o rechazo de bolsas por mala soldadura fiscal..."
                className="w-full bg-slate-50 border border-slate-300 rounded p-2.5 text-xs md:text-sm outline-none focus:bg-white focus:ring-1 focus:ring-cyan-500 transition"
              />
            </div>

            {/* Signatures */}
            <FormFooter />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              {msg.text && (
                <div id="recepcion-feedback-msg" className="flex-1 text-xs px-4 py-2 rounded-lg font-medium bg-cyan-50 text-cyan-900 border border-cyan-200">
                  {msg.text}
                </div>
              )}
              <button
                id="btn-save"
                type="submit"
                disabled={saving}
                className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs md:text-sm px-6 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Guardar e Ingresar'}
              </button>
            </div>

          </form>
        </div>

        {/* Sidebar History (col-span-1) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white space-y-3 shadow-md">
            <h3 className="font-extrabold text-xs uppercase text-slate-300 tracking-wider flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-400" /> Control de Balanzas SGC
            </h3>
            <p className="text-xs text-slate-400 leading-normal">
              La conciliación obligatoria entre el peso del ticket oficial del camión recolector y la sumatoria manual de los tickets de bolsas en rampa audita fugas y pérdidas invisibles.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide border-b pb-2">Pesajes Archivados</h3>

            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-600"></div>
              </div>
            ) : registros.length === 0 ? (
              <div className="py-6 text-center text-slate-400 italic text-xs">Sin registros de pesajes hoy.</div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {registros.map((reg) => (
                  <div key={reg.id} className="border border-slate-100 hover:border-cyan-250 rounded-lg p-3 bg-slate-50 transition text-xs">
                    <div className="flex items-center justify-between font-mono font-semibold">
                      <span>{reg.fecha}</span>
                      <span className="text-cyan-700 font-bold">{reg.totalPesoTickets.toFixed(1)} lbs</span>
                    </div>
                    <div className="text-slate-500 mt-1 font-mono text-[9px] truncate">Ente: {reg.enteGenerador}</div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/50">
                      <button
                        type="button"
                        onClick={() => handleExportCSV(reg)}
                        className="text-cyan-600 hover:text-cyan-900 font-bold text-[10px] cursor-pointer"
                      >
                        Descargar CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => generateAndDownloadPDF('generacion_almacenamiento', reg)}
                        className="text-rose-600 hover:text-rose-800 flex items-center gap-1 font-bold text-[10px] cursor-pointer"
                      >
                        <FileText className="w-3 h-3 text-rose-500" /> Descargar PDF (SGC)
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
