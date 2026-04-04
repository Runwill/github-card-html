/**
 * CustomSelect — 将原生 <select> 替换为主题化的自定义下拉组件
 *
 * 原生 <select> 保留为不可见的数据源，原有的 change 事件、value 读写均兼容。
 * 使用方法：
 *   CustomSelect.init()                     — 初始化页面上所有 select（已包装的跳过）
 *   CustomSelect.wrap(selectElement)         — 包装单个 <select>
 *   CustomSelect.refreshAll()               — 刷新所有已包装的实例（选项变更后调用）
 *   CustomSelect.refresh(selectElement)      — 刷新单个已包装的实例
 *
 * IIFE 模块，挂载到 window.CustomSelect
 */
;(function () {
    'use strict';

    const WRAP_CLASS = 'custom-select';
    const TRIGGER_CLASS = 'custom-select__trigger';
    const DROPDOWN_CLASS = 'custom-select__dropdown';
    const OPTION_CLASS = 'custom-select__option';
    const ARROW_CLASS = 'custom-select__arrow';
    const OPEN_CLASS = 'is-open';
    const SEL_CLASS = 'is-selected';
    const FOCUS_CLASS = 'is-focused';
    const DATA_KEY = '_customSelect';

    const CHEVRON_SVG = '<svg viewBox="0 0 12 8"><path d="M1 1l5 5 5-5"/></svg>';

    /* ── Public API ────────────────────────────────────────────────── */

    function init(root) {
        const container = root || document;
        const selects = container.querySelectorAll('select:not([data-cs-wrapped])');
        selects.forEach(sel => wrap(sel));
    }

    function wrap(sel) {
        if (!sel || sel.dataset.csWrapped) return sel[DATA_KEY] || null;

        // Mark native select
        sel.dataset.csWrapped = '1';

        // Build wrapper
        const wrapper = document.createElement('div');
        wrapper.className = WRAP_CLASS;
        // Inherit block behavior if select was 100% width or standalone
        if (sel.style.width === '100%' || sel.classList.contains('setup-char-select')) {
            wrapper.classList.add('custom-select--block');
        }

        // Transfer classes from select to wrapper (except input-group-field)
        const keepOnSelect = ['input-group-field', 'setup-char-select', 'tokens-input'];
        sel.classList.forEach(cls => {
            if (!keepOnSelect.includes(cls)) {
                wrapper.classList.add(cls);
            }
        });

        // Build trigger button
        const trigger = document.createElement('div');
        trigger.className = TRIGGER_CLASS;
        trigger.tabIndex = 0;
        trigger.setAttribute('role', 'combobox');
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');

        const label = document.createElement('span');
        label.className = 'custom-select__label';

        const arrow = document.createElement('span');
        arrow.className = ARROW_CLASS;
        arrow.innerHTML = CHEVRON_SVG;

        trigger.appendChild(label);
        trigger.appendChild(arrow);

        // Build dropdown
        const dropdown = document.createElement('div');
        dropdown.className = DROPDOWN_CLASS;
        dropdown.setAttribute('role', 'listbox');

        // Insert DOM structure
        sel.parentNode.insertBefore(wrapper, sel);
        wrapper.appendChild(sel);
        wrapper.appendChild(trigger);
        wrapper.appendChild(dropdown);

        // Build context object
        const ctx = { sel, wrapper, trigger, label, dropdown, focusIdx: -1 };
        sel[DATA_KEY] = ctx;

        // Build options
        _buildOptions(ctx);

        // ── Events ──
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            _toggle(ctx);
        });

        trigger.addEventListener('keydown', (e) => _handleKeyDown(e, ctx));

        // Close on outside click (delegated to document, one global handler)
        _ensureGlobalClose();

        // Sync when native select changes programmatically
        sel.addEventListener('change', () => _syncLabel(ctx));

        // Intercept programmatic .value / .selectedIndex assignment
        _hookValueSetter(ctx);

        // Watch for option mutations (e.g. dynamic character selects)
        const mo = new MutationObserver(() => _buildOptions(ctx));
        mo.observe(sel, { childList: true, subtree: true });
        ctx._observer = mo;

        return ctx;
    }

    function refresh(sel) {
        const ctx = sel && sel[DATA_KEY];
        if (!ctx) return;
        _buildOptions(ctx);
    }

    function refreshAll() {
        document.querySelectorAll('select[data-cs-wrapped]').forEach(sel => refresh(sel));
    }

    /* ── Internal ──────────────────────────────────────────────────── */

    /**
     * Hook the native select's .value and .selectedIndex setters
     * so that programmatic assignments (e.g. sel.value = 'all') also
     * update the custom trigger label.
     */
    function _hookValueSetter(ctx) {
        const sel = ctx.sel;
        const proto = HTMLSelectElement.prototype;
        const valDesc = Object.getOwnPropertyDescriptor(proto, 'value');
        const idxDesc = Object.getOwnPropertyDescriptor(proto, 'selectedIndex');

        if (valDesc && valDesc.set) {
            Object.defineProperty(sel, 'value', {
                get: function () { return valDesc.get.call(this); },
                set: function (v) { valDesc.set.call(this, v); _syncLabel(ctx); },
                configurable: true
            });
        }
        if (idxDesc && idxDesc.set) {
            Object.defineProperty(sel, 'selectedIndex', {
                get: function () { return idxDesc.get.call(this); },
                set: function (v) { idxDesc.set.call(this, v); _syncLabel(ctx); },
                configurable: true
            });
        }
    }

    function _buildOptions(ctx) {
        const { sel, dropdown, label } = ctx;
        dropdown.innerHTML = '';

        Array.from(sel.options).forEach((opt, i) => {
            const item = document.createElement('div');
            item.className = OPTION_CLASS;
            item.dataset.index = i;
            item.textContent = opt.textContent;
            item.setAttribute('role', 'option');

            if (opt.selected) {
                item.classList.add(SEL_CLASS);
                item.setAttribute('aria-selected', 'true');
            }

            item.addEventListener('click', (e) => {
                e.stopPropagation();
                _selectOption(ctx, i);
                _close(ctx);
            });

            item.addEventListener('mouseenter', () => {
                _clearFocus(ctx);
                item.classList.add(FOCUS_CLASS);
                ctx.focusIdx = i;
            });

            dropdown.appendChild(item);
        });

        _syncLabel(ctx);

        // Auto-shrink any option text that overflows the dropdown width
        if (window._CustomSelectFit) {
            window._CustomSelectFit.fitOptionTexts(ctx.dropdown, OPEN_CLASS);
        }
    }

    function _syncLabel(ctx) {
        const { sel, label, dropdown } = ctx;
        const opt = sel.options[sel.selectedIndex];
        label.textContent = opt ? opt.textContent : '';

        // Update selected class in dropdown items
        const items = dropdown.children;
        for (let i = 0; i < items.length; i++) {
            items[i].classList.toggle(SEL_CLASS, i === sel.selectedIndex);
            items[i].setAttribute('aria-selected', i === sel.selectedIndex ? 'true' : 'false');
        }
    }

    function _selectOption(ctx, index) {
        const { sel } = ctx;
        if (sel.selectedIndex === index) return;
        sel.selectedIndex = index;
        // Fire native change event so existing listeners work
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        _syncLabel(ctx);
    }

    function _toggle(ctx) {
        if (ctx.wrapper.classList.contains(OPEN_CLASS)) {
            _close(ctx);
        } else {
            _open(ctx);
        }
    }

    function _open(ctx) {
        // Close all other open dropdowns
        _closeAll();

        ctx.wrapper.classList.add(OPEN_CLASS);
        ctx.trigger.setAttribute('aria-expanded', 'true');
        ctx.focusIdx = ctx.sel.selectedIndex;

        // Scroll selected into view
        const items = ctx.dropdown.children;
        if (items[ctx.focusIdx]) {
            _clearFocus(ctx);
            items[ctx.focusIdx].classList.add(FOCUS_CLASS);
            items[ctx.focusIdx].scrollIntoView({ block: 'nearest' });
        }
    }

    function _close(ctx) {
        ctx.wrapper.classList.remove(OPEN_CLASS);
        ctx.trigger.setAttribute('aria-expanded', 'false');
        _clearFocus(ctx);
    }

    function _closeAll() {
        document.querySelectorAll('.' + WRAP_CLASS + '.' + OPEN_CLASS).forEach(w => {
            const sel = w.querySelector('select');
            if (sel && sel[DATA_KEY]) _close(sel[DATA_KEY]);
        });
    }

    function _clearFocus(ctx) {
        const items = ctx.dropdown.querySelectorAll('.' + FOCUS_CLASS);
        items.forEach(it => it.classList.remove(FOCUS_CLASS));
    }

    function _handleKeyDown(e, ctx) {
        const isOpen = ctx.wrapper.classList.contains(OPEN_CLASS);
        const items = ctx.dropdown.children;
        const count = items.length;
        if (!count) return;

        switch (e.key) {
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (isOpen && ctx.focusIdx >= 0) {
                    _selectOption(ctx, ctx.focusIdx);
                    _close(ctx);
                    ctx.trigger.focus();
                } else {
                    _open(ctx);
                }
                break;

            case 'ArrowDown':
                e.preventDefault();
                if (!isOpen) { _open(ctx); return; }
                ctx.focusIdx = (ctx.focusIdx + 1) % count;
                _updateFocusVisual(ctx);
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (!isOpen) { _open(ctx); return; }
                ctx.focusIdx = (ctx.focusIdx - 1 + count) % count;
                _updateFocusVisual(ctx);
                break;

            case 'Escape':
                if (isOpen) {
                    e.preventDefault();
                    _close(ctx);
                    ctx.trigger.focus();
                }
                break;

            case 'Tab':
                if (isOpen) _close(ctx);
                break;
        }
    }

    function _updateFocusVisual(ctx) {
        _clearFocus(ctx);
        const items = ctx.dropdown.children;
        if (items[ctx.focusIdx]) {
            items[ctx.focusIdx].classList.add(FOCUS_CLASS);
            items[ctx.focusIdx].scrollIntoView({ block: 'nearest' });
        }
    }

    /* ── Global close handler (registered once) ────────────────────── */
    let _globalCloseInstalled = false;
    function _ensureGlobalClose() {
        if (_globalCloseInstalled) return;
        _globalCloseInstalled = true;
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.' + WRAP_CLASS)) {
                _closeAll();
            }
        });
    }

    /* ── Expose ────────────────────────────────────────────────────── */
    window.CustomSelect = { init, wrap, refresh, refreshAll };

})();
