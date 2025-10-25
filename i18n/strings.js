(function(){
  const zh = {
    'nav.term': '程序',
    'nav.skill': '技能',
    'nav.card': '牌库',
    'nav.character': '将池',
    'nav.draft': '草稿',
    'nav.tokens': '词元',
    'nav.permissions': '权限',

    'sidebar.account': '账号',
    'sidebar.approvals': '审核',
    'sidebar.permissions': '权限',
    'sidebar.theme': '主题',
    'sidebar.logout': '退出',

    'account.menu.back': '返回',
    'account.menu.info': '名片',
    'account.menu.password': '密码',
    'account.menu.avatar': '头像',

    'modal.password.title': '密码',
    'modal.password.old': '旧密码',
    'modal.password.new': '新密码',
    'modal.password.confirm': '确认新密码',
    'modal.password.update': '更新',

    'modal.approvals.title': '审核',

    'modal.avatar.title': '头像',
    'modal.avatar.upload': '上传头像',
    'modal.avatar.pending': '审核中',

    'modal.crop.title': '裁剪头像',
    'modal.crop.cancel': '取消',
    'modal.crop.confirm': '裁剪并上传',

    'account.info.username': '用户名',
    'account.info.userId': '用户ID',
    'account.info.placeholder.intro': '（暂无简介）',
  'account.info.editUsername': '编辑用户名',
    'account.info.pending': '审核中：',
    'account.info.cancel': '撤回',

    'theme.toggle.toLight': '切换为浅色',
    'theme.toggle.toDark': '切换为深色',

    'lang.button.label': '语言：{lang}',
    'lang.name.zh': '中文',
    'lang.name.en': 'English',
    'lang.name.debug': '调试',

    // Footer
    'footer.author': '作者：',

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

    // Permissions panel
    'permissions.title': '权限',
    'permissions.search.placeholder': '按用户名/ID搜索',
    'permissions.search': '搜索',
    'permissions.mode.toggle.title': '切换展示模式：部分/全部',
    'permissions.mode.partial': '部分',
    'permissions.mode.all': '全部',
  'permissions.fetchUsersFailedPrefix': '获取用户失败：',
  'permissions.user.role': '角色: {role}',
  'permissions.edit': '编辑权限',
  'permissions.selectAll': '全选',
  'permissions.saveFailed': '保存失败',

    // Draft panel
    'draft.input.placeholder': '输入HTML代码',
  // Common
  'common.empty': '空',
  'common.cancel': '取消',
  'common.save': '保存',
  'common.expand': '展开',
  'common.collapse': '收起',
  'common.delete': '删除',
  'common.noPermission': '无权限',

    // UI messages / alerts / statuses
    'toast.noRequests': '无申请',
    'alert.selectImage': '请选择图片文件',
    'alert.loginFirst': '请先登录',
    'error.noLogin': '未检测到登录信息，请重新登录。',
    'error.noLoginSimple': '未检测到登录信息',
    'status.cropping': '正在裁剪…',
    'error.cropFailed': '裁剪失败',
    'error.exportFailed': '导出失败',
    'status.uploading': '正在上传…',
    'success.avatarUpdatedImmediate': '头像已更新（免审核）',
    'status.updated': '已更新',
    'success.avatarSubmitted': '头像已提交审核，待管理员批准后生效。',
    'status.submitted': '已提交审核',
    'error.uploadFailed': '上传失败',
    'error.uploadFailedPrefix': '上传失败：',
    'error.networkRetryLater': '网络异常，稍后再试',
    'error.networkRevokeFailed': '网络异常，撤回失败',
    'error.parse.json': '服务器返回非 JSON 响应',
    'error.parse.unknown': '无法解析服务器响应',

    // Error prefixes for developer console messages
    'error.updateIntroFailedPrefix': '更新简介失败：',
    'error.updateUsernameFailedPrefix': '更新用户名失败：',
    'error.requestFailedPrefix': '请求失败：',

    // Password modal
    'error.fillAll': '请填写完整。',
    'error.pwdMin': '新密码至少 6 位。',
    'error.pwdNotMatch': '两次输入的新密码不一致。',
    'status.updating': '正在更新...',
    'success.pwdUpdated': '密码已更新！请使用新密码重新登录。',
    'error.updateFailed': '更新失败',
    'error.requestFailed': '请求失败，请稍后重试。',

    // Intro edit
    'error.introMax': '简介最多 500 个字符',
    'success.introUpdatedImmediate': '简介已更新（免审核）',
    'success.introSubmitted': '简介变更已提交审核，待通过后生效。',

    // Username edit
    'error.usernameMax': '用户名最多 12 个字符',
    'success.usernameUpdatedImmediate': '用户名已更新（免审核）',
    'success.usernameSubmitted': '用户名变更已提交审核，待通过后生效。',
    'error.revokeFailed': '撤回失败',

    // Roles
    'role.admin': '管理员',
    'role.moderator': '版主',
    'role.user': '用户',
    'role.guest': '访客',

    // Permissions badge
  'perm.badge.multiple': '权限×{count}',
  'perm.tooltip.prefix': '权限：{name}',
  'perm.tooltip.仪同三司': '可免审直接生效（用户名/简介/头像）',
  'perm.tooltip.赞拜不名': '允许切换到调试语言（Debug）'
    ,
    // Login page
    'login.title': '登录',
    'login.header': '登录',
    'login.username.placeholder': '用户名',
    'login.password.placeholder': '密码',
    'login.submit': '登录',
    'login.register': '注册',
    'login.loggingIn': '正在登录…',
    'login.success': '登录成功！',
    'login.failed': '登录失败',
    'login.failedRetry': '登录失败，请稍后再试',
    'login.backend.toggle': '切换后端',
    'login.backend.publicSelected': '使用公网后端 (已选)',
    'login.backend.localSelected': '使用本地后端 (已选)',
    'login.backend.currentPrefix': '当前后端：{url}',
    'register.needUserPass': '请输入用户名和密码进行注册',
    'register.success': '注册成功',
    'register.fail': '注册失败',
    'register.failRetry': '注册失败，请稍后重试。'
  };

  const en = {
    'nav.term': 'Terms',
    'nav.skill': 'Skills',
    'nav.card': 'Cards',
    'nav.character': 'Characters',
    'nav.draft': 'Drafts',
    'nav.tokens': 'Tokens',
    'nav.permissions': 'Permissions',

    'sidebar.account': 'Account',
    'sidebar.approvals': 'Approvals',
    'sidebar.permissions': 'Permissions',
    'sidebar.theme': 'Theme',
    'sidebar.logout': 'Log out',

    'account.menu.back': 'Back',
    'account.menu.info': 'Profile',
    'account.menu.password': 'Password',
    'account.menu.avatar': 'Avatar',

    'modal.password.title': 'Password',
    'modal.password.old': 'Current password',
    'modal.password.new': 'New password',
    'modal.password.confirm': 'Confirm new password',
    'modal.password.update': 'Update',

    'modal.approvals.title': 'Approvals',

    'modal.avatar.title': 'Avatar',
    'modal.avatar.upload': 'Upload avatar',
    'modal.avatar.pending': 'Pending',

    'modal.crop.title': 'Crop avatar',
    'modal.crop.cancel': 'Cancel',
    'modal.crop.confirm': 'Crop & upload',

    'account.info.username': 'Username',
    'account.info.userId': 'User ID',
    'account.info.placeholder.intro': '(No intro yet)',
  'account.info.editUsername': 'Edit username',
    'account.info.pending': 'Pending: ',
    'account.info.cancel': 'Revoke',

    'theme.toggle.toLight': 'Switch to light',
    'theme.toggle.toDark': 'Switch to dark',

    'lang.button.label': 'Language: {lang}',
    'lang.name.zh': '中文',
    'lang.name.en': 'English',
    'lang.name.debug': 'Debug',

    // Footer
    'footer.author': 'Author:',

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

    // Permissions panel
    'permissions.title': 'Permissions',
    'permissions.search.placeholder': 'Search by username/ID',
    'permissions.search': 'Search',
    'permissions.mode.toggle.title': 'Toggle view: Partial/All',
    'permissions.mode.partial': 'Partial',
    'permissions.mode.all': 'All',
  'permissions.fetchUsersFailedPrefix': 'Fetch users failed:',
  'permissions.user.role': 'Role: {role}',
  'permissions.edit': 'Edit permissions',
  'permissions.selectAll': 'Select all',
  'permissions.saveFailed': 'Save failed',

    // Draft panel
    'draft.input.placeholder': 'Enter HTML code',
  // Common
  'common.empty': 'Empty',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.expand': 'Expand',
  'common.collapse': 'Collapse',
  'common.delete': 'Delete',
  'common.noPermission': 'No permission',

    // UI messages / alerts / statuses
    'toast.noRequests': 'No requests',
    'alert.selectImage': 'Please select an image file',
    'alert.loginFirst': 'Please log in first',
    'error.noLogin': 'No login detected. Please log in again.',
    'error.noLoginSimple': 'No login detected',
    'status.cropping': 'Cropping…',
    'error.cropFailed': 'Crop failed',
    'error.exportFailed': 'Export failed',
    'status.uploading': 'Uploading…',
    'success.avatarUpdatedImmediate': 'Avatar updated (no approval required)',
    'status.updated': 'Updated',
    'success.avatarSubmitted': 'Avatar submitted for approval and will take effect after approval.',
    'status.submitted': 'Submitted',
    'error.uploadFailed': 'Upload failed',
    'error.uploadFailedPrefix': 'Upload failed: ',
    'error.networkRetryLater': 'Network error, please try again later',
    'error.networkRevokeFailed': 'Network error, revoke failed',
    'error.parse.json': 'Server returned non-JSON response',
    'error.parse.unknown': 'Unable to parse server response',

    // Error prefixes for developer console messages
    'error.updateIntroFailedPrefix': 'Update intro failed:',
    'error.updateUsernameFailedPrefix': 'Update username failed:',
    'error.requestFailedPrefix': 'Request failed:',

    // Password modal
    'error.fillAll': 'Please fill out all fields.',
    'error.pwdMin': 'New password must be at least 6 characters.',
    'error.pwdNotMatch': 'New passwords do not match.',
    'status.updating': 'Updating...',
    'success.pwdUpdated': 'Password updated! Please re-login with the new password.',
    'error.updateFailed': 'Update failed',
    'error.requestFailed': 'Request failed, please try again later.',

    // Intro edit
    'error.introMax': 'Intro can be at most 500 characters',
    'success.introUpdatedImmediate': 'Intro updated (no approval required)',
    'success.introSubmitted': 'Intro change submitted for approval and will take effect after approval.',

    // Username edit
    'error.usernameMax': 'Username can be at most 12 characters',
    'success.usernameUpdatedImmediate': 'Username updated (no approval required)',
    'success.usernameSubmitted': 'Username change submitted for approval and will take effect after approval.',
    'error.revokeFailed': 'Revoke failed',

    // Roles
    'role.admin': 'Admin',
    'role.moderator': 'Moderator',
    'role.user': 'User',
    'role.guest': 'Guest',

    // Permissions badge
  'perm.badge.multiple': 'Permissions×{count}',
  'perm.tooltip.prefix': 'Permission: {name}',
  'perm.tooltip.仪同三司': 'Bypass approval (username/intro/avatar)',
  'perm.tooltip.赞拜不名': 'Allow switching to Debug language'
    ,
    // Login page
    'login.title': 'Login',
    'login.header': 'Login',
    'login.username.placeholder': 'Username',
    'login.password.placeholder': 'Password',
    'login.submit': 'Log in',
    'login.register': 'Register',
    'login.loggingIn': 'Logging in…',
    'login.success': 'Logged in!',
    'login.failed': 'Login failed',
    'login.failedRetry': 'Login failed, please try again later',
    'login.backend.toggle': 'Switch backend',
    'login.backend.publicSelected': 'Public backend (selected)',
    'login.backend.localSelected': 'Local backend (selected)',
    'login.backend.currentPrefix': 'Current backend: {url}',
    'register.needUserPass': 'Please enter username and password to register',
    'register.success': 'Registered successfully',
    'register.fail': 'Registration failed',
    'register.failRetry': 'Registration failed, please try again later.'
  };

  // debug 语言：直接返回 key
  const debug = new Proxy({}, { get: (_, k) => String(k) });

  window.I18N_STRINGS = { zh, en, debug };
})();
