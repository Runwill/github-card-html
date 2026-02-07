// admin/time_fmt
// 共享时间格式化工具：解析、绝对/相对格式化、locale 推断
// 消费者：tokens/ui/logger.js、permissions/logs.js
(function(){
  function parseTimeValue(v){
    try{
      if (v == null) return undefined;
      if (v instanceof Date) return v.getTime();
      if (typeof v === 'number') return v;
      if (typeof v === 'string') { const t = Date.parse(v); return isNaN(t) ? undefined : t; }
      return undefined;
    }catch(_){ return undefined; }
  }

  function getLocaleFromI18n(){
    try{
      const lang = (window.i18n && window.i18n.getLang && window.i18n.getLang()) || 'zh';
      if (lang === 'zh') return 'zh-CN';
      if (lang === 'en') return 'en-US';
      return 'en-US';
    }catch(_){ return 'en-US'; }
  }

  function formatAbsForLang(v){
    try{
      const t = parseTimeValue(v) ?? Date.now();
      const locale = getLocaleFromI18n();
      return new Date(t).toLocaleString(locale);
    }catch(_){ return String(v || ''); }
  }

  function formatRel(v){
    try{
      const now = Date.now();
      const t = parseTimeValue(v) ?? now;
      let diff = Math.floor((now - t) / 1000);
      if (diff < -5) return window.t('time.justNow');
      if (diff < 5) return window.t('time.justNow');
      if (diff < 60) return window.t('time.secondsAgo', { n: diff });
      const m = Math.floor(diff / 60);
      if (m < 60) return window.t('time.minutesAgo', { n: m });
      const h = Math.floor(m / 60);
      if (h < 24) return window.t('time.hoursAgo', { n: h });
      const d = Math.floor(h / 24);
      if (d < 30) return window.t('time.daysAgo', { n: d });
      const mo = Math.floor(d / 30);
      if (mo < 12) return window.t('time.monthsAgo', { n: mo });
      const y = Math.floor(mo / 12);
      return window.t('time.yearsAgo', { n: y });
    }catch(_){ return ''; }
  }

  window.TimeFmt = { parseTimeValue, getLocaleFromI18n, formatAbsForLang, formatRel };
})();
