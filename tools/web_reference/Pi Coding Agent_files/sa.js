(function () {
  "use strict";

  var win = window;
  var doc = document;
  var loc = win.location;
  var hist = win.history;
  var nav = win.navigator;
  var script = doc.currentScript;

  function getScriptAttribute(name) {
    if (!script) return null;
    return script.getAttribute("data-" + name);
  }

  var apiUrl =
    getScriptAttribute("api") ||
    (script && script.src ? new URL(script.src).origin + "/api/sa" : "/api/sa");

  function shouldIgnoreLocalhost() {
    return (
      loc.protocol === "file:" ||
      /^(localhost|(0|127)(\.[0-9]+){0,2}\.[0-9]+|\[::1?\])$/.test(loc.hostname)
    );
  }

  function pathMatches(wildcardPath) {
    return new RegExp(
      "^" + wildcardPath.trim().replace(/\*\*/g, ".*").replace(/\*/g, "[^\\s/]*") + "/?$",
    ).test(loc.pathname);
  }

  function collectProperties(options) {
    var properties = {};

    if (script) {
      script
        .getAttributeNames()
        .filter(function (name) {
          return name.substring(0, 11) === "data-event-";
        })
        .forEach(function (name) {
          properties[name.substring(11)] = script.getAttribute(name);
        });
    }

    if (options && options.properties) {
      for (var key in options.properties) {
        properties[key] = options.properties[key];
      }
    }

    return properties;
  }

  function sendPayload(payload) {
    var body = JSON.stringify(payload);

    if (nav && nav.sendBeacon) {
      var blob = new Blob([body], { type: "text/plain" });
      nav.sendBeacon(apiUrl, blob);
      return;
    }

    fetch(apiUrl, {
      method: "POST",
      body: body,
      headers: {
        "Content-Type": "text/plain",
      },
      keepalive: true,
      credentials: "omit",
    }).catch(function () {
      // ignore
    });
  }

  function emitEvent(eventName, options) {
    options = options || {};

    if (shouldIgnoreLocalhost()) {
      return;
    }

    try {
      if (localStorage.__saIgnored === "true") {
        return;
      }
    } catch (_) {
      // ignore
    }

    if (eventName === "pageview") {
      var includeAttr = getScriptAttribute("include");
      var excludeAttr = getScriptAttribute("exclude");
      var isIncluded = !includeAttr || includeAttr.split(",").some(pathMatches);
      var isExcluded = excludeAttr && excludeAttr.split(",").some(pathMatches);

      if (!isIncluded || isExcluded) {
        return;
      }
    }

    sendPayload({
      v: 1,
      e: eventName,
      u: loc.href,
      d: getScriptAttribute("domain"),
      r: doc.referrer || null,
      p: collectProperties(options),
    });
  }

  function autoTrackPageViews() {
    var lastPath = null;

    function maybeEmitPageView() {
      if (lastPath !== loc.pathname) {
        lastPath = loc.pathname;
        emitEvent("pageview");
      }
    }

    if (hist && hist.pushState) {
      var originalPushState = hist.pushState;
      hist.pushState = function () {
        originalPushState.apply(this, arguments);
        maybeEmitPageView();
      };

      var originalReplaceState = hist.replaceState;
      hist.replaceState = function () {
        originalReplaceState.apply(this, arguments);
        maybeEmitPageView();
      };

      win.addEventListener("popstate", maybeEmitPageView);
    }

    if (doc.visibilityState === "prerender") {
      doc.addEventListener("visibilitychange", function () {
        if (!lastPath && doc.visibilityState === "visible") {
          maybeEmitPageView();
        }
      });
      return;
    }

    maybeEmitPageView();
  }

  var pendingEvents = win.__sa && win.__sa._ ? win.__sa._ : [];
  win.__sa = emitEvent;
  win.sa = emitEvent;

  pendingEvents.forEach(function (args) {
    emitEvent.apply(win, args);
  });

  if (getScriptAttribute("auto") !== "false") {
    autoTrackPageViews();
  }
})();
