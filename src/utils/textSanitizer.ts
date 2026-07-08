/**
 * Highly polished text sanitization utility for SGI BIOTRASH S.A.
 * Implements the user's directive: "todo lado donde diga basura bio colocar BIOTRASH"
 * Automatically normalizes any variation of 'basura bio', 'basura-bio', 'basurabio', 'bio trash',
 * 'bio-trash', 'basuras bio', and 'biotrash' to uppercase 'BIOTRASH'.
 */

export function sanitizeBiotrashText(text: string): string {
  if (typeof text !== 'string') return text;

  // Pattern matches case-insensitive:
  // 1. "basura bio", "basuras bio", "basura-bio", "basura_bio"
  // 2. "basurabio", "basurasbio"
  // 3. "basura biológica", "basura bioinfecciosa", "basuras bioinfecciosas"
  // 4. "bio-trash", "bio trash", "biotrash" (all case insensitive)
  return text
    .replace(/\bbasura[s]?[-_ ]?bio\b/gi, 'BIOTRASH')
    .replace(/\bbasura[s]?[-_ ]?biológica[s]?\b/gi, 'BIOTRASH')
    .replace(/\bbasura[s]?[-_ ]?bioinfecciosa[s]?\b/gi, 'BIOTRASH')
    .replace(/\bbio[-_ ]?trash\b/gi, 'BIOTRASH')
    .replace(/\b(biotrash)\b/gi, 'BIOTRASH');
}

/**
 * Recursively traverses any data structure (string, array, or object) and sanitizes
 * any text properties containing "basura bio" or other matched terms.
 */
export function sanitizeBiotrashObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeBiotrashText(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeBiotrashObject(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    // Keep class instances if they are not plain objects (e.g., Date, RegExp)
    const proto = Object.getPrototypeOf(obj);
    if (proto !== Object.prototype && proto !== null) {
      return obj;
    }

    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = sanitizeBiotrashObject(obj[key]);
      }
    }
    return newObj as T;
  }

  return obj;
}
