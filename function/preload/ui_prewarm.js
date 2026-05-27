'use strict';

const preload = window.AppPreload;

if (preload) {
  preload.register('prewarm-announcements', function(){
    return window.preloadAnnouncements?.();
  }, { context: 'app', priority: 40, delay: 220, timeout: 2200 });

  preload.register('prewarm-help-panel', function(){
    return window.preloadHelpPanel?.();
  }, { context: 'app', priority: 50, delay: 320, timeout: 2200 });
}