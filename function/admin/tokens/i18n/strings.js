(function(){
    const zh = {
        // Tokens panel
        'tokens.title': '词元',
        'tokens.search.placeholder': '搜索...',
        'tokens.refresh': '刷新',
        'tokens.mode.toggle.title': '切换显示模式',
        'tokens.mode.compact': '缩略',
        'tokens.mode.detail': '详细',
        // Tokens KV and common action texts
        'tokens.kv.value': '值',
        'tokens.kv.editHint': '单击编辑',
        'tokens.kv.type.array': '数组',
        'tokens.kv.type.object': '对象',
        // Tokens modal texts
        'tokens.create.title': '新增对象',
        'tokens.create.cancel': '取消',
        'tokens.create.submit': '创建',
        'tokens.edit.title': '编辑对象',
        'tokens.edit.cancel': '取消',
        'tokens.edit.saveas': '另存',
        'tokens.edit.submit': '保存',
        // Tokens hints in modal
        'tokens.hints.title': '{name} 结构字段：',
        'tokens.hints.listTitle': '{name} 字段（• 必填）：',
        'tokens.hints.optionalKeys': '可能的可选键：{keys}',
        'tokens.hints.sampleTitle': '示例对象',
        'tokens.hints.none': '无',
        // Tokens toasts and errors
        'tokens.toast.useCtrlToDelete': '按住 Ctrl 键以启用删除',
        'tokens.toast.useCtrlToEdit': '按住 Ctrl 键以启用编辑',
        'tokens.toast.saved': '已保存',
        'tokens.toast.deleted': '已删除',
        'tokens.toast.cleared': '已清空',
        'tokens.toast.created': '创建成功',
        'tokens.toast.savedAs': '已另存为新对象',
        'tokens.error.jsonInvalid': 'JSON 不合法',
        'tokens.error.createFailed': '创建失败',
        'tokens.error.deleteFailed': '删除失败',
        'tokens.error.updateFailed': '更新失败',
        'tokens.error.openEditFailed': '无法打开编辑',
        'tokens.go.notFound': '未找到跳转目标',
        'tokens.go.openFailed': '无法打开链接',
        // Logger
        'tokens.log.title': '变更日志',
        'tokens.log.clear': '清空',
        'tokens.log.create': '新增',
        'tokens.log.deleteDoc': '删除对象',
        'tokens.log.deleteField': '删除字段',
        'tokens.log.update': '修改',
        'tokens.log.prev': '原：',
        'tokens.log.saveSummary': '修改 {sets} 项，删除 {dels} 项',
        // Relative time
        'time.justNow': '刚刚',
        'time.secondsAgo': '{n} 秒前',
        'time.minutesAgo': '{n} 分钟前',
        'time.hoursAgo': '{n} 小时前',
        'time.daysAgo': '{n} 天前',
        'time.monthsAgo': '{n} 个月前',
        'time.yearsAgo': '{n} 年前',
        // Tokens toolbar
        'tokens.toolbar.go': '跳转',
        'tokens.toolbar.editDoc': '编辑对象',
        'tokens.toolbar.deleteDoc': '删除对象',
        // Tokens summary tiles
        'tokens.summary.termFixed': '静态术语',
        'tokens.summary.termDynamic': '动态术语',
        'tokens.summary.card': '牌',
        'tokens.summary.character': '武将',
        'tokens.summary.skill': '技能',
        // Tokens sections
        'tokens.section.termFixed': '静态术语',
        'tokens.section.termDynamic': '动态术语',
        'tokens.section.card': '牌',
        'tokens.section.character': '武将',
        'tokens.section.skill': '技能',
        'tokens.section.new': '新增',
        // Tokens statuses
        'tokens.status.loading': '加载中…',
        'tokens.status.loadFailedWithRefresh': '加载失败，请点击“刷新”重试',
    };

    const en = {
        // Tokens panel
        'tokens.title': 'Tokens',
        'tokens.search.placeholder': 'Search...',
        'tokens.refresh': 'Refresh',
        'tokens.mode.toggle.title': 'Toggle display mode',
        'tokens.mode.compact': 'Compact',
        'tokens.mode.detail': 'Detailed',
        // Tokens KV and common action texts
        'tokens.kv.value': 'Value',
        'tokens.kv.editHint': 'Click to edit',
        'tokens.kv.type.array': 'Array',
        'tokens.kv.type.object': 'Object',
        // Tokens modal texts
        'tokens.create.title': 'Create object',
        'tokens.create.cancel': 'Cancel',
        'tokens.create.submit': 'Create',
        'tokens.edit.title': 'Edit object',
        'tokens.edit.cancel': 'Cancel',
        'tokens.edit.saveas': 'Save as new',
        'tokens.edit.submit': 'Save',
        // Tokens hints in modal
        'tokens.hints.title': '{name} schema fields:',
        'tokens.hints.listTitle': '{name} fields (• required):',
        'tokens.hints.optionalKeys': 'Possible optional keys: {keys}',
        'tokens.hints.sampleTitle': 'Sample object',
        'tokens.hints.none': 'None',
        // Tokens toasts and errors
        'tokens.toast.useCtrlToDelete': 'Hold Ctrl to enable delete',
        'tokens.toast.useCtrlToEdit': 'Hold Ctrl to enable edit',
        'tokens.toast.saved': 'Saved',
        'tokens.toast.deleted': 'Deleted',
        'tokens.toast.cleared': 'Cleared',
        'tokens.toast.created': 'Created',
        'tokens.toast.savedAs': 'Saved as new object',
        'tokens.error.jsonInvalid': 'Invalid JSON',
        'tokens.error.createFailed': 'Create failed',
        'tokens.error.deleteFailed': 'Delete failed',
        'tokens.error.updateFailed': 'Update failed',
        'tokens.error.openEditFailed': 'Unable to open edit',
        'tokens.go.notFound': 'No target to open',
        'tokens.go.openFailed': 'Unable to open link',
        // Logger
        'tokens.log.title': 'Change log',
        'tokens.log.clear': 'Clear',
        'tokens.log.create': 'Created',
        'tokens.log.deleteDoc': 'Delete object',
        'tokens.log.deleteField': 'Delete field',
        'tokens.log.update': 'Updated',
        'tokens.log.prev': 'Prev: ',
        'tokens.log.saveSummary': 'Changed {sets}, deleted {dels}',
        // Relative time
        'time.justNow': 'just now',
        'time.secondsAgo': '{n} seconds ago',
        'time.minutesAgo': '{n} minutes ago',
        'time.hoursAgo': '{n} hours ago',
        'time.daysAgo': '{n} days ago',
        'time.monthsAgo': '{n} months ago',
        'time.yearsAgo': '{n} years ago',
        // Tokens toolbar
        'tokens.toolbar.go': 'Open',
        'tokens.toolbar.editDoc': 'Edit object',
        'tokens.toolbar.deleteDoc': 'Delete object',
        // Tokens summary tiles
        'tokens.summary.termFixed': 'Fixed terms',
        'tokens.summary.termDynamic': 'Dynamic terms',
        'tokens.summary.card': 'Cards',
        'tokens.summary.character': 'Characters',
        'tokens.summary.skill': 'Skills',
        // Tokens sections
        'tokens.section.termFixed': 'Fixed terms',
        'tokens.section.termDynamic': 'Dynamic terms',
        'tokens.section.card': 'Cards',
        'tokens.section.character': 'Characters',
        'tokens.section.skill': 'Skills',
        'tokens.section.new': 'New',
        // Tokens statuses
        'tokens.status.loading': 'Loading…',
        'tokens.status.loadFailedWithRefresh': 'Load failed, click “Refresh” to retry',
    };

    if (window.I18N_STRINGS) {
        Object.assign(window.I18N_STRINGS.zh, zh);
        Object.assign(window.I18N_STRINGS.en, en);
    } else {
        console.warn('I18N_STRINGS not found, tokens strings not loaded');
    }
})();
