(() => {
  const copyTimers = new WeakMap();

  function getCopyText(el) {
    if (el.dataset.copyFrom) {
      return document.querySelector(el.dataset.copyFrom)?.textContent?.trim() || "";
    }
    return el.dataset.copyText ?? "";
  }

  document.addEventListener("click", async (event) => {
    const el = event.target.closest("[data-copy]");
    if (!el || !navigator.clipboard?.writeText) return;

    const text = getCopyText(el);
    if (!text) return;

    const originalLabel = el.dataset.copyLabel || el.textContent || "";
    const flashClass = el.dataset.copyFlashClass || "is-copied";
    const flashText = el.dataset.copyFlashText;

    await navigator.clipboard.writeText(text);

    if (flashText) {
      el.textContent = flashText;
    }
    el.classList.remove(flashClass);
    void el.offsetWidth;
    el.classList.add(flashClass);

    clearTimeout(copyTimers.get(el));
    copyTimers.set(
      el,
      setTimeout(() => {
        if (flashText) {
          el.textContent = originalLabel;
        }
        el.classList.remove(flashClass);
        copyTimers.delete(el);
      }, 1600),
    );
  });
})();
