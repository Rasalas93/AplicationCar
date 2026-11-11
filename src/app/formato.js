/** Formato es-ES de cifras y fechas para las pantallas. */
export const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const MESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export const partes = f => f.split('-').map(Number);
export const num = (n, dec = 2) => n.toFixed(dec).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const eur = (n, dec = 2) => num(n, dec) + ' €';
export const km = n => num(n, 0) + ' km';
export const corta = f => { const [, m, d] = partes(f); return d + ' ' + MES[m - 1]; };
export const larga = f => { const [a, m, d] = partes(f); return `${d} ${MES[m - 1]} ${a}`; };
export const dma = f => f.split('-').reverse().join('/');
export const diaSem = f => { const [a, m, d] = partes(f); return DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]; };
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
