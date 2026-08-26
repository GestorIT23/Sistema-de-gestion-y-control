import React from 'react';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title?: string;
  description?: string;
  itemIdentifier?: string;
  details?: { label: string; value: string }[];
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteSingleRecordModal({
  isOpen,
  title = '¿Eliminar este registro?',
  description = 'Esta acción eliminará permanentemente el registro seleccionado de la base de datos Firestore y no se podrá recuperar.',
  itemIdentifier,
  details = [],
  isDeleting,
  onConfirm,
  onCancel,
}: Props) {
  if (!isOpen) return null;

  return (
    <div
      id="modal-delete-single-record"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-sans"
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-rose-200 max-w-md w-full overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-rose-50 px-5 py-4 border-b border-rose-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{title}</h3>
              <p className="text-xs text-rose-700 font-medium">Acción administrativa de eliminación</p>
            </div>
          </div>
          <button
            id="btn-close-delete-modal"
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs text-slate-600">
          <p className="leading-relaxed">{description}</p>

          {itemIdentifier && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-[11px] text-slate-700">
              <span className="text-slate-400 font-bold uppercase text-[9px] block mb-1">Identificador / Folio:</span>
              <span className="font-bold text-slate-900 break-all">{itemIdentifier}</span>
            </div>
          )}

          {details.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 font-mono text-[11px]">
              {details.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 border-b border-slate-100 last:border-0 pb-1 last:pb-0">
                  <span className="text-slate-500 font-medium">{item.label}:</span>
                  <span className="font-bold text-slate-800 text-right truncate max-w-[200px]">{item.value || '—'}</span>
                </div>
              ))}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-[11px] leading-relaxed flex items-start gap-2">
            <Trash2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              La eliminación afectará únicamente a este documento individual sin modificar el resto de bitácoras del sistema.
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            id="btn-cancel-single-delete"
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            id="btn-confirm-single-delete"
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-sm transition flex items-center gap-1.5 disabled:opacity-60"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" /> Sí, Eliminar Registro
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
