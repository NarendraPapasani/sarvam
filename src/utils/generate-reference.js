import crypto from 'crypto';

/**
 * Generate unique human-readable reference numbers.
 * Pattern: PREFIX-NNNN  (4-digit zero-padded counter backed by randomness)
 */

let counter = 0;

export function generateEventNumber() {
  counter += 1;
  const rand = crypto.randomInt(1000, 9999);
  return `EVT-${rand}${String(counter).padStart(2, '0')}`;
}

export function generateEscalationNumber() {
  counter += 1;
  const rand = crypto.randomInt(1000, 9999);
  return `ESC-${rand}${String(counter).padStart(2, '0')}`;
}

export function generateShipmentNumber() {
  counter += 1;
  const rand = crypto.randomInt(1000, 9999);
  return `SHP-${rand}${String(counter).padStart(2, '0')}`;
}
