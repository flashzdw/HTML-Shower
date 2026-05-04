document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const input = document.getElementById("html-input");
  const previewButton = document.getElementById("preview-button");
  const clearButton = document.getElementById("clear-button");
  const previewClearButton = document.getElementById("preview-clear-button");
  const fullscreenButton = document.getElementById("fullscreen-button");
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

  const exitFullscreenPreview = () => {
    body.setAttribute("data-preview-mode", "default");
    fullscreenButton.textContent = "全屏";
  };

  const enterFullscreenPreview = () => {
    body.setAttribute("data-preview-mode", "fullscreen");
    fullscreenButton.textContent = "退出全屏";
  };

  const toggleFullscreenPreview = () => {
    if (body.getAttribute("data-preview-mode") === "fullscreen") {
      exitFullscreenPreview();
      return;
    }

    enterFullscreenPreview();
  };

  const showEditor = () => {
    body.setAttribute("data-view", "editor");
    exitFullscreenPreview();
    input.focus();
  };

  const showPreview = () => {
    body.setAttribute("data-view", "preview");
    if (!body.getAttribute("data-preview-mode")) {
      body.setAttribute("data-preview-mode", "default");
    }
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
  fullscreenButton.addEventListener("click", toggleFullscreenPreview);

  backButton.addEventListener("click", showEditor);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      exitFullscreenPreview();
    }
  });

  previewFrame.srcdoc = emptyDoc;
  body.setAttribute("data-preview-mode", "default");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("service worker register failed", error);
    });
  });
}
