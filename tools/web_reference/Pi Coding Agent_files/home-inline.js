(function () {
  const HOME_INTRO_STATE = {
    staged: "staged",
    headline: "headline",
    collapsing: "collapsing",
    full: "full",
  };
  const HOME_INTRO_TIMING = {
    headingLeadIn: 2200,
    heroLiftSettle: 1180,
    terminalReveal: 220,
    navReveal: 400,
    introMaxWait: 10000,
  };
  const HOME_INTRO_NAV_REVEAL_MARGIN = 20;
  const HOME_NAV_HOVER_STORAGE_KEY = "pi:sticky-nav-hovered-at";
  const HOME_NAV_HOVER_INTENT_MAX_AGE = 5000;
  const DEMO_FADE_MS = 180;
  const DEMO_CAPTION_SLIDE_MS = 220;
  const INLINE_DEMO_VISIBILITY_THRESHOLD = 0.18;
  const INTRO_TERMINAL_BREAKPOINT = 768;
  const INLINE_DEMO_BREAKPOINT = 1023;
  const MOBILE_DEMO_BREAKPOINT = 900;
  const HOME_INTRO_SCROLL_RANGES = {
    mobile: 220,
    tablet: 260,
    desktop: 300,
  };
  /*
   * Story thresholds are intentionally split by concern:
   * - active* ratios drive visual emphasis / section switching
   * - release* ratios drive when the sticky story rail may hand off to page scroll
   * Ratios are measured from the top of the terminal frame or title block.
   */
  const HOME_STORY_LINES = {
    inlineViewportRatio: 0.62,
    activeFrameRatio: 0.7,
    releaseFrameRatio: 0.2,
    activeTitleRatio: 0.5,
    releaseTitleRatio: 0,
  };

  const prefersReducedMotion = matchesMedia("(prefers-reduced-motion: reduce)");
  const mediaQueries = {
    inlineDemo: createMediaQuery(`(max-width: ${INLINE_DEMO_BREAKPOINT}px)`),
    mobileDemo: createMediaQuery(`(max-width: ${MOBILE_DEMO_BREAKPOINT}px)`),
  };

  initInstallSwitcher();
  initDoomUnlock(prefersReducedMotion);

  const elements = getHomeElements();
  const homeState = {
    terminalUnlocked: !elements.homeShell,
  };

  const logo = createHeroLogoController({
    heroLogoStage: elements.heroLogoStage,
    heroLogo: elements.heroLogo,
    reduceMotion: prefersReducedMotion,
  });
  const demoController = createDemoController({
    elements,
    homeState,
    mediaQueries,
    prefersReducedMotion,
  });
  const introController = createHomeIntroController({
    elements,
    homeState,
    logo,
    prefersReducedMotion,
    isInlineHomeLayoutActive: demoController.isInlineHomeLayoutActive,
    onTerminalReveal: demoController.handleTerminalReveal,
  });

  demoController.initialize();
  bindHomePageEvents({
    elements,
    mediaQueries,
    introController,
    demoController,
  });

  if (elements.homeShell) {
    introController.start();
  }

  function matchesMedia(query) {
    return !!(window.matchMedia && window.matchMedia(query).matches);
  }

  function createMediaQuery(query) {
    return window.matchMedia ? window.matchMedia(query) : null;
  }

  function bindMediaQueryChange(mediaQuery, handler) {
    if (!mediaQuery) {
      return;
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler);
      return;
    }

    if (mediaQuery.addListener) {
      mediaQuery.addListener(handler);
    }
  }

  function afterNextPaint(callback) {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(callback);
    });
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  function createTimerQueue() {
    let timers = [];

    return {
      set: function (delay, callback) {
        const timer = window.setTimeout(callback, delay);
        timers.push(timer);
        return timer;
      },
      clear: function () {
        for (let i = 0; i < timers.length; i++) {
          window.clearTimeout(timers[i]);
        }
        timers = [];
      },
    };
  }

  function consumeStickyNavHoverIntent() {
    const hoveredAt = Number(sessionStorage.getItem(HOME_NAV_HOVER_STORAGE_KEY));
    sessionStorage.removeItem(HOME_NAV_HOVER_STORAGE_KEY);
    return hoveredAt > 0 && Date.now() - hoveredAt <= HOME_NAV_HOVER_INTENT_MAX_AGE;
  }

  function resetCaptionNode(node) {
    if (!node) {
      return;
    }

    node.hidden = true;
    node.classList.remove("has-content");
    node.classList.remove("is-visible");
    node.removeAttribute("data-caption-demo");
    node.removeAttribute("data-caption-kind");
    node.replaceChildren();
  }

  function mountCaptionNode(node, template) {
    node.replaceChildren(template.content.cloneNode(true));
    node.hidden = false;
    node.classList.add("has-content");
  }

  function parseCellKey(position) {
    const parts = position.split(":");
    return {
      y: Number(parts[0]),
      x: Number(parts[1]),
    };
  }

  function getHomeElements() {
    const landingStage = document.querySelector(".landing-stage");
    const demoFigure = landingStage ? landingStage.querySelector(".landing-demo-figure") : null;

    return {
      demoRegistry: document.getElementById("demoRegistry"),
      demoMount: document.getElementById("demo"),
      demoCaption: document.getElementById("demoCaption"),
      demoTitle: document.getElementById("demoTitle"),
      landingStage: landingStage,
      demoFrame: landingStage ? landingStage.querySelector(".landing-demo-frame") : null,
      demoFigure: demoFigure,
      demoColumn: demoFigure ? demoFigure.querySelector(".landing-demo-column") : null,
      landingCopy: document.querySelector(".landing-copy"),
      landingSections: document.querySelector(".landing-sections"),
      landingIntroCopy: document.getElementById("landingIntroCopy"),
      homeShell: document.querySelector(".page-shell--home"),
      nav: document.getElementById("stickyNav"),
      stickyNavCurrent: document.getElementById("stickyNavCurrent"),
      crookedResetCallout: document.getElementById("crookedResetCallout"),
      crookedResetButton: document.getElementById("crookedResetButton"),
      heroLogoStage: document.getElementById("heroLogoStage"),
      heroLogo: document.getElementById("heroLogo"),
      demoSections: Array.from(document.querySelectorAll(".section")),
      scrollFadeItems: Array.from(document.querySelectorAll(".home-scroll-fade-item")),
      vfadeMaskNodes: Array.from(document.querySelectorAll(".home-callout--viewport-mask")),
      inlineDemoSlots: Array.from(
        document.querySelectorAll(".section-demo-slot[data-inline-demo]"),
      ),
    };
  }

  function getDefaultInstallMethod() {
    switch (window.__PI_DEV__.getClientPlatform()) {
      case "windows":
        return "powershell";
      case "macos":
      case "unix":
      case "unknown":
      default:
        return "curl";
    }
  }

  function initInstallSwitcher() {
    const switcher = document.querySelector("[data-install-switcher]");
    if (!switcher) {
      return;
    }

    const tabList = switcher.querySelector(".install-tabs");
    const tabs = Array.from(switcher.querySelectorAll("[data-install-tab]"));
    const panels = Array.from(switcher.querySelectorAll("[data-install-panel]"));
    let activeTab = switcher.querySelector(".install-tab.is-active") || tabs[0] || null;
    let indicatorFrame = 0;

    function syncIndicator() {
      indicatorFrame = 0;

      if (!tabList || !activeTab) {
        return;
      }

      tabList.style.setProperty("--install-indicator-x", `${activeTab.offsetLeft}px`);
      tabList.style.setProperty("--install-indicator-width", `${activeTab.offsetWidth}px`);
      tabList.classList.add("has-active-indicator");
    }

    function scheduleIndicatorSync() {
      if (indicatorFrame) {
        window.cancelAnimationFrame(indicatorFrame);
      }

      indicatorFrame = window.requestAnimationFrame(syncIndicator);
    }

    function setActiveMethod(method, nextActiveTab) {
      activeTab = nextActiveTab;

      tabs.forEach(function (tab) {
        const isActive = tab === activeTab;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", isActive ? "true" : "false");
      });

      panels.forEach(function (panel) {
        panel.hidden = panel.dataset.installPanel !== method;
      });

      scheduleIndicatorSync();
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        setActiveMethod(tab.dataset.installTab, tab);
      });
    });

    const defaultMethod = getDefaultInstallMethod();
    const defaultTab = tabs.find(function (tab) {
      return tab.dataset.installTab === defaultMethod;
    });
    if (defaultTab) {
      setActiveMethod(defaultMethod, defaultTab);
    } else {
      scheduleIndicatorSync();
    }

    window.addEventListener("resize", scheduleIndicatorSync);

    if (document.fonts) {
      document.fonts.ready.then(scheduleIndicatorSync);
    }
  }

  function initDoomUnlock(reduceMotion) {
    const unlockLink = document.getElementById("doomUnlockLink");
    const unlockPanel = document.getElementById("doomUnlockPanel");

    if (!unlockLink || !unlockPanel) {
      return;
    }

    unlockLink.addEventListener("click", function (event) {
      event.preventDefault();
      unlockPanel.classList.remove("is-revealed");
      unlockPanel.hidden = false;
      unlockLink.hidden = true;

      if (reduceMotion) {
        unlockPanel.classList.add("is-revealed");
        return;
      }

      void unlockPanel.offsetWidth;
      unlockPanel.classList.add("is-revealed");
    });
  }

  function createHomeIntroController(options) {
    const elements = options.elements;
    const homeShell = elements.homeShell;
    const landingIntroCopy = elements.landingIntroCopy;
    const landingStage = elements.landingStage;
    const demoFigure = elements.demoFigure;
    const nav = elements.nav;
    const homeState = options.homeState;
    const logo = options.logo;
    const isInlineHomeLayoutActive = options.isInlineHomeLayoutActive;
    const onTerminalReveal = options.onTerminalReveal;
    const timers = createTimerQueue();
    const hadBootNavReveal = document.documentElement.classList.contains(
      "is-home-nav-visible-at-load",
    );
    const revealNavOnStart = consumeStickyNavHoverIntent() || hadBootNavReveal;

    function getState() {
      return document.documentElement.getAttribute("data-intro");
    }

    function setState(state) {
      if (state) {
        document.documentElement.setAttribute("data-intro", state);
        return;
      }

      document.documentElement.removeAttribute("data-intro");
    }

    function setSkipMode(enabled) {
      document.documentElement.classList.toggle("is-intro-skip", enabled);
    }

    function suppressNav() {
      if (!nav) {
        return;
      }

      nav.setAttribute("aria-hidden", "true");
      nav.setAttribute("inert", "");
    }

    function revealNav() {
      if (!nav) {
        return;
      }

      nav.removeAttribute("aria-hidden");
      nav.removeAttribute("inert");
    }

    function isIntroLoading() {
      const state = getState();
      return (
        state === HOME_INTRO_STATE.staged ||
        state === HOME_INTRO_STATE.headline ||
        state === HOME_INTRO_STATE.collapsing
      );
    }

    function revealNavEarly() {
      if (!nav || !isIntroLoading()) {
        return;
      }

      document.documentElement.classList.add("is-home-nav-revealed-early");
      revealNav();
    }

    function handleNavPointerMove(event) {
      if (!nav || !isIntroLoading()) {
        return;
      }

      const rect = nav.getBoundingClientRect();
      const zoneBottom = Math.max(rect.bottom, nav.offsetHeight) + HOME_INTRO_NAV_REVEAL_MARGIN;

      if (event.clientY <= zoneBottom) {
        revealNavEarly();
      }
    }

    function getScrollRange() {
      if (window.innerWidth <= 767) {
        return HOME_INTRO_SCROLL_RANGES.mobile;
      }
      if (window.innerWidth <= 1023) {
        return HOME_INTRO_SCROLL_RANGES.tablet;
      }
      return HOME_INTRO_SCROLL_RANGES.desktop;
    }

    function setProgress(progress, sectionsRevealProgress) {
      if (!homeShell) {
        return;
      }

      homeShell.style.setProperty("--home-intro-scroll-progress", progress.toFixed(4));
      homeShell.style.setProperty(
        "--home-sections-reveal-progress",
        sectionsRevealProgress.toFixed(4),
      );
      homeShell.classList.toggle("is-home-sections-visible", sectionsRevealProgress > 0.001);
    }

    function updateScrollProgress() {
      if (!homeShell) {
        return;
      }

      const progress = clamp(window.scrollY / getScrollRange(), 0, 1);
      const sectionsRevealProgress = isInlineHomeLayoutActive()
        ? 1
        : clamp((progress - 0.8) / 0.2, 0, 1);

      setProgress(progress, sectionsRevealProgress);
    }

    function updateGeometry() {
      if (!homeShell || !landingIntroCopy || !landingStage || !demoFigure) {
        return;
      }

      const viewportCenterX = window.innerWidth / 2;
      const navHeight = nav ? nav.getBoundingClientRect().height : 0;
      const availableViewportTop = navHeight;
      const availableViewportHeight = Math.max(0, window.innerHeight - navHeight);
      const viewportCenterY = availableViewportTop + availableViewportHeight / 2;
      const stageRect = landingStage.getBoundingClientRect();
      const figureRect = demoFigure.getBoundingClientRect();
      const stageCenterX = stageRect.left + stageRect.width / 2;
      const figureHeight = figureRect.height || demoFigure.offsetHeight || 0;
      const centeredStickyTop = Math.max(navHeight, Math.round(viewportCenterY - figureHeight / 2));

      homeShell.style.setProperty(
        "--home-stage-intro-shift-x",
        Math.round(viewportCenterX - stageCenterX) + "px",
      );
      homeShell.style.setProperty("--home-stage-sticky-top-target", centeredStickyTop + "px");
    }

    function isOffscreen() {
      if (!landingIntroCopy) {
        return false;
      }

      const rect = landingIntroCopy.getBoundingClientRect();
      const isVisible = rect.bottom > 0 && rect.top < window.innerHeight;

      if (window.innerWidth <= 1023) {
        return !isVisible;
      }

      return rect.bottom <= 0;
    }

    function isDocumentHidden() {
      return document.visibilityState === "hidden";
    }

    function hasSettledContent() {
      return homeState.terminalUnlocked || getState() === HOME_INTRO_STATE.full;
    }

    function shouldStartInFinalState() {
      return hasSettledContent() || isDocumentHidden() || window.scrollY > 0 || isOffscreen();
    }

    function shouldForceFinalState() {
      return hasSettledContent() || isDocumentHidden() || window.scrollY > 0 || isOffscreen();
    }

    function shouldAnimateIntro() {
      return !shouldStartInFinalState() && logo.canPlayIntro();
    }

    function settleHeroLift() {
      return new Promise(function (resolve) {
        timers.set(HOME_INTRO_TIMING.heroLiftSettle, resolve);
      });
    }

    function armTransitions() {
      afterNextPaint(function () {
        document.documentElement.classList.add("is-intro-armed");
      });
    }

    function revealTerminal() {
      if (!homeShell) {
        return;
      }

      homeState.terminalUnlocked = true;
      updateGeometry();
      updateScrollProgress();
      onTerminalReveal();
    }

    function revealAnimatedIntro() {
      setState(HOME_INTRO_STATE.full);
      timers.set(HOME_INTRO_TIMING.terminalReveal, revealTerminal);
      timers.set(HOME_INTRO_TIMING.navReveal, revealNav);
    }

    function startAnimatedIntro() {
      homeState.terminalUnlocked = false;
      setSkipMode(false);
      document.documentElement.classList.toggle("is-home-nav-revealed-early", revealNavOnStart);
      if (revealNavOnStart) {
        revealNav();
      } else {
        suppressNav();
      }
      setState(HOME_INTRO_STATE.staged);
      armTransitions();

      let introResolved = false;

      function resolveIntro() {
        if (introResolved) {
          return;
        }

        introResolved = true;
        revealAnimatedIntro();
      }

      timers.set(HOME_INTRO_TIMING.headingLeadIn, function () {
        setState(HOME_INTRO_STATE.headline);
        logo
          .playIntro(function () {
            setState(HOME_INTRO_STATE.collapsing);
            return settleHeroLift();
          })
          .then(function (completed) {
            resolveIntro();
          });
      });

      timers.set(HOME_INTRO_TIMING.introMaxWait, resolveIntro);
    }

    function showFinalState() {
      if (!homeShell) {
        return;
      }

      timers.clear();
      logo.cancel();
      setSkipMode(true);
      document.documentElement.classList.add("is-intro-armed");
      setState(HOME_INTRO_STATE.full);
      logo.showStatic();
      revealTerminal();
      revealNav();
    }

    function syncVisibility() {
      if (!homeShell || homeState.terminalUnlocked) {
        return;
      }

      if (shouldForceFinalState()) {
        showFinalState();
      }
    }

    function start() {
      if (!homeShell) {
        return;
      }

      timers.clear();
      updateScrollProgress();

      if (!shouldAnimateIntro()) {
        showFinalState();
        return;
      }

      startAnimatedIntro();
    }

    return {
      updateGeometry: updateGeometry,
      updateScrollProgress: updateScrollProgress,
      syncVisibility: syncVisibility,
      handleNavPointerMove: handleNavPointerMove,
      start: start,
    };
  }

  function createDemoController(options) {
    const elements = options.elements;
    const demoRegistry = elements.demoRegistry;
    const demoMount = elements.demoMount;
    const demoCaption = elements.demoCaption;
    const demoTitle = elements.demoTitle;
    const demoFrame = elements.demoFrame;
    const demoFigure = elements.demoFigure;
    const demoColumn = elements.demoColumn;
    const landingStage = elements.landingStage;
    const demoScrollCue = demoFrame ? demoFrame.querySelector(".landing-demo-scroll-cue") : null;
    const landingCopy = elements.landingCopy;
    const landingSections = elements.landingSections;
    const stickyNavCurrent = elements.stickyNavCurrent;
    const crookedResetCallout = elements.crookedResetCallout;
    const crookedResetButton = elements.crookedResetButton;
    const demoSections = elements.demoSections;
    const scrollFadeItems = elements.scrollFadeItems;
    const vfadeMaskNodes = elements.vfadeMaskNodes;
    const inlineDemoSlots = elements.inlineDemoSlots;
    const homeShell = elements.homeShell;
    const homeState = options.homeState;
    const inlineDemoMediaQuery = options.mediaQueries.inlineDemo;
    const mobileDemoMediaQuery = options.mediaQueries.mobileDemo;
    const prefersReducedMotion = options.prefersReducedMotion;

    if (!demoRegistry) {
      return {
        initialize: function () {},
        isInlineHomeLayoutActive: function () {
          return false;
        },
        handleTerminalReveal: function () {},
        scheduleUpdate: function () {},
        handleResize: function () {},
        refreshInlineDemosForMediaChange: function () {},
        hasSections: function () {
          return false;
        },
      };
    }

    const demoConfigs = readDemoConfigs(demoRegistry);
    const demoParams = new URLSearchParams(window.location.search);
    const forcedDemo = demoParams.get("demo");
    const forceMobileDemo =
      forcedDemo === "mobile" ||
      forcedDemo === "mobileCalendar" ||
      demoParams.get("mobile-demo") === "1";
    const crookedModeSessionKey = "pi:crooked-mode-disabled";

    let isInlineDemoMode = false;
    let currentDemo = null;
    let currentDemoPlayer = null;
    let demoSwapToken = 0;
    let demoUpdateFrame = 0;
    let demoCaptionTimer = 0;
    let demoEndedCaptionTimer = 0;
    let inlineDemoObserver = null;
    let demoEffectTimers = [];

    const inlineDemoPlayers = new Map();
    function hasSections() {
      return demoSections.length > 0;
    }

    function shouldUseMobileDemo() {
      if (forceMobileDemo) {
        return true;
      }
      if (mobileDemoMediaQuery) {
        return mobileDemoMediaQuery.matches;
      }
      return window.innerWidth <= MOBILE_DEMO_BREAKPOINT;
    }

    function getDemoConfig(key) {
      return demoConfigs.get(key);
    }

    function normalizeDemo(input) {
      let key = "default";
      let repeat = true;

      if (typeof input === "string") {
        key = input;
      } else if (input) {
        key = input.key || "default";
        repeat = input.repeat !== false;
      }

      const config = getDemoConfig(key);
      let normalizedKey = config.key;

      if (config.mobileDemo && shouldUseMobileDemo()) {
        normalizedKey = config.mobileDemo;
      }

      return {
        key: normalizedKey,
        repeat: repeat,
      };
    }

    function getDemoId(demo) {
      return demo.key + ":" + (demo.repeat ? "repeat" : "once");
    }

    function getSectionDemoRepeat(section) {
      const value = section.getAttribute("data-demo-repeat");
      return !(value === "false" || value === "0" || value === "no" || value === "off");
    }

    function shouldAnimateDemoSwap() {
      return !prefersReducedMotion && !isInlineDemoMode;
    }

    function isInlineDemoViewport() {
      if (inlineDemoMediaQuery) {
        return inlineDemoMediaQuery.matches;
      }

      return window.innerWidth <= INLINE_DEMO_BREAKPOINT;
    }

    function isInlineHomeLayoutActive() {
      return isInlineDemoViewport() && homeState.terminalUnlocked && window.scrollY > 1;
    }

    function shouldShowMainIntroTerminal() {
      return !homeShell || window.innerWidth >= INTRO_TERMINAL_BREAKPOINT;
    }

    function shouldUseInlineLayout() {
      if (homeShell) {
        return isInlineHomeLayoutActive();
      }

      return isInlineDemoViewport();
    }

    function shouldAutoplayMainDemo() {
      return !homeShell || window.scrollY > 1;
    }

    function syncDemoScrollCue() {
      if (!demoFrame) {
        return;
      }

      const shouldShow =
        !!homeShell &&
        shouldShowMainIntroTerminal() &&
        !isInlineDemoMode &&
        !shouldAutoplayMainDemo();

      demoFrame.classList.toggle("is-scroll-cue-dismissed", !shouldShow);
    }

    function applyDemoFrame(key) {
      if (!demoFrame) {
        return;
      }

      const config = getDemoConfig(key);
      const container =
        demoFigure && demoFigure.parentElement ? demoFigure.parentElement : demoFrame.parentElement;
      let figureInset = 0;

      if (demoFigure && window.getComputedStyle) {
        const figureStyle = window.getComputedStyle(demoFigure);
        const leftInset = parseFloat(figureStyle.paddingLeft || "0");
        const rightInset = parseFloat(figureStyle.paddingRight || "0");
        figureInset =
          (isFinite(leftInset) ? leftInset : 0) + (isFinite(rightInset) ? rightInset : 0);
      }

      const maxWidth = container ? Math.max(container.clientWidth - figureInset, 0) : config.width;
      const widthScale = maxWidth > 0 ? maxWidth / config.width : 1;
      let scale = Math.min(widthScale, 1);

      if (!isFinite(scale) || scale <= 0) {
        scale = 1;
      }

      const frameWidth = Math.round(config.width * scale) + "px";

      if (config.width > 0 && config.aspectRatio) {
        demoFrame.style.setProperty("--demo-aspect", config.aspectRatio);
      }

      if (demoFigure) {
        demoFigure.style.width = frameWidth;
      }

      if (demoColumn) {
        demoColumn.style.width = "100%";
        demoFrame.style.width = "100%";
      } else {
        demoFrame.style.width = frameWidth;
      }

      updateStoryReleaseRunway();
    }

    function disposeDemoPlayer() {
      clearDemoEffects();
      clearDemoEndedCaptionTimer();
      if (currentDemoPlayer && currentDemoPlayer.dispose) {
        currentDemoPlayer.dispose();
      }
      currentDemoPlayer = null;
      if (demoMount) {
        demoMount.replaceChildren();
      }
    }

    function clearDemoCaptionTimer() {
      if (!demoCaptionTimer) {
        return;
      }

      window.clearTimeout(demoCaptionTimer);
      demoCaptionTimer = 0;
    }

    function clearDemoEndedCaptionTimer() {
      if (!demoEndedCaptionTimer) {
        return;
      }

      window.clearTimeout(demoEndedCaptionTimer);
      demoEndedCaptionTimer = 0;
    }

    function getDemoCaptionTemplate(key) {
      return demoRegistry.querySelector(`template[data-demo-caption="${key}"]`);
    }

    function getDemoEndedCaptionTemplate(key) {
      return demoRegistry.querySelector(`template[data-demo-ended-caption="${key}"]`);
    }

    function updateDemoTitle(key) {
      if (demoTitle) {
        demoTitle.textContent = getDemoConfig(key).title;
      }
    }

    function hideDemoCaption(immediate) {
      if (!demoCaption) {
        return;
      }

      clearDemoCaptionTimer();
      demoCaption.classList.remove("is-visible");

      if (immediate) {
        resetCaptionNode(demoCaption);
        return;
      }

      demoCaptionTimer = window.setTimeout(function () {
        if (!demoCaption) {
          return;
        }
        if (!demoCaption.classList.contains("is-visible")) {
          resetCaptionNode(demoCaption);
        }
        demoCaptionTimer = 0;
      }, DEMO_CAPTION_SLIDE_MS);
    }

    function showDemoCaptionTemplate(demo, kind, template, token) {
      if (!demoCaption) {
        return;
      }
      if (!template) {
        hideDemoCaption(true);
        return;
      }

      if (
        demoCaption.getAttribute("data-caption-demo") === demo.key &&
        demoCaption.getAttribute("data-caption-kind") === kind &&
        !demoCaption.hidden &&
        demoCaption.classList.contains("is-visible")
      ) {
        return;
      }

      clearDemoCaptionTimer();
      demoCaption.classList.remove("is-visible");
      mountCaptionNode(demoCaption, template);
      demoCaption.setAttribute("data-caption-demo", demo.key);
      demoCaption.setAttribute("data-caption-kind", kind);

      afterNextPaint(function () {
        if (typeof token === "number" && token !== demoSwapToken) {
          return;
        }
        if (!demoCaption || demoCaption.hidden) {
          return;
        }
        demoCaption.classList.add("is-visible");
      });
    }

    function showDemoCaption(demo, token) {
      showDemoCaptionTemplate(demo, "default", getDemoCaptionTemplate(demo.key), token);
    }

    function showDemoEndedCaption(demo, token) {
      if (typeof token === "number" && token !== demoSwapToken) {
        return;
      }

      clearDemoEndedCaptionTimer();
      showDemoCaptionTemplate(demo, "ended", getDemoEndedCaptionTemplate(demo.key), token);
    }

    function disableDemoSpaceShortcut() {
      if (!demoMount) {
        return;
      }

      const demoWrapper = demoMount.querySelector(".ap-wrapper");
      if (!demoWrapper) {
        return;
      }

      demoWrapper.addEventListener(
        "keydown",
        function (event) {
          if (event.key !== " " && event.code !== "Space") {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          if (event.stopImmediatePropagation) {
            event.stopImmediatePropagation();
          }
        },
        true,
      );
    }

    function attachDemoScrollCue() {
      if (!demoMount || !demoScrollCue) {
        return;
      }

      const demoWrapper = demoMount.querySelector(".ap-wrapper");
      if (!demoWrapper || demoScrollCue.parentElement === demoWrapper) {
        return;
      }

      demoWrapper.appendChild(demoScrollCue);
    }

    function hideCrookedResetCallout() {
      if (!crookedResetCallout) {
        return;
      }

      crookedResetCallout.hidden = true;
      crookedResetCallout.classList.remove("is-visible");
    }

    function showCrookedResetCallout() {
      if (!crookedResetCallout) {
        return;
      }

      crookedResetCallout.hidden = false;
      window.requestAnimationFrame(function () {
        crookedResetCallout.classList.add("is-visible");
      });
    }

    function isCrookedModeDisabled() {
      return window.sessionStorage.getItem(crookedModeSessionKey) === "1";
    }

    function clearDemoEffects() {
      for (let i = 0; i < demoEffectTimers.length; i++) {
        window.clearTimeout(demoEffectTimers[i]);
      }
      demoEffectTimers = [];

      document.documentElement.classList.remove("is-recording-rewired-font");
      document.documentElement.classList.remove("is-recording-rewired-subtitle");
      document.documentElement.classList.remove("is-recording-rewired-style");
      hideCrookedResetCallout();
    }

    function resetCrookedMode() {
      window.sessionStorage.setItem(crookedModeSessionKey, "1");
      clearDemoEffects();
    }

    function scheduleDemoEffect(delay, callback) {
      demoEffectTimers.push(window.setTimeout(callback, delay));
    }

    function scheduleDemoEffects(demo) {
      clearDemoEffects();

      if (!demo || demo.key !== "hello" || isCrookedModeDisabled()) {
        return;
      }

      scheduleDemoEffect(4123, function () {
        if (isCrookedModeDisabled()) {
          return;
        }
        document.documentElement.classList.add("is-recording-rewired-font");
      });

      scheduleDemoEffect(12910, function () {
        if (isCrookedModeDisabled()) {
          return;
        }
        document.documentElement.classList.add("is-recording-rewired-subtitle");
      });

      scheduleDemoEffect(18126, function () {
        if (isCrookedModeDisabled()) {
          return;
        }
        document.documentElement.classList.add("is-recording-rewired-font");
        document.documentElement.classList.add("is-recording-rewired-subtitle");
        document.documentElement.classList.add("is-recording-rewired-style");
        showCrookedResetCallout();
      });
    }

    function syncMainDemoPlayback() {
      if (!currentDemoPlayer) {
        syncDemoScrollCue();
        return;
      }

      if (shouldAutoplayMainDemo()) {
        syncDemoScrollCue();
        currentDemoPlayer.play();
        return;
      }

      currentDemoPlayer.pause();
      clearDemoEffects();
      syncDemoScrollCue();
    }

    function getPlayerOptions(config, playback) {
      return {
        theme:
          document.documentElement.getAttribute("data-theme") === "light"
            ? "solarized-light"
            : config.theme,
        fit: "width",
        idleTimeLimit: 2,
        autoPlay: playback.autoPlay,
        controls: playback.controls,
        loop: playback.loop,
        speed: config.speed || 1,
        terminalFontFamily: "Commit Mono",
        terminalLineHeight: 1.4,
      };
    }

    function mountDemo(demo, token) {
      if (!window.AsciinemaPlayer || !demoMount || !demoFrame) {
        return;
      }

      const config = getDemoConfig(demo.key);
      applyDemoFrame(demo.key);

      const player = window.AsciinemaPlayer.create(
        config.src,
        demoMount,
        getPlayerOptions(config, {
          autoPlay: shouldAutoplayMainDemo(),
          controls: false,
          loop: demo.repeat,
        }),
      );

      currentDemoPlayer = player;
      attachDemoScrollCue();
      disableDemoSpaceShortcut();
      clearDemoEndedCaptionTimer();
      player.addEventListener("play", function () {
        syncDemoScrollCue();
        scheduleDemoEffects(demo);
      });

      if (getDemoEndedCaptionTemplate(demo.key) && demo.repeat === false) {
        player.addEventListener("ended", function () {
          showDemoEndedCaption(demo, token);
        });

        const playbackDurationMs = Math.max(
          1000,
          Math.round(((config.duration || 18) * 1000) / (config.speed || 1)),
        );

        demoEndedCaptionTimer = window.setTimeout(
          function () {
            showDemoEndedCaption(demo, token);
          },
          Math.max(400, playbackDurationMs - 2000),
        );
      }

      player.addEventListener("ready", function () {
        if (token !== demoSwapToken) {
          return;
        }

        attachDemoScrollCue();
        applyDemoFrame(demo.key);
        window.requestAnimationFrame(function () {
          if (token !== demoSwapToken || !demoFrame) {
            return;
          }

          demoFrame.classList.remove("is-empty");
          demoFrame.classList.remove("is-swapping");

          clearDemoCaptionTimer();
          syncMainDemoPlayback();
          if (!shouldAnimateDemoSwap()) {
            showDemoCaption(demo, token);
            return;
          }

          demoCaptionTimer = window.setTimeout(function () {
            if (token !== demoSwapToken) {
              return;
            }
            showDemoCaption(demo, token);
          }, DEMO_FADE_MS + 40);
        });
      });
    }

    function showDemo(input) {
      if (!window.AsciinemaPlayer || !demoMount || !demoFrame) {
        return;
      }

      if (!input || !input.key) {
        updateDemoTitle("default");
        hideDemoCaption(true);
        clearDemoEndedCaptionTimer();
        currentDemo = null;
        demoSwapToken += 1;
        disposeDemoPlayer();
        demoFrame.classList.remove("is-swapping");
        demoFrame.classList.add("is-empty");
        return;
      }

      const nextDemo = normalizeDemo(input);
      updateDemoTitle(nextDemo.key);
      applyDemoFrame(nextDemo.key);

      if (currentDemo && getDemoId(nextDemo) === getDemoId(currentDemo) && currentDemoPlayer) {
        demoFrame.classList.remove("is-empty");
        if (
          !demoCaption ||
          demoCaption.getAttribute("data-caption-demo") !== nextDemo.key ||
          demoCaption.getAttribute("data-caption-kind") !== "ended"
        ) {
          showDemoCaption(nextDemo);
        }
        return;
      }

      currentDemo = nextDemo;
      const token = ++demoSwapToken;
      const animateSwap = shouldAnimateDemoSwap();

      hideDemoCaption(!animateSwap);
      clearDemoEndedCaptionTimer();
      demoFrame.classList.remove("is-empty");
      demoFrame.classList.toggle("is-swapping", animateSwap);

      function swap() {
        if (token !== demoSwapToken) {
          return;
        }

        disposeDemoPlayer();
        mountDemo(nextDemo, token);
      }

      const swapDelay = !currentDemoPlayer || !animateSwap ? 0 : DEMO_FADE_MS;
      const captionDelay = animateSwap ? DEMO_CAPTION_SLIDE_MS : 0;
      const delay = Math.max(swapDelay, captionDelay);

      if (delay <= 0) {
        swap();
        return;
      }

      window.setTimeout(swap, delay);
    }

    function getInlineDemo(slot) {
      const section = slot.closest(".section");
      return normalizeDemo({
        key: slot.getAttribute("data-inline-demo"),
        repeat: getSectionDemoRepeat(section),
      });
    }

    function hideInlineCaption(caption) {
      resetCaptionNode(caption);
    }

    function showInlineCaption(caption, template) {
      mountCaptionNode(caption, template);
      caption.classList.add("is-visible");
    }

    function hidePreparedInlineEndedCaption(caption) {
      caption.hidden = true;
      caption.classList.remove("is-visible");
    }

    function prepareInlineCaption(slot, demo) {
      const caption = slot.querySelector("[data-inline-caption-slot]");
      const template = getDemoCaptionTemplate(demo.key);

      if (!template) {
        hideInlineCaption(caption);
        return;
      }

      showInlineCaption(caption, template);
    }

    function prepareInlineEndedCaption(slot, demo) {
      const caption = slot.querySelector("[data-inline-ended-caption-slot]");
      const template = getDemoEndedCaptionTemplate(demo.key);

      if (!template) {
        hideInlineCaption(caption);
        return null;
      }

      mountCaptionNode(caption, template);
      hidePreparedInlineEndedCaption(caption);
      return caption;
    }

    function revealInlineEndedCaption(caption) {
      caption.hidden = false;
      window.requestAnimationFrame(function () {
        caption.classList.add("is-visible");
      });
    }

    function disposeInlineDemo(slot) {
      const state = inlineDemoPlayers.get(slot);
      if (state) {
        state.player.dispose();
      }
      inlineDemoPlayers.delete(slot);

      const mount = slot.querySelector(".inline-demo-mount");
      const frame = slot.querySelector(".inline-demo-frame");
      mount.replaceChildren();
      frame.classList.add("is-empty");
    }

    function mountInlineDemo(slot) {
      const demo = getInlineDemo(slot);
      const demoId = getDemoId(demo);
      const currentState = inlineDemoPlayers.get(slot);

      if (currentState && currentState.demoId === demoId) {
        return currentState.player;
      }

      if (currentState) {
        disposeInlineDemo(slot);
      }

      const config = getDemoConfig(demo.key);
      const frame = slot.querySelector(".inline-demo-frame");
      const mount = slot.querySelector(".inline-demo-mount");
      const title = slot.querySelector(".figure-caption-title");
      const endedCaption = prepareInlineEndedCaption(slot, demo);

      frame.style.setProperty("--demo-aspect", config.aspectRatio);
      title.textContent = config.title;
      prepareInlineCaption(slot, demo);

      const player = window.AsciinemaPlayer.create(
        config.src,
        mount,
        getPlayerOptions(config, {
          autoPlay: !prefersReducedMotion,
          controls: prefersReducedMotion,
          loop: demo.repeat,
        }),
      );

      inlineDemoPlayers.set(slot, {
        player: player,
        demoId: demoId,
      });

      player.addEventListener("ready", function () {
        frame.classList.remove("is-empty");
      });

      if (endedCaption && demo.repeat === false) {
        player.addEventListener("play", function () {
          hidePreparedInlineEndedCaption(endedCaption);
        });
        player.addEventListener("ended", function () {
          revealInlineEndedCaption(endedCaption);
        });
      }

      return player;
    }

    function playInlineDemo(slot) {
      const player = mountInlineDemo(slot);
      if (!prefersReducedMotion) {
        player.play();
      }
    }

    function pauseInlineDemo(slot) {
      const state = inlineDemoPlayers.get(slot);
      if (state) {
        state.player.pause();
      }
    }

    function disposeInlineDemos() {
      if (inlineDemoObserver) {
        inlineDemoObserver.disconnect();
        inlineDemoObserver = null;
      }

      for (let i = 0; i < inlineDemoSlots.length; i++) {
        const slot = inlineDemoSlots[i];
        disposeInlineDemo(slot);
        hideInlineCaption(slot.querySelector("[data-inline-caption-slot]"));
        hideInlineCaption(slot.querySelector("[data-inline-ended-caption-slot]"));
      }
    }

    function mountInlineDemos() {
      if (inlineDemoObserver) {
        return;
      }

      inlineDemoObserver = new IntersectionObserver(
        function (entries) {
          for (let i = 0; i < entries.length; i++) {
            if (entries[i].intersectionRatio >= INLINE_DEMO_VISIBILITY_THRESHOLD) {
              playInlineDemo(entries[i].target);
            } else {
              pauseInlineDemo(entries[i].target);
            }
          }
        },
        {
          threshold: INLINE_DEMO_VISIBILITY_THRESHOLD,
        },
      );

      for (let i = 0; i < inlineDemoSlots.length; i++) {
        inlineDemoObserver.observe(inlineDemoSlots[i]);
      }
    }

    function setInlineDemoMode(enabled) {
      if (isInlineDemoMode === enabled) {
        return;
      }

      isInlineDemoMode = enabled;
      document.documentElement.classList.toggle("is-inline-demo-mode", enabled);

      if (enabled) {
        currentDemo = null;
        demoSwapToken += 1;
        disposeDemoPlayer();
        if (demoFrame) {
          demoFrame.classList.add("is-empty");
        }
        mountInlineDemos();
        return;
      }

      disposeInlineDemos();
    }

    function updateDemoLayout() {
      setInlineDemoMode(shouldUseInlineLayout());

      if (!shouldShowMainIntroTerminal()) {
        disposeDemoPlayer();
        if (demoFrame) {
          demoFrame.classList.add("is-empty");
        }
        syncDemoScrollCue();
        return;
      }

      if (!isInlineDemoMode) {
        const layoutKey = currentDemo && currentDemo.key ? currentDemo.key : "default";
        applyDemoFrame(layoutKey);
      }

      syncDemoScrollCue();
    }

    function getDefaultDemo() {
      if (!homeShell || !homeState.terminalUnlocked) {
        return null;
      }

      return {
        key: "default",
        repeat: true,
      };
    }

    function getSectionAnchorLine(section, titleRatio) {
      if (!section) {
        return null;
      }

      const anchorNode = section.querySelector(".section-title") || section;

      if (!anchorNode) {
        return null;
      }

      const anchorRect = anchorNode.getBoundingClientRect();

      return anchorRect.top + anchorRect.height * titleRatio;
    }

    function getStoryRailFrame() {
      if (!landingStage || !demoFrame || !demoFigure || !isStoryRailSticky()) {
        return null;
      }

      const stickyTop = parseFloat(getComputedStyle(landingStage).top);
      const stageRect = landingStage.getBoundingClientRect();
      const frameRect = demoFrame.getBoundingClientRect();
      const figureRect = demoFigure.getBoundingClientRect();
      const railHeight = Math.max(stageRect.height, figureRect.height);
      // Resolve the terminal frame to its sticky resting line inside the rail, not its transient
      // viewport position while the container is still scrolling into place.
      const frameTop = stickyTop + (frameRect.top - stageRect.top);

      return {
        bottom: stickyTop + railHeight,
        height: frameRect.height,
        top: frameTop,
      };
    }

    function getStoryLine(frameRatio) {
      if (isInlineDemoMode) {
        return window.innerHeight * HOME_STORY_LINES.inlineViewportRatio;
      }

      const storyRail = getStoryRailFrame();

      if (!storyRail) {
        return window.innerHeight / 2;
      }

      return storyRail.top + storyRail.height * frameRatio;
    }

    function getActiveSectionState() {
      const activationLine = getStoryLine(HOME_STORY_LINES.activeFrameRatio);
      let activeSection = null;
      let firstVisibleSection = null;

      for (let i = 0; i < demoSections.length; i++) {
        const section = demoSections[i];
        const rect = section.getBoundingClientRect();

        if (rect.bottom > 0 && rect.top < window.innerHeight && !firstVisibleSection) {
          firstVisibleSection = section;
        }

        const anchorLine = getSectionAnchorLine(section, HOME_STORY_LINES.activeTitleRatio);

        if (anchorLine === null) {
          continue;
        }

        if (anchorLine <= activationLine) {
          activeSection = section;
          continue;
        }

        if (activeSection) {
          break;
        }
      }

      const section = activeSection || firstVisibleSection;
      const titleNode = section ? section.querySelector(".section-title") : null;
      const demoKey = section ? section.getAttribute("data-demo") : null;

      return {
        section: section,
        title: titleNode ? titleNode.textContent.trim() : "",
        demo: demoKey
          ? {
              key: demoKey,
              repeat: getSectionDemoRepeat(section),
            }
          : getDefaultDemo(),
      };
    }

    function updateVFadeMasks() {
      for (const node of vfadeMaskNodes) {
        const rect = node.getBoundingClientRect();
        node.style.setProperty("--home-callout-mask-position-y", (-rect.top).toFixed(2) + "px");
      }
    }

    function updateScrollFadeItems() {
      if (prefersReducedMotion) {
        for (const item of scrollFadeItems) {
          item.style.removeProperty("--home-scroll-fade-progress");
        }
        return;
      }

      if (!scrollFadeItems.length) {
        return;
      }

      if (document.documentElement.dataset.intro !== "full") {
        return;
      }

      const viewportHeight = window.innerHeight;
      const homeStyles = getComputedStyle(homeShell);
      const fadeStartLine =
        viewportHeight * parseFloat(homeStyles.getPropertyValue("--home-callout-fade-start"));
      const fadeEndLine =
        viewportHeight * parseFloat(homeStyles.getPropertyValue("--home-callout-fade-end"));
      const fadeDistance = fadeStartLine - fadeEndLine;

      for (const item of scrollFadeItems) {
        const rect = item.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const opacity = clamp((fadeStartLine - center) / fadeDistance, 0, 1);
        const progress = opacity.toFixed(3);

        item.style.setProperty("--home-scroll-fade-progress", progress);
      }
    }

    function isStoryRailSticky() {
      return !!(landingStage && getComputedStyle(landingStage).position === "sticky");
    }

    function updateStoryReleaseRunway() {
      if (!homeShell) {
        return;
      }

      const storyRail = getStoryRailFrame();

      if (!landingSections || isInlineDemoMode || !storyRail) {
        homeShell.style.setProperty("--home-story-outro-runway", "0px");
        return;
      }

      /*
       * Sticky release is a layout concern, not a fade concern. We keep a separate release line
       * near the top of the terminal and only add enough trailing space for the last heading to
       * reach that line before the sticky rail releases.
       */
      const releaseLine = getStoryLine(HOME_STORY_LINES.releaseFrameRatio);
      const lastSection = demoSections[demoSections.length - 1];
      let runway = 0;

      if (lastSection) {
        const lastSectionRect = lastSection.getBoundingClientRect();
        const lastTitleLine = getSectionAnchorLine(lastSection, HOME_STORY_LINES.releaseTitleRatio);
        // The rail can only release once the last heading has enough trailing content below it to
        // travel from the sticky rail bottom up to the release line near the top of the terminal.
        const requiredTailDistance = Math.max(0, storyRail.bottom - releaseLine);
        const availableTailDistance =
          lastTitleLine === null ? 0 : Math.max(0, lastSectionRect.bottom - lastTitleLine);

        runway = Math.max(0, requiredTailDistance - availableTailDistance);
      }

      homeShell.style.setProperty("--home-story-outro-runway", runway.toFixed(2) + "px");
    }

    function updateActiveDemo() {
      demoUpdateFrame = 0;
      const activeState = getActiveSectionState();

      updateDemoLayout();
      document.documentElement.classList.toggle("has-scrolled", window.scrollY > 0);
      updateVFadeMasks();
      updateScrollFadeItems();

      if (shouldShowMainIntroTerminal() && !isInlineDemoMode) {
        showDemo(homeState.terminalUnlocked ? activeState.demo : null);
        syncMainDemoPlayback();
      }

      if (stickyNavCurrent) {
        stickyNavCurrent.textContent = activeState.title;
        stickyNavCurrent.setAttribute(
          "aria-label",
          activeState.title ? "Current section: " + activeState.title : "",
        );
      }

      for (let i = 0; i < demoSections.length; i++) {
        demoSections[i].classList.toggle("is-active", demoSections[i] === activeState.section);
      }
    }

    function scheduleUpdate() {
      if (
        (!hasSections() && !scrollFadeItems.length && !vfadeMaskNodes.length) ||
        demoUpdateFrame
      ) {
        return;
      }

      demoUpdateFrame = window.requestAnimationFrame(updateActiveDemo);
    }

    function handleResize() {
      if (
        shouldShowMainIntroTerminal() &&
        !isInlineDemoMode &&
        window.AsciinemaPlayer &&
        demoMount &&
        demoFrame &&
        currentDemo &&
        currentDemo.key
      ) {
        applyDemoFrame(currentDemo.key);
      }

      updateStoryReleaseRunway();
    }

    function refreshInlineDemosForMediaChange() {
      if (!isInlineDemoMode) {
        return;
      }

      disposeInlineDemos();
      mountInlineDemos();
    }

    function handleThemeChange() {
      if (currentDemoPlayer && shouldShowMainIntroTerminal() && !isInlineDemoMode && currentDemo) {
        const nextDemo = currentDemo;
        // Invalidate any older async demo mount still in flight.
        const token = ++demoSwapToken;

        hideDemoCaption(true);
        clearDemoEndedCaptionTimer();
        demoFrame.classList.remove("is-swapping");
        demoFrame.classList.add("is-empty");

        disposeDemoPlayer();
        mountDemo(nextDemo, token);
      }

      refreshInlineDemosForMediaChange();
    }

    function handleTerminalReveal() {
      if (shouldShowMainIntroTerminal() && window.AsciinemaPlayer && demoFrame) {
        demoFrame.classList.add("is-empty");
        applyDemoFrame(currentDemo && currentDemo.key ? currentDemo.key : "default");
      }
      updateStoryReleaseRunway();
      scheduleUpdate();
    }

    function initialize() {
      if (landingCopy && hasSections()) {
        landingCopy.classList.add("has-scroll-sync");
      }

      if (crookedResetButton) {
        crookedResetButton.addEventListener("click", resetCrookedMode);
      }

      if (window.AsciinemaPlayer && demoFrame) {
        demoFrame.classList.add("is-empty");
        if (
          shouldShowMainIntroTerminal() &&
          (!homeShell ||
            homeState.terminalUnlocked ||
            document.documentElement.getAttribute("data-intro") === HOME_INTRO_STATE.full)
        ) {
          applyDemoFrame("default");
        }
        syncDemoScrollCue();
      }

      if (!hasSections()) {
        document.documentElement.classList.toggle("has-scrolled", window.scrollY > 0);
        updateVFadeMasks();
        updateScrollFadeItems();
        return;
      }

      updateDemoLayout();
      if (currentDemo && currentDemo.key) {
        applyDemoFrame(currentDemo.key);
      } else {
        updateStoryReleaseRunway();
      }
      scheduleUpdate();
    }

    window.addEventListener("pi:themechange", handleThemeChange);

    return {
      initialize: initialize,
      isInlineHomeLayoutActive: isInlineHomeLayoutActive,
      handleTerminalReveal: handleTerminalReveal,
      scheduleUpdate: scheduleUpdate,
      handleResize: handleResize,
      refreshInlineDemosForMediaChange: refreshInlineDemosForMediaChange,
      hasSections: hasSections,
    };
  }

  function readDemoConfigs(demoRegistry) {
    const configs = new Map();
    const configNodes = demoRegistry.querySelectorAll("[data-demo]");

    for (let i = 0; i < configNodes.length; i++) {
      const node = configNodes[i];
      const config = {
        key: node.dataset.demo,
        title: node.dataset.title,
        src: node.dataset.src,
        theme: node.dataset.theme,
        width: Number(node.dataset.width),
        aspectRatio: node.dataset.aspectRatio,
      };

      if (node.dataset.speed) {
        config.speed = Number(node.dataset.speed);
      }
      if (node.dataset.duration) {
        config.duration = Number(node.dataset.duration);
      }
      if (node.dataset.mobileDemo) {
        config.mobileDemo = node.dataset.mobileDemo;
      }

      configs.set(config.key, config);
    }

    return configs;
  }

  function bindHomePageEvents(options) {
    const elements = options.elements;
    const introController = options.introController;
    const demoController = options.demoController;
    const mediaQueries = options.mediaQueries;

    if (elements.homeShell || demoController.hasSections()) {
      window.addEventListener(
        "scroll",
        function () {
          if (elements.homeShell) {
            introController.syncVisibility();
            introController.updateScrollProgress();
          }
          demoController.scheduleUpdate();
        },
        { passive: true },
      );

      window.addEventListener(
        "resize",
        function () {
          if (elements.homeShell) {
            introController.syncVisibility();
            introController.updateGeometry();
            introController.updateScrollProgress();
          }
          demoController.handleResize();
          demoController.scheduleUpdate();
        },
        { passive: true },
      );
    }

    bindMediaQueryChange(mediaQueries.inlineDemo, demoController.scheduleUpdate);
    bindMediaQueryChange(mediaQueries.mobileDemo, function () {
      demoController.refreshInlineDemosForMediaChange();
      demoController.scheduleUpdate();
    });

    if (elements.homeShell) {
      function refreshHomeIntroLayout() {
        introController.syncVisibility();
        introController.updateGeometry();
        introController.updateScrollProgress();
      }

      window.addEventListener("load", refreshHomeIntroLayout);
      window.addEventListener("pageshow", refreshHomeIntroLayout);
      window.addEventListener("pointermove", introController.handleNavPointerMove, {
        passive: true,
      });
      document.addEventListener("visibilitychange", introController.syncVisibility);
    }
  }

  function createHeroLogoController(options) {
    const heroLogoStage = options.heroLogoStage;
    const heroLogo = options.heroLogo;
    const reduceMotion = options.reduceMotion;

    if (!heroLogoStage || !heroLogo || !heroLogo.getContext) {
      return {
        canPlayIntro: function () {
          return false;
        },
        cancel: function () {},
        playIntro: function () {
          return Promise.resolve(false);
        },
        showStatic: function () {},
      };
    }

    const ctx = heroLogo.getContext("2d");
    if (!ctx) {
      return {
        canPlayIntro: function () {
          return false;
        },
        cancel: function () {},
        playIntro: function () {
          return Promise.resolve(false);
        },
        showStatic: function () {},
      };
    }

    const LOGO_FPS = 18;
    const BOARD_W = 8;
    const BOARD_H = 9;
    const CLEAR_ROW = 6;
    const COLORS = {
      cyan: "#4B607C",
      red: "#8F4632",
      green: "#A3A473",
      orange: "#D4904E",
      flash: "#fff5b4",
      white: "#ffffff",
      ink: "#09090B",
    };
    const BORDER_COLORS = {
      cyan: "#2D3D55",
      red: "#4F271C",
      green: "#5A5A3F",
      orange: "#754F2B",
    };
    const BEVEL_STYLE = {
      face: {
        top: 0.08,
        bottom: 0.06,
      },
      edge: {
        widths: {
          topOuter: 2,
          topInner: 1,
          topSeamOuter: 1,
          topSeamInner: 0.5,
          bottomOuter: 2,
          bottomInner: 1,
          bottomSeamOuter: 1,
          bottomSeamInner: 0.5,
          sideOuter: 2,
          sideInner: 1,
          sideSeamOuter: 1,
          sideSeamInner: 0.5,
        },
        alpha: {
          topOuter: 0.28,
          topInner: 0.14,
          sideOuter: 0.62,
          sideInner: 0.38,
          bottomOuter: 1,
          bottomInner: 0.78,
        },
        sameColorAlpha: {
          topOuterScale: 0.45,
          topOuterMin: 0.12,
          topInner: 0.06,
          bottomOuter: 0.24,
          bottomInner: 0.12,
          sideOuter: 0.22,
          sideInner: 0.08,
        },
      },
    };
    const SHADE_COLORS = {
      light: COLORS.white,
      dark: "#000000",
    };
    const RENDER_MODE = {
      bevel: "bevel",
      flat: "flat",
    };
    const TOP = {
      color: "cyan",
      cells: [
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 2],
      ],
      startX: 2,
      startY: -2,
      targetX: 2,
      targetY: 2,
    };
    const LEFT = {
      color: "red",
      cells: [
        [0, 0],
        [1, 0],
        [1, 1],
        [2, 0],
      ],
      startX: 0,
      startY: -3,
      targetX: 2,
      targetY: 3,
    };
    const RIGHT = {
      color: "green",
      cells: [
        [0, 0],
        [1, 0],
        [2, 0],
        [2, 1],
      ],
      startX: 5,
      startY: -3,
      targetX: 5,
      targetY: 4,
    };
    const BASE = {
      color: "orange",
      cells: [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
      ],
      startX: 1,
      startY: -2,
      targetX: 1,
      targetY: 6,
    };
    const LOGO_SEQUENCE = [
      { piece: BASE, duration: 130, holdAfter: 15 },
      { piece: LEFT, duration: 130, holdAfter: 15 },
      { piece: TOP, duration: 130, holdAfter: 15 },
      { piece: RIGHT, duration: 130, holdAfter: 70 },
    ];
    const LOGO_TIMING = {
      initialHold: 40,
      clearFlashCount: 5,
      clearFlashStep: 50,
      postClearHold: 70,
      postDropHold: 220,
      whiteFlashHold: 90,
    };
    const FINAL_LOGO = ["3:2", "3:3", "3:4", "4:2", "4:4", "5:2", "5:3", "5:5", "6:2", "6:5"];

    let repaint = function () {};
    let logoBusy = false;
    let activeLogoRun = null;
    let extraTopRows = 0;
    let tallCanvasActive = false;

    function createLogoRun() {
      const run = { cancelled: false };
      activeLogoRun = run;
      logoBusy = true;
      return run;
    }

    function isLogoRunActive(run) {
      return !!run && activeLogoRun === run && !run.cancelled && document.body.contains(heroLogo);
    }

    function finishLogoRun(run, renderStatic) {
      if (activeLogoRun !== run) {
        return false;
      }

      activeLogoRun = null;
      logoBusy = false;

      if (renderStatic) {
        showStatic();
      }

      return true;
    }

    function cancelActiveLogoRun(renderStatic) {
      if (!activeLogoRun) {
        if (renderStatic) {
          showStatic();
        }
        return;
      }

      activeLogoRun.cancelled = true;
      activeLogoRun = null;
      logoBusy = false;

      if (renderStatic) {
        showStatic();
      }
    }

    function toCellKey(y, x) {
      return y + ":" + x;
    }

    function sleep(ms) {
      return new Promise(function (resolve) {
        window.setTimeout(resolve, ms);
      });
    }

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function copyCells(cells) {
      const copy = {};
      for (const [position, color] of Object.entries(cells)) {
        copy[position] = color;
      }
      return copy;
    }

    function mergePiece(cells, piece, x, y) {
      for (let i = 0; i < piece.cells.length; i++) {
        const cell = piece.cells[i];
        cells[toCellKey(y + cell[0], x + cell[1])] = piece.color;
      }
    }

    function composeCells(settled, active, options) {
      const renderOptions = options || {};
      let cells = copyCells(settled);

      if (active) {
        mergePiece(cells, active.piece, active.x, active.y);
      }

      if (renderOptions.flashClearRow) {
        for (let x = 1; x <= 6; x++) {
          cells[toCellKey(CLEAR_ROW, x)] = "flash";
        }
      }

      if (renderOptions.whiteLogo) {
        cells = {};
        const logoColor = settledLogoColor();
        for (let i = 0; i < FINAL_LOGO.length; i++) {
          cells[FINAL_LOGO[i]] = logoColor;
        }
      }

      return cells;
    }

    function getTotalRows() {
      return BOARD_H + extraTopRows;
    }

    function resizeLogoCanvas() {
      const wrap = heroLogo.parentElement;
      if (!wrap) {
        return;
      }

      const wrapRect = wrap.getBoundingClientRect();
      if (wrapRect.width <= 0) {
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const totalRows = getTotalRows();
      const cellCss = wrapRect.width / BOARD_W;
      const cssWidth = wrapRect.width;
      const cssHeight = cellCss * totalRows;
      const bitmapWidth = Math.max(1, Math.round(cssWidth * dpr));
      const bitmapHeight = Math.max(1, Math.round(cssHeight * dpr));

      if (heroLogo.width !== bitmapWidth || heroLogo.height !== bitmapHeight) {
        heroLogo.width = bitmapWidth;
        heroLogo.height = bitmapHeight;
      }

      heroLogo.style.width = cssWidth + "px";
      heroLogo.style.height = cssHeight + "px";
    }

    function getCanvasMetrics() {
      const width = heroLogo.width;
      const height = heroLogo.height;
      const totalRows = getTotalRows();
      const cellW = width / BOARD_W;
      const cellH = height / totalRows;
      const xLines = new Array(BOARD_W + 1);
      const yLines = new Array(totalRows + 1);

      for (let x = 0; x <= BOARD_W; x++) {
        xLines[x] = Math.round(x * cellW);
      }

      for (let y = 0; y <= totalRows; y++) {
        yLines[y] = Math.round(y * cellH);
      }

      return {
        width: width,
        height: height,
        cellW: cellW,
        cellH: cellH,
        xLines: xLines,
        yLines: yLines,
      };
    }

    function gridLine(lineArray, index, cellSize) {
      if (index >= 0 && index < lineArray.length) {
        return lineArray[index];
      }

      return Math.round(index * cellSize);
    }

    function getNeighborsAt(colorAt, y, x) {
      return {
        top: colorAt(y - 1, x),
        right: colorAt(y, x + 1),
        bottom: colorAt(y + 1, x),
        left: colorAt(y, x - 1),
      };
    }

    function renderBlocks(metrics, emitBlocks) {
      ctx.clearRect(0, 0, metrics.width, metrics.height);

      emitBlocks(function (left, top, width, height, color, neighbors) {
        drawBlock(left, top, width, height, color, neighbors);
      });
    }

    function fillRectWithAlpha(fill, alpha, x, y, width, height) {
      if (alpha <= 0 || width <= 0 || height <= 0) {
        return;
      }

      ctx.globalAlpha = alpha;
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, width, height);
      ctx.globalAlpha = 1;
    }

    function createBlockContext(left, top, width, height, color, neighbors) {
      const neighborCells = neighbors || {};
      const fillColor = COLORS[color] || COLORS.white;
      const borderColor = BORDER_COLORS[color];

      return {
        left: left,
        top: top,
        width: width,
        height: height,
        fillColor: fillColor,
        borderColor: borderColor,
        renderMode: borderColor ? RENDER_MODE.bevel : RENDER_MODE.flat,
        sameTop: neighborCells.top === color,
        sameRight: neighborCells.right === color,
        sameBottom: neighborCells.bottom === color,
        sameLeft: neighborCells.left === color,
        canInset: width > 4 && height > 4,
        innerLeft: left + 1,
        innerTop: top + 1,
        innerWidth: width - 2,
        innerHeight: height - 2,
      };
    }

    function paintBlockFace(block) {
      ctx.fillStyle = block.fillColor;
      ctx.fillRect(block.left, block.top, block.width, block.height);

      if (
        block.renderMode !== RENDER_MODE.bevel ||
        block.innerWidth <= 0 ||
        block.innerHeight <= 0
      ) {
        return;
      }

      const faceTopHeight = Math.max(1, Math.floor(block.innerHeight * 0.55));
      const faceBottomHeight = block.innerHeight - faceTopHeight;

      fillRectWithAlpha(
        SHADE_COLORS.light,
        BEVEL_STYLE.face.top,
        block.innerLeft,
        block.innerTop,
        block.innerWidth,
        faceTopHeight,
      );
      fillRectWithAlpha(
        SHADE_COLORS.dark,
        BEVEL_STYLE.face.bottom,
        block.innerLeft,
        block.innerTop + faceTopHeight,
        block.innerWidth,
        faceBottomHeight,
      );
    }

    function paintTopBottomBevels(block) {
      const edgeWidths = BEVEL_STYLE.edge.widths;
      const edgeAlpha = BEVEL_STYLE.edge.alpha;
      const sameColorAlpha = BEVEL_STYLE.edge.sameColorAlpha;
      const topOuterPx = block.sameTop ? edgeWidths.topSeamOuter : edgeWidths.topOuter;
      const topInnerPx = block.sameTop ? edgeWidths.topSeamInner : edgeWidths.topInner;
      const bottomOuterPx = block.sameBottom ? edgeWidths.bottomSeamOuter : edgeWidths.bottomOuter;
      const bottomInnerPx = block.sameBottom ? edgeWidths.bottomSeamInner : edgeWidths.bottomInner;
      const topOuterAlpha = edgeAlpha.topOuter;
      const sameTopOuterAlpha = Math.max(
        sameColorAlpha.topOuterMin,
        topOuterAlpha * sameColorAlpha.topOuterScale,
      );

      fillRectWithAlpha(
        SHADE_COLORS.light,
        block.sameTop ? sameTopOuterAlpha : topOuterAlpha,
        block.left,
        block.top,
        block.width,
        topOuterPx,
      );
      fillRectWithAlpha(
        block.borderColor,
        block.sameBottom ? sameColorAlpha.bottomOuter : edgeAlpha.bottomOuter,
        block.left,
        block.top + block.height - bottomOuterPx,
        block.width,
        bottomOuterPx,
      );

      if (!block.canInset) {
        return;
      }

      const topInnerY = block.top + topOuterPx;
      const bottomInnerY = block.top + block.height - bottomOuterPx - bottomInnerPx;

      fillRectWithAlpha(
        SHADE_COLORS.light,
        block.sameTop ? sameColorAlpha.topInner : edgeAlpha.topInner,
        block.innerLeft,
        topInnerY,
        block.innerWidth,
        topInnerPx,
      );
      fillRectWithAlpha(
        block.borderColor,
        block.sameBottom ? sameColorAlpha.bottomInner : edgeAlpha.bottomInner,
        block.innerLeft,
        bottomInnerY,
        block.innerWidth,
        bottomInnerPx,
      );
    }

    function paintSideBevels(block) {
      const edgeWidths = BEVEL_STYLE.edge.widths;
      const edgeAlpha = BEVEL_STYLE.edge.alpha;
      const sameColorAlpha = BEVEL_STYLE.edge.sameColorAlpha;
      const leftOuterPx = block.sameLeft ? edgeWidths.sideSeamOuter : edgeWidths.sideOuter;
      const rightOuterPx = block.sameRight ? edgeWidths.sideSeamOuter : edgeWidths.sideOuter;
      const leftInnerPx = block.sameLeft ? edgeWidths.sideSeamInner : edgeWidths.sideInner;
      const rightInnerPx = block.sameRight ? edgeWidths.sideSeamInner : edgeWidths.sideInner;

      fillRectWithAlpha(
        block.borderColor,
        block.sameLeft ? sameColorAlpha.sideOuter : edgeAlpha.sideOuter,
        block.left,
        block.top,
        leftOuterPx,
        block.height,
      );
      fillRectWithAlpha(
        block.borderColor,
        block.sameRight ? sameColorAlpha.sideOuter : edgeAlpha.sideOuter,
        block.left + block.width - rightOuterPx,
        block.top,
        rightOuterPx,
        block.height,
      );

      if (!block.canInset) {
        return;
      }

      fillRectWithAlpha(
        block.sameLeft ? SHADE_COLORS.light : block.borderColor,
        block.sameLeft ? sameColorAlpha.sideInner : edgeAlpha.sideInner,
        block.innerLeft,
        block.innerTop,
        leftInnerPx,
        block.innerHeight,
      );
      fillRectWithAlpha(
        block.sameRight ? SHADE_COLORS.light : block.borderColor,
        block.sameRight ? sameColorAlpha.sideInner : edgeAlpha.sideInner,
        block.left + block.width - rightOuterPx,
        block.innerTop,
        rightInnerPx,
        block.innerHeight,
      );
    }

    function drawBlock(left, top, width, height, color, neighbors) {
      const block = createBlockContext(left, top, width, height, color, neighbors);

      paintBlockFace(block);
      if (block.renderMode !== RENDER_MODE.bevel) {
        return;
      }

      paintTopBottomBevels(block);
      paintSideBevels(block);
    }

    function paintCells(cells) {
      resizeLogoCanvas();
      const metrics = getCanvasMetrics();

      function colorAt(y, x) {
        return cells[toCellKey(y, x)];
      }

      renderBlocks(metrics, function (renderBlock) {
        for (const [position, color] of Object.entries(cells)) {
          const point = parseCellKey(position);
          const canvasY = point.y + extraTopRows;
          const left = gridLine(metrics.xLines, point.x, metrics.cellW);
          const top = gridLine(metrics.yLines, canvasY, metrics.cellH);
          const right = gridLine(metrics.xLines, point.x + 1, metrics.cellW);
          const bottom = gridLine(metrics.yLines, canvasY + 1, metrics.cellH);

          renderBlock(
            left,
            top,
            right - left,
            bottom - top,
            color,
            getNeighborsAt(colorAt, point.y, point.x),
          );
        }
      });
    }

    function renderLogo(settled, active, options) {
      const cells = composeCells(settled, active, options);
      repaint = function () {
        paintCells(cells);
      };
      paintCells(cells);
    }

    function renderCells(cells) {
      repaint = function () {
        paintCells(cells);
      };
      paintCells(cells);
    }

    async function holdLogo(settled, ms, options, run) {
      const frameMs = 1000 / LOGO_FPS;
      const frames = Math.max(1, Math.round(ms / frameMs));

      for (let i = 0; i < frames; i++) {
        if (!isLogoRunActive(run)) {
          return false;
        }

        renderLogo(settled, null, options);
        await sleep(frameMs);

        if (!isLogoRunActive(run)) {
          return false;
        }
      }

      return true;
    }

    function getPieceStartY(piece) {
      return extraTopRows > 0 ? -extraTopRows - 1 : piece.startY;
    }

    async function animatePiece(settled, piece, duration, run) {
      const frameMs = 1000 / LOGO_FPS;
      const startY = getPieceStartY(piece);
      const fallDistance = Math.abs(piece.targetY - startY);
      const scaledDuration = Math.min(560, duration + Math.max(0, fallDistance - 6) * 11);
      const frames = Math.max(Math.round(scaledDuration / frameMs), 10);

      for (let i = 0; i < frames; i++) {
        if (!isLogoRunActive(run)) {
          return false;
        }

        const t = easeOutCubic((i + 1) / frames);
        const x = Math.round(piece.startX + (piece.targetX - piece.startX) * t);
        const y = Math.round(startY + (piece.targetY - startY) * t);
        renderLogo(settled, { piece: piece, x: x, y: y });
        await sleep(frameMs);

        if (!isLogoRunActive(run)) {
          return false;
        }
      }

      mergePiece(settled, piece, piece.targetX, piece.targetY);
      renderLogo(settled);
      await sleep(50);

      return isLogoRunActive(run);
    }

    async function playLogoSequence(onBeforeWhite, run) {
      let settled = {};

      if (!(await holdLogo(settled, LOGO_TIMING.initialHold, null, run))) {
        return false;
      }

      for (let i = 0; i < LOGO_SEQUENCE.length; i++) {
        const step = LOGO_SEQUENCE[i];
        if (!(await animatePiece(settled, step.piece, step.duration, run))) {
          return false;
        }
        if (step.holdAfter > 0 && !(await holdLogo(settled, step.holdAfter, null, run))) {
          return false;
        }
      }

      for (let i = 0; i < LOGO_TIMING.clearFlashCount; i++) {
        if (
          !(await holdLogo(
            settled,
            LOGO_TIMING.clearFlashStep,
            { flashClearRow: i % 2 === 0 },
            run,
          ))
        ) {
          return false;
        }
      }

      const floating = {};
      for (const [position, color] of Object.entries(settled)) {
        if (parseCellKey(position).y !== CLEAR_ROW) {
          floating[position] = color;
        }
      }

      if (!(await holdLogo(floating, LOGO_TIMING.postClearHold, null, run))) {
        return false;
      }

      settled = {};
      for (const [position, color] of Object.entries(floating)) {
        const point = parseCellKey(position);
        settled[toCellKey(point.y + 1, point.x)] = color;
      }

      if (!(await holdLogo(settled, LOGO_TIMING.postDropHold, null, run))) {
        return false;
      }

      if (onBeforeWhite) {
        await onBeforeWhite();
        if (!isLogoRunActive(run)) {
          return false;
        }
      }

      for (let flash = 0; flash < 2; flash++) {
        if (!(await holdLogo(settled, LOGO_TIMING.whiteFlashHold, null, run))) {
          return false;
        }
        if (!(await holdLogo(settled, LOGO_TIMING.whiteFlashHold, { whiteLogo: true }, run))) {
          return false;
        }
      }

      if (!isLogoRunActive(run)) {
        return false;
      }

      return true;
    }

    function settledLogoColor() {
      return document.documentElement.getAttribute("data-theme") === "light" ? "ink" : "white";
    }

    function shiftedSettledLogo(color, offsetY) {
      const cells = {};

      for (let i = 0; i < FINAL_LOGO.length; i++) {
        const point = parseCellKey(FINAL_LOGO[i]);
        const y = point.y + offsetY;

        if (y >= 0 && y < BOARD_H) {
          cells[toCellKey(y, point.x)] = color;
        }
      }

      return cells;
    }

    async function dropLogoDown() {
      const run = createLogoRun();

      if (!(await holdLogo({}, 80, { whiteLogo: true }, run))) {
        finishLogoRun(run, false);
        return false;
      }

      for (let step = 1; step <= 6; step++) {
        if (!isLogoRunActive(run)) {
          finishLogoRun(run, false);
          return false;
        }

        renderCells(shiftedSettledLogo(settledLogoColor(), step));
        await sleep(90);
      }

      renderCells({});
      await sleep(80);
      finishLogoRun(run, false);
      return true;
    }

    function updateTallCanvasBounds() {
      const wrap = heroLogo.parentElement;
      if (!wrap) {
        return;
      }

      const wrapRect = wrap.getBoundingClientRect();
      if (wrapRect.width <= 0) {
        return;
      }

      const cellCss = wrapRect.width / BOARD_W;
      const totalRows = Math.max(BOARD_H, Math.ceil(wrapRect.bottom / cellCss));
      extraTopRows = totalRows - BOARD_H;
    }

    function activateTallCanvas() {
      tallCanvasActive = true;
      updateTallCanvasBounds();
    }

    function deactivateTallCanvas() {
      tallCanvasActive = false;
      extraTopRows = 0;
    }

    function cancel() {
      deactivateTallCanvas();
      cancelActiveLogoRun(true);
      repaint();
    }

    function canPlayIntro() {
      return !reduceMotion;
    }

    function showStatic() {
      renderCells(shiftedSettledLogo(settledLogoColor(), 0));
    }

    function canReplay() {
      return (
        !reduceMotion &&
        !logoBusy &&
        document.body.contains(heroLogo) &&
        document.documentElement.getAttribute("data-intro") === HOME_INTRO_STATE.full
      );
    }

    function playIntro(onBeforeWhite) {
      if (!canPlayIntro() || logoBusy || !document.body.contains(heroLogo)) {
        showStatic();
        return Promise.resolve(false);
      }

      const run = createLogoRun();
      activateTallCanvas();
      return playLogoSequence(onBeforeWhite, run).finally(function () {
        finishLogoRun(run, true);
        repaint();
      });
    }

    async function replay() {
      if (!canReplay()) {
        return;
      }

      try {
        activateTallCanvas();
        if (!(await dropLogoDown())) {
          return;
        }

        const run = createLogoRun();
        await playLogoSequence(null, run);
        finishLogoRun(run, true);
        repaint();
      } finally {
        cancelActiveLogoRun(true);
      }
    }

    window.addEventListener("resize", function () {
      if (tallCanvasActive) {
        updateTallCanvasBounds();
      }
      repaint();
    });

    window.addEventListener("pi:themechange", function () {
      if (!logoBusy) {
        showStatic();
      }
    });

    function handleLogoClick(event) {
      if (!event || event.button === 0) {
        replay();
      }
    }

    heroLogoStage.addEventListener("click", handleLogoClick);

    heroLogoStage.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        replay();
      }
    });

    renderCells({});
    if (reduceMotion) {
      showStatic();
    }

    return {
      canPlayIntro: canPlayIntro,
      cancel: cancel,
      playIntro: playIntro,
      showStatic: showStatic,
    };
  }
})();
