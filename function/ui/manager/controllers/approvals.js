// 审批弹窗入口与基于角色的界面可见性控制。
// CardUI Manager Controllers - approvals & visibility
(function(){
  'use strict';
  var w = (typeof window !== 'undefined') ? window : this;
  w.CardUI = w.CardUI || {};
  w.CardUI.Manager = w.CardUI.Manager || {};
  w.CardUI.Manager.Core = w.CardUI.Manager.Core || {};
  w.CardUI.Manager.Controllers = w.CardUI.Manager.Controllers || {};

  var dom = (w.CardUI.Manager.Core.dom) || {};
  var messages = (w.CardUI.Manager.Core.messages) || {};
  var $ = dom.$ || function(id){ return document.getElementById(id); };
  var qs = dom.qs || function(s){ return document.querySelector(s); };
  var api = dom.api || function(u){ return u; };
  var toast = messages.toast || function(msg){ try{ alert(msg); }catch(_){ } };

  async function onApproveClick(){
    var token = (w.localStorage && w.localStorage.getItem('token')) || '';
    var headers = token ? { 'Authorization': 'Bearer ' + token } : {};
    try {
      var reqs = await Promise.all([
        fetch(api('/api/pending-users'), { headers: headers }),
        fetch(api('/api/avatar/pending'), { headers: headers }),
        fetch(api('/api/username/pending'), { headers: headers }),
        fetch(api('/api/intro/pending'), { headers: headers })
      ]);
      var toJson = async function(r){ return (r && r.ok) ? (await r.json()) : []; };
      var arr = await Promise.all(reqs.map(toJson));
      var total = arr.reduce(function(sum,a){ return sum + (Array.isArray(a) ? a.length : 0); }, 0);
      if (total > 0) {
        try { w.CardUI.Manager.Controllers.overlay.open('approve-user-modal'); } catch(_){ }
      } else {
        var msg = t('toast.noRequests');
        try { toast(msg); } catch(_){ try{ alert(msg); }catch(__){} }
      }
    } catch(_){
      var msg2 = t('toast.noRequests');
      try { toast(msg2); } catch(_){ try{ alert(msg2); }catch(__){} }
    }
  }

  function updateVisibilityByRole(role){
    var approveBtn = $('approve-request-button');
    if (approveBtn) approveBtn.style.display = (role === 'admin' || role === 'moderator') ? '' : 'none';

    var tokensTab = (qs('a[href="#panel_tokens"]').parentElement) || null;
    var tokensPanel = $('panel_tokens');
    var canViewTokens = (role === 'admin' || role === 'moderator');
    if (tokensTab) tokensTab.style.display = canViewTokens ? '' : 'none';
    if (tokensPanel) tokensPanel.style.display = canViewTokens ? '' : 'none';

    var permTabEl = (qs('a[href="#panel_permissions"]').parentElement) || null;
    var permPanelEl = $('panel_permissions');
    var canViewPerms = (role === 'admin');
    if (permTabEl) permTabEl.style.display = canViewPerms ? '' : 'none';
    if (permPanelEl) permPanelEl.style.display = canViewPerms ? '' : 'none';
  }

  w.CardUI.Manager.Controllers.approvals = {
    onApproveClick: onApproveClick,
    updateVisibilityByRole: updateVisibilityByRole
  };
})();
