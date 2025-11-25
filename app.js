function attachDocumentToState(doc) {

  if (appState.currentSubchapter) {
    const ch = appState.chapters.find(
      (c) => c.id === appState.currentChapter
    );
    const sub = ch.subchapters.find(
      (s) => s.id === appState.currentSubchapter
    );

    if (!sub.documents) sub.documents = [];

    if (editingDocId) {
      const idx = sub.documents.findIndex((x) => x.id === editingDocId);
      if (idx >= 0) sub.documents[idx] = doc;
    } else {
      sub.documents.push(doc);
    }

  } else {

    const ch = appState.chapters.find(
      (c) => c.id === appState.currentChapter
    );

    if (!ch.documents) ch.documents = [];

    if (editingDocId) {
      const idx = ch.documents.findIndex((x) => x.id === editingDocId);
      if (idx >= 0) ch.documents[idx] = doc;
    } else {
      ch.documents.push(doc);
    }
  }

  // ⭐⭐ ESTA LÍNEA ERA LA QUE FALTABA ⭐⭐
  saveAppState();
}
