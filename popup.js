const STORAGE_KEY = 'slots';
const THEME_KEY = 'theme';
const DEFAULT_SLOT_COUNT = 12;
const ADD_INCREMENT = 4;

const grid = document.getElementById('grid');
const addSlotBtn = document.getElementById('addSlotBtn');
const logoImg = document.getElementById('logoImg');
const folderHeading = document.getElementById('folderHeading');
const themeBtn = document.getElementById('themeBtn');
const themeMenu = document.getElementById('themeMenu');
const themeSwatches = document.querySelectorAll('.theme-swatch');

const overlay = document.getElementById('modalOverlay');
const form = document.getElementById('shortcutForm');
const typeTabs = document.getElementById('typeTabs');
const tabShortcut = document.getElementById('tabShortcut');
const tabFolder = document.getElementById('tabFolder');
const nameInput = document.getElementById('nameInput');
const urlLabel = document.getElementById('urlLabel');
const urlInput = document.getElementById('urlInput');
const useTabBtn = document.getElementById('useTabBtn');
const cancelBtn = document.getElementById('cancelBtn');
const removeBtn = document.getElementById('removeBtn');
const moveOutBtn = document.getElementById('moveOutBtn');
const modalTitle = document.getElementById('modalTitle');
const saveBtn = document.getElementById('saveBtn');

let rootSlots = [];
let viewFolderIndex = null; // null = root view, else index into rootSlots
let editingSlots = null; // the array (rootSlots or a folder's items) being edited
let editingIndex = null;
let editingIsNew = false;
let editingInsideFolder = false;
let selectedType = 'shortcut';
let draggedIndex = null;

function isFolder(entry) {
  return !!entry && Array.isArray(entry.items);
}

function currentSlots() {
  return viewFolderIndex === null ? rootSlots : rootSlots[viewFolderIndex].items;
}

function normalizeUrl(raw) {
  let value = raw.trim();
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value)) {
    value = 'https://' + value;
  }
  return value;
}

function faviconUrl(pageUrl) {
  const u = new URL(chrome.runtime.getURL('/_favicon/'));
  u.searchParams.set('pageUrl', pageUrl);
  u.searchParams.set('size', '32');
  return u.toString();
}

function load() {
  chrome.storage.local.get([STORAGE_KEY, THEME_KEY], (result) => {
    rootSlots = result[STORAGE_KEY] || new Array(DEFAULT_SLOT_COUNT).fill(null);
    applyTheme(result[THEME_KEY] || 'dark');
    render();
  });
}

function save() {
  chrome.storage.local.set({ [STORAGE_KEY]: rootSlots });
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  themeSwatches.forEach((swatch) => {
    swatch.classList.toggle('active', swatch.dataset.theme === theme);
  });
}

function renderHeader() {
  const inFolder = viewFolderIndex !== null;
  folderHeading.hidden = !inFolder;
  if (inFolder) {
    folderHeading.textContent = rootSlots[viewFolderIndex].name;
  }
}

function attachDragHandlers(tile, index, draggableEntry) {
  if (draggableEntry) {
    tile.draggable = true;

    tile.addEventListener('dragstart', (e) => {
      draggedIndex = index;
      tile.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    });

    tile.addEventListener('dragend', () => {
      tile.classList.remove('dragging');
      draggedIndex = null;
      grid.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
    });
  }

  tile.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    tile.classList.add('drag-over');
  });

  tile.addEventListener('dragleave', () => {
    tile.classList.remove('drag-over');
  });

  tile.addEventListener('drop', (e) => {
    e.preventDefault();
    tile.classList.remove('drag-over');
    handleDrop(index);
  });
}

function handleDrop(targetIndex) {
  if (draggedIndex === null || draggedIndex === targetIndex) return;

  const slots = currentSlots();
  const draggedEntry = slots[draggedIndex];
  const targetEntry = slots[targetIndex];
  if (!draggedEntry) return;

  let createdNewFolderAt = null;

  if (!targetEntry) {
    slots[targetIndex] = draggedEntry;
    slots[draggedIndex] = null;
  } else if (isFolder(targetEntry) && isFolder(draggedEntry)) {
    targetEntry.items.push(...draggedEntry.items.filter(Boolean));
    slots[draggedIndex] = null;
  } else if (isFolder(targetEntry)) {
    targetEntry.items.push(draggedEntry);
    slots[draggedIndex] = null;
  } else if (isFolder(draggedEntry)) {
    draggedEntry.items.push(targetEntry);
    slots[targetIndex] = draggedEntry;
    slots[draggedIndex] = null;
  } else {
    slots[targetIndex] = { name: 'New Folder', items: [draggedEntry, targetEntry] };
    slots[draggedIndex] = null;
    createdNewFolderAt = targetIndex;
  }

  draggedIndex = null;
  save();
  render();

  if (createdNewFolderAt !== null) {
    openModal(currentSlots(), createdNewFolderAt, viewFolderIndex !== null);
    nameInput.select();
  }
}

function buildShortcutTile(entry, index) {
  const tile = document.createElement('div');
  tile.className = 'slot';
  tile.title = entry.name;

  const icon = document.createElement('div');
  icon.className = 'slot-icon';
  const img = document.createElement('img');
  img.src = faviconUrl(entry.url);
  img.alt = '';
  img.onerror = () => {
    icon.textContent = entry.name.charAt(0).toUpperCase();
  };
  icon.appendChild(img);

  const label = document.createElement('div');
  label.className = 'slot-label';
  label.textContent = entry.name;

  tile.appendChild(icon);
  tile.appendChild(label);

  tile.addEventListener('click', () => {
    chrome.tabs.create({ url: entry.url });
  });
  tile.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    openModal(currentSlots(), index, viewFolderIndex !== null);
  });
  attachDragHandlers(tile, index, true);

  return tile;
}

function buildFolderTile(entry, index) {
  const tile = document.createElement('div');
  tile.className = 'slot slot-folder';
  tile.title = entry.name;

  const icon = document.createElement('div');
  icon.className = 'slot-icon';

  const preview = entry.items.filter(Boolean).slice(0, 4);
  for (let i = 0; i < 4; i++) {
    const mini = document.createElement('div');
    mini.className = 'mini';
    const item = preview[i];
    if (item) {
      const img = document.createElement('img');
      img.src = faviconUrl(item.url);
      img.alt = '';
      mini.appendChild(img);
    }
    icon.appendChild(mini);
  }

  const label = document.createElement('div');
  label.className = 'slot-label';
  label.textContent = entry.name;

  tile.appendChild(icon);
  tile.appendChild(label);

  tile.addEventListener('click', () => {
    viewFolderIndex = index;
    render();
  });
  tile.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    openModal(currentSlots(), index, viewFolderIndex !== null);
  });
  attachDragHandlers(tile, index, true);

  return tile;
}

function buildEmptyTile(index) {
  const tile = document.createElement('div');
  tile.className = 'slot slot-empty';
  tile.title = 'Add shortcut';

  const icon = document.createElement('div');
  icon.className = 'slot-icon';
  icon.textContent = '+';

  const label = document.createElement('div');
  label.className = 'slot-label';
  label.textContent = 'Empty';

  tile.appendChild(icon);
  tile.appendChild(label);

  tile.addEventListener('click', () => openModal(currentSlots(), index, viewFolderIndex !== null));
  attachDragHandlers(tile, index, false);

  return tile;
}

function render() {
  renderHeader();
  grid.innerHTML = '';

  const slots = currentSlots();
  slots.forEach((entry, index) => {
    if (isFolder(entry)) {
      grid.appendChild(buildFolderTile(entry, index));
    } else if (entry) {
      grid.appendChild(buildShortcutTile(entry, index));
    } else {
      grid.appendChild(buildEmptyTile(index));
    }
  });
}

function setSelectedType(type) {
  selectedType = type;
  tabShortcut.classList.toggle('active', type === 'shortcut');
  tabFolder.classList.toggle('active', type === 'folder');
  urlLabel.hidden = type === 'folder';
  urlInput.required = type === 'shortcut';
}

function openModal(slotsRef, index, insideFolder) {
  editingSlots = slotsRef;
  editingIndex = index;
  editingInsideFolder = !!insideFolder;
  const existing = slotsRef[index];
  editingIsNew = !existing;

  if (existing) {
    typeTabs.hidden = true;
    setSelectedType(isFolder(existing) ? 'folder' : 'shortcut');
    modalTitle.textContent = isFolder(existing) ? 'Edit folder' : 'Edit shortcut';
    removeBtn.textContent = isFolder(existing) ? 'Delete folder' : 'Remove';
    saveBtn.textContent = 'Save';
    removeBtn.hidden = false;
    moveOutBtn.hidden = !(editingInsideFolder && !isFolder(existing));
    nameInput.value = existing.name;
    urlInput.value = isFolder(existing) ? '' : existing.url;
  } else {
    typeTabs.hidden = false;
    setSelectedType('shortcut');
    modalTitle.textContent = 'Add shortcut';
    saveBtn.textContent = 'Add';
    removeBtn.hidden = true;
    moveOutBtn.hidden = true;
    nameInput.value = '';
    urlInput.value = '';
  }

  overlay.classList.add('open');
  nameInput.focus();
}

function closeModal() {
  overlay.classList.remove('open');
  form.reset();
  editingSlots = null;
  editingIndex = null;
}

tabShortcut.addEventListener('click', () => setSelectedType('shortcut'));
tabFolder.addEventListener('click', () => setSelectedType('folder'));

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  if (!name || editingIndex === null || !editingSlots) return;

  if (selectedType === 'folder') {
    if (editingIsNew) {
      editingSlots[editingIndex] = { name, items: new Array(ADD_INCREMENT).fill(null) };
    } else {
      editingSlots[editingIndex].name = name;
    }
  } else {
    const url = normalizeUrl(urlInput.value);
    if (!url) return;
    editingSlots[editingIndex] = { name, url };
  }

  save();
  render();
  closeModal();
});

removeBtn.addEventListener('click', () => {
  if (editingIndex === null || !editingSlots) return;
  const deletingCurrentFolder = editingSlots === rootSlots && editingIndex === viewFolderIndex;
  editingSlots[editingIndex] = null;
  if (deletingCurrentFolder) viewFolderIndex = null;
  save();
  render();
  closeModal();
});

moveOutBtn.addEventListener('click', () => {
  if (editingIndex === null || !editingSlots || !editingInsideFolder) return;
  const entry = editingSlots[editingIndex];
  editingSlots[editingIndex] = null;

  let target = rootSlots.findIndex((s) => s === null);
  if (target === -1) {
    target = rootSlots.length;
    for (let i = 0; i < ADD_INCREMENT; i++) rootSlots.push(null);
  }
  rootSlots[target] = entry;

  viewFolderIndex = null;
  save();
  render();
  closeModal();
});

addSlotBtn.addEventListener('click', () => {
  const slots = currentSlots();
  for (let i = 0; i < ADD_INCREMENT; i++) slots.push(null);
  save();
  render();
});

logoImg.addEventListener('click', () => {
  if (viewFolderIndex === null) return;
  viewFolderIndex = null;
  render();
});

folderHeading.addEventListener('click', () => {
  if (viewFolderIndex === null) return;
  openModal(rootSlots, viewFolderIndex, false);
});

themeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  themeMenu.hidden = !themeMenu.hidden;
});

themeSwatches.forEach((swatch) => {
  swatch.addEventListener('click', () => {
    const theme = swatch.dataset.theme;
    applyTheme(theme);
    chrome.storage.local.set({ [THEME_KEY]: theme });
    themeMenu.hidden = true;
  });
});

document.addEventListener('click', (e) => {
  if (!themeMenu.hidden && !e.target.closest('.theme-picker')) {
    themeMenu.hidden = true;
  }
});

useTabBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.url) return;
    urlInput.value = tab.url;
    if (!nameInput.value.trim() && tab.title) {
      nameInput.value = tab.title.slice(0, 40);
    }
  });
});

cancelBtn.addEventListener('click', closeModal);
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
});

load();
