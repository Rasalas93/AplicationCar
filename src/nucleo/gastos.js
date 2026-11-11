/** Adaptador de prevision.js (T1634, sin cambios): lo expone igual en el navegador y en Node. */
import * as M from './prevision.js';

export const Prevision = globalThis.Prevision || M.default;
