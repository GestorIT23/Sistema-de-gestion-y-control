/**
 * Date normalization and descending sort utilities for SGI BIOTRASH.
 * Accurately parses multiple date representations (ISO YYYY-MM-DD, DD/MM/YYYY, 
 * Firestore Timestamp, ISO string timestamps) to sort all records in descending order (newest first).
 */

export function parseDateToTimestamp(val: any): number {
  if (val === null || val === undefined || val === '') return -Infinity;

  // Firestore Timestamp
  if (typeof val === 'object') {
    if (typeof val.toMillis === 'function') return val.toMillis();
    if (typeof val.seconds === 'number') return val.seconds * 1000;
    if (val instanceof Date) return val.getTime();
  }

  // Pure Number (timestamp or Excel serial date)
  if (typeof val === 'number') {
    if (val > 100000000000) return val; // Milliseconds
    if (val > 1000000000) return val * 1000; // Seconds
    if (val > 30000 && val < 60000) {
      // Excel serial date to JS timestamp
      return (val - 25569) * 86400 * 1000;
    }
    return val;
  }

  if (typeof val === 'string') {
    const s = val.trim();
    if (!s) return -Infinity;

    // Pattern: DD/MM/YYYY or DD-MM-YYYY (with optional time)
    const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(.*)$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      const rest = dmyMatch[4] ? dmyMatch[4].trim() : '';
      const isoStr = rest ? `${year}-${month}-${day}T${rest}` : `${year}-${month}-${day}T00:00:00`;
      const parsed = Date.parse(isoStr);
      if (!isNaN(parsed)) return parsed;
      const parsedWithoutT = Date.parse(`${year}-${month}-${day}`);
      if (!isNaN(parsedWithoutT)) return parsedWithoutT;
    }

    // Pattern: YYYY-MM-DD or ISO string
    const parsed = Date.parse(s);
    if (!isNaN(parsed)) return parsed;

    // Fallback: extract any YYYY-MM-DD
    const ymdMatch = s.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, '0');
      const day = ymdMatch[3].padStart(2, '0');
      const fallbackParsed = Date.parse(`${year}-${month}-${day}T00:00:00`);
      if (!isNaN(fallbackParsed)) return fallbackParsed;
    }
  }

  return -Infinity;
}

/**
 * Comparator to sort objects by date in DESCENDING order (newest first).
 * Evaluates primary date field (e.g., 'fecha', 'fechaVisita', 'fechaHora')
 * with fallback to 'fechaRegistro' or 'createdAt'.
 */
export function compareDatesDesc<T extends Record<string, any>>(a: T, b: T, primaryField = 'fecha'): number {
  const tsA = Math.max(
    parseDateToTimestamp(a[primaryField]),
    parseDateToTimestamp(a.fecha),
    parseDateToTimestamp(a.fechaVisita),
    parseDateToTimestamp(a.fechaHora),
    parseDateToTimestamp(a.fechaRegistro),
    parseDateToTimestamp(a.createdAt)
  );

  const tsB = Math.max(
    parseDateToTimestamp(b[primaryField]),
    parseDateToTimestamp(b.fecha),
    parseDateToTimestamp(b.fechaVisita),
    parseDateToTimestamp(b.fechaHora),
    parseDateToTimestamp(b.fechaRegistro),
    parseDateToTimestamp(b.createdAt)
  );

  if (tsB !== tsA) {
    return tsB - tsA;
  }

  // Secondary tie-breaker by document ID or string representation
  const strA = String(a[primaryField] || a.fecha || a.fechaRegistro || a.id || '');
  const strB = String(b[primaryField] || b.fecha || b.fechaRegistro || b.id || '');
  return strB.localeCompare(strA);
}

/**
 * Sorts an array of objects by date in DESCENDING order (newest first).
 * Returns a new sorted array.
 */
export function sortRecordsByDateDesc<T extends Record<string, any>>(records: T[], primaryField = 'fecha'): T[] {
  if (!Array.isArray(records)) return [];
  return [...records].sort((a, b) => compareDatesDesc(a, b, primaryField));
}
