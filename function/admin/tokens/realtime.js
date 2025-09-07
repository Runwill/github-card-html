(function(){
  // tokens/realtime: subscribe SSE stream and update UI/logs
  const T = window.tokensAdmin || (window.tokensAdmin = {});
  const { API_BASE, CLIENT_ID } = T;

  function subscribe() {
    try {
      const url = `${API_BASE}/tokens/stream?clientId=${encodeURIComponent(CLIENT_ID||'')}`;
      const es = new EventSource(url, { withCredentials: false });

      es.addEventListener('tokens', (ev)=>{
        try {
          const msg = JSON.parse(ev.data||'{}');
          if (!msg || !msg.type) return;
          // If this event originates from current client, still log but skip duplicate state updates
          const isSelf = msg && msg.sourceId && (String(msg.sourceId) === String(CLIENT_ID));
          const type = msg.type;

          // Update local state minimally for remote changes
          if (!isSelf) {
            if (type === 'update') {
              try { window.tokensAdmin.updateDocInState && window.tokensAdmin.updateDocInState(msg.collection, msg.id, (doc)=> window.tokensAdmin.setByPath && window.tokensAdmin.setByPath(doc, msg.path, msg.value)); } catch(_){}
            } else if (type === 'delete-field') {
              try { window.tokensAdmin.updateDocInState && window.tokensAdmin.updateDocInState(msg.collection, msg.id, (doc)=> window.tokensAdmin.deleteFieldInDocByPath && window.tokensAdmin.deleteFieldInDocByPath(doc, msg.path)); } catch(_){}
            } else if (type === 'delete-doc') {
              try { window.tokensAdmin.removeDocFromState && window.tokensAdmin.removeDocFromState(msg.collection, msg.id); } catch(_){}
            } else if (type === 'create') {
              try { window.tokensAdmin.pushDocToState && window.tokensAdmin.pushDocToState(msg.collection, msg.doc); } catch(_){}
            }
          }

          // Append log only for remote events to avoid duplicate self-logs
          if (!isSelf) {
            try { window.tokensAdmin.logChange && window.tokensAdmin.logChange(type, msg); } catch(_){}
          }

          // Opportunistic refresh of summary counts without full refetch
          try {
            if (window.renderTokensDashboard) window.renderTokensDashboard(false);
          } catch(_){}
        } catch(_){}
      });

      es.addEventListener('error', ()=>{
        // Auto-reconnect: EventSource will retry; we can optionally show a toast once
      });

      // keep reference to close later if needed
      window.tokensAdmin.__es = es;
    } catch(_){}
  }

  // boot when DOM ready and panel exists
  document.addEventListener('DOMContentLoaded', function(){
    const ready = window.partialsReady instanceof Promise ? window.partialsReady : Promise.resolve();
    ready.then(()=>{
      try { if (!window.tokensAdmin.__es) subscribe(); } catch(_){}
    });
  });
})();
