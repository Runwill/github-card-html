  // tokens/actions/edit_delete
  // 行内编辑与删除、整对象删除、编辑对象的事件绑定（保持只读用户无效）

  const T = window.tokensAdmin;
  const { setByPath, deleteFieldInDocByPath, computeTint } = T;
  const { apiJson } = T;

  function getTokenCardMeta(node) {
    const card = node && node.closest ? node.closest('.token-card[data-coll][data-id]') : null;
    if (!card) return null;
    const coll = card.getAttribute('data-coll');
    const id = card.getAttribute('data-id');
    return coll && id ? { card, coll, id } : null;
  }

  function applyTokenAccent(tokenCard, color) {
    try {
      const col = String(color || '').trim();
      if (!tokenCard || !col) return;
      const tint = computeTint(col);
      [tokenCard, ...Array.from(tokenCard.querySelectorAll('.token-card, .nest-block'))].forEach((el) => {
        try {
          el.style.setProperty('--token-accent', col);
          if (el.classList.contains('token-card')) {
            if (tint) el.style.setProperty('--token-bg', tint);
            el.style.borderLeft = `1px solid ${col}`;
          }
        } catch (_) {}
      });
    } catch (_) {}
  }

  function hasCtrlIntent(ev) { return !!(ev && ev.ctrlKey) || document.body.classList.contains('ctrl-down'); }
  function requireCtrlIntent(ev, toastKey) { if (hasCtrlIntent(ev)) return true; T.showToast(window.t(toastKey)); return false; }


  // 行内编辑（单击 kv 值触发）
  function bindInlineEdit(rootEl) {
    if (rootEl.__inlineEditBound) return;
    rootEl.__inlineEditBound = true;

    rootEl.addEventListener('click', function (ev) {
      if (ev.ctrlKey || document.body.classList.contains('ctrl-down')) return;

      const host = ev.target && ev.target.closest ? ev.target.closest('.kv-val') : null;
      if (!host) return;

      const target = host;
      const openEditing = rootEl.querySelector('.kv-val[data-editing="1"]');
      if (openEditing && openEditing !== target) {
        const old = openEditing.getAttribute('data-old-text') || '';
        openEditing.textContent = old;
        openEditing.removeAttribute('data-editing');
        openEditing.removeAttribute('data-old-text');
        openEditing.classList.remove('is-editing', 'is-saving');
      }

      const path = target.getAttribute('data-path');
      if (!path || path.startsWith('_') || path.includes('.__v')) return;

      const type = target.getAttribute('data-type') || 'string';
      const meta = getTokenCardMeta(target);
      if (!meta) return;
      const { card: tokenCard, coll, id } = meta;

      if (target.getAttribute('data-editing') === '1') return;
      if (target.querySelector('.inline-edit')) return;

      target.setAttribute('data-editing', '1');
      const oldText = target.textContent;
      target.setAttribute('data-old-text', oldText);
      target.classList.add('is-editing');

      const looksLikeHex = (s) => /^#([\da-fA-F]{3}|[\da-fA-F]{4}|[\da-fA-F]{6}|[\da-fA-F]{8})$/.test((s || '').trim());
      const looksLikeFuncColor = (s) => /^(?:rgb|rgba|hsl|hsla)\s*\(/i.test((s || '').trim());
      const endsWithColorKey = /(^|\.)color$/i.test(path);
      const isColorField = endsWithColorKey || looksLikeHex(oldText) || looksLikeFuncColor(oldText);

      let input;
      let colorPicker = null;

      const applyPreview = (val) => applyTokenAccent(tokenCard, val);

      if (isColorField) {
        const wrap = document.createElement('div');
        wrap.className = 'inline-edit-color';

        colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.className = 'color-picker';

        const to6Hex = (s) => {
          s = (s || '').trim();
          if (!s.startsWith('#')) return null;
          const hex = s.slice(1);
          if (hex.length === 3) return '#' + hex.split('').map((c) => c + c).join('');
          if (hex.length === 4) return '#' + hex.slice(0, 3).split('').map((c) => c + c).join('');
          if (hex.length === 6) return '#' + hex;
          if (hex.length === 8) return '#' + hex.slice(0, 6);
          return null;
        };

        colorPicker.value = to6Hex(oldText) || '#3399ff';

        const text = document.createElement('input');
        text.type = 'text';
        text.value = oldText;
        text.className = 'inline-edit';

        wrap.appendChild(colorPicker);
        wrap.appendChild(text);
        target.textContent = '';
        target.appendChild(wrap);
        input = text;

        colorPicker.addEventListener('input', () => {
          const v = colorPicker.value;
          input.value = v;
          applyPreview(v);
          try {
            colorPicker.classList.remove('is-pulse');
            void colorPicker.offsetWidth;
            colorPicker.classList.add('is-pulse');
          } catch (_) {}
        });

        colorPicker.addEventListener('change', () => {
          const v = colorPicker.value;
          input.value = v;
          commit();
        });

        input.addEventListener('input', () => {
          const v = input.value;
          if (looksLikeHex(v)) {
            const hx = to6Hex(v);
            if (hx) colorPicker.value = hx;
          }
          applyPreview(v);
        });

        input.focus();
        input.select();
      } else {
        const ta = document.createElement('textarea');
        ta.value = oldText;
        ta.className = 'inline-edit';
        ta.setAttribute('wrap', 'soft');
        target.textContent = '';
        target.appendChild(ta);
        input = ta;

        const autoSize = () => {
          try {
            ta.style.height = '0';
            ta.style.minHeight = '0';
            ta.style.height = ta.scrollHeight + 'px';
          } catch (_) {}
        };
        ta.addEventListener('input', autoSize);
        autoSize();
        ta.focus();
        ta.select();
      }

      let committing = false;
      let revertTimer = null;

      const cleanup = () => {
        committing = false;
        target.removeAttribute('data-editing');
        target.classList.remove('is-editing', 'is-saving');
        target.removeAttribute('data-old-text');
        if (revertTimer) {
          clearTimeout(revertTimer);
          revertTimer = null;
        }
      };

      const revert = () => {
        target.textContent = oldText;
        cleanup();
      };

      const convertValue = (txt, t) => {
        if (t === 'number') {
          const n = Number(txt.trim());
          if (Number.isNaN(n)) throw new Error('请输入数字');
          return n;
        }
        if (t === 'boolean') {
          const s = txt.trim().toLowerCase();
          if (s === 'true') return true;
          if (s === 'false') return false;
          throw new Error('请输入 true 或 false');
        }
        return txt;
      };

      const commit = async () => {
        const canEdit = window.tokensAdmin?.getAuth?.()?.canEdit || false;
        const txt = input.value;
        if (txt === oldText) { revert(); return; }

        let value;
        try {
          value = convertValue(txt, type);
        } catch (err) {
          alert(err.message || '值不合法');
          return;
        }

        // 审核员可编辑但不可保存：直接提示并还原文字，不提交
        if (!canEdit) {
          T.showToast('无权限');
          revert();
          return;
        }

        input.disabled = true;
        target.classList.add('is-saving');
        committing = true;

        try {
          await apiJson('/tokens/update', { method: 'POST', auth: true, body: { collection: coll, id, path, value, valueType: type } });
          T.logChange('update', { collection: coll, id, path, from: oldText, to: value, value });

          target.textContent = (type === 'boolean' || type === 'number') ? String(value) : value;
          T.showToast('已保存');

          T.updateDocInState(coll, id, (doc) => setByPath(doc, path, value));

          if (path === 'color') {
            applyTokenAccent(tokenCard, value);
          }

          cleanup();
        } catch (e) {
          alert(e.message || '更新失败');
          revert();
        }
      };

      const handleCommitKey = (e) => {
        if (e.key === 'Enter' && !(e.currentTarget === input && e.shiftKey)) {
          e.preventDefault();
          commit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          revert();
        }
      };

      input.addEventListener('keydown', handleCommitKey);

      const safeBlur = () => {
        if (committing) return;
        revertTimer = setTimeout(() => {
          if (committing) return;
          const ae = document.activeElement;
          if (!target.contains(ae)) revert();
        }, 110);
      };

      input.addEventListener('blur', safeBlur);
      if (colorPicker) {
        colorPicker.addEventListener('keydown', handleCommitKey);
        colorPicker.addEventListener('blur', safeBlur);
      }
    });
  }

  // 行内删除字段
  function bindInlineDelete(rootEl) {
    if (rootEl.__inlineDeleteBound) return;
    rootEl.__inlineDeleteBound = true;

    rootEl.addEventListener('click', async function (ev) {
      const btn = ev.target && ev.target.closest ? ev.target.closest('.btn-del') : null;
      if (!btn) return;

      if (hasCtrlIntent(ev)) {
        T.showToast(window.t('tokens.toast.useCtrlToDelete'));
        ev.preventDefault();
        return;
      }

      const row = btn.closest('.kv-row');
      if (!row) return;

      const path = row.getAttribute('data-path');
      if (!path || path.startsWith('_') || path.includes('.__v')) return;

      const meta = getTokenCardMeta(row);
      if (!meta) return;
      const { coll, id } = meta;

      const keyNameEl = row.querySelector('.kv-key');
      const keyName = keyNameEl ? keyNameEl.textContent.trim() : path.split('.').pop();
  if (!confirm(window.t('common.confirm.deleteField', { name: keyName }))) return;

      try {
  await apiJson('/tokens/delete', { method: 'POST', auth: true, body: { collection: coll, id, path } });
  T.logChange('delete-field', { collection: coll, id, path, from: row.querySelector('.kv-val')?.textContent });
        T.updateDocInState(coll, id, (doc) => deleteFieldInDocByPath(doc, path));
        row.remove();
  T.showToast(window.t('tokens.toast.deleted'));
      } catch (e) {
  alert(e.message || window.t('tokens.error.deleteFailed'));
      }
    });
  }

  // 删除整对象
  function bindDeleteDoc(rootEl) {
    if (rootEl.__deleteDocBound) return;
    rootEl.__deleteDocBound = true;

    rootEl.addEventListener('click', async function (ev) {
      const btn = ev.target && ev.target.closest ? ev.target.closest('.btn-del-doc') : null;
      if (!btn) return;

      if (!requireCtrlIntent(ev, 'tokens.toast.useCtrlToDelete')) return;

      const meta = getTokenCardMeta(btn);
      if (!meta) return;
      const { card, coll, id } = meta;

  if (!confirm(window.t('common.confirm.deleteDoc'))) return;

      try {
  await apiJson('/tokens/remove', { method: 'POST', auth: true, body: { collection: coll, id } });
  T.logChange('delete-doc', { collection: coll, id });
        T.removeDocFromState(coll, id);
        card.remove();
  T.showToast(window.t('tokens.toast.deleted'));
      } catch (e) {
  alert(e.message || window.t('tokens.error.deleteFailed'));
      }
    });
  }

  // 编辑对象（整文档）
  function bindEditDoc(rootEl) {
    if (rootEl.__editDocBound) return;
    rootEl.__editDocBound = true;

    rootEl.addEventListener('click', async function (ev) {
      const btn = ev.target && ev.target.closest ? ev.target.closest('.btn-edit-doc') : null;
      if (!btn) return;

      if (!requireCtrlIntent(ev, 'tokens.toast.useCtrlToEdit')) return;

      const meta = getTokenCardMeta(btn);
      if (!meta) return;
      const { coll, id } = meta;

      try { window.tokensAdmin.openEditModal(coll, id); }
  catch (e) { alert(e.message || window.t('tokens.error.openEditFailed')); }
    });
  }

  Object.assign(window.tokensAdmin, {
    bindInlineEdit,
    bindInlineDelete,
    bindDeleteDoc,
    bindEditDoc,
  });
