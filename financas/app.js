// Controle das parcelas dos cartões emprestados.
// Tudo fica salvo no próprio celular (localStorage); o backup em arquivo
// fica em Ajustes.
(function () {
  const STORE_KEY = 'cartoes-v1';
  const COLORS = ['#7c3aed', '#ea580c', '#0891b2', '#16a34a', '#db2777', '#ca8a04', '#475569', '#dc2626'];
  const MONTH_NAMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  // ---------- utilidades ----------
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const brl = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => new Date().toISOString().slice(0, 10);
  const monthOf = (date) => date.slice(0, 7);
  const currentMonth = () => monthOf(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString());
  function addMonths(ym, n) {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  function monthLabel(ym, short) {
    const [y, m] = ym.split('-').map(Number);
    const name = MONTH_NAMES[m - 1];
    return short ? `${name.slice(0, 3)}/${String(y).slice(2)}` : `${name[0].toUpperCase()}${name.slice(1)} ${y}`;
  }
  const fmtDate = (d) => (d ? d.split('-').reverse().join('/') : '');
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

  // ---------- dados ----------
  function defaultData() {
    return {
      cards: [
        { id: uid(), name: 'Cartão 1', color: COLORS[0], dueDay: 10 },
        { id: uid(), name: 'Cartão 2', color: COLORS[1], dueDay: 10 },
        { id: uid(), name: 'Cartão 3', color: COLORS[2], dueDay: 10 },
        { id: uid(), name: 'Cartão 4', color: COLORS[3], dueDay: 10 },
      ],
      people: [],
      purchases: [],
      // descrição normalizada -> pessoa, para sugerir no próximo extrato
      memory: {},
    };
  }
  let data;
  try { data = JSON.parse(localStorage.getItem(STORE_KEY)) || defaultData(); } catch { data = defaultData(); }
  data.memory = data.memory || {};
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch { toast('Não foi possível salvar no aparelho'); }
  }

  const card = (id) => data.cards.find((c) => c.id === id);
  const person = (id) => data.people.find((p) => p.id === id);

  // Parcela i (1..total) cai na fatura firstMonth + (i-1).
  function installments(p) {
    const list = [];
    for (let i = 1; i <= p.total; i++) {
      list.push({ purchase: p, n: i, month: addMonths(p.firstMonth, i - 1), value: p.installmentValue, paidAt: p.paid[i] || null });
    }
    return list;
  }
  function installmentsIn(month, filter) {
    const out = [];
    for (const p of data.purchases) {
      if (filter && !filter(p)) continue;
      if (month < p.firstMonth || month > addMonths(p.firstMonth, p.total - 1)) continue;
      out.push(installments(p).find((i) => i.month === month));
    }
    return out;
  }
  const sum = (list) => round2(list.reduce((s, i) => s + i.value, 0));
  function overdue(personId) {
    const now = currentMonth();
    const out = [];
    for (const p of data.purchases) {
      if (personId && p.personId !== personId) continue;
      for (const i of installments(p)) if (i.month < now && !i.paidAt) out.push(i);
    }
    return out;
  }

  // ---------- estado da tela ----------
  const state = { tab: 'resumo', month: currentMonth(), personId: null, import: null };

  const $ = (sel, el = document) => el.querySelector(sel);
  const view = $('#view');

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.add('hidden'), 2600);
  }

  function openSheet(html) {
    $('#sheetBody').innerHTML = html;
    $('#sheet').classList.remove('hidden');
  }
  function closeSheet() { $('#sheet').classList.add('hidden'); $('#sheetBody').innerHTML = ''; }

  function go(tab, extra = {}) {
    Object.assign(state, { tab }, extra);
    document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === (tab === 'pessoa' ? 'pessoas' : tab)));
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    const titles = { resumo: 'Resumo', pessoas: 'Pessoas', pessoa: person(state.personId)?.name || 'Pessoa', lancar: 'Lançar parcela', importar: 'Ler extrato', ajustes: 'Ajustes' };
    $('#title').textContent = titles[state.tab];
    $('#monthNav').style.visibility = ['resumo', 'pessoa'].includes(state.tab) ? 'visible' : 'hidden';
    $('#monthLabel').textContent = monthLabel(state.month);
    ({ resumo: renderResumo, pessoas: renderPessoas, pessoa: renderPessoa, lancar: renderLancar, importar: renderImportar, ajustes: renderAjustes })[state.tab]();
  }

  // ---------- componentes ----------
  const cardChip = (c) => (c ? `<span class="chip" style="--c:${c.color}">${esc(c.name)}</span>` : '<span class="chip">sem cartão</span>');
  function progress(paid, total) {
    const pct = total ? Math.round((paid / total) * 100) : 0;
    return `<div class="bar"><div style="width:${pct}%"></div></div>`;
  }
  function installmentRow(i, opts = {}) {
    const p = i.purchase;
    const who = opts.showPerson ? `<small>${esc(person(p.personId)?.name || 'Sem pessoa')}</small>` : '';
    const when = opts.showMonth ? `<small>${monthLabel(i.month, true)}</small>` : '';
    return `<li class="inst ${i.paidAt ? 'paid' : ''}">
      <button class="check" data-toggle="${p.id}:${i.n}" aria-label="Marcar como pago">${i.paidAt ? '✓' : ''}</button>
      <div class="inst-main" data-open-purchase="${p.id}">
        <strong>${esc(p.description)}</strong>
        <div class="meta">${cardChip(card(p.cardId))} <small>${p.total > 1 ? `${i.n}/${p.total}` : 'à vista'}</small> ${who} ${when}</div>
      </div>
      <div class="inst-value">${brl(i.value)}</div>
    </li>`;
  }
  function emptyState(msg, action) {
    return `<div class="empty"><p>${msg}</p>${action || ''}</div>`;
  }

  // ---------- Resumo ----------
  function renderResumo() {
    const list = installmentsIn(state.month);
    const total = sum(list);
    const received = sum(list.filter((i) => i.paidAt));
    const late = overdue();
    let html = `<section class="hero">
      <small>A receber em ${monthLabel(state.month).toLowerCase()}</small>
      <div class="big">${brl(total)}</div>
      ${progress(received, total)}
      <div class="hero-row"><span>Recebido <b>${brl(received)}</b></span><span>Falta <b>${brl(round2(total - received))}</b></span></div>
    </section>`;

    if (late.length) {
      html += `<button class="alert" data-goto="pessoas">⚠️ ${late.length} parcela(s) atrasada(s) de meses anteriores · ${brl(sum(late))}</button>`;
    }

    html += '<h2>Por pessoa</h2>';
    const byPerson = {};
    for (const i of list) (byPerson[i.purchase.personId] ||= []).push(i);
    const ids = Object.keys(byPerson).sort((a, b) => sum(byPerson[b]) - sum(byPerson[a]));
    if (!ids.length) {
      html += emptyState('Nenhuma parcela neste mês.', '<button class="btn" data-goto="lancar">Lançar parcela</button> <button class="btn ghost" data-goto="importar">Ler extrato</button>');
    } else {
      html += '<ul class="list">' + ids.map((id) => {
        const items = byPerson[id];
        const t = sum(items), r = sum(items.filter((i) => i.paidAt));
        const done = r >= t;
        return `<li class="row" data-open-person="${id}">
          <div class="avatar">${esc((person(id)?.name || '?')[0].toUpperCase())}</div>
          <div class="grow"><strong>${esc(person(id)?.name || 'Sem pessoa')}</strong>${progress(r, t)}<small>${items.length} parcela(s) · ${done ? 'pago ✓' : `falta ${brl(t - r)}`}</small></div>
          <div class="amount ${done ? 'ok' : ''}">${brl(t)}</div>
        </li>`;
      }).join('') + '</ul>';
    }

    html += '<h2>Por cartão</h2><ul class="list">';
    for (const c of data.cards) {
      const items = list.filter((i) => i.purchase.cardId === c.id);
      html += `<li class="row"><div class="card-dot" style="background:${c.color}"></div>
        <div class="grow"><strong>${esc(c.name)}</strong><small>vence dia ${c.dueDay || '-'} · ${items.length} parcela(s) de terceiros</small></div>
        <div class="amount">${brl(sum(items))}</div></li>`;
    }
    html += '</ul>';
    view.innerHTML = html;
  }

  // ---------- Pessoas ----------
  function renderPessoas() {
    const now = currentMonth();
    let html = '<button class="btn block" data-new-person>＋ Nova pessoa</button>';
    if (!data.people.length) {
      html += emptyState('Cadastre as pessoas para quem os cartões são emprestados.');
    } else {
      html += '<ul class="list">' + data.people.slice().sort((a, b) => a.name.localeCompare(b.name)).map((p) => {
        const pending = data.purchases.filter((x) => x.personId === p.id).flatMap(installments).filter((i) => !i.paidAt);
        const late = pending.filter((i) => i.month < now);
        const month = pending.filter((i) => i.month === now);
        return `<li class="row" data-open-person="${p.id}">
          <div class="avatar">${esc(p.name[0].toUpperCase())}</div>
          <div class="grow"><strong>${esc(p.name)}</strong>
            <small>${late.length ? `<span class="late">${brl(sum(late))} atrasado</span> · ` : ''}este mês ${brl(sum(month))}</small></div>
          <div class="amount"><small>deve ao todo</small>${brl(sum(pending))}</div>
        </li>`;
      }).join('') + '</ul>';
    }
    view.innerHTML = html;
  }

  function renderPessoa() {
    const p = person(state.personId);
    if (!p) return go('pessoas');
    const monthItems = installmentsIn(state.month, (x) => x.personId === p.id);
    const late = overdue(p.id).filter((i) => i.month < state.month);
    const purchases = data.purchases.filter((x) => x.personId === p.id);
    const allPending = purchases.flatMap(installments).filter((i) => !i.paidAt);
    const t = sum(monthItems), r = sum(monthItems.filter((i) => i.paidAt));

    let html = `<section class="hero small">
      <small>Parcelas de ${monthLabel(state.month).toLowerCase()}</small>
      <div class="big">${brl(t)}</div>${progress(r, t)}
      <div class="hero-row"><span>Pago <b>${brl(r)}</b></span><span>Deve ao todo <b>${brl(sum(allPending))}</b></span></div>
    </section>
    <div class="actions">
      <button class="btn" data-pay-month ${monthItems.some((i) => !i.paidAt) ? '' : 'disabled'}>✓ Pagou o mês</button>
      <button class="btn whatsapp" data-whatsapp>WhatsApp</button>
      <button class="btn ghost" data-edit-person="${p.id}">Editar</button>
    </div>`;

    if (late.length) {
      html += `<h2 class="late">Atrasadas</h2><ul class="list">${late.map((i) => installmentRow(i, { showMonth: true })).join('')}</ul>`;
    }
    html += `<h2>${monthLabel(state.month)}</h2>`;
    html += monthItems.length ? `<ul class="list">${monthItems.map((i) => installmentRow(i)).join('')}</ul>` : emptyState('Nada neste mês.');

    html += '<h2>Compras</h2>';
    if (!purchases.length) html += emptyState('Nenhuma compra lançada.', `<button class="btn" data-goto="lancar" data-for-person="${p.id}">Lançar parcela</button>`);
    else {
      html += '<ul class="list">' + purchases.slice().sort((a, b) => b.firstMonth.localeCompare(a.firstMonth)).map((x) => {
        const paid = Object.keys(x.paid).length;
        const last = addMonths(x.firstMonth, x.total - 1);
        return `<li class="row" data-open-purchase="${x.id}"><div class="grow"><strong>${esc(x.description)}</strong>
          <div class="meta">${cardChip(card(x.cardId))} <small>${x.total}x ${brl(x.installmentValue)} · até ${monthLabel(last, true)}</small></div>
          ${progress(paid, x.total)}<small>${paid} de ${x.total} pagas</small></div>
          <div class="amount">${brl(x.installmentValue * x.total)}</div></li>`;
      }).join('') + '</ul>';
    }
    view.innerHTML = html;
  }

  function whatsappMessage(p) {
    const items = installmentsIn(state.month, (x) => x.personId === p.id).filter((i) => !i.paidAt);
    const late = overdue(p.id).filter((i) => i.month < state.month);
    let msg = `Oi ${p.name}! Segue o valor dos cartões de ${monthLabel(state.month).toLowerCase()}:\n\n`;
    for (const i of items) msg += `• ${i.purchase.description}${i.purchase.total > 1 ? ` (${i.n}/${i.purchase.total})` : ''} — ${brl(i.value)}\n`;
    if (late.length) {
      msg += `\nEm atraso:\n`;
      for (const i of late) msg += `• ${i.purchase.description} (${monthLabel(i.month, true)}) — ${brl(i.value)}\n`;
    }
    msg += `\n*Total: ${brl(sum(items) + sum(late))}*`;
    return msg;
  }

  function personForm(p) {
    openSheet(`<h3>${p ? 'Editar pessoa' : 'Nova pessoa'}</h3>
      <form id="personForm">
        <label>Nome<input name="name" required value="${esc(p?.name)}" autocomplete="off"></label>
        <label>WhatsApp (opcional)<input name="phone" type="tel" inputmode="tel" placeholder="(51) 99999-9999" value="${esc(p?.phone)}"></label>
        <div class="actions"><button class="btn" type="submit">Salvar</button><button class="btn ghost" type="button" data-close-sheet>Cancelar</button></div>
        ${p ? `<button class="btn danger block" type="button" data-delete-person="${p.id}">Excluir pessoa</button>` : ''}
      </form>`);
    $('#personForm').onsubmit = (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const name = f.get('name').trim();
      if (!name) return;
      if (p) Object.assign(p, { name, phone: f.get('phone').trim() });
      else {
        const np = { id: uid(), name, phone: f.get('phone').trim() };
        data.people.push(np);
        if (personForm.onCreate) personForm.onCreate(np);
      }
      personForm.onCreate = null;
      save(); closeSheet(); render();
    };
  }

  // ---------- Compra ----------
  function purchaseSheet(id) {
    const p = data.purchases.find((x) => x.id === id);
    if (!p) return;
    const list = installments(p);
    openSheet(`<h3>${esc(p.description)}</h3>
      <div class="meta">${cardChip(card(p.cardId))} <small>${esc(person(p.personId)?.name || 'Sem pessoa')} · compra em ${fmtDate(p.purchaseDate) || '—'}</small></div>
      <p class="muted">${p.total}x de ${brl(p.installmentValue)} = <b>${brl(p.installmentValue * p.total)}</b></p>
      <ul class="list">${list.map((i) => installmentRow(i, { showMonth: true })).join('')}</ul>
      <div class="actions"><button class="btn ghost" data-edit-purchase="${p.id}">Editar</button><button class="btn danger" data-delete-purchase="${p.id}">Excluir</button></div>`);
  }

  // Formulário usado tanto para lançar quanto para editar.
  function purchaseFormHtml(p, preset = {}) {
    const month = p ? addMonths(p.firstMonth, (preset.current || 1) - 1) : state.month;
    const personId = p?.personId || preset.personId || '';
    return `<form id="purchaseForm" class="form">
      <label>Cartão<select name="cardId" required>${data.cards.map((c) => `<option value="${c.id}" ${p?.cardId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
      <label>Pessoa<div class="inline"><select name="personId" required>
        <option value="">Escolha…</option>${data.people.map((x) => `<option value="${x.id}" ${personId === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}
      </select><button type="button" class="btn ghost" data-new-person-inline>＋</button></div></label>
      <label>Descrição<input name="description" required placeholder="Ex.: Magazine Luiza – geladeira" value="${esc(p?.description)}" autocomplete="off"></label>
      <label>Valor<div class="inline"><input name="value" required inputmode="decimal" placeholder="0,00" value="${p ? String(p.installmentValue.toFixed(2)).replace('.', ',') : ''}">
        <select name="valueMode"><option value="parcela">da parcela</option><option value="total">total da compra</option></select></div></label>
      <div class="grid2">
        <label>Nº de parcelas<input name="total" type="number" min="1" max="72" required value="${p?.total || 1}" inputmode="numeric"></label>
        <label>É a parcela nº<input name="current" type="number" min="1" required value="${preset.current || 1}" inputmode="numeric"></label>
      </div>
      <label>Na fatura de<input name="month" type="month" required value="${month}"></label>
      <p class="hint" id="formHint"></p>
      <label>Data da compra (opcional)<input name="purchaseDate" type="date" value="${p?.purchaseDate || ''}"></label>
      ${p ? '' : '<label class="check-label"><input type="checkbox" name="markPrevious" checked> Marcar parcelas anteriores como pagas</label>'}
      <button class="btn block" type="submit">${p ? 'Salvar alterações' : 'Lançar'}</button>
    </form>`;
  }

  function readPurchaseForm(form) {
    const f = new FormData(form);
    const total = Math.max(1, parseInt(f.get('total'), 10) || 1);
    const current = Math.min(total, Math.max(1, parseInt(f.get('current'), 10) || 1));
    let value = StatementParser.parseMoney(f.get('value'));
    if (isNaN(value) || value <= 0) return null;
    if (f.get('valueMode') === 'total') value = value / total;
    return {
      cardId: f.get('cardId'),
      personId: f.get('personId'),
      description: f.get('description').trim(),
      total,
      current,
      installmentValue: round2(value),
      firstMonth: addMonths(f.get('month'), -(current - 1)),
      purchaseDate: f.get('purchaseDate') || null,
      markPrevious: f.get('markPrevious') === 'on',
    };
  }

  function wirePurchaseForm(form, onSave) {
    const hint = () => {
      const v = readPurchaseForm(form);
      $('#formHint').textContent = v
        ? `${v.total}x de ${brl(v.installmentValue)} (total ${brl(v.installmentValue * v.total)}) · de ${monthLabel(v.firstMonth, true)} até ${monthLabel(addMonths(v.firstMonth, v.total - 1), true)}`
        : '';
    };
    form.addEventListener('input', hint);
    hint();
    form.querySelector('[data-new-person-inline]').onclick = () => {
      const snapshot = new FormData(form);
      personForm.onCreate = (np) => setTimeout(() => {
        // o formulário foi redesenhado: restaura o que já tinha sido digitado
        const f2 = $('#purchaseForm');
        if (!f2) return;
        for (const [k, v] of snapshot.entries()) if (f2.elements[k] && f2.elements[k].type !== 'checkbox') f2.elements[k].value = v;
        f2.elements.personId.value = np.id;
        f2.dispatchEvent(new Event('input'));
      });
      personForm(null);
    };
    form.onsubmit = (e) => {
      e.preventDefault();
      const v = readPurchaseForm(form);
      if (!v) return toast('Informe um valor válido');
      if (!v.personId) return toast('Escolha a pessoa');
      onSave(v);
    };
  }

  function renderLancar() {
    if (!data.people.length) {
      view.innerHTML = emptyState('Primeiro cadastre a pessoa que usa o cartão.', '<button class="btn" data-new-person>＋ Nova pessoa</button>');
      return;
    }
    view.innerHTML = `<p class="muted">Compra já em andamento? Informe em qual parcela ela está na fatura do mês escolhido (ex.: parcela 3 de 10 na fatura de outubro).</p>` + purchaseFormHtml(null, { personId: state.presetPerson });
    wirePurchaseForm($('#purchaseForm'), (v) => {
      const p = { id: uid(), cardId: v.cardId, personId: v.personId, description: v.description, total: v.total, installmentValue: v.installmentValue, firstMonth: v.firstMonth, purchaseDate: v.purchaseDate, paid: {}, source: 'manual' };
      if (v.markPrevious) for (let i = 1; i < v.current; i++) p.paid[i] = today();
      data.purchases.push(p);
      data.memory[norm(v.description)] = v.personId;
      save();
      toast('Parcela lançada');
      go('pessoa', { personId: v.personId, month: addMonths(v.firstMonth, v.current - 1) });
    });
  }

  function editPurchase(id) {
    const p = data.purchases.find((x) => x.id === id);
    const cur = currentMonth();
    const current = Math.min(p.total, Math.max(1, monthDiff(p.firstMonth, cur) + 1));
    openSheet(`<h3>Editar compra</h3>${purchaseFormHtml(p, { current })}`);
    wirePurchaseForm($('#purchaseForm'), (v) => {
      const paid = {};
      for (const k of Object.keys(p.paid)) if (+k <= v.total) paid[k] = p.paid[k];
      Object.assign(p, { cardId: v.cardId, personId: v.personId, description: v.description, total: v.total, installmentValue: v.installmentValue, firstMonth: v.firstMonth, purchaseDate: v.purchaseDate, paid });
      save(); closeSheet(); render(); toast('Compra atualizada');
    });
  }
  function monthDiff(a, b) {
    const [ay, am] = a.split('-').map(Number), [by, bm] = b.split('-').map(Number);
    return (by - ay) * 12 + (bm - am);
  }

  // ---------- Extrato ----------
  function renderImportar() {
    const imp = state.import;
    if (imp && imp.entries) return renderImportPreview();
    const defMonth = imp?.month || currentMonth();
    view.innerHTML = `<p class="muted">Envie a fatura em PDF ou CSV (ou cole o texto). As compras parceladas são lidas e você escolhe de quem é cada uma.</p>
      <form id="importForm" class="form">
        <label>Cartão<select name="cardId">${data.cards.map((c) => `<option value="${c.id}" ${imp?.cardId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
        <label>Fatura de<input type="month" name="month" value="${defMonth}" required></label>
        <label class="file">📎 Escolher arquivo (PDF, CSV, TXT)<input type="file" name="file" accept=".pdf,.csv,.txt,.ofx,application/pdf,text/*"></label>
        <label>…ou cole o texto da fatura<textarea name="text" rows="6" placeholder="12/05  LOJA EXEMPLO  03/10  150,00"></textarea></label>
        <button class="btn block" type="submit">Ler extrato</button>
      </form>`;
    $('#importForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const file = f.get('file');
      let text = f.get('text');
      const btn = e.target.querySelector('button[type=submit]');
      try {
        btn.disabled = true; btn.textContent = 'Lendo…';
        if (file && file.size) text = await readFile(file);
        if (!text.trim()) return toast('Escolha um arquivo ou cole o texto');
        const entries = StatementParser.parseStatement(text, f.get('month'));
        state.import = { cardId: f.get('cardId'), month: f.get('month'), entries: prepareEntries(entries, f.get('cardId'), f.get('month')), showAll: false, rawText: text };
        render();
      } catch (err) {
        console.error(err);
        toast('Não consegui ler esse arquivo');
      } finally {
        btn.disabled = false; btn.textContent = 'Ler extrato';
      }
    };
  }

  async function readFile(file) {
    if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') return readPdf(file);
    const buf = await file.arrayBuffer();
    let text = new TextDecoder('utf-8').decode(buf);
    if (text.includes('�')) text = new TextDecoder('iso-8859-1').decode(buf);
    return text;
  }

  // Remonta as linhas do PDF agrupando os pedaços de texto pela altura na página.
  async function readPdf(file) {
    if (!window.pdfjsLib) throw new Error('pdf.js não carregou (sem internet?)');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const lines = [];
    for (let pn = 1; pn <= pdf.numPages; pn++) {
      const page = await pdf.getPage(pn);
      const content = await page.getTextContent();
      const rows = [];
      for (const it of content.items) {
        if (!it.str.trim()) continue;
        const y = it.transform[5], x = it.transform[4];
        let row = rows.find((r) => Math.abs(r.y - y) < 3);
        if (!row) rows.push((row = { y, items: [] }));
        row.items.push({ x, str: it.str, w: it.width });
      }
      rows.sort((a, b) => b.y - a.y);
      for (const r of rows) {
        r.items.sort((a, b) => a.x - b.x);
        let line = '', end = null;
        for (const it of r.items) {
          if (end != null) line += it.x - end > 1.5 ? '  ' : '';
          line += it.str;
          end = it.x + it.w;
        }
        lines.push(line);
      }
    }
    return lines.join('\n');
  }

  function purchaseKey(cardId, description, total, value, firstMonth) {
    return [cardId, norm(description), total, round2(value).toFixed(2), firstMonth].join('|');
  }

  function prepareEntries(entries, cardId, month) {
    const existing = new Set(data.purchases.map((p) => purchaseKey(p.cardId, p.description, p.total, p.installmentValue, p.firstMonth)));
    return entries.map((e, idx) => {
      const firstMonth = addMonths(month, -(e.installment - 1));
      const dup = existing.has(purchaseKey(cardId, e.description, e.total, e.amount, firstMonth));
      const personId = data.memory[norm(e.description)] || '';
      return { ...e, idx, firstMonth, dup, personId, selected: !dup && !e.ignoredByDefault && e.total > 1 && !!personId };
    });
  }

  function renderImportPreview() {
    const imp = state.import;
    const c = card(imp.cardId);
    const visible = imp.entries.filter((e) => imp.showAll || (e.total > 1 && !e.ignoredByDefault));
    const selected = imp.entries.filter((e) => e.selected);
    let html = `<div class="import-head">${cardChip(c)} <span>Fatura de ${monthLabel(imp.month).toLowerCase()}</span></div>
      <p class="muted">Encontrei ${imp.entries.length} lançamento(s), ${imp.entries.filter((e) => e.total > 1).length} parcelado(s). Marque as que são de outras pessoas e escolha de quem é.</p>
      <label class="check-label"><input type="checkbox" id="showAll" ${imp.showAll ? 'checked' : ''}> Mostrar também compras à vista e créditos</label>`;
    if (!imp.entries.length) {
      html += emptyState('Não reconheci nenhum lançamento nesse arquivo. Me mande o extrato que eu ajusto a leitura para esse banco.', '<button class="btn ghost" data-show-raw>Ver texto lido</button>');
    } else {
      html += '<ul class="list import-list">' + visible.map((e) => `<li class="imp ${e.selected ? 'on' : ''} ${e.dup ? 'dup' : ''}">
        <label class="imp-top"><input type="checkbox" data-imp-sel="${e.idx}" ${e.selected ? 'checked' : ''}>
          <div class="grow"><strong>${esc(e.description)}</strong>
          <small>${fmtDate(e.date)} · ${e.total > 1 ? `parcela ${e.installment}/${e.total}` : 'à vista'}${e.credit ? ' · crédito' : ''}${e.dup ? ' · <b>já cadastrada</b>' : ''}</small></div>
          <b>${brl(e.amount)}</b></label>
        <select data-imp-person="${e.idx}"><option value="">De quem é?</option>${data.people.map((p) => `<option value="${p.id}" ${e.personId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}<option value="__new">＋ Nova pessoa…</option></select>
      </li>`).join('') + '</ul>';
    }
    html += `<div class="sticky-actions"><button class="btn ghost" data-import-cancel>Voltar</button>
      <button class="btn" data-import-save ${selected.length ? '' : 'disabled'}>Salvar ${selected.length} · ${brl(sum(selected.map((e) => ({ value: e.amount }))))}</button></div>`;
    view.innerHTML = html;
  }

  function saveImport() {
    const imp = state.import;
    const chosen = imp.entries.filter((e) => e.selected);
    if (chosen.some((e) => !e.personId)) return toast('Escolha a pessoa de todas as marcadas');
    for (const e of chosen) {
      const p = { id: uid(), cardId: imp.cardId, personId: e.personId, description: e.description, total: e.total, installmentValue: round2(e.amount), firstMonth: e.firstMonth, purchaseDate: e.date, paid: {}, source: 'extrato' };
      // parcelas de faturas anteriores já estavam em andamento: considera pagas
      for (let i = 1; i < e.installment; i++) p.paid[i] = today();
      data.purchases.push(p);
      data.memory[norm(e.description)] = e.personId;
    }
    save();
    toast(`${chosen.length} compra(s) salvas`);
    const month = imp.month;
    state.import = null;
    go('resumo', { month });
  }

  // ---------- Ajustes ----------
  function renderAjustes() {
    view.innerHTML = `<h2>Cartões</h2><ul class="list">${data.cards.map((c) => `<li class="row" data-edit-card="${c.id}">
        <div class="card-dot" style="background:${c.color}"></div><div class="grow"><strong>${esc(c.name)}</strong><small>vence dia ${c.dueDay || '-'}</small></div><span class="muted">Editar</span></li>`).join('')}</ul>
      <button class="btn ghost block" data-edit-card="">＋ Adicionar cartão</button>
      <h2>Backup</h2>
      <p class="muted">Os dados ficam só neste celular. Faça um backup de vez em quando e guarde o arquivo (WhatsApp, Drive, e-mail).</p>
      <div class="actions"><button class="btn" data-backup>⬇️ Salvar backup</button>
      <label class="btn ghost">⬆️ Restaurar<input type="file" accept=".json,application/json" data-restore hidden></label></div>
      <p class="muted small">${data.purchases.length} compra(s) · ${data.people.length} pessoa(s)</p>`;
  }

  function cardForm(id) {
    const c = id ? card(id) : null;
    openSheet(`<h3>${c ? 'Editar cartão' : 'Novo cartão'}</h3>
      <form id="cardForm" class="form">
        <label>Nome<input name="name" required value="${esc(c?.name)}" placeholder="Ex.: Nubank" autocomplete="off"></label>
        <label>Dia do vencimento<input name="dueDay" type="number" min="1" max="31" inputmode="numeric" value="${c?.dueDay || 10}"></label>
        <label>Cor</label><div class="colors">${COLORS.map((k) => `<label><input type="radio" name="color" value="${k}" ${(c?.color || COLORS[data.cards.length % COLORS.length]) === k ? 'checked' : ''}><span style="background:${k}"></span></label>`).join('')}</div>
        <div class="actions"><button class="btn" type="submit">Salvar</button><button class="btn ghost" type="button" data-close-sheet>Cancelar</button></div>
        ${c ? `<button class="btn danger block" type="button" data-delete-card="${c.id}">Excluir cartão</button>` : ''}
      </form>`);
    $('#cardForm').onsubmit = (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const v = { name: f.get('name').trim(), dueDay: parseInt(f.get('dueDay'), 10) || null, color: f.get('color') };
      if (c) Object.assign(c, v); else data.cards.push({ id: uid(), ...v });
      save(); closeSheet(); render();
    };
  }

  function downloadBackup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const name = `cartoes-backup-${today()}.json`;
    const fileObj = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [fileObj] })) {
      navigator.share({ files: [fileObj], title: 'Backup cartões' }).catch(() => {});
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- eventos ----------
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab],[data-goto],[data-month-step],[data-open-person],[data-open-purchase],[data-toggle],[data-close-sheet],[data-new-person],[data-edit-person],[data-delete-person],[data-pay-month],[data-whatsapp],[data-edit-purchase],[data-delete-purchase],[data-edit-card],[data-delete-card],[data-import-cancel],[data-import-save],[data-backup],[data-show-raw]');
    if (!t) return;
    const d = t.dataset;
    if (d.tab) {
      if (d.tab === 'lancar') state.presetPerson = null;
      if (d.tab === 'importar' && state.tab === 'importar' && state.import?.entries) state.import = { cardId: state.import.cardId, month: state.import.month };
      return go(d.tab);
    }
    if (d.goto) { state.presetPerson = d.forPerson || null; return go(d.goto); }
    if (d.monthStep) { state.month = addMonths(state.month, +d.monthStep); return render(); }
    if ('toggle' in d) {
      const [pid, n] = d.toggle.split(':');
      const p = data.purchases.find((x) => x.id === pid);
      if (p.paid[n]) delete p.paid[n]; else p.paid[n] = today();
      save();
      if (!$('#sheet').classList.contains('hidden')) purchaseSheet(pid);
      return render();
    }
    if (d.openPerson) return go('pessoa', { personId: d.openPerson });
    if (d.openPurchase) return purchaseSheet(d.openPurchase);
    if ('closeSheet' in d) return closeSheet();
    if ('newPerson' in d) { personForm.onCreate = null; return personForm(null); }
    if (d.editPerson) return personForm(person(d.editPerson));
    if (d.deletePerson) {
      const n = data.purchases.filter((x) => x.personId === d.deletePerson).length;
      if (!confirm(n ? `Excluir a pessoa e as ${n} compra(s) dela?` : 'Excluir esta pessoa?')) return;
      data.people = data.people.filter((x) => x.id !== d.deletePerson);
      data.purchases = data.purchases.filter((x) => x.personId !== d.deletePerson);
      save(); closeSheet(); return go('pessoas');
    }
    if ('payMonth' in d) {
      for (const i of installmentsIn(state.month, (x) => x.personId === state.personId)) if (!i.paidAt) i.purchase.paid[i.n] = today();
      save(); toast('Mês marcado como pago'); return render();
    }
    if ('whatsapp' in d) {
      const p = person(state.personId);
      const phone = (p.phone || '').replace(/\D/g, '');
      const full = phone && phone.length <= 11 ? '55' + phone : phone;
      window.open(`https://wa.me/${full}?text=${encodeURIComponent(whatsappMessage(p))}`, '_blank');
      return;
    }
    if (d.editPurchase) return editPurchase(d.editPurchase);
    if (d.deletePurchase) {
      if (!confirm('Excluir esta compra e todas as parcelas?')) return;
      data.purchases = data.purchases.filter((x) => x.id !== d.deletePurchase);
      save(); closeSheet(); return render();
    }
    if ('editCard' in d) return cardForm(d.editCard);
    if (d.deleteCard) {
      const n = data.purchases.filter((x) => x.cardId === d.deleteCard).length;
      if (n) return toast(`Este cartão tem ${n} compra(s); exclua ou mova antes`);
      if (!confirm('Excluir este cartão?')) return;
      data.cards = data.cards.filter((x) => x.id !== d.deleteCard);
      save(); closeSheet(); return render();
    }
    if ('importCancel' in d) { state.import = { cardId: state.import.cardId, month: state.import.month }; return render(); }
    if ('importSave' in d) return saveImport();
    if ('backup' in d) return downloadBackup();
    if ('showRaw' in d) return openSheet(`<h3>Texto lido</h3><pre class="raw">${esc(state.import.rawText)}</pre>`);
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'showAll') { state.import.showAll = t.checked; return render(); }
    if (t.dataset.impSel) {
      const entry = state.import.entries[+t.dataset.impSel];
      entry.selected = t.checked;
      return render();
    }
    if (t.dataset.impPerson) {
      const entry = state.import.entries[+t.dataset.impPerson];
      if (t.value === '__new') {
        personForm.onCreate = (np) => { entry.personId = np.id; entry.selected = true; };
        return personForm(null);
      }
      entry.personId = t.value;
      entry.selected = !!t.value;
      // mesma loja em outras linhas sem dono: sugere a mesma pessoa
      for (const o of state.import.entries) if (!o.personId && norm(o.description) === norm(entry.description)) o.personId = t.value;
      return render();
    }
    if ('restore' in t.dataset && t.files[0]) {
      t.files[0].text().then((txt) => {
        const d = JSON.parse(txt);
        if (!Array.isArray(d.cards) || !Array.isArray(d.purchases)) throw new Error('arquivo inválido');
        if (!confirm('Substituir os dados atuais pelo backup?')) return;
        data = d; data.memory = data.memory || {}; data.people = data.people || [];
        save(); toast('Backup restaurado'); render();
      }).catch(() => toast('Arquivo de backup inválido'));
    }
  });

  render();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
