document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const input = document.getElementById("html-input");
  const previewButton = document.getElementById("preview-button");
  const clearButton = document.getElementById("clear-button");
  const previewClearButton = document.getElementById("preview-clear-button");
  const backButton = document.getElementById("back-button");
  const previewFrame = document.getElementById("preview-frame");

  const emptyDoc = `
    <!doctype html>
    <html lang="zh-CN">
      <body>
        <p>请先粘贴 HTML 内容。</p>
      </body>
    </html>
  `;

  const showEditor = () => {
    body.setAttribute("data-view", "editor");
    input.focus();
  };

  const showPreview = () => {
    body.setAttribute("data-view", "preview");
  };

  const renderPreview = () => {
    previewFrame.srcdoc = input.value.trim() || emptyDoc;
    showPreview();
  };

  previewButton.addEventListener("click", renderPreview);

  const clearPreview = () => {
    input.value = "";
    previewFrame.srcdoc = emptyDoc;
    showEditor();
  };

  clearButton.addEventListener("click", clearPreview);
  previewClearButton.addEventListener("click", clearPreview);

  backButton.addEventListener("click", showEditor);

  previewFrame.srcdoc = emptyDoc;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("service worker register failed", error);
    });
  });
}
