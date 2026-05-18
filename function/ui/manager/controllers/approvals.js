// 审批弹窗入口与基于角色的界面可见性控制。
// CardUI Manager Controllers - approvals & visibility
(function(){
  'use strict';
  var w = window;
  var dom = w.CardUI.Manager.Core.dom;
  var $ = dom.$;
  var qs = dom.qs;

  async function onApproveClick(){
    try {
      var groups = typeof w.fetchPendingApprovalGroups === 'function' ? await w.fetchPendingApprovalGroups() : null;
      var total = typeof w.countPendingApprovalGroups === 'function' ? w.countPendingApprovalGroups(groups) : 0;
      if (total > 0) {
        try { if (typeof w.setPendingApprovalGroupsCache === 'function') w.setPendingApprovalGroupsCache(groups); } catch(_){ }
        try { w.CardUI.Manager.Controllers.overlay.open('approve-user-modal'); } catch(_){ }
      } else {
        var msg = t('toast.noRequests');
        w.showToast(msg);
      }
    } catch(_){
      var msg2 = t('toast.noRequests');
      w.showToast(msg2);
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
