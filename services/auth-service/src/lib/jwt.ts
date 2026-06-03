import jwtImport from 'jsonwebtoken';

/** ESM-compatible jsonwebtoken default export */
export const jwt =
  (jwtImport as { default?: typeof jwtImport }).default ?? jwtImport;
