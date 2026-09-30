// Leitura de extratos de cartão: transforma o texto (PDF, CSV ou colado)
// em uma lista de lançamentos com a parcela identificada ("03/10").
(function (root) {
  const MONTHS = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };

  const DATE_RE = String.raw`\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{1,2}\s*(?:de\s+)?(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç]*\.?(?:\s*(?:de\s+)?\d{4})?`;
  const MONEY_RE = String.raw`-?\s?(?:R\$\s*)?-?\s?\d{1,3}(?:\.\d{3})*,\d{2}\s?-?`;
  // data, descrição e valor; uma linha do PDF pode trazer mais de um lançamento (fatura em duas colunas)
  const TX_RE = new RegExp(`(?:^|\\s)(${DATE_RE})\\s+(.+?)\\s+(${MONEY_RE})(?=\\s|$)`, 'gi');
  const INSTALLMENT_RE = /(?:parc(?:ela)?s?\.?\s*)?\b(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})\b/gi;
  const IGNORE_RE = /pagamento|pgto|estorno|cr[eé]dito|saldo|total|encargos|juros|iof|anuidade|limite|m[ií]nimo/i;

  function parseMoney(str) {
    if (str == null) return NaN;
    let s = String(str).trim();
    const negative = /^-|-$/.test(s.replace(/\s/g, '')) || /^\(.*\)$/.test(s);
    s = s.replace(/[R$\s()\-+]/g, '');
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
    const n = parseFloat(s);
    if (isNaN(n)) return NaN;
    return negative ? -n : n;
  }

  // Converte a data do extrato em AAAA-MM-DD. Sem ano, usa o ano da fatura
  // (ou o anterior, quando o mês da compra é depois do mês da fatura).
  function parseDate(str, invoiceMonth) {
    if (!str) return null;
    const s = str.toLowerCase().replace(/\s+/g, ' ').trim();
    let d, m, y;
    let match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    match = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (match) {
      d = +match[1]; m = +match[2]; y = match[3] ? +match[3] : null;
    } else {
      match = s.match(/^(\d{1,2})\s*(?:de\s+)?([a-zç]{3})[a-zç]*\.?(?:\s*(?:de\s+)?(\d{4}))?/);
      if (!match || !MONTHS[match[2]]) return null;
      d = +match[1]; m = MONTHS[match[2]]; y = match[3] ? +match[3] : null;
    }
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    if (y != null && y < 100) y += 2000;
    if (y == null) {
      const [iy, im] = (invoiceMonth || '').split('-').map(Number);
      y = iy || new Date().getFullYear();
      if (im && m > im) y -= 1;
    }
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // Procura "03/10", "PARC 03/10", "Parcela 3 de 10" na descrição.
  function extractInstallment(desc) {
    let found = null;
    for (const m of desc.matchAll(INSTALLMENT_RE)) {
      const k = +m[1], n = +m[2];
      if (n >= 2 && n <= 72 && k >= 1 && k <= n) found = { k, n, text: m[0] };
    }
    if (!found) return { description: cleanDescription(desc), installment: 1, total: 1 };
    const description = cleanDescription(desc.replace(found.text, ' '));
    return { description, installment: found.k, total: found.n };
  }

  function cleanDescription(s) {
    return s.replace(/\s+-\s*$/, '').replace(/\s{2,}/g, ' ').replace(/^[\s\-–]+|[\s\-–]+$/g, '').trim();
  }

  function buildEntry(dateStr, rawDesc, amount, invoiceMonth, raw) {
    const info = extractInstallment(rawDesc);
    const ignoredByDefault = amount <= 0 || IGNORE_RE.test(rawDesc);
    return {
      date: parseDate(dateStr, invoiceMonth),
      description: info.description || rawDesc.trim(),
      amount: Math.abs(amount),
      installment: info.installment,
      total: info.total,
      credit: amount < 0,
      ignoredByDefault,
      raw: raw.trim(),
    };
  }

  function parseText(text, invoiceMonth) {
    const entries = [];
    const lines = String(text).replace(/\r/g, '').split('\n');
    for (const line of lines) {
      const clean = line.replace(/\t/g, ' ').replace(/ /g, ' ').trim();
      if (!clean) continue;
      TX_RE.lastIndex = 0;
      for (const m of clean.matchAll(TX_RE)) {
        const amount = parseMoney(m[3]);
        if (isNaN(amount)) continue;
        entries.push(buildEntry(m[1], m[2], amount, invoiceMonth, m[0]));
      }
    }
    return entries;
  }

  function splitCsvLine(line, sep) {
    const out = [];
    let cur = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted;
      } else if (c === sep && !quoted) { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  }

  // CSV com cabeçalho (ex.: Nubank "date,title,amount"). Retorna null se não parecer CSV.
  function parseCsv(text, invoiceMonth) {
    const lines = String(text).replace(/\r/g, '').split('\n').filter((l) => l.trim());
    if (lines.length < 2) return null;
    const head = lines[0];
    const sep = [';', ',', '\t'].sort((a, b) => head.split(b).length - head.split(a).length)[0];
    const cols = splitCsvLine(head, sep).map((c) => c.toLowerCase());
    const find = (re) => cols.findIndex((c) => re.test(c));
    const iDate = find(/^data|date/);
    const iDesc = find(/descri|title|estabelec|hist[oó]rico|lan[cç]amento|nome/);
    const iAmount = find(/valor|amount|value|quantia/);
    const iInst = find(/parcela|installment/);
    if (iDate < 0 || iDesc < 0 || iAmount < 0) return null;
    const entries = [];
    for (const line of lines.slice(1)) {
      const c = splitCsvLine(line, sep);
      const amount = parseMoney(c[iAmount]);
      if (isNaN(amount)) continue;
      let desc = c[iDesc] || '';
      if (iInst >= 0 && c[iInst]) desc += ' ' + c[iInst];
      entries.push(buildEntry(c[iDate], desc, amount, invoiceMonth, line));
    }
    return entries;
  }

  function parseStatement(text, invoiceMonth) {
    const csv = parseCsv(text, invoiceMonth);
    if (csv && csv.length) return csv;
    return parseText(text, invoiceMonth);
  }

  const api = { parseStatement, parseText, parseCsv, parseMoney, parseDate, extractInstallment };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StatementParser = api;
})(typeof window !== 'undefined' ? window : globalThis);
