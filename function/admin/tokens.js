// 拉取并渲染词元仪表盘
(function(){
	// 简单缓存与搜索状态
	const state = {
		data: null,
		q: '',
		timer: null,
	activeType: null, // 当前筛选的类型：'term-fixed' | 'term-dynamic' | 'card' | 'character' | 'skill' | null
	};
	// 统一的集合配置
	const COLLECTIONS = Object.freeze({
		'term-fixed':   { key: 'termFixed',   url: 'http://localhost:3000/api/term-fixed' },
		'term-dynamic': { key: 'termDynamic', url: 'http://localhost:3000/api/term-dynamic' },
		'card':         { key: 'cards',       url: 'http://localhost:3000/api/card' },
		'character':    { key: 'characters',  url: 'http://localhost:3000/api/character' },
		// skill 为多来源集合，单独处理
		'skill':        { key: null,          url: null, urls: [
			'http://localhost:3000/api/skill0',
			'http://localhost:3000/api/skill1',
			'http://localhost:3000/api/skill2'
		] }
	});

	// 统一鉴权与权限判断
	function getAuth(){
		const role = localStorage.getItem('role');
		const token = localStorage.getItem('token');
		return { role, token, canEdit: !!token && role === 'admin' };
	}

	// 通用 HTML 转义
	function esc(s){ return (s==null? '' : String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))); }

	// 统一 API JSON 请求助手
	const API_BASE = 'http://localhost:3000/api';
	async function apiJson(endpoint, opts){
		const { method = 'GET', headers = {}, body, auth = false } = opts || {};
		const { token } = getAuth();
		const h = Object.assign({}, headers);
		if (auth && token) h['Authorization'] = `Bearer ${token}`;
		let payload = body;
		if (body != null && typeof body !== 'string') {
			h['Content-Type'] = h['Content-Type'] || 'application/json';
			payload = JSON.stringify(body);
		}
		const resp = await fetch(endpoint.startsWith('http') ? endpoint : (API_BASE + endpoint), { method, headers: h, body: payload });
		const out = await resp.json().catch(() => ({}));
		if (!resp.ok) throw new Error(out && out.message || '请求失败');
		return out;
	}

	// —— 缓存更新助手 ——
	function ensureArraysForSkills(){
		if (!state.data) state.data = {};
		if (!Array.isArray(state.data.s0)) state.data.s0 = [];
		if (!Array.isArray(state.data.s1)) state.data.s1 = [];
		if (!Array.isArray(state.data.s2)) state.data.s2 = [];
	}

	function pushDocToState(collection, doc){
		if (!state.data) state.data = {};
		if (collection === 'term-fixed') {
			if (!Array.isArray(state.data.termFixed)) state.data.termFixed = [];
			state.data.termFixed.unshift(doc);
		} else if (collection === 'term-dynamic') {
			if (!Array.isArray(state.data.termDynamic)) state.data.termDynamic = [];
			state.data.termDynamic.unshift(doc);
		} else if (collection === 'card') {
			if (!Array.isArray(state.data.cards)) state.data.cards = [];
			state.data.cards.unshift(doc);
		} else if (collection === 'character') {
			if (!Array.isArray(state.data.characters)) state.data.characters = [];
			state.data.characters.unshift(doc);
		} else if (collection === 'skill') {
			ensureArraysForSkills();
			const s = Number(doc && doc.strength);
			if (s === 1) state.data.s1.unshift(doc);
			else if (s === 2) state.data.s2.unshift(doc);
			else state.data.s0.unshift(doc);
		}
	}

	function updateDocInState(collection, id, updater){
		if (!state.data) return false;
		const touch = (arr) => {
			if (!Array.isArray(arr)) return false;
			for (const doc of arr) {
				if (doc && String(doc._id) === String(id)) { updater(doc); return true; }
			}
			return false;
		};
		let updated = false;
		if (collection === 'term-fixed') updated = touch(state.data.termFixed);
		else if (collection === 'term-dynamic') updated = touch(state.data.termDynamic);
		else if (collection === 'card') updated = touch(state.data.cards);
		else if (collection === 'character') updated = touch(state.data.characters);
		else if (collection === 'skill') updated = touch(state.data.s0)||touch(state.data.s1)||touch(state.data.s2);
		// 兜底：全量扫描
		if (!updated) {
			for (const key of Object.keys(state.data)) { if (touch(state.data[key])) { updated = true; break; } }
		}
		return updated;
	}

	function removeDocFromState(collection, id){
		if (!state.data) return false;
		const rm = (arr) => {
			if (!Array.isArray(arr)) return false;
			const i = arr.findIndex(d => d && String(d._id) === String(id));
			if (i >= 0) { arr.splice(i, 1); return true; }
			return false;
		};
		if (collection === 'term-fixed') return rm(state.data.termFixed);
		if (collection === 'term-dynamic') return rm(state.data.termDynamic);
		if (collection === 'card') return rm(state.data.cards);
		if (collection === 'character') return rm(state.data.characters);
		if (collection === 'skill') return rm(state.data.s0) || rm(state.data.s1) || rm(state.data.s2);
		// 兜底：全量扫描
		for (const key of Object.keys(state.data)) { if (rm(state.data[key])) return true; }
		return false;
	}

	function deleteFieldInDocByPath(doc, path){
		const parts = String(path).split('.');
		let parent = doc;
		for (let i = 0; i < parts.length - 1; i++) {
			const k = parts[i];
			const key = /^\d+$/.test(k) ? Number(k) : k;
			parent = parent ? parent[key] : undefined;
		}
		const lastRaw = parts[parts.length - 1];
		const isIdx = /^\d+$/.test(lastRaw);
		const lastKey = isIdx ? Number(lastRaw) : lastRaw;
		if (Array.isArray(parent) && isIdx) parent.splice(lastKey, 1);
		else if (parent && typeof parent === 'object') delete parent[lastKey];
	}
  
	// 工具：按 dot path 设置对象的值，支持数组索引
	function setByPath(obj, path, value) {
		if (!obj || !path) return;
		const parts = path.split('.');
		let cursor = obj;
		for (let i = 0; i < parts.length; i++) {
			const k = parts[i];
			const isLast = i === parts.length - 1;
			const key = /^\d+$/.test(k) ? Number(k) : k;
			if (isLast) {
				cursor[key] = value;
			} else {
				if (cursor[key] == null || typeof cursor[key] !== 'object') {
					// 下一段是数字则建数组，否则建对象
					const nextIsIndex = /^\d+$/.test(parts[i+1] || '');
					cursor[key] = nextIsIndex ? [] : {};
				}
				cursor = cursor[key];
			}
		}
	}

	function setupSearch() {
		const inp = document.getElementById('tokens-search');
		if (!inp) return;
		inp.value = state.q;
		inp.oninput = function() {
			const val = (this.value || '').trim();
			state.q = val;
			// 防抖
			if (state.timer) clearTimeout(state.timer);
			state.timer = setTimeout(() => {
				renderTokensDashboard(false);
			}, 200);
		};
	}

	// 对数组按关键字进行过滤（对所有可见字段做字符串搜索）
	function filterByQuery(arr, q) {
		if (!q) return arr;
		q = q.toLowerCase();
		const hit = (v) => {
			if (v == null) return false;
			if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
				return String(v).toLowerCase().includes(q);
			}
			if (Array.isArray(v)) return v.some(hit);
			if (typeof v === 'object') return Object.keys(v).some(k => hit(v[k]));
			return false;
		};
		return (arr || []).filter(it => hit(it));
	}

	async function renderTokensDashboard(forceReload = false) {
		// 样式已移至外部文件 style/tokens.css
		const summaryEl = document.getElementById('tokens-summary');
		const contentEl = document.getElementById('tokens-content');
		if (!summaryEl || !contentEl) return;
	// 首屏或强制刷新时才显示摘要 loading；否则保持现有节点以便过渡
	if (!summaryEl.__initialized || forceReload) {
		summaryEl.innerHTML = '<div class="tokens-status tokens-status--loading">加载中…</div>';
	}
		contentEl.innerHTML = '';
	// 权限：仅管理员可新增/编辑
	const { canEdit } = getAuth();

	try {
			if (!state.data || forceReload) {
				const [termFixed, termDynamic, cards, characters, s0, s1, s2] = await Promise.all([
					apiJson('/term-fixed'),
					apiJson('/term-dynamic'),
					apiJson('/card'),
					apiJson('/character'),
					apiJson('/skill0'),
					apiJson('/skill1'),
					apiJson('/skill2')
				]);
				state.data = { termFixed, termDynamic, cards, characters, s0, s1, s2 };
			}
			const { termFixed, termDynamic, cards, characters, s0, s1, s2 } = state.data;
			const skills = ([]).concat(s0||[], s1||[], s2||[]);

			const tiles = [
				{ type: 'term-fixed', key: '静态术语', value: Array.isArray(termFixed)? termFixed.length : 0, color: '#EDF2F7' },
				{ type: 'term-dynamic', key: '动态术语', value: Array.isArray(termDynamic)? termDynamic.length : 0, color: '#E6FFFA' },
				{ type: 'card', key: '牌', value: Array.isArray(cards)? cards.length : 0, color: '#FEF3C7' },
				{ type: 'character', key: '武将', value: Array.isArray(characters)? characters.length : 0, color: '#E9D8FD' },
				{ type: 'skill', key: '技能', value: Array.isArray(skills)? skills.length : 0, color: '#C6F6D5' },
			];

			// 首次渲染创建摘要磁贴；之后仅更新类名与数值
			if (!summaryEl.__initialized || forceReload) {
				summaryEl.innerHTML = tiles.map(t => {
					const isActive = state.activeType === t.type;
					const active = isActive ? ' is-active' : '';
					const dim = state.activeType && !isActive ? ' is-dim' : '';
					return `
						<div class="type-tile${active}${dim}" data-type="${t.type}" role="button" tabindex="0" aria-pressed="${isActive}">
							<div class="type-tile__label">${t.key}</div>
							<div class="type-tile__value">${t.value}</div>
						</div>
					`;
				}).join('');
				summaryEl.__initialized = true;
			} else {
				// 更新现有节点
				const map = new Map(tiles.map(t => [t.type, t]));
				const nodes = summaryEl.querySelectorAll('.type-tile');
				nodes.forEach(node => {
					const tp = node.getAttribute('data-type');
					const conf = map.get(tp);
					if (!conf) return;
					const isActive = state.activeType === tp;
					node.classList.toggle('is-active', !!isActive);
					node.classList.toggle('is-dim', !!(state.activeType && !isActive));
					node.setAttribute('aria-pressed', isActive ? 'true' : 'false');
					const valEl = node.querySelector('.type-tile__value');
					if (valEl) valEl.textContent = String(conf.value);
				});
			}

	const section = (type, title, items, renderItem) => {
		const id = 'sec-' + Math.random().toString(36).slice(2,8);
		const total = Array.isArray(items)? items.length : 0;
		const shouldPreOpen = !!state.activeType && state.activeType === type && total > 1;
		// 收起时不显示任何对象：将所有条目放入可折叠区域；仅当 total <= 1 时直接展示
		const allItemsHtml = (items||[]).map(renderItem).join('');
		const collapsedAreaHtml = (total > 1)
			? ''
			: (allItemsHtml || '<div class="tokens-empty">空</div>');
		const html = `
				<div class="tokens-section">
					<div class="tokens-section__header">
						<div class=\"tokens-section__title\">${title} <span class=\"count-badge\">(${total})</span></div>
						<div class=\"tokens-section__ops\">
						${canEdit ? `<button class=\"btn btn--secondary btn--sm\" onclick=\"tokensOpenCreate('${type}')\">新增</button>` : ''}
						${total>1 ? `<button id=\"btn-${id}\" class=\"btn btn--secondary btn--sm expand-btn${shouldPreOpen ? ' is-expanded' : ''}\" aria-expanded=\"${shouldPreOpen ? 'true' : 'false'}\" onclick=\"toggleTokensSection('${id}')\">${shouldPreOpen ? '收起' : '展开'}</button>`: ''}
					</div>
				</div>
					<div id="${id}" data-expanded="${shouldPreOpen ? '1' : '0'}" class="tokens-section__body">
					<div class="token-list">
							${collapsedAreaHtml}
					</div>
					${total>1 ? `
							<div id=\"more-${id}\" class=\"js-more token-list collapsible tokens-section__more${shouldPreOpen ? ' is-open' : ''}\">
							${allItemsHtml}
						</div>
					` : ''}
				</div>
			</div>
		`;
		return html;
	};

			const HIDE_KEYS = new Set(['_id','__v','_v']);
			const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

			// 递归渲染所有属性，隐藏 _id/__v/_v，并对嵌套对象/数组分层展示
			const renderKV = (obj, level = 0, accent = null, basePath = '') => {
				if (!obj || typeof obj !== 'object') {
					return `<div class="kv-row" data-path="${esc(basePath)}">
						<div class="kv-key">value</div>
						<div class="kv-val" data-path="${esc(basePath)}" data-type="${typeof obj}" title="单击编辑">${esc(obj)}</div>
						<div class="kv-actions" role="组" aria-label="字段操作"><button class="btn-del" title="删除" aria-label="删除">删除</button></div>
					</div>`;
				}
				const parts = [];
				for (const k of Object.keys(obj)) {
					if (HIDE_KEYS.has(k)) continue;
					const v = obj[k];
					const curPath = basePath ? `${basePath}.${k}` : k;
					if (Array.isArray(v)) {
						const items = v.map((it, idx) => {
							if (isObj(it) || Array.isArray(it)) {
								const style = accent ? ` style="--token-accent:${esc(accent)}"` : '';
								return `<div class="arr-item"><div class="arr-index">#${idx}</div><div class="token-card"${style}>${renderKV(it, level+1, accent, `${curPath}.${idx}`)}</div></div>`;
							}
							return `<div class="kv-row" data-path="${esc(curPath)}.${idx}">
								<div class="kv-key">[${idx}]</div>
								<div class="kv-val" data-path="${esc(curPath)}.${idx}" data-type="${typeof it}" title="单击编辑">${esc(it)}</div>
								<div class="kv-actions" role="组" aria-label="字段操作"><button class="btn-del" title="删除" aria-label="删除">删除</button></div>
							</div>`;
						}).join('');
						parts.push(`
							<div class="nest-block"${accent ? ` style=\"--token-accent:${esc(accent)}\"` : ''}>
								<div class="nest-title">${esc(k)} [${v.length}]</div>
								<div class="nest-body">${items || '<div class="kv-row"><div class="kv-key">(空)</div><div class="kv-val"></div></div>'}</div>
							</div>
						`);
					} else if (isObj(v)) {
						parts.push(`
							<div class="nest-block"${accent ? ` style=\"--token-accent:${esc(accent)}\"` : ''}>
								<div class="nest-title">${esc(k)}</div>
								<div class="nest-body">${renderKV(v, level+1, accent, curPath)}</div>
							</div>
						`);
					} else {
						parts.push(`<div class="kv-row" data-path="${esc(curPath)}">
							<div class="kv-key">${esc(k)}</div>
							<div class="kv-val" data-path="${esc(curPath)}" data-type="${typeof v}" title="单击编辑">${esc(v)}</div>
							<div class="kv-actions" role="组" aria-label="字段操作"><button class="btn-del" title="删除" aria-label="删除">删除</button></div>
						</div>`);
					}
				}
				return parts.join('');
			};

			const getAccent = (o) => {
				const v = (o && typeof o.color === 'string') ? o.color.trim() : '';
				if (!v) return null;
				// 仅允许安全颜色值：十六进制或英文命名色
				if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)) return v;
				if (/^[a-zA-Z]+$/.test(v)) return v;
				return null;
			};
			// 计算浅色背景：将颜色与白色按比例混合（更浅）
			const computeTint = (col, ratio = 0.95) => {
				if (!col) return '';
				const hexToRgb = (h) => {
					let r,g,b;
					if (/^#([\da-fA-F]{3})$/.test(h)) {
						const m = h.slice(1);
						r = parseInt(m[0] + m[0], 16);
						g = parseInt(m[1] + m[1], 16);
						b = parseInt(m[2] + m[2], 16);
						return {r,g,b};
					}
					if (/^#([\da-fA-F]{6})$/.test(h)) {
						const m = h.slice(1);
						r = parseInt(m.slice(0,2),16);
						g = parseInt(m.slice(2,4),16);
						b = parseInt(m.slice(4,6),16);
						return {r,g,b};
					}
					return null;
				};
				const rgb = hexToRgb(col);
				if (rgb) {
					const r = Math.round(rgb.r * (1 - ratio) + 255 * ratio);
					const g = Math.round(rgb.g * (1 - ratio) + 255 * ratio);
					const b = Math.round(rgb.b * (1 - ratio) + 255 * ratio);
					return `rgba(${r}, ${g}, ${b}, 1)`;
				}
				// 命名色：使用 color-mix 作为回退
				return `color-mix(in srgb, ${col} ${Math.round(ratio*100)}%, white)`;
			};

	const tagAttrs = (coll, obj) => ` data-coll="${coll}" data-id="${esc(obj && obj._id || '')}"`;
	function cardShell(coll, obj, innerHtml) {
		const col = getAccent(obj);
		const style = col ? ` style="--token-accent:${esc(col)}; --token-bg:${esc(computeTint(col))}; border-left:3px solid ${esc(col)}"` : '';
			const { canEdit } = getAuth();
			return `<div class="token-card"${style}${tagAttrs(coll, obj)}>
				${canEdit ? `<div class="token-card__toolbar" role="工具栏" aria-label="对象操作">` +
					`<button class="btn btn--danger btn--xs btn-del-doc" title="删除对象" aria-label="删除对象">删除对象</button>` +
				`</div>` : ''}
				${innerHtml}
			</div>`;
	}
	const termFixedItem = (t) => cardShell('term-fixed', t, renderKV(t, 0, getAccent(t), ''));
	const termDynamicItem = (t) => cardShell('term-dynamic', t, renderKV(t, 0, getAccent(t), ''));
	const cardItem = (c) => cardShell('card', c, renderKV(c, 0, getAccent(c), ''));
	const characterItem = (ch) => cardShell('character', ch, renderKV(ch, 0, getAccent(ch), ''));
	const skillItem = (s) => cardShell('skill', s, renderKV(s, 0, getAccent(s), ''));

			// 过滤后的视图
			const q = state.q;
			const sections = [
				{ type: 'term-fixed', title: '静态术语', items: Array.isArray(termFixed)? filterByQuery(termFixed, q): [], render: termFixedItem },
				{ type: 'term-dynamic', title: '动态术语', items: Array.isArray(termDynamic)? filterByQuery(termDynamic, q): [], render: termDynamicItem },
				{ type: 'card', title: '牌', items: Array.isArray(cards)? filterByQuery(cards, q): [], render: cardItem },
				{ type: 'character', title: '武将', items: Array.isArray(characters)? filterByQuery(characters, q): [], render: characterItem },
				{ type: 'skill', title: '技能', items: Array.isArray(skills)? filterByQuery(skills, q): [], render: skillItem },
			];
			const filteredSections = state.activeType ? sections.filter(s => s.type === state.activeType) : sections;
				const html = filteredSections.map(s => section(s.type, s.title, s.items, s.render)).join('');
			contentEl.innerHTML = html;
			// 为新渲染的卡片添加入场延迟（交错动画）
			try {
				const cards = contentEl.querySelectorAll('.token-card');
				cards.forEach((el, i) => {
					const delay = Math.min(i, 12) * 40; // 最多 12 个交错
					el.style.setProperty('--enter-delay', delay + 'ms');
				});
			} catch (_) {}
			setupSearch();
			// 绑定类型筛选（只绑定一次）
			(function setupTypeFilter(){
				if (summaryEl.__bindTypeFilter) return;
				summaryEl.__bindTypeFilter = true;
				const handler = (ev) => {
					const t = ev.target && ev.target.closest ? ev.target.closest('.type-tile') : null;
					if (!t) return;
					const tp = t.getAttribute('data-type');
					if (!tp) return;
					// 单选：再次点击取消筛选
					state.activeType = (state.activeType === tp) ? null : tp;
					renderTokensDashboard(false);
				};
				summaryEl.addEventListener('click', handler);
				summaryEl.addEventListener('keydown', (e) => {
					if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(e); }
				});
			})();

	// 启用编辑/删除（仅管理员）
			if (canEdit) {
				if (!contentEl.__inlineEditBound) { enableInlineEdit(contentEl); contentEl.__inlineEditBound = true; }
				if (!contentEl.__inlineDeleteBound) { enableInlineDelete(contentEl); contentEl.__inlineDeleteBound = true; }
				if (!contentEl.__deleteDocBound) { enableDeleteDoc(contentEl); contentEl.__deleteDocBound = true; }
			}
		} catch (e) {
			console.error('加载词元数据失败:', e);
	summaryEl.innerHTML = '<div class="tokens-status tokens-status--error">加载失败，请点击“刷新”重试</div>';
		}
	}

	// 初次进入页面时预取一次，便于用户切到该页立即可见
	document.addEventListener('DOMContentLoaded', function(){
		try {
	const { role } = getAuth();
			if (role === 'admin') renderTokensDashboard();
		} catch(e){}
		// Ctrl 键按下状态：用于启用危险操作 UI（删除对象）
		try {
			const setCtrl = (down) => {
				if (down) document.body.classList.add('ctrl-down');
				else document.body.classList.remove('ctrl-down');
			};
			let ctrlLatch = false;
			window.addEventListener('keydown', (e) => {
				if (e.ctrlKey && !ctrlLatch) { ctrlLatch = true; setCtrl(true); }
			});
			window.addEventListener('keyup', (e) => {
				// 当 Ctrl 松开或任意键事件报告 ctrlKey=false 时清除
				if (!e.ctrlKey) { ctrlLatch = false; setCtrl(false); }
			});
			window.addEventListener('blur', () => { ctrlLatch = false; setCtrl(false); });
		} catch(_){}
	});

	// 暴露到全局用于手动刷新
	window.renderTokensDashboard = renderTokensDashboard;
	// 动画展开/收起区块
	window.toggleTokensSection = function(baseId){
		try {
			const root = document.getElementById(baseId);
			if (!root) return;
			const btn = document.getElementById('btn-' + baseId);
			const more = document.getElementById('more-' + baseId) || root.querySelector('.js-more');
			if (!more) return;

			const expanded = root.getAttribute('data-expanded') === '1';
	const transitionMs = 400; // 与 CSS .collapsible 的高度过渡时长对齐
			const setBtn = (isOpen) => {
				if (btn) {
					btn.textContent = isOpen ? '收起' : '展开';
					btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
					btn.classList.toggle('is-expanded', isOpen);
				}
			};

			const onEnd = (cb) => {
				let called = false;
				const handler = () => { if (called) return; called = true; more.removeEventListener('transitionend', handler); cb && cb(); };
				more.addEventListener('transitionend', handler, { once: true });
				// 保险兜底
				setTimeout(handler, transitionMs + 50);
			};

			if (!expanded) {
				// 展开
				more.style.display = 'block';
				more.classList.add('is-opening');
				more.style.height = '0px';
				// 强制回流以应用初始高度
				void more.offsetHeight;
				const target = more.scrollHeight;
				more.style.height = target + 'px';
				onEnd(() => {
					more.classList.remove('is-opening');
					more.classList.add('is-open');
					more.style.height = 'auto';
				});
				root.setAttribute('data-expanded', '1');
				setBtn(true);
			} else {
				// 收起
				const from = more.scrollHeight;
				more.style.height = from + 'px';
				// 强制回流
				void more.offsetHeight;
				more.classList.remove('is-open');
				more.classList.add('is-closing');
				more.style.height = '0px';
				onEnd(() => {
					more.classList.remove('is-closing');
					more.style.display = 'none';
					more.style.height = '0px';
				});
				root.setAttribute('data-expanded', '0');
				setBtn(false);
			}
		} catch(_){}
	};
	window.tokensRefresh = function(){
		state.data = null; // 强制重新拉取
		renderTokensDashboard(true);
	};
	// —— 新增：打开创建弹窗 ——
	window.tokensOpenCreate = async function(collection){
		try {
			// 优先从已存在对象推导结构方案
			const dataArr = await getCollectionData(collection);
			const variants = computeCollectionVariants(collection, dataArr || []);
			if (variants && variants.length > 0) {
				showCreateModal(collection, null, variants[0].tpl, variants);
				return;
			}
			// 兜底：没有历史对象，退回到后端 shape
	const shape = await apiJson(`/tokens/shape?collection=${encodeURIComponent(collection)}`, { auth: true });
			const tpl = buildTemplate(collection, shape);
			showCreateModal(collection, shape, tpl, null);
		} catch (e) {
			alert(e.message || '获取结构失败');
		}
	};

	// 拉取对应集合的数据（若 state.data 不完整则单独获取）
	async function getCollectionData(collection){
		try {
			if (!state.data) state.data = {};
			const conf = COLLECTIONS[collection];
			if (!conf) return [];
			if (collection === 'skill') {
				// 聚合 s0/s1/s2
				if (!state.data.s0 || !state.data.s1 || !state.data.s2) {
					const [s0, s1, s2] = await Promise.all([
						apiJson(conf.urls[0]),
						apiJson(conf.urls[1]),
						apiJson(conf.urls[2]),
					]);
					state.data.s0 = s0 || [];
					state.data.s1 = s1 || [];
					state.data.s2 = s2 || [];
				}
				return ([]).concat(state.data.s0||[], state.data.s1||[], state.data.s2||[]);
			}
			if (!state.data[conf.key]) {
				const arr = await apiJson(conf.url);
				state.data[conf.key] = arr || [];
			}
			return state.data[conf.key] || [];
		} catch(_) { return []; }
	}

	// —— 结构推导与模板生成 ——
	function deriveSchema(val){
		if (val === null || val === undefined) return { kind: 'null' };
		if (Array.isArray(val)) {
			if (val.length === 0) return { kind: 'arr', elem: { kind: 'empty' } };
			const elemSchemas = val.map(deriveSchema);
			const merged = mergeSchemas(elemSchemas);
			return { kind: 'arr', elem: merged };
		}
		const t = typeof val;
		if (t === 'string') return { kind: 'str' };
		if (t === 'number') return { kind: 'num' };
		if (t === 'boolean') return { kind: 'bool' };
		if (t === 'object') {
			const keys = Object.keys(val).filter(k => k !== '_id' && k !== '__v' && k !== '_v');
			keys.sort();
			const fields = {};
			for (const k of keys) fields[k] = deriveSchema(val[k]);
			return { kind: 'obj', fields };
		}
		return { kind: 'unknown' };
	}

	function mergeSchemas(schemas){
		if (!schemas || schemas.length === 0) return { kind: 'empty' };
		// 如果都是原始同类，保留该类
		const kinds = new Set(schemas.map(s => s && s.kind));
		if (kinds.size === 1) {
			const kind = schemas[0].kind;
			if (kind === 'obj') {
				const allKeys = new Set();
				schemas.forEach(s => { Object.keys(s.fields||{}).forEach(k => allKeys.add(k)); });
				const fields = {};
				Array.from(allKeys).sort().forEach(k => {
					const subs = schemas.map(s => (s.fields||{})[k]).filter(Boolean);
					fields[k] = mergeSchemas(subs);
				});
				return { kind: 'obj', fields };
			}
			if (kind === 'arr') {
				const elems = schemas.map(s => s.elem).filter(Boolean);
				return { kind: 'arr', elem: mergeSchemas(elems) };
			}
			return { kind };
		}
		// 混合类型，使用 union（对数组则合并 elem；对对象则合并字段）
		const hasObj = schemas.some(s => s.kind === 'obj');
		const hasArr = schemas.some(s => s.kind === 'arr');
		if (hasObj) {
			const objSchemas = schemas.filter(s => s.kind === 'obj');
			return mergeSchemas([{ kind: 'obj', fields: {} }, ...objSchemas]);
		}
		if (hasArr) {
			const arrSchemas = schemas.filter(s => s.kind === 'arr');
			const elems = arrSchemas.map(s => s.elem).filter(Boolean);
			return { kind: 'arr', elem: mergeSchemas(elems) };
		}
		// 不同原始类型，降级为 unknown
		return { kind: 'unknown' };
	}

	function schemaSignature(s){
		if (!s) return 'null';
		switch(s.kind){
			case 'str': case 'num': case 'bool': case 'null': case 'unknown': case 'empty': return s.kind;
			case 'arr': return `arr<${schemaSignature(s.elem)}>`;
			case 'obj': {
				const keys = Object.keys(s.fields||{}).sort();
				const inner = keys.map(k => `${k}:${schemaSignature(s.fields[k])}`).join(',');
				return `{${inner}}`;
			}
			default: return 'unknown';
		}
	}

	function skeletonFromSchema(s){
		switch(s && s.kind){
			case 'str': return '';
			case 'num': return 0;
			case 'bool': return false;
			case 'null': return '';
			case 'unknown': return '';
			case 'empty': return [];
			case 'arr': {
				const elem = s.elem || { kind: 'str' };
				// 为对象元素提供一个原型，原始元素则提供一个示例值
				if (elem.kind === 'obj') return [ skeletonFromSchema(elem) ];
				if (elem.kind === 'arr') return [ skeletonFromSchema(elem) ];
				return [ skeletonFromSchema(elem) ];
			}
			case 'obj': {
				const out = {};
				const keys = Object.keys(s.fields||{}).sort();
				for (const k of keys) out[k] = skeletonFromSchema(s.fields[k]);
				return out;
			}
			default: return '';
		}
	}

	function flattenHintsFromSchema(s, base=''){ const out=[]; _flatten(s, base); return out; function _flatten(sch, p){
		if (!sch) return; const dot=(k)=> p?`${p}.${k}`:k;
		switch(sch.kind){
			case 'str': case 'num': case 'bool': case 'null': case 'unknown':
				out.push({ name: p || '(root)', type: sch.kind }); break;
			case 'arr': {
				const t = schemaSignature(sch.elem);
				if (sch.elem && sch.elem.kind === 'obj') {
					// 展开对象元素字段
					_flatten(sch.elem, (p?`${p}`:p) + '[]');
				} else {
					out.push({ name: (p?`${p}`:p) + '[]', type: `Array<${t}>` });
				}
				break;
			}
			case 'obj': {
				const keys = Object.keys(sch.fields||{}).sort();
				if (!p && keys.length===0) out.push({ name: '(root)', type: 'obj' });
				for (const k of keys) _flatten(sch.fields[k], dot(k));
				break;
			}
		}
	}}

	function applyCollectionDefaults(collection, obj, shape){
		// 在基于结构的骨架上补充一些友好的默认字段
		try {
			if (collection === 'character') {
				if (shape && shape.suggest && shape.suggest.nextId != null && obj.id == null) obj.id = shape.suggest.nextId;
				if (obj.name == null) obj.name = '新武将';
				if (obj.health == null) obj.health = 1;
				if (obj.dominator == null) obj.dominator = 0;
			} else if (collection === 'card') {
				if (obj.en == null) obj.en = 'new_card_en';
				if (obj.cn == null) obj.cn = '新卡牌';
				if (obj.type == null) obj.type = '';
			} else if (collection === 'term-fixed') {
				if (obj.en == null) obj.en = 'term_key';
				if (obj.cn == null) obj.cn = '术语中文';
				if (!Array.isArray(obj.part)) obj.part = [];
				if (!Array.isArray(obj.epithet)) obj.epithet = [];
			} else if (collection === 'term-dynamic') {
				if (obj.en == null) obj.en = 'term_key';
				if (!Array.isArray(obj.part)) obj.part = [];
			} else if (collection === 'skill') {
				if (obj.name == null) obj.name = '新技能';
				if (obj.content == null) obj.content = '技能描述';
				if (obj.strength == null) obj.strength = 0;
				if (!Array.isArray(obj.role)) obj.role = [];
			}
		} catch(_){}
		return obj;
	}

	function computeCollectionVariants(collection, arr){
		const map = new Map(); // sig -> { schema, count, samples: [] }
		for (const doc of Array.isArray(arr)? arr : []){
			const schema = deriveSchema(doc || {});
			const sig = schemaSignature(schema);
			let cur = map.get(sig);
			if (!cur) { cur = { schema, count: 0, samples: [] }; map.set(sig, cur); }
			cur.count += 1;
			if (cur.samples.length < 3) cur.samples.push(doc);
		}
		const list = Array.from(map.values()).map((it, idx) => {
	// 仅按方案结构生成骨架，不注入集合级默认字段，避免出现提示面板无而 JSON 中有的键
	const base = skeletonFromSchema(it.schema);
			const tpl = base;
			const hints = flattenHintsFromSchema(it.schema);
			return { id: `scheme-${idx+1}`, count: it.count, schema: it.schema, tpl, hints, samples: it.samples };
		});
		// 按字段多寡降序，其次按出现次数降序，优先更“完整”的方案
		list.sort((a,b)=>{
			const ak = a.hints.length, bk = b.hints.length;
			if (bk !== ak) return bk - ak;
			return b.count - a.count;
		});
		return list;
	}

	function buildTemplate(collection, shape){
		const byTypeDefault = (t) => t === 'String' ? '' : t === 'Number' ? 0 : t === 'Boolean' ? false : t === 'Array' ? [] : {};
		const obj = {};
	const fields = Array.isArray(shape && shape.fields) ? shape.fields : [];
	const arrayBases = new Set(); // 记录诸如 part[].* 的顶层数组基名
	const arrayChildren = new Map(); // base => [childPath relative to each item]

		// 使用 dot-path 赋值，支持创建嵌套对象/数组
		const setDefaultByPath = (path, defVal) => {
			try { setByPath(obj, path, defVal); } catch(_) {}
		};

		for (const f of fields) {
			const raw = f && f.name;
			if (!raw) continue;
			if (raw === '_id' || raw === '__v') continue;

			// 收集数组基名，如 part[] 或 part[].cn
			if (raw.includes('[]')) {
				try {
					const base = raw.slice(0, raw.indexOf('[]'));
					if (base) {
						arrayBases.add(base);
						const after = raw.slice(raw.indexOf('[]') + 2); // e.g. ".cn" or ".meta.en"
						if (after.startsWith('.')) {
							const rel = after.slice(1);
							if (rel) {
								if (!arrayChildren.has(base)) arrayChildren.set(base, []);
								arrayChildren.get(base).push(rel);
							}
						}
					}
				} catch(_) {}
			}

			// 处理数组字段标记：例如 foo[]
			if (raw.endsWith('[]')) {
				if (f.required) {
					const base = raw.slice(0, -2); // 去掉 []
					const def = Array.isArray(f.default) ? f.default : [];
					setDefaultByPath(base, def);
				}
				continue;
			}

			if (f.required) {
				const def = (f.default !== undefined) ? f.default : byTypeDefault(f.type);
				setDefaultByPath(raw, def);
			}
		}

		// 额外：为存在点路径的子字段填充默认值（即使非必填），避免父对象为空壳（例如 part.cn）
		for (const f of fields) {
			const raw = f && f.name;
			if (!raw || raw === '_id' || raw === '__v') continue;
			if (raw.includes('.')) {
				const normalized = raw.replace(/\[\]/g, '');
				const def = (f.default !== undefined) ? f.default : byTypeDefault(f.type);
				setDefaultByPath(normalized, def);
			}
		}

		// 将收集到的数组基名统一初始化为 []（若当前不是数组），并根据子字段生成一个原型元素
		for (const base of arrayBases) {
			if (!Array.isArray(obj[base])) obj[base] = [];
			try {
				const children = arrayChildren.get(base) || [];
				if (obj[base].length === 0 && children.length > 0) {
					const proto = {};
					for (const rel of children) {
						const defField = fields.find(ff => ff.name && (ff.name === `${base}[].${rel}`));
						const defVal = defField && defField.default !== undefined ? defField.default : byTypeDefault(defField ? defField.type : 'String');
						setByPath(proto, rel, defVal);
					}
					obj[base].push(proto);
				}
			} catch(_) {}
		}

	// 统一使用 applyCollectionDefaults 以避免重复代码
	return applyCollectionDefaults(collection, obj, shape);
	}

	function ensureCreateModal(){
		let backdrop = document.getElementById('tokens-create-backdrop');
		let modal = document.getElementById('tokens-create-modal');
		if (!backdrop) {
			backdrop = document.createElement('div');
			backdrop.id = 'tokens-create-backdrop';
			backdrop.className = 'modal-backdrop';
			document.body.appendChild(backdrop);
		}
		if (!modal) {
			modal = document.createElement('div');
			modal.id = 'tokens-create-modal';
			modal.className = 'modal approve-modal';
			modal.innerHTML = `
				<div class="modal-header"><h2>新增对象</h2></div>
				<div class="modal-form">
					<div id="tokens-create-hints"></div>
					<textarea id="tokens-create-editor"></textarea>
					<div id="tokens-create-actions" class="tokens-create-actions">
						<button type="button" class="btn btn--secondary" id="tokens-create-cancel">取消</button>
						<button type="button" class="btn btn--primary" id="tokens-create-submit">创建</button>
					</div>
				</div>`;
			document.body.appendChild(modal);
			backdrop.addEventListener('click', hideCreateModal);
			document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideCreateModal(); });
		}
		return { backdrop, modal };
	}

	function showCreateModal(collection, shape, tpl, variants){
		const { backdrop, modal } = ensureCreateModal();
		const editor = modal.querySelector('#tokens-create-editor');
		const hints = modal.querySelector('#tokens-create-hints');
		const btnCancel = modal.querySelector('#tokens-create-cancel');
		const btnSubmit = modal.querySelector('#tokens-create-submit');
		const schemeBoxId = 'tokens-create-variants';
		let schemeBox = modal.querySelector('#' + schemeBoxId);
		if (!schemeBox) {
			const form = modal.querySelector('.modal-form');
			schemeBox = document.createElement('div');
			schemeBox.id = schemeBoxId;
			schemeBox.className = 'tokens-scheme';
			form.insertBefore(schemeBox, form.firstElementChild);
		}
		// 仅在 shape 回退路径下做规范化，避免在方案路径增加额外键
		if (shape) {
			try {
				const normArr = (val) => Array.isArray(val) ? val : [];
				const pushProtoIfEmpty = (arr, base, fields) => {
					try {
						if (!Array.isArray(arr)) return arr;
						if (arr.length > 0) return arr;
						// 从 shape.fields 提取 base 的子字段原型
						const proto = {};
						const childPrefix = `${base}[].`;
						const list = Array.isArray(fields) ? fields : [];
						list.forEach(ff => {
							if (!ff || !ff.name) return;
							if (ff.name.startsWith(childPrefix)) {
								const rel = ff.name.slice(childPrefix.length);
								const def = ff.default !== undefined ? ff.default : (ff.type || '').toLowerCase() === 'number' ? 0 : (ff.type || '').toLowerCase() === 'boolean' ? false : '';
								try { setByPath(proto, rel, def); } catch(_) {}
							}
						});
						// 若未从结构推断出任何子键，给出常见原型
						if (Object.keys(proto).length === 0) {
							proto.cn = '';
							proto.en = '';
						}
						arr.push(proto);
						return arr;
					} catch (_) { return arr; }
				};
				if (collection === 'term-fixed') {
					tpl.part = normArr(tpl.part);
					tpl.part = pushProtoIfEmpty(tpl.part, 'part', shape && shape.fields);
					tpl.epithet = normArr(tpl.epithet);
					// epithet 的子项可能只有 cn
					if (Array.isArray(tpl.epithet) && tpl.epithet.length === 0) tpl.epithet.push({ cn: '' });
				} else if (collection === 'term-dynamic') {
					tpl.part = normArr(tpl.part);
					tpl.part = pushProtoIfEmpty(tpl.part, 'part', shape && shape.fields);
				}
			} catch(_) {}
		}
	const fields = shape && Array.isArray(shape.fields) ? shape.fields : [];
		function renderHintsFromVariants(curTpl, curVariants){
			// 工具：按 schema 裁剪 sample，仅保留方案字段；并隐藏内部键
			const HIDE = new Set(['_id','__v','_v']);
			const stripHidden = (v) => {
				if (!v || typeof v !== 'object') return v;
				if (Array.isArray(v)) return v.map(stripHidden);
				const o = {};
				for (const k of Object.keys(v)) { if (!HIDE.has(k)) o[k] = stripHidden(v[k]); }
				return o;
			};
			const pruneBySchema = (val, sch) => {
				if (!sch) return stripHidden(val);
				switch (sch.kind) {
					case 'str': case 'num': case 'bool': case 'null': case 'unknown': return val;
					case 'arr': {
						const a = Array.isArray(val) ? val : [];
						return a.slice(0, 3).map(it => pruneBySchema(it, sch.elem));
					}
					case 'obj': {
						const out = {};
						const keys = Object.keys(sch.fields||{});
						for (const k of keys) { if (val && Object.prototype.hasOwnProperty.call(val, k)) out[k] = pruneBySchema(val[k], sch.fields[k]); }
						return out;
					}
					default: return val;
				}
			};
			if (curVariants && curVariants.length) {
				// 取当前模板对应的 schema hints（通过比对字符串化匹配）
				const match = curVariants.find(v => JSON.stringify(v.tpl) === JSON.stringify(curTpl));
				const hintRows = (match ? match.hints : []).map(h => {
					const badge = `(${h.type})`;
			return `<div class="hint-row"><div class="hint-name">${esc(h.name)}</div><div class="hint-type">${esc(badge)}</div></div>`;
				}).join('');
				// 示例：取该方案归组下的第一个样本，按方案 schema 裁剪后展示
				let sampleHtml = '';
				try {
					const sample = match && Array.isArray(match.samples) && match.samples[0];
					if (sample) {
						const pruned = pruneBySchema(stripHidden(sample), match.schema);
						const pretty = esc(JSON.stringify(pruned, null, 2));
						sampleHtml = `<div class="variant-sample"><div class="variant-sample__title">示例对象</div><pre class="variant-sample__pre">${pretty}</pre></div>`;
					}
				} catch(_) {}
				hints.innerHTML = `<div class="hints-title"><strong>${collection}</strong> 结构字段：</div><div class="hints-list">${hintRows || '无'}</div>${sampleHtml}`;
				return;
			}
			// fallback 到 shape.fields
			const list = (fields
				.filter(f => !f.name.endsWith('[]') && f.name !== '_id' && f.name !== '__v')
				.map(f => {
					const badge = `(${f.type}${f.enum ? ': ' + f.enum.join('|') : ''})`;
					const bullet = f.required ? '•' : '○';
					return `
						<div class="hint-row">
				<div class="hint-name">${bullet} ${esc(f.name)}</div>
				<div class="hint-type">${esc(badge)}</div>
						</div>`;
				})
				.join(''));
			const extra = shape && shape.suggest && shape.suggest.mixedKeys && shape.suggest.mixedKeys.length
				? `<div class="hints-extra">可能的可选键：${shape.suggest.mixedKeys.slice(0,20).join(', ')}${shape.suggest.mixedKeys.length>20?' …':''}</div>`
				: '';
			hints.innerHTML = `<div class="hints-title"><strong>${collection}</strong> 字段（• 必填）：</div><div class="hints-list">${list || '无'}</div>${extra}`;
		}

		// 渲染方案选择器（改为分段按钮，支持键盘导航）
		function renderSchemeSelector(curVariants) {
			if (!curVariants || curVariants.length === 0) { schemeBox.innerHTML = ''; schemeBox.__variants = []; return; }
			schemeBox.__variants = curVariants;
			const groupHtml = `
				<div class="tokens-scheme__title">结构方案：</div>
				<div class="tokens-scheme__group" role="radiogroup" aria-label="结构方案">
					${curVariants.map((v, i) => {
						const idx = i + 1;
						const selCls = i === 0 ? ' is-selected' : '';
						const aria = i === 0 ? 'true' : 'false';
						const tab = i === 0 ? '0' : '-1';
						const title = `方案${idx}，样本 ${v.count}`;
						return `<div class="tokens-scheme__btn${selCls}" role="radio" aria-checked="${aria}" tabindex="${tab}" data-index="${i}" title="${esc(title)}">
							<span class="idx">${idx}</span>
							<span class="cnt">${v.count}</span>
							<span class="label">方案${idx}</span>
						</div>`;
					}).join('')}
				</div>`;
			schemeBox.innerHTML = groupHtml;

			// 选择并应用某个方案
			const selectIdx = (idx) => {
				try {
					const variantsList = schemeBox.__variants || [];
					if (!Number.isFinite(idx) || idx < 0 || idx >= variantsList.length) return;
					const btns = Array.from(schemeBox.querySelectorAll('.tokens-scheme__btn'));
					btns.forEach((b, i) => {
						const on = i === idx;
						b.classList.toggle('is-selected', on);
						b.setAttribute('aria-checked', on ? 'true' : 'false');
						b.setAttribute('tabindex', on ? '0' : '-1');
					});
					schemeBox.dataset.selectedIndex = String(idx);
					const v = variantsList[idx];
					if (v) {
						editor.value = JSON.stringify(v.tpl || {}, null, 2);
						renderHintsFromVariants(v.tpl, variantsList);
					}
				} catch(_) {}
			};

			// 只绑定一次事件，数据用 schemeBox.__variants 动态读取
			if (!schemeBox.__bound) {
				schemeBox.__bound = true;
				schemeBox.addEventListener('click', (e) => {
					const btn = e.target && e.target.closest ? e.target.closest('.tokens-scheme__btn') : null;
					if (!btn) return;
					const idx = Number(btn.getAttribute('data-index'));
					if (!Number.isFinite(idx)) return;
					selectIdx(idx);
				});
				schemeBox.addEventListener('keydown', (e) => {
					const btns = Array.from(schemeBox.querySelectorAll('.tokens-scheme__btn'));
					if (btns.length === 0) return;
					const cur = Number(schemeBox.dataset.selectedIndex || '0');
					let next = cur;
					if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { next = (cur + 1) % btns.length; e.preventDefault(); }
					else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { next = (cur - 1 + btns.length) % btns.length; e.preventDefault(); }
					else if (e.key === 'Home') { next = 0; e.preventDefault(); }
					else if (e.key === 'End') { next = btns.length - 1; e.preventDefault(); }
					else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectIdx(cur); btns[cur].focus(); return; }
					else { return; }
					selectIdx(next);
					try { btns[next].focus(); } catch(_) {}
				});
			}

			// 初始化到第一个方案
			selectIdx(0);
		}

		renderSchemeSelector(variants);
		renderHintsFromVariants(tpl, variants);
		editor.value = JSON.stringify(tpl || {}, null, 2);
		const submit = async () => {
			try {
	let payload;
				try { payload = JSON.parse(editor.value); } catch (_) { throw new Error('JSON 不合法'); }
	const out = await apiJson('/tokens/create', { method: 'POST', auth: true, body: { collection, data: payload } });
	const doc = out && out.doc;
				// 更新缓存
	try { pushDocToState(collection, doc); } catch(_){ }
				hideCreateModal();
				try { showTokensToast('创建成功'); } catch(_){}
				renderTokensDashboard(false);
			} catch (e) {
				alert(e.message || '创建失败');
			}
		};
		btnCancel.onclick = hideCreateModal;
		btnSubmit.onclick = submit;
		// 与全局弹窗一致：先设置 display，再在下一帧添加 show 以触发过渡
		backdrop.style.display = 'block';
		modal.style.display = 'block';
		requestAnimationFrame(() => {
			backdrop.classList.add('show');
			modal.classList.add('show');
		});
		setTimeout(() => { try { editor.focus(); } catch(_){} }, 80);
	}

	function hideCreateModal(){
		const backdrop = document.getElementById('tokens-create-backdrop');
		const modal = document.getElementById('tokens-create-modal');
		if (backdrop) backdrop.classList.remove('show');
		if (modal) modal.classList.remove('show');
		// 动画结束后恢复为 display:none，避免拦截点击
		setTimeout(() => {
			const bd = document.getElementById('tokens-create-backdrop');
			const md = document.getElementById('tokens-create-modal');
			if (bd && !bd.classList.contains('show')) bd.style.display = 'none';
			if (md && !md.classList.contains('show')) md.style.display = 'none';
		}, 320);
	}
  
	// 事件委托与更新逻辑
	function enableInlineEdit(rootEl) {
	if (rootEl.__inlineEditBound) return; rootEl.__inlineEditBound = true;
		rootEl.addEventListener('click', function(ev) {
	// 按住 Ctrl 时禁用属性编辑，保留整对象删除入口
	if (ev.ctrlKey || document.body.classList.contains('ctrl-down')) return;
			const host = ev.target && ev.target.closest ? ev.target.closest('.kv-val') : null;
			if (!host) return;
			const target = host;
			// 若已有其他编辑框，先关闭它，避免两个动画叠加
			const openEditing = rootEl.querySelector('.kv-val[data-editing="1"]');
			if (openEditing && openEditing !== target) {
				// 找到其输入框，触发一次安全的还原
				const old = openEditing.getAttribute('data-old-text') || '';
				openEditing.textContent = old;
				openEditing.removeAttribute('data-editing');
				openEditing.removeAttribute('data-old-text');
				openEditing.classList.remove('is-editing','is-saving');
			}
			const path = target.getAttribute('data-path');
			// 屏蔽非法或空路径、隐藏字段
			if (!path || path.startsWith('_') || path.includes('.__v')) return;
			const type = target.getAttribute('data-type') || 'string';
	// 向上查找带数据属性的卡片（顶层 token-card 才有 data-coll/data-id）
	const tokenCard = target.closest('.token-card[data-coll][data-id]');
			if (!tokenCard) return;
			const coll = tokenCard.getAttribute('data-coll');
			const id = tokenCard.getAttribute('data-id');
			if (!coll || !id) return;

	// 避免重复编辑同一元素
	if (target.getAttribute('data-editing') === '1') return;
	// 若内部已有输入控件（点击到控件本身），则忽略
	if (target.querySelector('.inline-edit')) return;
		target.setAttribute('data-editing', '1');
	const oldText = target.textContent;
	// 存储原始文本，便于在强制关闭上一个编辑框时准确还原
	target.setAttribute('data-old-text', oldText);
	// 标记编辑态，使用 CSS 控制视觉而非内联阴影
	target.classList.add('is-editing');

	// 判断是否颜色字段（更严格）：仅当键名以 color 结尾，或值为十六进制/函数色值
	const looksLikeHex = (s) => /^#([\da-fA-F]{3}|[\da-fA-F]{4}|[\da-fA-F]{6}|[\da-fA-F]{8})$/.test((s||'').trim());
	const looksLikeFuncColor = (s) => /^(?:rgb|rgba|hsl|hsla)\s*\(/i.test((s||'').trim());
	const endsWithColorKey = /(^|\.)color$/i.test(path);
	const isColorField = endsWithColorKey || looksLikeHex(oldText) || looksLikeFuncColor(oldText);

	let input; // 将用于提交的输入控件
	let colorPicker = null;
	const applyPreview = (val) => {
		try {
			if (!tokenCard || !val) return;
			const col = String(val).trim();
			if (!col) return;
			const tint = computeTint(col);
			tokenCard.style.setProperty('--token-accent', col);
			if (tint) tokenCard.style.setProperty('--token-bg', tint);
			tokenCard.style.borderLeft = `3px solid ${col}`;
		} catch(_){}
	};

	if (isColorField) {
		const wrap = document.createElement('div');
		wrap.className = 'inline-edit-color';
	// 入场动画触发：先加 is-enter 再下一帧移除
	try { wrap.classList.add('is-enter'); requestAnimationFrame(() => { try { wrap.classList.remove('is-enter'); } catch(_){} }); } catch(_){ }
		colorPicker = document.createElement('input');
		colorPicker.type = 'color';
		colorPicker.className = 'color-picker';
		const to6Hex = (s) => {
			s = (s||'').trim();
			if (!s.startsWith('#')) return null;
			const hex = s.slice(1);
			if (hex.length === 3) return '#' + hex.split('').map(c=>c+c).join('');
			if (hex.length === 4) return '#' + hex.slice(0,3).split('').map(c=>c+c).join('');
			if (hex.length === 6) return '#' + hex;
			if (hex.length === 8) return '#' + hex.slice(0,6);
			return null;
		};
		colorPicker.value = to6Hex(oldText) || '#3399ff';
		const text = document.createElement('input');
		text.type = 'text';
		text.value = oldText;
		text.className = 'inline-edit';
		wrap.appendChild(colorPicker);
		wrap.appendChild(text);
		// 清空并插入
		target.textContent = '';
		target.appendChild(wrap);
		input = text;

		// 联动：picker -> text；text -> picker（仅 hex 时）并实时预览
		colorPicker.addEventListener('input', () => {
			const v = colorPicker.value;
			input.value = v;
			applyPreview(v);
	// 小脉冲提示
	try { colorPicker.classList.remove('is-pulse'); void colorPicker.offsetWidth; colorPicker.classList.add('is-pulse'); } catch(_){ }
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
	// 入场动画：添加 is-enter 再在下一帧移除
	try { ta.classList.add('is-enter'); requestAnimationFrame(() => { try { ta.classList.remove('is-enter'); } catch(_){} }); } catch(_){ }
		ta.setAttribute('rows', '1');
		ta.setAttribute('wrap', 'soft');
		// 清空并插入
		target.textContent = '';
		target.appendChild(ta);
		input = ta;
		// 自动高度
		const autoSize = () => { try { ta.style.height = 'auto'; ta.style.height = Math.max(24, ta.scrollHeight) + 'px'; } catch(_){} };
		ta.addEventListener('input', autoSize);
		autoSize();
		ta.focus();
		ta.select();
	}
	// 删除逻辑已在顶层定义

	// 删除逻辑已在顶层定义

			let committing = false; // 标记是否正在提交，避免 blur 触发还原造成闪烁
			let revertTimer = null; // 延迟还原，平滑从一个编辑框切换到另一个
			const cleanup = () => {
				committing = false;
				target.removeAttribute('data-editing');
				target.classList.remove('is-editing');
				target.classList.remove('is-saving');
				target.removeAttribute('data-old-text');
				if (revertTimer) { clearTimeout(revertTimer); revertTimer = null; }
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
				return txt; // 默认字符串
			};

			const commit = async () => {
				const txt = input.value;
				// 未变化直接还原
				if (txt === oldText) { revert(); return; }
				let value;
				try {
					value = convertValue(txt, type);
				} catch (err) {
					alert(err.message || '值不合法');
					return;
				}
	input.disabled = true;
	target.classList.add('is-saving');
				committing = true;
				try {
					await apiJson('/tokens/update', { method: 'POST', auth: true, body: { collection: coll, id, path, value, valueType: type } });
					// 成功：更新文本并显示绿色提示小弹窗（toast）
					target.textContent = (type === 'boolean' || type === 'number') ? String(value) : value;
					try {
						showTokensToast('已保存');
					} catch(_){ }
					// 同步更新缓存数据，确保后续刷新/折叠展开不丢失
					try { updateDocInState(coll, id, (doc)=> setByPath(doc, path, value)); } catch(_){ }
					// 若修改的是顶层 color，则同步更新卡片样式
					if (path === 'color') {
						const col = value;
						const tint = computeTint(col);
						if (tokenCard && col) {
							tokenCard.style.setProperty('--token-accent', col);
							if (tint) tokenCard.style.setProperty('--token-bg', tint);
							tokenCard.style.borderLeft = `3px solid ${col}`;
						}
					}
					cleanup();
				} catch (e) {
					alert(e.message || '更新失败');
					revert();
				}
			};

			input.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
				else if (e.key === 'Escape') { e.preventDefault(); revert(); }
			});
			const safeBlur = () => {
				if (committing) return;
				// 稍作延时，若焦点仍在当前编辑容器内，则不还原
				revertTimer = setTimeout(() => {
					if (committing) return;
					const ae = document.activeElement;
					if (!target.contains(ae)) revert();
				}, 110);
			};
			input.addEventListener('blur', safeBlur);
			if (colorPicker) {
				colorPicker.addEventListener('keydown', (e) => {
					if (e.key === 'Enter') { e.preventDefault(); commit(); }
					else if (e.key === 'Escape') { e.preventDefault(); revert(); }
				});
				colorPicker.addEventListener('blur', safeBlur);
			}
		});
	}
  
	// 删除逻辑：点击删除按钮 -> 确认 -> 调用后端 -> 更新缓存与 DOM（顶层）
	function enableInlineDelete(rootEl) {
	if (rootEl.__inlineDeleteBound) return; rootEl.__inlineDeleteBound = true;
		rootEl.addEventListener('click', async function(ev) {
			// 按住 Ctrl 时拦截属性删除
			if (ev.ctrlKey || document.body.classList.contains('ctrl-down')) {
				const maybe = ev.target && ev.target.closest ? ev.target.closest('.btn-del') : null;
				if (maybe) {
					try { showTokensToast('按 Ctrl 时仅支持删除对象'); } catch(_){}
					ev.preventDefault();
					return;
				}
			}
			const btn = ev.target && ev.target.closest ? ev.target.closest('.btn-del') : null;
			if (!btn) return;
			const row = btn.closest('.kv-row');
			if (!row) return;
			const path = row.getAttribute('data-path');
			if (!path || path.startsWith('_') || path.includes('.__v')) return;
			const tokenCard = row.closest('.token-card[data-coll][data-id]');
			if (!tokenCard) return;
			const coll = tokenCard.getAttribute('data-coll');
			const id = tokenCard.getAttribute('data-id');
			// 二次确认
			const keyNameEl = row.querySelector('.kv-key');
			const keyName = keyNameEl ? keyNameEl.textContent.trim() : path.split('.').pop();
			if (!confirm(`确定删除「${keyName}」吗？此操作不可撤销。`)) return;
			// 调后端
			try {
	await apiJson('/tokens/delete', { method: 'POST', auth: true, body: { collection: coll, id, path } });
				// 成功：从缓存中移除
	try { updateDocInState(coll, id, (doc)=> deleteFieldInDocByPath(doc, path)); } catch(_){ }
				// 从 DOM 移除行
				row.remove();
				try { showTokensToast('已删除'); } catch(_){ }
			} catch (e) {
				alert(e.message || '删除失败');
			}
		});
	}
	// 词元页绿色提示小弹窗（toast）
	function showTokensToast(message) {
		try {
			let container = document.querySelector('.tokens-toast-container');
			if (!container) {
				container = document.createElement('div');
				container.className = 'tokens-toast-container';
				document.body.appendChild(container);
			}
			const toast = document.createElement('div');
			toast.className = 'tokens-toast';
			toast.textContent = message || '操作成功';
			container.appendChild(toast);
			// 自动移除
			setTimeout(() => {
				try { toast.remove(); } catch(_) {}
				// 若容器空了也移除
				if (container && container.children.length === 0) {
					try { container.remove(); } catch(_) {}
				}
			}, 2200);
		} catch(_) { /* 忽略 */ }
	}

	// 删除整个对象（文档）
	function enableDeleteDoc(rootEl){
	if (rootEl.__deleteDocBound) return; rootEl.__deleteDocBound = true;
		rootEl.addEventListener('click', async function(ev){
			const btn = ev.target && ev.target.closest ? ev.target.closest('.btn-del-doc') : null;
			if (!btn) return;
			// 需要按住 Ctrl 键
			if (!ev.ctrlKey && !document.body.classList.contains('ctrl-down')) {
				try { showTokensToast('按住 Ctrl 键以启用删除'); } catch(_){}
				return;
			}
			const card = btn.closest('.token-card[data-coll][data-id]');
			if (!card) return;
			const coll = card.getAttribute('data-coll');
			const id = card.getAttribute('data-id');
			if (!coll || !id) return;
			if (!confirm('确定删除整个对象吗？此操作不可撤销。')) return;
			try {
				await apiJson('/tokens/remove', { method: 'POST', auth: true, body: { collection: coll, id } });
				// 更新缓存
	try { removeDocFromState(coll, id); } catch(_){ }
				// 从 DOM 移除卡片
				card.remove();
				try { showTokensToast('对象已删除'); } catch(_){ }
			} catch (e) {
				alert(e.message || '删除失败');
			}
		});
	}
})();

