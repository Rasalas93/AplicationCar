/** Fechas 'AAAA-MM-DD' en UTC, sin reloj: funciones puras. */
const DIA = 864e5;
export const ms = f => { const [a, m, d] = f.split('-').map(Number); return Date.UTC(a, m - 1, d); };
export const iso = t => new Date(t).toISOString().slice(0, 10);
export const masDias = (f, n) => iso(ms(f) + n * DIA);
export const dias = (a, b) => Math.round((ms(b) - ms(a)) / DIA);
export const masMeses = (f, n) => { const [a, m, d] = f.split('-').map(Number); const fin = new Date(Date.UTC(a, m - 1 + n + 1, 0)).getUTCDate(); return iso(Date.UTC(a, m - 1 + n, Math.min(d, fin))); };
export const hoyLocal = (ahora = new Date()) => iso(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()));
