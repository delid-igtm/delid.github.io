(() => {
  'use strict';

  const STORAGE_KEY = 'quent_archive_characters_v1';

  // маленький демонстрационный силуэт — показывает, как карточка выглядит
  // с прикреплённым фото (зелёная анимация сканирования)
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

  const DEFAULT_CHARACTERS = [
    {
      id: 'unit-01',
      name: 'ДЕМО_ЮНИТ',
      role: 'ПРИМЕР ФОТО — можно заменить',
      status: 'active',
      desc: 'Демонстрационная карточка: показывает, как выглядит юнит с прикреплённой фотографией — зелёная линия сканирования поверх снимка.',
      bio: '',
      equipment: '',
      photo: DEMO_PHOTO
    },
    {
      id: 'unit-02',
      name: 'ИМЯ_ФАМИЛИЯ',
      role: 'РОЛЬ / АРХЕТИП — заполнить',
      status: 'idle',
      desc: 'Короткая квента персонажа появится здесь: пара строк о происхождении, характере и цели.',
      bio: '',
      equipment: '',
      photo: ''
    },
    {
      id: 'unit-03',
      name: 'ИМЯ_ФАМИЛИЯ',
      role: 'РОЛЬ / АРХЕТИП — заполнить',
      status: 'archived',
      desc: 'Короткая квента персонажа появится здесь: пара строк о происхождении, характере и цели.',
      bio: '',
      equipment: '',
      photo: ''
    }
  ];

  // ---------------------------------------------------------
  // DATA LAYER
  // ---------------------------------------------------------
  function loadCharacters(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('QUENT_ARCHIVE: не удалось прочитать localStorage', e);
    }
    return DEFAULT_CHARACTERS.map(c => ({ ...c }));
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

  function escapeHtml(str){
    return String(str ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

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
        <img src="${escapeHtml(char.photo)}" alt="${escapeHtml(char.name)}">
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
    grid.innerHTML = '';

    characters.forEach((char, idx) => {
      const st = STATUS_MAP[char.status] || STATUS_MAP.idle;
      const card = document.createElement('article');
      card.className = 'char-card';
      card.innerHTML = `
        <div class="char-photo">${photoBlockHtml(char, idx)}</div>
        <div class="char-body">
          <p class="char-status"><span class="dot ${st.dot}"></span>СТАТУС: ${st.label}</p>
          <h3 class="char-name">${escapeHtml(char.name) || 'БЕЗ_ИМЕНИ'}</h3>
          <p class="char-role">${escapeHtml(char.role) || 'РОЛЬ / АРХЕТИП — заполнить'}</p>
          <p class="char-desc">${escapeHtml(char.desc) || 'Короткая квента персонажа появится здесь.'}</p>
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
  // DOSSIER PAGE
  // ---------------------------------------------------------
  const dossierPhoto  = document.getElementById('dossier-photo');
  const fieldPhoto     = document.getElementById('field-photo');
  const fieldName       = document.getElementById('field-name');
  const fieldStatus     = document.getElementById('field-status');
  const fieldRole       = document.getElementById('field-role');
  const fieldDesc       = document.getElementById('field-desc');
  const fieldBio         = document.getElementById('field-bio');
  const fieldEquipment  = document.getElementById('field-equipment');
  const btnSave          = document.getElementById('btn-save');
  const btnDelete        = document.getElementById('btn-delete');
  const saveToast         = document.getElementById('save-toast');

  function updateDossierPhotoPreview(){
    const url = fieldPhoto.value.trim();
    if (url) {
      dossierPhoto.innerHTML = `
        <img src="${escapeHtml(url)}" alt="фото юнита">
        <span class="scan-line"></span>
      `;
    } else {
      dossierPhoto.innerHTML = `
        <div class="photo-error">
          <span class="error-icon">⚠</span>
          <span class="error-text">ERROR // FILE_NOT_FOUND</span>
        </div>
      `;
    }
  }

  function findCharacter(id){
    return characters.find(c => c.id === id) || null;
  }

  function openDossier(id){
    currentEditId = id;
    const char = findCharacter(id);
    if (!char) return;

    fieldPhoto.value = char.photo || '';
    fieldName.value = char.name || '';
    fieldStatus.value = char.status || 'idle';
    fieldRole.value = char.role || '';
    fieldDesc.value = char.desc || '';
    fieldBio.value = char.bio || '';
    fieldEquipment.value = char.equipment || '';

    updateDossierPhotoPreview();
    saveToast.classList.remove('show');
  }

  function createNewCharacter(){
    const id = 'unit-' + Date.now();
    const newChar = {
      id,
      name: '',
      role: '',
      status: 'idle',
      desc: '',
      bio: '',
      equipment: '',
      photo: ''
    };
    characters.push(newChar);
    saveCharacters();
    renderArchive();
    return id;
  }

  function saveCurrentDossier(){
    const char = findCharacter(currentEditId);
    if (!char) return;

    char.photo = fieldPhoto.value.trim();
    char.name = fieldName.value.trim();
    char.status = fieldStatus.value;
    char.role = fieldRole.value.trim();
    char.desc = fieldDesc.value.trim();
    char.bio = fieldBio.value.trim();
    char.equipment = fieldEquipment.value.trim();

    saveCharacters();
    renderArchive();

    saveToast.classList.add('show');
    window.clearTimeout(saveCurrentDossier._t);
    saveCurrentDossier._t = window.setTimeout(() => saveToast.classList.remove('show'), 2200);
  }

  function deleteCurrentDossier(){
    if (!currentEditId) return;
    const char = findCharacter(currentEditId);
    const label = (char && char.name) ? char.name : 'этого юнита';
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

  // делегирование кликов: работает и для статичных кнопок навигации,
  // и для карточек, созданных динамически
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
    renderArchive();
    const hash = window.location.hash.replace('#', '');
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

  initMatrixRain();
})();
