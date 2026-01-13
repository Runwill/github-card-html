(function() {
    /**
     * ͨ�õ� DOM ɨ���� MutationObserver ��װ
     * ���� card_name, term, character_name, skill_name ���滻�ű�
     */

    /**
     * ����ȫ��ɨ�貢���� MutationObserver
     * @param {object} config
     * @param {HTMLElement} config.root - ɨ����ڵ�
     * @param {Function} config.processor - ���Ĵ����߼�: (node) => void
     * @param {string} config.dataKey - dataset key������ȥ�ؼ�� (�Զ�����: �� node.dataset[dataKey] ����������)
     * @param {Map<string, any>} [config.tagNameMap] - �Ż�ģʽA: ������ tagName �� Map �е�Ԫ�� (�����д)
     * @param {string} [config.selector] - �Ż�ģʽB: ʹ�� querySelectorAll ����Ŀ��Ԫ��
     * @param {Function} [config.manualCheck] - �Ż�ģʽC: �ֶ���麯�� (node) => boolean�����ڼ��临�ӵ�ƥ��
     * @param {Object} [config.context] - ���������ݣ����� processor �ĵڶ������� (optional)
     */
    function scanAndObserve(config) {
        const { root, processor, dataKey, tagNameMap, selector, manualCheck, context } = config;
        
        // �ڲ���װ��������������ȥ�ؼ��
        const processSafe = (node) => {
            if (node.nodeType !== 1) return; // ������ Element
            if (node.dataset[dataKey]) return;
            
            // �������߼�
            if (tagNameMap && !tagNameMap.has(node.tagName)) return;
            if (manualCheck && !manualCheck(node)) return;

            processor(node, context);
            node.dataset[dataKey] = 'true';
        };

        const targetRoot = root || document.body;
        if (!targetRoot) return;

        // --- 1. ��ʼȫ��ɨ�� ---
        if (tagNameMap) {
            // TagName �Ż�·��: getElementsByTagName('*') ������� Map
            const all = targetRoot.getElementsByTagName('*');
            for (let i = 0; i < all.length; i++) {
                if (tagNameMap.has(all[i].tagName)) {
                    processSafe(all[i]);
                }
            }
        } else if (selector) {
            // Selector �Ż�·��
            const all = targetRoot.querySelectorAll(selector);
            for (let i = 0; i < all.length; i++) {
                processSafe(all[i]);
            }
        } else {
            // Fallback: ����ȫɨ
            const all = targetRoot.getElementsByTagName('*');
            for (let i = 0; i < all.length; i++) {
                processSafe(all[i]);
            }
        }

        // --- 2. ��̬���� ---
        if (window.MutationObserver) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.addedNodes.length) {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType !== 1) return;

                            // 1. Check self
                            processSafe(node);

                            // 2. Check descendants
                            if (tagNameMap) {
                                const descendants = node.getElementsByTagName('*');
                                for (let j = 0; j < descendants.length; j++) {
                                    if (tagNameMap.has(descendants[j].tagName)) {
                                        processSafe(descendants[j]);
                                    }
                                }
                            } else if (selector) {
                                const descendants = node.querySelectorAll(selector);
                                for (let j = 0; j < descendants.length; j++) {
                                    processSafe(descendants[j]);
                                }
                            } else {
                                const descendants = node.getElementsByTagName('*');
                                for (let j = 0; j < descendants.length; j++) {
                                    processSafe(descendants[j]);
                                }
                            }
                        });
                    }
                });
            });

            observer.observe(targetRoot, { childList: true, subtree: true });
            
            if (!window.globalObservers) window.globalObservers = [];
            window.globalObservers.push({ key: dataKey, observer });
        }
    }

    window.scanAndObserve = scanAndObserve;
})();
