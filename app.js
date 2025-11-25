/* ===========================
   app.js — PARTE 1 de 5
   (Inicialización, IndexedDB, helpers y comienzo de init)
   Pega esta parte primero.
   =========================== */

// Basic PMBOK editor with persistence (diagrams and documents saved as base64 in IndexedDB)
// Uses mermaid.js for diagram rendering and pdf.js for viewing PDFs.

mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });

// PDF.js worker
if (window['pdfjsLib']) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
}

// ---------- IndexedDB (for storing large files like images, PDFs, PPTX) ----------
let db;
const DB_NAME = "PMBOK-Files";
const DB_VERSION = 1;

function initDB() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = function (e) {
        db = e.target.result;
        if (!db.objectStoreNames.contains("files")) {
          db.createObjectStore("files", { keyPath: "id" });
        }
      };

      req.onsuccess = function (e) {
        db = e.target.result;
        resolve();
      };

      req.onerror = function (e) {
        console.error("IndexedDB error", e);
        reject("Error al abrir IndexedDB");
      };
    } catch (err) {
      reject(err);
    }
  });
}

function saveFileToDB(id, data) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction("files", "readwrite");
      const store = tx.objectStore("files");
      store.put({ id, data });
      tx.oncomplete = () => resolve();
      tx.onerror = (err) => {
        console.error("saveFileToDB tx error", err);
        reject("Error guardando archivo en DB");
      };
    } catch (err) {
      console.error("saveFileToDB error", err);
      reject(err);
    }
  });
}

function loadFileFromDB(id) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction("files", "readonly");
      const store = tx.objectStore("files");
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result?.data || null);
      req.onerror = (err) => {
        console.error("loadFileFromDB error", err);
        reject(err);
      };
    } catch (err) {
      console.error("loadFileFromDB catch", err);
      reject(err);
    }
  });
}

function deleteFileFromDB(id) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction("files", "readwrite");
      const store = tx.objectStore("files");
      const req = store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = (err) => {
        console.error("deleteFileFromDB error", err);
        reject(err);
      };
    } catch (err) {
      console.error("deleteFileFromDB catch", err);
      reject(err);
    }
  });
}

// ------------------------------------------------------------------------------

// ---------- App state ----------
let appState = {
  chapters: [],
  currentChapter: null,
  currentSubchapter: null,
};

// ---------- Helpers ----------
function generateId() {
  return "id-" + Math.random().toString(36).slice(2, 10);
}

function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString();
}

function saveAppState() {
  localStorage.setItem("pmbokEditor", JSON.stringify(appState));
}

function loadAppState() {
  const saved = localStorage.getItem("pmbokEditor");
  if (saved) {
    try {
      appState = JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
  }
}

// ---------- (DOM element references will be initialised inside init)
// We move the getElementById calls INTO init() to avoid nulls if script runs
// before DOM is ready. This fixes "buttons no hacen nada".
let chaptersList;
let addChapterBtn;
let expandAllBtn;
let collapseAllBtn;

let editorTitle;
let chapterEditor;
let editorSectionTitle;
let addSubchapterBtn;
let addDiagramBtn;
let addDocumentBtn;
let chapterTitle;
let chapterDescription;

let diagramEditor;
let diagramTitle;
let diagramDescription;
let diagramCode;
let diagramImage;
let diagramFileName;
let mermaidInputGroup;
let imageInputGroup;
let diagramPreview;
let saveDiagramBtn;
let cancelDiagramBtn;

let documentEditor;
let documentTitle;
let documentDescription;
let documentDate;
let documentFile;
let documentFileName;
let saveDocumentBtn;
let cancelDocumentBtn;

let diagramsList;
let documentsList;

let saveBtn;
let loadBtn;
let resetBtn;

let modal;
let modalContent;
let modalClose;

// ---------- Init ----------
async function init() {
  // Initialize IndexedDB first (if supported)
  try {
    await initDB();
  } catch (err) {
    console.warn("IndexedDB no disponible o fallo de inicialización, se intentará continuar con localStorage (limitado).", err);
  }

  // Now that DOM is ready, grab elements
  chaptersList = document.getElementById("chaptersList");
  addChapterBtn = document.getElementById("addChapterBtn");
  expandAllBtn = document.getElementById("expandAllBtn");
  collapseAllBtn = document.getElementById("collapseAllBtn");

  editorTitle = document.getElementById("editorTitle");
  chapterEditor = document.getElementById("chapterEditor");
  editorSectionTitle = document.getElementById("editorSectionTitle");
  addSubchapterBtn = document.getElementById("addSubchapterBtn");
  addDiagramBtn = document.getElementById("addDiagramBtn");
  addDocumentBtn = document.getElementById("addDocumentBtn");
  chapterTitle = document.getElementById("chapterTitle");
  chapterDescription = document.getElementById("chapterDescription");

  diagramEditor = document.getElementById("diagramEditor");
  diagramTitle = document.getElementById("diagramTitle");
  diagramDescription = document.getElementById("diagramDescription");
  diagramCode = document.getElementById("diagramCode");
  diagramImage = document.getElementById("diagramImage");
  diagramFileName = document.getElementById("diagramFileName");
  mermaidInputGroup = document.getElementById("mermaidInputGroup");
  imageInputGroup = document.getElementById("imageInputGroup");
  diagramPreview = document.getElementById("diagramPreview");
  saveDiagramBtn = document.getElementById("saveDiagramBtn");
  cancelDiagramBtn = document.getElementById("cancelDiagramBtn");

  documentEditor = document.getElementById("documentEditor");
  documentTitle = document.getElementById("documentTitle");
  documentDescription = document.getElementById("documentDescription");
  documentDate = document.getElementById("documentDate");
  documentFile = document.getElementById("documentFile");
  documentFileName = document.getElementById("documentFileName");
  saveDocumentBtn = document.getElementById("saveDocumentBtn");
  cancelDocumentBtn = document.getElementById("cancelDocumentBtn");

  diagramsList = document.getElementById("diagramsList");
  documentsList = document.getElementById("documentsList");

  saveBtn = document.getElementById("saveBtn");
  loadBtn = document.getElementById("loadBtn");
  resetBtn = document.getElementById("resetBtn");

  modal = document.getElementById("modal");
  modalContent = document.getElementById("modalContent");
  modalClose = document.getElementById("modalClose");

  // load app state and UI
  loadAppState();

  if (!appState.chapters || appState.chapters.length === 0) createInitialChapters();

  renderChapters();

  if (appState.currentChapter) selectChapter(appState.currentChapter);

  setupEventListeners();

  documentDate.valueAsDate = new Date();
}

// Ensure init runs only after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/* === FIN PARTE 1 ===
   A continuación debes pegar la PARTE 2 (event listeners + capítulos).
   No cambies el orden: Parte1 → Parte2 → Parte3 → Parte4 → Parte5
*/
/* ===========================
   app.js — PARTE 2 de 5
   (Event listeners + chapters/subchapters)
   =========================== */

function setupEventListeners() {
  addChapterBtn.addEventListener("click", addNewChapter);

  expandAllBtn.addEventListener("click", () => {
    appState.chapters.forEach((c) => (c.expanded = true));
    renderChapters();
    saveAppState();
  });

  collapseAllBtn.addEventListener("click", () => {
    appState.chapters.forEach((c) => (c.expanded = false));
    renderChapters();
    saveAppState();
  });

  addSubchapterBtn.addEventListener("click", addNewSubchapter);
  addDiagramBtn.addEventListener("click", showDiagramEditor);
  addDocumentBtn.addEventListener("click", showDocumentEditor);

  chapterTitle.addEventListener("input", saveCurrentChapter);
  chapterDescription.addEventListener("input", saveCurrentChapter);
}

/* =======================
   CHAPTERS + SUBCHAPTERS
   ======================= */

function createInitialChapters() {
  appState.chapters = [
    {
      id: generateId(),
      title: "Capítulo 1: Introducción",
      description: "Conceptos ...",
      expanded: true,
      subchapters: [],
      diagrams: [],
      documents: [],
    },
    {
      id: generateId(),
      title: "Capítulo 2: Entorno",
      description: "Factores organizacionales",
      expanded: false,
      subchapters: [],
      diagrams: [],
      documents: [],
    },
  ];
  appState.currentChapter = appState.chapters[0].id;
  saveAppState();
}

function renderChapters() {
  chaptersList.innerHTML = "";

  appState.chapters.forEach((chap) => {
    const li = document.createElement("li");
    li.className = "chapter-item" + (chap.expanded ? " expanded" : "");

    li.innerHTML = `
      <div class="chapter-header ${appState.currentChapter === chap.id ? "active" : ""}" data-id="${chap.id}">
        <span>${chap.title}</span>
        <div>
          <button class="edit">✎</button>
          <button class="delete">×</button>
        </div>
      </div>

      <ul class="subchapters-list">
        ${chap.subchapters
          .map(
            (s) =>
              `<li class="subchapter-item" data-id="${s.id}">
                <span>${s.title}</span>
              </li>`
          )
          .join("")}
      </ul>
    `;

    chaptersList.appendChild(li);

    li.querySelector(".chapter-header").addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.id;
      toggleChapterExpansion(id);
      selectChapter(id);
    });

    li.querySelector(".edit").addEventListener("click", (e) => {
      e.stopPropagation();
      selectChapter(chap.id);
    });

    li.querySelector(".delete").addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm("¿Eliminar capítulo?")) {
        appState.chapters = appState.chapters.filter((c) => c.id !== chap.id);
        appState.currentChapter = null;
        renderChapters();
        saveAppState();
      }
    });

    li.querySelectorAll(".subchapter-item").forEach((item) => {
      item.addEventListener("click", () => selectSubchapter(item.dataset.id));
    });
  });
}

function addNewChapter() {
  const newC = {
    id: generateId(),
    title: "Nuevo Capítulo",
    description: "",
    expanded: true,
    subchapters: [],
    diagrams: [],
    documents: [],
  };

  appState.chapters.push(newC);
  selectChapter(newC.id);
  renderChapters();
  saveAppState();
}

function addNewSubchapter() {
  if (!appState.currentChapter)
    return alert("Selecciona un capítulo primero");

  const ch = appState.chapters.find((c) => c.id === appState.currentChapter);

  const sub = {
    id: generateId(),
    title: "Nuevo Subcapítulo",
    description: "",
    diagrams: [],
    documents: [],
  };

  ch.subchapters.push(sub);
  ch.expanded = true;

  saveAppState();
  renderChapters();
  selectSubchapter(sub.id);
}

function toggleChapterExpansion(id) {
  const ch = appState.chapters.find((c) => c.id === id);
  if (!ch) return;
  ch.expanded = !ch.expanded;
  renderChapters();
  saveAppState();
}

function selectChapter(id) {
  appState.currentChapter = id;
  appState.currentSubchapter = null;

  const ch = appState.chapters.find((c) => c.id === id);
  if (!ch) return;

  editorTitle.textContent = "Editor: " + ch.title;
  editorSectionTitle.textContent = "Editar Capítulo";

  chapterTitle.value = ch.title;
  chapterDescription.value = ch.description;

  chapterEditor.classList.remove("hidden");

  renderCurrentDiagrams();
  renderCurrentDocuments();
  renderChapters();
}

function selectSubchapter(subId) {
  if (!appState.currentChapter) return;

  const ch = appState.chapters.find((c) => c.id === appState.currentChapter);
  const sub = ch.subchapters.find((s) => s.id === subId);

  appState.currentSubchapter = subId;

  editorTitle.textContent = "Editor: " + sub.title;
  editorSectionTitle.textContent = "Editar Subcapítulo";

  chapterTitle.value = sub.title;
  chapterDescription.value = sub.description;

  renderCurrentDiagrams();
  renderCurrentDocuments();
  renderChapters();
}

function saveCurrentChapter() {
  if (appState.currentSubchapter) {
    const ch = appState.chapters.find((c) => c.id === appState.currentChapter);
    const sub = ch.subchapters.find(
      (s) => s.id === appState.currentSubchapter
    );

    sub.title = chapterTitle.value;
    sub.description = chapterDescription.value;
  } else if (appState.currentChapter) {
    const ch = appState.chapters.find((c) => c.id === appState.currentChapter);

    ch.title = chapterTitle.value;
    ch.description = chapterDescription.value;
  }

  renderChapters();
  saveAppState();
}

/* === FIN PARTE 2 ===  
   Cuando estés lista pega la PARTE 3 (Diagramas) justo después de esta.
*/
/* ===========================
   app.js — PARTE 3 de 5
   (Diagramas — creación, guardado, render, modal, eliminación)
   =========================== */

let editingDiagramId = null;

function showDiagramEditor() {
  if (!appState.currentChapter)
    return alert("Selecciona un capítulo o subcapítulo");

  diagramEditor.classList.remove("hidden");
  documentEditor.classList.add("hidden");

  editingDiagramId = null;

  diagramTitle.value = "";
  diagramDescription.value = "";
  diagramCode.value = "";
  diagramImage.value = "";
  diagramFileName.textContent = "Ningún archivo seleccionado";

  mermaidInputGroup.classList.remove("hidden");
  imageInputGroup.classList.add("hidden");

  updateDiagramPreview();
}

function updateDiagramPreview() {
  const title = diagramTitle.value || "Sin título";
  const desc = diagramDescription.value || "";
  const type = document.querySelector(".type-option.active").dataset.type;

  if (type === "mermaid") {
    const code = diagramCode.value.trim();

    if (code) {
      diagramPreview.innerHTML = `
        <div>
          <strong>${title}</strong>
          <div>${desc}</div>
          <div class="mermaid">${code}</div>
        </div>
      `;
      try {
        mermaid.init(undefined, diagramPreview.querySelectorAll(".mermaid"));
      } catch (e) {}
    } else {
      diagramPreview.innerHTML = `
        <div>
          <strong>${title}</strong>
          <div>${desc}</div>
          <div>Ingresa código Mermaid</div>
        </div>
      `;
    }
  } else {
    if (diagramImage.files && diagramImage.files.length) {
      const file = diagramImage.files[0];
      const url = URL.createObjectURL(file);

      diagramPreview.innerHTML = `
        <div>
          <strong>${title}</strong>
          <div>${desc}</div>
          <img src="${url}" style="max-width:100%;height:auto;border-radius:6px" />
        </div>
      `;
    } else {
      diagramPreview.innerHTML = `
        <div>
          <strong>${title}</strong>
          <div>${desc}</div>
          <div>Selecciona una imagen</div>
        </div>
      `;
    }
  }
}

function saveDiagram() {
  const title = diagramTitle.value.trim();
  const desc = diagramDescription.value.trim();
  const type = document.querySelector(".type-option.active").dataset.type;

  if (!title) return alert("Ingresa título");

  if (type === "mermaid") {
    const content = diagramCode.value.trim();
    if (!content) return alert("Ingresa código Mermaid");

    const diagram = {
      id: editingDiagramId || generateId(),
      title,
      description: desc,
      type: "mermaid",
      content,
    };

    finishSavingDiagram(diagram);
  } else {
    if (!diagramImage.files.length)
      return alert("Selecciona una imagen");

    const file = diagramImage.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
      const base64 = e.target.result;
      const diagramId = editingDiagramId || generateId();

      const diagram = {
        id: diagramId,
        title,
        description: desc,
        type: "image",
        content: null,
        fileId: diagramId,
      };

      if (db) {
        saveFileToDB(diagram.fileId, base64)
          .then(() => finishSavingDiagram(diagram))
          .catch((err) => {
            console.error("Error guardando imagen en DB:", err);
            diagram.content = base64;
            finishSavingDiagram(diagram);
          });
      } else {
        diagram.content = base64;
        finishSavingDiagram(diagram);
      }
    };

    reader.readAsDataURL(file);
  }
}

function finishSavingDiagram(diagram) {
  diagram.id = diagram.id || generateId();

  if (appState.currentSubchapter) {
    const ch = appState.chapters.find((c) => c.id === appState.currentChapter);
    const sub = ch.subchapters.find((s) => s.id === appState.currentSubchapter);

    if (!sub.diagrams) sub.diagrams = [];

    if (editingDiagramId) {
      const idx = sub.diagrams.findIndex((d) => d.id === diagram.id);
      if (idx >= 0) sub.diagrams[idx] = diagram;
    } else {
      sub.diagrams.push(diagram);
    }
  } else {
    const ch = appState.chapters.find((c) => c.id === appState.currentChapter);

    if (!ch.diagrams) ch.diagrams = [];

    if (editingDiagramId) {
      const idx = ch.diagrams.findIndex((d) => d.id === diagram.id);
      if (idx >= 0) ch.diagrams[idx] = diagram;
    } else {
      ch.diagrams.push(diagram);
    }
  }

  diagramEditor.classList.add("hidden");
  renderCurrentDiagrams();
  saveAppState();
}

function renderCurrentDiagrams() {
  let diagrams = [];

  if (appState.currentSubchapter) {
    const ch = appState.chapters.find((c) => c.id === appState.currentChapter);
    const sub = ch.subchapters.find((s) => s.id === appState.currentSubchapter);
    diagrams = sub?.diagrams || [];
  } else if (appState.currentChapter) {
    const ch = appState.chapters.find((c) => c.id === appState.currentChapter);
    diagrams = ch?.diagrams || [];
  }

  renderDiagrams(diagrams);
}

function renderDiagrams(diagrams) {
  if (!diagrams || diagrams.length === 0) {
    diagramsList.innerHTML = `<div class="card">No hay diagramas</div>`;
    return;
  }

  diagramsList.innerHTML = "";

  diagrams.forEach((d) => {
    const el = document.createElement("div");
    el.className = "card";

    el.innerHTML = `
      <div class="title">${d.title}</div>
      <div class="meta">${d.description || ""}</div>
    `;

    if (d.type === "mermaid") {
      const cont = document.createElement("div");
      cont.className = "mermaid";
      cont.textContent = d.content;
      el.appendChild(cont);

      setTimeout(() => {
        try {
          mermaid.init(undefined, el.querySelectorAll(".mermaid"));
        } catch (e) {}
      }, 10);
    } else {
      const img = document.createElement("img");
      img.style.maxWidth = "100%";
      img.alt = d.title;

      if (d.fileId && db) {
        loadFileFromDB(d.fileId)
          .then((dataUrl) => {
            if (dataUrl) img.src = dataUrl;
            else if (d.content) img.src = d.content;
            else img.alt = "Imagen no disponible";
          })
          .catch((err) => {
            console.error("Error cargando imagen desde DB:", err);
            if (d.content) img.src = d.content;
            else img.alt = "Imagen no disponible";
          });
      } else if (d.content) {
        img.src = d.content;
      } else {
        img.alt = "Imagen no disponible";
      }

      el.appendChild(img);
    }

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "8px";

    const btnView = document.createElement("button");
    btnView.textContent = "Abrir";
    btnView.onclick = () => openModalForDiagram(d);

    const btnDel = document.createElement("button");
    btnDel.textContent = "Eliminar";
    btnDel.onclick = () => {
      if (confirm("¿Eliminar diagrama?")) deleteDiagramById(d.id);
    };

    actions.appendChild(btnView);
    actions.appendChild(btnDel);
    el.appendChild(actions);

    diagramsList.appendChild(el);
  });
}

function openModalForDiagram(d) {
  if (d.type === "mermaid") {
    modalContent.innerHTML = `<div class="mermaid">${d.content}</div>`;

    try {
      mermaid.init(undefined, modalContent.querySelectorAll(".mermaid"));
    } catch (e) {}

    modal.classList.remove("hidden");
    return;
  }

  if (d.fileId && db) {
    loadFileFromDB(d.fileId)
      .then((dataUrl) => {
        if (dataUrl) {
          modalContent.innerHTML = `
            <img src="${dataUrl}" style="max-width:100%;height:auto" />
          `;
        } else if (d.content) {
          modalContent.innerHTML = `
            <img src="${d.content}" style="max-width:100%;height:auto" />
          `;
        } else {
          modalContent.innerHTML = `<p>Imagen no encontrada.</p>`;
        }
        modal.classList.remove("hidden");
      })
      .catch((err) => {
        console.error("Error cargando imagen en modal:", err);
        if (d.content) {
          modalContent.innerHTML = `
            <img src="${d.content}" style="max-width:100%;height:auto" />
          `;
        } else {
          modalContent.innerHTML = `<p>Error al cargar la imagen.</p>`;
        }
        modal.classList.remove("hidden");
      });
  } else if (d.content) {
    modalContent.innerHTML = `
      <img src="${d.content}" style="max-width:100%;height:auto" />
    `;
    modal.classList.remove("hidden");
  } else {
    modalContent.innerHTML = `<p>Imagen no disponible</p>`;
    modal.classList.remove("hidden");
  }
}

function deleteDiagramById(id) {
  const removeFile = (fileId) => {
    if (fileId && db) {
      deleteFileFromDB(fileId).catch((err) => {
        console.warn("No se pudo eliminar archivo del diagrama en DB:", err);
      });
    }
  };

  if (appState.currentSubchapter) {
    const ch = appState.chapters.find((c) => c.id === appState.currentChapter);
    const sub = ch.subchapters.find((s) => s.id === appState.currentSubchapter);

    const toDelete = sub.diagrams.find((x) => x.id === id);
    if (toDelete && toDelete.fileId) removeFile(toDelete.fileId);

    sub.diagrams = sub.diagrams.filter((x) => x.id !== id);
  } else {
    const ch = appState.chapters.find((c) => c.id === appState.currentChapter);

    const toDelete = ch.diagrams.find((x) => x.id === id);
    if (toDelete && toDelete.fileId) removeFile(toDelete.fileId);

    ch.diagrams = ch.diagrams.filter((x) => x.id !== id);
  }

  saveAppState();
  renderCurrentDiagrams();
}

/* === FIN PARTE 3 ===  
   Cuando estés lista pega la PARTE 4 (Documentos).
*/
/* ===========================
   app.js — PARTE 4 de 5
   (Documentos — creación, guardado, render, apertura, eliminación)
   =========================== */

let editingDocumentId = null;

function showDocumentEditor() {
  if (!appState.currentChapter)
    return alert("Selecciona un capítulo o subcapítulo");

  documentEditor.classList.remove("hidden");
  diagramEditor.classList.add("hidden");

  editingDocumentId = null;

  documentTitle.value = "";
  documentDescription.value = "";
  documentDate.valueAsDate = new Date();

  documentFile.value = "";
  documentFileName.textContent = "Ningún archivo seleccionado";
}

documentFile.addEventListener("change", () => {
  if (documentFile.files && documentFile.files.length) {
    documentFileName.textContent = documentFile.files[0].name;
  }
});

function saveDocument() {
  const title = documentTitle.value.trim();
  const desc = documentDescription.value.trim();
  const date = documentDate.value;

  if (!title) return alert("Ingresa título");
  if (!documentFile.files.length && !editingDocumentId)
    return alert("Selecciona archivo");

  // NEW OR REPLACED FILE
  if (documentFile.files.length) {
    const file = documentFile.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
      const base64 = e.target.result;
      const id = editingDocumentId || generateId();

      const doc = {
        id,
        title,
        description: desc,
        date,
        type: file.type,
        fileId: id,
        fileName: file.name,
      };

      if (db) {
        saveFileToDB(doc.fileId, base64)
          .then(() => finishSavingDocument(doc))
          .catch((err) => {
            console.error("Error guardando documento en DB:", err);
            doc.content = base64;
            finishSavingDocument(doc);
          });
      } else {
        doc.content = base64;
        finishSavingDocument(doc);
      }
    };

    reader.readAsDataURL(file);
    return;
  }

  // EDITING WITHOUT CHANGING THE FILE
  const doc = {
    id: editingDocumentId,
    title,
    description: desc,
    date,
  };

  finishSavingDocument(doc);
}

function finishSavingDocument(doc) {
  // Chapter or Subchapter?
  let target;

  if (appState.currentSubchapter) {
    const ch = appState.chapters.find((c) => c.id === appState.currentChapter);
    target = ch.subchapters.find((s) => s.id === appState.currentSubchapter);
  } else {
    target = appState.chapters.find((c) => c.id === appState.currentChapter);
  }

  if (!target.documents) target.documents = [];

  if (editingDocumentId) {
    const idx = target.documents.findIndex((d) => d.id === doc.id);
    if (idx >= 0) {
      // UPDATE PARTIAL PROPERTIES
      target.documents[idx] = {
        ...target.documents[idx],
        ...doc,
      };
    }
  } else {
    target.documents.push(doc);
  }

  documentEditor.classList.add("hidden");
  renderCurrentDocuments();
  saveAppState();
}

function renderCurrentDocuments() {
  let docs = [];

  if (appState.currentSubchapter) {
    const ch = appState.chapters.find((c) => c.id === appState.currentChapter);
    const sub = ch.subchapters.find((s) => s.id === appState.currentSubchapter);
    docs = sub?.documents || [];
  } else if (appState.currentChapter) {
    const ch = appState.chapters.find((c) => c.id === appState.currentChapter);
    docs = ch?.documents || [];
  }

  renderDocuments(docs);
}

function renderDocuments(docs) {
  if (!docs || docs.length === 0) {
    documentsList.innerHTML = `<div class="card">No hay documentos</div>`;
    return;
  }

  documentsList.innerHTML = "";

  docs.forEach((d) => {
    const el = document.createElement("div");
    el.className = "card";

    el.innerHTML = `
      <div class="title">${d.title}</div>
      <div class="meta">${d.description || ""}</div>
      <div class="meta">Fecha: ${formatDate(d.date)}</div>
      <div class="meta">Archivo: ${d.fileName || "(sin nombre)"}</div>
    `;

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "8px";
    actions.style.marginTop = "8px";

    // VIEW BUTTON
    const btnView = document.createElement("button");
    btnView.textContent = "Abrir";
    btnView.onclick = () => openDocument(d);

    // DELETE BUTTON
    const btnDel = document.createElement("button");
    btnDel.textContent = "Eliminar";
    btnDel.onclick = () => {
      if (confirm("¿Eliminar documento?")) deleteDocumentById(d.id);
    };

    actions.appendChild(btnView);
    actions.appendChild(btnDel);

    el.appendChild(actions);
    documentsList.appendChild(el);
  });
}

function openDocument(d) {
  function show(dataUrl) {
    if (!dataUrl) {
      modalContent.innerHTML = `<p>Archivo no encontrado</p>`;
      modal.classList.remove("hidden");
      return;
    }

    if (d.type?.includes("pdf")) {
      renderPDFInModal(dataUrl);
      return;
    }

    // IMAGE OR UNKNOWN → just open in modal
    modalContent.innerHTML = `
      <iframe src="${dataUrl}" style="width:100%;height:80vh;border:none"></iframe>
    `;
    modal.classList.remove("hidden");
  }

  if (d.fileId && db) {
    loadFileFromDB(d.fileId)
      .then((dataUrl) => show(dataUrl || d.content))
      .catch(() => show(d.content));
  } else {
    show(d.content);
  }
}

function renderPDFInModal(base64) {
  modalContent.innerHTML = "";

  const container = document.createElement("div");
  container.style.height = "80vh";
  container.style.overflow = "auto";
  modalContent.appendChild(container);

  try {
    const loadingTask = pdfjsLib.getDocument({ data: atob(base64.split(",")[1]) });

    loadingTask.promise.then(async function (pdf) {
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        container.appendChild(canvas);

        await page.render({ canvasContext: context, viewport }).promise;
      }
    });
  } catch (e) {
    modalContent.innerHTML = `<p>Error al mostrar PDF</p>`;
  }

  modal.classList.remove("hidden");
}

function deleteDocumentById(id) {
  let target, doc;

  if (appState.currentSubchapter) {
    const ch = appState.chapters.find((c) => c.id === appState.currentChapter);
    target = ch.subchapters.find((s) => s.id === appState.currentSubchapter);
  } else {
    target = appState.chapters.find((c) => c.id === appState.currentChapter);
  }

  doc = (target.documents || []).find((d) => d.id === id);

  if (doc?.fileId && db) {
    deleteFileFromDB(doc.fileId).catch((err) =>
      console.warn("No se pudo borrar archivo en DB:", err)
    );
  }

  target.documents = target.documents.filter((d) => d.id !== id);

  saveAppState();
  renderCurrentDocuments();
}

/* === FIN PARTE 4 ===  
   Ahora sigue la PARTE 5 (modal + botones finales).
*/
/* ===========================
   app.js — PARTE 5 de 5
   (Modal + botones finales + reset)
   =========================== */

// Cerrar modal
modalClose.addEventListener("click", () => {
  modal.classList.add("hidden");
});

modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.add("hidden");
  }
});

/* ===========================
   BOTONES DE GUARDAR / CARGAR / RESETEAR
   =========================== */

saveBtn.addEventListener("click", () => {
  saveAppState();
  alert("Proyecto guardado correctamente.");
});

loadBtn.addEventListener("click", () => {
  loadAppState();
  renderChapters();
  if (appState.currentChapter) selectChapter(appState.currentChapter);
  alert("Proyecto cargado.");
});

resetBtn.addEventListener("click", () => {
  if (!confirm("¿Seguro que deseas reiniciar todo?")) return;

  // Borrar localStorage
  localStorage.removeItem("pmbokEditor");

  // Borrar archivos en IndexedDB
  if (db) {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").clear();
  }

  // Volver al estado inicial
  createInitialChapters();
  saveAppState();
  renderChapters();
  selectChapter(appState.chapters[0].id);
  alert("Reiniciado.");
});

/* ===========================
   FIN DE app.js COMPLETO
   =========================== */
