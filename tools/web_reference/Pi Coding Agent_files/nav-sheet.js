(() => {
  const nav = document.querySelector("[data-nav-root]");
  const toggle = nav?.querySelector("[data-nav-toggle]");
  const sheet = nav?.querySelector("[data-nav-sheet]");
  const backdrop = nav?.querySelector("[data-nav-backdrop]");
  const mobileNav = matchMedia("(max-width: 1023px)");
  const body = document.body;

  if (!nav || !toggle || !sheet || !backdrop) return;

  const getViewportHeight = () => window.visualViewport?.height ?? window.innerHeight;
  let lockedScrollY = 0;
  let scrollLocked = false;

  const lockPageScroll = () => {
    if (scrollLocked) return;

    lockedScrollY = window.scrollY;
    scrollLocked = true;
    body.setAttribute("data-nav-locked", "true");
    body.style.position = "fixed";
    body.style.top = `-${lockedScrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
  };

  const unlockPageScroll = () => {
    if (!scrollLocked) return;

    scrollLocked = false;
    body.removeAttribute("data-nav-locked");
    body.style.position = "";
    body.style.top = "";
    body.style.left = "";
    body.style.right = "";
    body.style.width = "";
    window.scrollTo(0, lockedScrollY);
  };

  const syncSheetHeight = () => {
    const navBottom = nav.getBoundingClientRect().bottom;
    const availableHeight = Math.max(0, getViewportHeight() - navBottom);

    nav.style.setProperty("--nav-sheet-offset-top", `${navBottom}px`);
    nav.style.setProperty("--nav-sheet-available-height", `${availableHeight}px`);
  };

  const setOpen = (open) => {
    syncSheetHeight();
    nav.setAttribute("data-nav-open", String(open));
    sheet.setAttribute("data-open", String(open));
    toggle.setAttribute("data-open", String(open));
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    sheet.setAttribute("aria-hidden", String(!open));

    if (open) {
      lockPageScroll();
      sheet.removeAttribute("inert");
      return;
    }

    unlockPageScroll();
    sheet.setAttribute("inert", "");
  };

  const close = () => setOpen(false);

  let cleanup = null;

  const handleToggleClick = () => {
    setOpen(nav.getAttribute("data-nav-open") !== "true");
  };

  const handleSheetClick = (event) => {
    if (event.target instanceof Element && event.target.closest("a")) {
      close();
    }
  };

  const handleBackdropClick = () => {
    close();
  };

  const handleDocumentKeyDown = (event) => {
    if (event.key === "Escape") {
      close();
    }
  };

  const init = () => {
    if (cleanup) return;

    toggle.addEventListener("click", handleToggleClick);
    sheet.addEventListener("click", handleSheetClick);
    backdrop.addEventListener("click", handleBackdropClick);
    document.addEventListener("keydown", handleDocumentKeyDown);
    window.addEventListener("resize", syncSheetHeight);
    window.visualViewport?.addEventListener("resize", syncSheetHeight);

    close();

    cleanup = () => {
      close();
      toggle.removeEventListener("click", handleToggleClick);
      sheet.removeEventListener("click", handleSheetClick);
      backdrop.removeEventListener("click", handleBackdropClick);
      document.removeEventListener("keydown", handleDocumentKeyDown);
      window.removeEventListener("resize", syncSheetHeight);
      window.visualViewport?.removeEventListener("resize", syncSheetHeight);
      cleanup = null;
    };
  };

  const sync = () => {
    if (mobileNav.matches) {
      init();
      return;
    }

    cleanup?.();
  };

  if (typeof mobileNav.addEventListener === "function") {
    mobileNav.addEventListener("change", sync);
  } else {
    mobileNav.addListener(sync);
  }

  sync();
})();
