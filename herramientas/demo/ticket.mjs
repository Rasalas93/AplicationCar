/** Ticket de taller de ejemplo (sin datos reales), dibujado en HTML: lo usan la demo y las láminas. */
export const TICKET_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;width:520px;height:760px;display:grid;place-items:center;background:#d9d4c8}
.t{width:440px;padding:34px 30px;background:#fbfaf6;box-shadow:0 10px 30px #0004;font:16px/1.5 "Courier New",monospace;color:#222;transform:rotate(-1.4deg)}
h1{font:700 24px/1.2 "Courier New",monospace;text-align:center;margin:0 0 4px}.c{text-align:center;color:#555;font-size:14px}
hr{border:0;border-top:2px dashed #999;margin:16px 0}.f{display:flex;justify-content:space-between}.tot{font-weight:700;font-size:20px}
.s{margin-top:18px;text-align:center;font-size:13px;color:#666}</style></head><body><div class="t">
<h1>TALLER DE EJEMPLO</h1><div class="c">Ticket de ejemplo · sin datos reales</div><hr>
<div class="f"><span>Fecha</span><span>11/11/2026</span></div><div class="f"><span>Km</span><span>165.500</span></div><hr>
<div class="f"><span>Aceite 5W-30 (4,3 L)</span><span>62,40</span></div><div class="f"><span>Filtro de aceite</span><span>14,90</span></div>
<div class="f"><span>Filtro de aire</span><span>19,80</span></div><div class="f"><span>Mano de obra</span><span>32,80</span></div><hr>
<div class="f tot"><span>TOTAL</span><span>129,90 EUR</span></div><div class="s">IVA incluido · Gracias</div></div></body></html>`;

/** Renderiza el ticket a JPEG con un navegador ya abierto. */
export async function ticketJpg(navegador) {
  const p = await navegador.newPage({ viewport: { width: 520, height: 760 } });
  await p.setContent(TICKET_HTML);
  const buffer = await p.screenshot({ type: 'jpeg', quality: 88 });
  await p.close();
  return { name: 'ticket-taller.jpg', mimeType: 'image/jpeg', buffer };
}
