(() => {
  if (!matchMedia("(pointer: fine)").matches) return;

  const NAV_HOVER_STORAGE_KEY = "pi:sticky-nav-hovered-at";
  const stickyNav = document.getElementById("stickyNav");

  if (stickyNav) {
    let navigationStartedFromNav = false;
    const markStickyNavHover = () => {
      sessionStorage.setItem(NAV_HOVER_STORAGE_KEY, String(Date.now()));
    };
    const markStickyNavNavigation = () => {
      navigationStartedFromNav = true;
      markStickyNavHover();
    };
    const clearStickyNavHover = () => {
      sessionStorage.removeItem(NAV_HOVER_STORAGE_KEY);
    };

    stickyNav.addEventListener("pointerenter", markStickyNavHover);
    stickyNav.addEventListener("pointerdown", (event) => {
      if (event.target.closest("a")) {
        markStickyNavNavigation();
      }
    });
    stickyNav.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        markStickyNavNavigation();
      }
    });
    stickyNav.addEventListener("pointerleave", () => {
      if (!navigationStartedFromNav) {
        clearStickyNavHover();
      }
    });

    if (stickyNav.matches(":hover")) {
      markStickyNavHover();
    } else {
      clearStickyNavHover();
    }
  }

  const trigger = document.querySelector("[data-logo-context-trigger]");
  const menu = document.querySelector("[data-logo-context-menu]");

  if (!trigger || !menu) return;

  const copyButton = menu.querySelector("[data-logo-context-copy-svg]");
  const downloadLink = menu.querySelector("[data-logo-context-download]");
  const menuLinks = menu.querySelectorAll("a");

  if (!copyButton || !downloadLink) return;

  const logoAssetsByTheme = {
    light: { href: "/logo-on-light.svg", download: "pi-logo-on-light.svg" },
    dark: { href: "/logo-on-dark.svg", download: "pi-logo-on-dark.svg" },
  };

  let copyTimer;
  const copyLabel = copyButton.textContent.trim();

  function syncLogoAsset() {
    const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const asset = logoAssetsByTheme[theme];

    downloadLink.href = asset.href;
    downloadLink.download = asset.download;
  }

  function resetCopyState() {
    copyButton.textContent = copyLabel;
    copyButton.classList.remove("is-copied");
    clearTimeout(copyTimer);
  }

  function closeMenu() {
    menu.hidden = true;
    resetCopyState();
  }

  function openMenu(clientX, clientY) {
    resetCopyState();
    syncLogoAsset();
    menu.hidden = false;

    const { width, height } = menu.getBoundingClientRect();
    const gutter = 8;
    const left = Math.min(clientX, window.innerWidth - width - gutter);
    const top = Math.min(clientY, window.innerHeight - height - gutter);

    menu.style.left = `${Math.max(gutter, left)}px`;
    menu.style.top = `${Math.max(gutter, top)}px`;
  }

  trigger.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    openMenu(event.clientX, event.clientY);
  });

  copyButton.addEventListener("click", async () => {
    if (!navigator.clipboard?.writeText) return;

    const response = await fetch(downloadLink.href);
    const svg = await response.text();

    await navigator.clipboard.writeText(svg);

    copyButton.textContent = "Copied";
    copyButton.classList.remove("is-copied");
    void copyButton.offsetWidth;
    copyButton.classList.add("is-copied");

    clearTimeout(copyTimer);
    copyTimer = setTimeout(resetCopyState, 900);
  });

  menuLinks.forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("pointerdown", (event) => {
    if (menu.hidden || menu.contains(event.target) || trigger.contains(event.target)) return;
    closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  window.addEventListener("scroll", closeMenu, { passive: true });
  window.addEventListener("resize", closeMenu);
})();
