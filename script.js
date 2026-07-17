(() => {
  'use strict';

  const STORAGE_KEY = 'quent_archive_characters_v2';

  function uid(prefix){
    return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function escapeHtml(str){
    return String(str ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  // ---------------------------------------------------------
  // RELATION TYPES (легенда "СОЦИАЛЬНЫЕ ОТНОШЕНИЯ")
  // ---------------------------------------------------------
  const RELATION_TYPES = [
    { key: 'loves',      label: 'ЛЮБИТ',                    color: '#ff2fb0' },
    { key: 'family',     label: 'СЕМЬЯ',                    color: '#ff7a7a' },
    { key: 'sympathy',   label: 'СИМПАТИЗИРУЕТ',            color: '#c77dff' },
    { key: 'respect',    label: 'УВАЖАЕТ',                  color: '#ffd23f' },
    { key: 'bestfriend', label: 'ЛУЧШИЙ ДРУГ',              color: '#2ec4b6' },
    { key: 'friend',     label: 'ДРУГ',                     color: '#5fd6a8' },
    { key: 'trust',      label: 'ДОВЕРЯЕТ',                 color: '#4ea8ff' },
    { key: 'neutral',    label: 'РАВНОДУШЕН',               color: '#eaffea' },
    { key: 'distrust',   label: 'НЕ ДОВЕРЯЕТ / ОПАСАЕТСЯ',  color: '#ff9142' },
    { key: 'hate',       label: 'НЕНАВИДИТ',                color: 'var(--red)' },
    { key: 'knows',      label: 'ЗНАЕТ',                    color: '#8fd694' },
    { key: 'unknown',    label: 'НЕ ЗНАЕТ',                 color: '#8b8f96' },
    { key: 'dead',       label: 'УМЕР / ПРОПАЛ БЕЗ ВЕСТИ',  color: '#55555f' }
  ];
  function relType(key){ return RELATION_TYPES.find(t => t.key === key) || RELATION_TYPES[10]; }

  // ---------------------------------------------------------
  // DEFAULT DOSSIER FIELDS (шаблон для новых юнитов)
  // ---------------------------------------------------------
  const DEFAULT_FIELD_TITLES = [
    'ФИО', 'Прозвище', 'Биологический вид', 'Дата рождения', 'Родная планета',
    'Актуальная локация', 'Род деятельности', 'Уровень лояльности',
    'Предыстория', 'Личность', 'Внешний вид', 'Привычки и увлечения',
    'Страхи и нетерпимости'
  ];
  function blankFields(){
    return DEFAULT_FIELD_TITLES.map(title => ({ id: uid('f'), title, value: '' }));
  }

  const DEMO_PHOTO = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250">' +
    '<rect width="400" height="250" fill="#050a05"/>' +
    '<circle cx="200" cy="95" r="46" fill="#0c1f10" stroke="#00ff6a" stroke-width="2"/>' +
    '<path d="M110 250 C110 170 290 170 290 250 Z" fill="#0c1f10" stroke="#00ff6a" stroke-width="2"/>' +
    '</svg>'
  );

  const STATUS_MAP = {
    active:   { label: 'АКТИВЕН',      dot: 'dot-active' },
    idle:     { label: 'НЕИЗВЕСТЕН',   dot: 'dot-idle' },
    archived: { label: 'АРХИВИРОВАН',  dot: 'dot-archived' }
  };

  function demoCharacter(){
    const fields = blankFields();
    const set = (title, value) => { const f = fields.find(x => x.title === title); if (f) f.value = value; };
    set('ФИО', 'Демо Юнит');
    set('Прозвище', 'Пример');
    set('Род деятельности', 'Демонстрация карточки');
    set('Предыстория', 'Демонстрационная карточка: показывает, как выглядит юнит с прикреплённой фотографией — зелёная линия сканирования поверх снимка — и как устроены пункты досье.');
    return { id: 'unit-01', photo: DEMO_PHOTO, status: 'active', fields, relations: [] };
  }

  function DEFAULT_CHARACTERS(){
    return [
      demoCharacter(),
      { id: 'unit-02', photo: '', status: 'idle',     fields: blankFields(), relations: [] },
      { id: 'unit-03', photo: '', status: 'archived', fields: blankFields(), relations: [] }
    ];
  }

  // ---------------------------------------------------------
  // MIGRATION (старая схема v1 -> новая v2)
  // ---------------------------------------------------------
  function migrateLegacy(old){
    const fields = blankFields();
    const set = (title, value) => { const f = fields.find(x => x.title === title); if (f && value) f.value = value; };
    set('ФИО', old.name);
    set('Род деятельности', old.role);
    set('Предыстория', old.bio || old.desc);
    if (old.equipment) fields.push({ id: uid('f'), title: 'Снаряжение', value: old.equipment });
    return {
      id: old.id || uid('unit'),
      photo: old.photo || '',
      status: old.status || 'idle',
      fields,
      relations: []
    };
  }

  // ---------------------------------------------------------
  // DATA LAYER
  // ---------------------------------------------------------
  function loadCharacters(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
      const oldRaw = localStorage.getItem('quent_archive_characters_v1');
      if (oldRaw) {
        const old = JSON.parse(oldRaw);
        return old.map(migrateLegacy);
      }
    } catch (e) {
      console.warn('QUENT_ARCHIVE: не удалось прочитать localStorage', e);
    }
    return DEFAULT_CHARACTERS();
  }

  function saveCharacters(){
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
    } catch (e) {
      console.warn('QUENT_ARCHIVE: не удалось сохранить localStorage', e);
    }
  }

  let characters = loadCharacters();
  let currentEditId = null;

  function findCharacter(id){ return characters.find(c => c.id === id) || null; }

  function getField(char, title){
    const f = (char.fields || []).find(x => x.title.trim().toLowerCase() === title.toLowerCase());
    return f ? f.value.trim() : '';
  }
  function cardName(char){ return getField(char, 'ФИО') || (char.fields[0] && char.fields[0].value.trim()) || 'БЕЗ_ИМЕНИ'; }
  function cardSubtitle(char){ return getField(char, 'Прозвище') || getField(char, 'Род деятельности') || ''; }
  function cardSnippet(char){ return getField(char, 'Предыстория') || getField(char, 'Личность') || 'Пункты досье ещё не заполнены.'; }

  // ---------------------------------------------------------
  // ARCHIVE GRID RENDERING
  // ---------------------------------------------------------
  const grid = document.getElementById('card-grid');
  const statUnits = document.getElementById('stat-units');

  function photoBlockHtml(char, idx){
    const label = 'UNIT_' + String(idx + 1).padStart(2, '0');
    if (char.photo) {
      return `
        <span class="char-photo-id">${label}</span>
        <img src="${escapeHtml(char.photo)}" alt="${escapeHtml(cardName(char))}">
        <span class="scan-line"></span>
      `;
    }
    return `
      <span class="char-photo-id">${label}</span>
      <div class="photo-error">
        <span class="error-icon">⚠</span>
        <span class="error-text">ERROR // FILE_NOT_FOUND</span>
      </div>
    `;
  }

  function renderArchive(){
    if (!grid) return;
    grid.innerHTML = '';

    characters.forEach((char, idx) => {
      const st = STATUS_MAP[char.status] || STATUS_MAP.idle;
      const card = document.createElement('article');
      card.className = 'char-card';
      card.innerHTML = `
        <div class="char-photo">${photoBlockHtml(char, idx)}</div>
        <div class="char-body">
          <p class="char-status"><span class="dot ${st.dot}"></span>СТАТУС: ${st.label}</p>
          <h3 class="char-name">${escapeHtml(cardName(char))}</h3>
          <p class="char-role">${escapeHtml(cardSubtitle(char)) || 'РОЛЬ / ПРОЗВИЩЕ — заполнить'}</p>
          <p class="char-desc">${escapeHtml(cardSnippet(char))}</p>
          <button class="btn-ghost" data-target="page-dossier" data-char-id="${char.id}">ДОСЬЕ <span class="btn-arrow">›</span></button>
        </div>
      `;
      grid.appendChild(card);
    });

    const addCard = document.createElement('article');
    addCard.className = 'char-card char-card--add';
    addCard.id = 'add-unit-btn';
    addCard.setAttribute('data-target', 'page-dossier');
    addCard.innerHTML = `
      <span class="add-icon">＋</span>
      <span class="add-text">ДОБАВИТЬ ЮНИТА</span>
      <span class="add-hint">создать новую карточку в архиве</span>
    `;
    grid.appendChild(addCard);

    if (statUnits) statUnits.textContent = String(characters.length).padStart(3, '0');
  }

  // ---------------------------------------------------------
  // DOSSIER — PHOTO / STATUS
  // ---------------------------------------------------------
  const dossierPhoto = document.getElementById('dossier-photo');
  const fieldPhoto    = document.getElementById('field-photo');
  const fieldStatus   = document.getElementById('field-status');
  const btnSave        = document.getElementById('btn-save');
  const btnDelete       = document.getElementById('btn-delete');
  const btnCopyLink      = document.getElementById('btn-copy-link');
  const saveToast         = document.getElementById('save-toast');
  const fieldsList          = document.getElementById('fields-list');
  const btnAddField          = document.getElementById('btn-add-field');
  const relationsGrid          = document.getElementById('relations-grid');
  const relationsLegend          = document.getElementById('relations-legend');
  const btnAddRelation             = document.getElementById('btn-add-relation');

  function photoPreviewHtml(url){
    if (url) {
      return `<img src="${escapeHtml(url)}" alt="фото юнита"><span class="scan-line"></span>`;
    }
    return `<div class="photo-error"><span class="error-icon">⚠</span><span class="error-text">ERROR // FILE_NOT_FOUND</span></div>`;
  }

  function updateDossierPhotoPreview(){
    if (!dossierPhoto) return;
    dossierPhoto.innerHTML = photoPreviewHtml(fieldPhoto.value.trim());
  }

  // ---------------------------------------------------------
  // DOSSIER — DYNAMIC FIELDS
  // ---------------------------------------------------------
  function fieldRowHtml(field){
    return `
      <div class="field-row-dyn" data-field-id="${field.id}">
        <div class="field-row-head">
          <input type="text" class="field-title-input" value="${escapeHtml(field.title)}" placeholder="Название пункта">
          <div class="field-row-controls">
            <button type="button" class="icon-btn" data-action="move-up" title="Переместить вверх">▲</button>
            <button type="button" class="icon-btn" data-action="move-down" title="Переместить вниз">▼</button>
            <button type="button" class="icon-btn icon-btn-danger" data-action="delete-field" title="Удалить пункт">✕</button>
          </div>
        </div>
        <textarea class="input-area field-value-input" rows="3" placeholder="Содержимое пункта...">${escapeHtml(field.value)}</textarea>
      </div>
    `;
  }

  function renderFieldsList(fields){
    if (!fieldsList) return;
    fieldsList.innerHTML = fields.map(fieldRowHtml).join('');
  }

  function addFieldRow(title = '', value = ''){
    const row = document.createElement('div');
    row.className = 'field-row-dyn';
    row.dataset.fieldId = uid('f');
    row.innerHTML = `
      <div class="field-row-head">
        <input type="text" class="field-title-input" value="${escapeHtml(title)}" placeholder="Название пункта">
        <div class="field-row-controls">
          <button type="button" class="icon-btn" data-action="move-up" title="Переместить вверх">▲</button>
          <button type="button" class="icon-btn" data-action="move-down" title="Переместить вниз">▼</button>
          <button type="button" class="icon-btn icon-btn-danger" data-action="delete-field" title="Удалить пункт">✕</button>
        </div>
      </div>
      <textarea class="input-area field-value-input" rows="3" placeholder="Содержимое пункта...">${escapeHtml(value)}</textarea>
    `;
    fieldsList.appendChild(row);
    row.querySelector('.field-title-input').focus();
  }

  fieldsList?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const row = btn.closest('.field-row-dyn');
    if (!row) return;

    if (btn.dataset.action === 'delete-field') {
      row.remove();
    } else if (btn.dataset.action === 'move-up') {
      const prev = row.previousElementSibling;
      if (prev) fieldsList.insertBefore(row, prev);
    } else if (btn.dataset.action === 'move-down') {
      const next = row.nextElementSibling;
      if (next) fieldsList.insertBefore(next, row);
    }
  });

  btnAddField?.addEventListener('click', () => addFieldRow('НОВЫЙ ПУНКТ', ''));

  function readFieldsFromDom(){
    if (!fieldsList) return [];
    return Array.from(fieldsList.querySelectorAll('.field-row-dyn')).map(row => ({
      id: row.dataset.fieldId || uid('f'),
      title: row.querySelector('.field-title-input').value.trim() || 'БЕЗ НАЗВАНИЯ',
      value: row.querySelector('.field-value-input').value.trim()
    }));
  }

  // ---------------------------------------------------------
  // DOSSIER — RELATIONS ("СОЦИАЛЬНЫЕ ОТНОШЕНИЯ")
  // ---------------------------------------------------------
  function renderRelationsLegend(){
    if (!relationsLegend) return;
    relationsLegend.innerHTML = RELATION_TYPES.map(t =>
      `<span class="legend-item" style="color:${t.color}">${t.label}</span>`
    ).join('');
  }

  function relationTypeOptionsHtml(selected){
    return RELATION_TYPES.map(t =>
      `<option value="${t.key}" ${t.key === selected ? 'selected' : ''}>${t.label}</option>`
    ).join('');
  }

  function relationCardEditHtml(rel){
    return `
      <div class="relation-card relation-card-edit" data-relation-id="${rel.id}">
        <button type="button" class="icon-btn icon-btn-danger relation-remove" data-action="delete-relation" title="Удалить отношение">✕</button>
        <div class="relation-photo">${rel.photo
          ? `<img src="${escapeHtml(rel.photo)}" alt="">`
          : `<div class="relation-photo-empty"><span>НЕТ ДАННЫХ</span></div>`}</div>
        <input type="text" class="input-line relation-photo-input" placeholder="URL фото (необязательно)" value="${escapeHtml(rel.photo || '')}">
        <input type="text" class="input-line relation-name-input" placeholder="Имя персонажа" value="${escapeHtml(rel.name || '')}">
        <select class="input-line relation-type-select">${relationTypeOptionsHtml(rel.type)}</select>
        <textarea class="input-area relation-quote-input" rows="2" placeholder="Короткая цитата или заметка...">${escapeHtml(rel.quote || '')}</textarea>
      </div>
    `;
  }

  function renderRelationsGrid(relations){
    if (!relationsGrid) return;
    relationsGrid.innerHTML = relations.map(relationCardEditHtml).join('');
  }

  function addRelationRow(){
    const rel = { id: uid('rel'), name: '', photo: '', type: 'unknown', quote: '' };
    const wrapper = document.createElement('div');
    wrapper.innerHTML = relationCardEditHtml(rel);
    const node = wrapper.firstElementChild;
    relationsGrid.appendChild(node);
    node.querySelector('.relation-name-input').focus();
  }

  relationsGrid?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="delete-relation"]');
    if (!btn) return;
    btn.closest('.relation-card').remove();
  });

  relationsGrid?.addEventListener('input', (e) => {
    if (!e.target.classList.contains('relation-photo-input')) return;
    const card = e.target.closest('.relation-card');
    const photoBox = card.querySelector('.relation-photo');
    const url = e.target.value.trim();
    photoBox.innerHTML = url
      ? `<img src="${escapeHtml(url)}" alt="">`
      : `<div class="relation-photo-empty"><span>НЕТ ДАННЫХ</span></div>`;
  });

  btnAddRelation?.addEventListener('click', addRelationRow);

  function readRelationsFromDom(){
    if (!relationsGrid) return [];
    return Array.from(relationsGrid.querySelectorAll('.relation-card')).map(card => ({
      id: card.dataset.relationId || uid('rel'),
      name: card.querySelector('.relation-name-input').value.trim(),
      photo: card.querySelector('.relation-photo-input').value.trim(),
      type: card.querySelector('.relation-type-select').value,
      quote: card.querySelector('.relation-quote-input').value.trim()
    }));
  }

  // ---------------------------------------------------------
  // DOSSIER — OPEN / SAVE / DELETE / NEW
  // ---------------------------------------------------------
  function openDossier(id){
    currentEditId = id;
    const char = findCharacter(id);
    if (!char) return;

    if (fieldPhoto) fieldPhoto.value = char.photo || '';
    if (fieldStatus) fieldStatus.value = char.status || 'idle';
    updateDossierPhotoPreview();
    renderFieldsList(char.fields && char.fields.length ? char.fields : blankFields());
    renderRelationsGrid(char.relations || []);
    saveToast?.classList.remove('show');
  }

  function createNewCharacter(){
    const id = uid('unit');
    characters.push({ id, photo: '', status: 'idle', fields: blankFields(), relations: [] });
    saveCharacters();
    renderArchive();
    return id;
  }

  function toastMessage(msg){
    if (!saveToast) return;
    saveToast.textContent = msg;
    saveToast.classList.add('show');
    window.clearTimeout(toastMessage._t);
    toastMessage._t = window.setTimeout(() => saveToast.classList.remove('show'), 2400);
  }

  function saveCurrentDossier(){
    const char = findCharacter(currentEditId);
    if (!char) return;

    char.photo = fieldPhoto.value.trim();
    char.status = fieldStatus.value;
    char.fields = readFieldsFromDom();
    char.relations = readRelationsFromDom();

    saveCharacters();
    renderArchive();
    toastMessage('ИЗМЕНЕНИЯ СОХРАНЕНЫ');
  }

  function deleteCurrentDossier(){
    if (!currentEditId) return;
    const char = findCharacter(currentEditId);
    const label = char ? cardName(char) : 'этого юнита';
    const ok = window.confirm(`Удалить ${label} из архива? Это действие необратимо.`);
    if (!ok) return;

    characters = characters.filter(c => c.id !== currentEditId);
    saveCharacters();
    renderArchive();
    currentEditId = null;
    goTo('page-archive');
  }

  fieldPhoto?.addEventListener('input', updateDossierPhotoPreview);
  btnSave?.addEventListener('click', saveCurrentDossier);
  btnDelete?.addEventListener('click', deleteCurrentDossier);

  // ---------------------------------------------------------
  // READ-ONLY SHARE LINK
  // ---------------------------------------------------------
  function b64EncodeUnicode(str){
    return btoa(unescape(encodeURIComponent(str)));
  }
  function b64DecodeUnicode(str){
    return decodeURIComponent(escape(atob(str)));
  }

  function buildReadLink(char){
    const payload = { v: 2, c: char };
    const encoded = b64EncodeUnicode(JSON.stringify(payload));
    return location.origin + location.pathname + '#read=' + encoded;
  }

  function decodeReadLink(hash){
    const encoded = hash.replace(/^read=/, '');
    const json = b64DecodeUnicode(decodeURIComponent(encoded));
    const payload = JSON.parse(json);
    return payload.c;
  }

  btnCopyLink?.addEventListener('click', async () => {
    const char = findCharacter(currentEditId);
    if (!char) return;

    const pending = {
      ...char,
      photo: fieldPhoto.value.trim(),
      status: fieldStatus.value,
      fields: readFieldsFromDom(),
      relations: readRelationsFromDom()
    };

    const link = buildReadLink(pending);
    try {
      await navigator.clipboard.writeText(link);
      toastMessage('ССЫЛКА СКОПИРОВАНА');
    } catch (e) {
      window.prompt('Скопируйте ссылку вручную:', link);
    }
  });

  // ---------------------------------------------------------
  // READ-ONLY PAGE RENDERING
  // ---------------------------------------------------------
  function relationCardReadHtml(rel){
    const t = relType(rel.type);
    return `
      <div class="relation-card">
        <div class="relation-photo">${rel.photo
          ? `<img src="${escapeHtml(rel.photo)}" alt="">`
          : `<div class="relation-photo-empty"><span>НЕТ ДАННЫХ</span></div>`}</div>
        <div class="relation-body">
          <p class="relation-name">${escapeHtml(rel.name) || '?'}</p>
          <span class="relation-type-tag" style="color:${t.color}">${t.label}</span>
          <p class="relation-quote">${rel.quote ? '«' + escapeHtml(rel.quote) + '»' : '«…»'}</p>
        </div>
      </div>
    `;
  }

  function renderReadPage(char){
    const content = document.getElementById('read-content');
    if (!content) return;

    const st = STATUS_MAP[char.status] || STATUS_MAP.idle;
    const fields = (char.fields || []).filter(f => f.value && f.value.trim());
    const relations = char.relations || [];

    content.innerHTML = `
      <p class="eyebrow"><span class="eyebrow-bracket">[</span>ID // 0x03_READ_ONLY<span class="eyebrow-bracket">]</span></p>

      <div class="read-top">
        <div class="read-photo">${photoPreviewHtmlStatic(char.photo)}</div>
        <div class="read-meta">
          <h1 class="read-name">${escapeHtml(cardName(char))}</h1>
          <p class="read-status"><span class="dot ${st.dot}"></span>СТАТУС: ${st.label}</p>
          ${cardSubtitle(char) ? `<span class="read-badge">${escapeHtml(cardSubtitle(char))}</span>` : ''}
        </div>
      </div>

      <div class="read-fields">
        ${fields.length ? fields.map(f => `
          <div class="read-field-block">
            <p class="read-field-title">${escapeHtml(f.title)}</p>
            <p class="read-field-value">${escapeHtml(f.value)}</p>
          </div>
        `).join('') : '<p class="section-sub">Пункты досье ещё не заполнены.</p>'}
      </div>

      <div class="relations-section read-relations">
        <div class="relations-banner">СОЦИАЛЬНЫЕ ОТНОШЕНИЯ</div>
        <div class="relations-legend">${RELATION_TYPES.map(t => `<span class="legend-item" style="color:${t.color}">${t.label}</span>`).join('')}</div>
        <div class="relations-grid">
          ${relations.length ? relations.map(relationCardReadHtml).join('') : '<p class="section-sub">Отношения ещё не добавлены.</p>'}
        </div>
      </div>
    `;
  }

  function photoPreviewHtmlStatic(url){
    if (url) return `<img src="${escapeHtml(url)}" alt=""><span class="scan-line"></span>`;
    return `<div class="photo-error"><span class="error-icon">⚠</span><span class="error-text">ERROR // FILE_NOT_FOUND</span></div>`;
  }

  function renderReadError(){
    const content = document.getElementById('read-content');
    if (!content) return;
    content.innerHTML = `
      <div class="read-error">
        <span class="error-icon">⚠</span>
        <p class="error-text">ССЫЛКА ПОВРЕЖДЕНА ИЛИ УСТАРЕЛА // DATA_CORRUPTED</p>
      </div>
    `;
  }

  function enterReadMode(hash){
    document.body.classList.add('read-mode');
    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('is-active', 'is-entering', 'is-leaving');
      p.style.display = 'none';
    });
    const readPage = document.getElementById('page-read');
    try {
      const char = decodeReadLink(hash);
      renderReadPage(char);
    } catch (e) {
      renderReadError();
    }
    readPage.style.display = 'block';
    readPage.classList.add('is-active');
  }

  // ---------------------------------------------------------
  // PAGE TRANSITIONS
  // ---------------------------------------------------------
  const navButtons = document.querySelectorAll('.nav-btn[data-target]');
  const LEAVE_MS = 460;
  let isAnimating = false;

  function getPage(id){ return document.getElementById(id); }

  function setNavActive(targetId){
    const navTarget = (targetId === 'page-dossier') ? 'page-archive' : targetId;
    navButtons.forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.target === navTarget);
    });
  }

  function goTo(targetId){
    const current = document.querySelector('.page.is-active');
    const target = getPage(targetId);
    if (!target || isAnimating || (current && current.id === targetId)) return;

    isAnimating = true;
    setNavActive(targetId);

    if (current) {
      current.classList.remove('is-active');
      current.classList.add('is-leaving');
      window.setTimeout(() => {
        current.classList.remove('is-leaving');
        current.style.display = 'none';
        enter(target);
      }, LEAVE_MS);
    } else {
      enter(target);
    }
  }

  function enter(target){
    target.style.display = 'block';
    target.classList.add('is-entering');
    const onEnd = () => {
      target.classList.remove('is-entering');
      target.classList.add('is-active');
      target.removeEventListener('animationend', onEnd);
      isAnimating = false;
    };
    target.addEventListener('animationend', onEnd);
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-target]');
    if (!btn) return;

    if (btn.id === 'add-unit-btn') {
      const id = createNewCharacter();
      openDossier(id);
      goTo('page-dossier');
      history.replaceState(null, '', '#page-dossier');
      return;
    }

    if (btn.dataset.charId) {
      openDossier(btn.dataset.charId);
      goTo('page-dossier');
      history.replaceState(null, '', '#page-dossier');
      return;
    }

    goTo(btn.dataset.target);
    history.replaceState(null, '', '#' + btn.dataset.target);
  });

  window.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash.replace('#', '');

    if (hash.startsWith('read=')) {
      enterReadMode(hash);
      return;
    }

    renderArchive();
    renderRelationsLegend();

    if (hash === 'page-archive' || hash === 'page-home') {
      goTo(hash);
    }
  });

  // ---------------------------------------------------------
  // MATRIX RAIN (декоративный виджет на главной)
  // ---------------------------------------------------------
  function initMatrixRain(){
    const canvas = document.getElementById('matrix-rain');
    if (!canvas) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d');
    const chars = 'アイウエオカキクケコサシスセソ0123456789QUENT01ｱｲｳｴｵ';
    let cols, drops, fontSize = 15;

    function resize(){
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      cols = Math.floor(rect.width / fontSize);
      drops = new Array(cols).fill(0).map(() => Math.floor(Math.random() * -20));
    }

    function frame(){
      const rect = canvas.getBoundingClientRect();
      ctx.fillStyle = 'rgba(2,3,2,0.14)';
      ctx.fillRect(0, 0, rect.width, rect.height);

      ctx.font = fontSize + 'px monospace';
      for (let i = 0; i < cols; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const y = drops[i] * fontSize;
        ctx.fillStyle = Math.random() > 0.94 ? '#eafff0' : '#00ff6a';
        ctx.fillText(ch, i * fontSize, y);
        if (y > rect.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }

    resize();
    window.addEventListener('resize', resize);

    if (reduceMotion) {
      frame();
      return;
    }
    window.setInterval(frame, 60);
  }

  if (!window.location.hash.startsWith('#read=')) {
    initMatrixRain();
  }
})();
