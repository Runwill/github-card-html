(function(){
  const zh = {
    'nav.term': '程序',
    'nav.skill': '技能',
    'nav.card': '牌库',
    'nav.character': '将池',
    'nav.draft': '草稿',
    'nav.tokens': '词元',
    'nav.permissions': '权限',
    'nav.game': '对局',

    'sidebar.account': '账号',
    'sidebar.approvals': '审核',
    'sidebar.permissions': '权限',
    'sidebar.theme': '主题',
    'sidebar.logout': '退出',
    'sidebar.announcements': '更新公告',
    'sidebar.keySettings': '按键设置',
    'sidebar.settings': '设置',
    'sidebar.gameSettings': '对局设置',

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
    'modal.announcements.title': '更新公告',
    'modal.keySettings.title': '按键设置',
    'modal.gameSettings.title': '对局设置',

    'modal.avatar.title': '头像',
    'modal.avatar.upload': '上传头像',
    'modal.avatar.pending': '审核中',

    'modal.crop.title': '裁剪头像',
    'modal.crop.cancel': '取消',
    'modal.crop.confirm': '裁剪并上传',

    'account.info.username': '用户名',
    'account.info.userId': '用户ID',
    'account.info.createdAt': '注册时间',
    'account.info.placeholder.intro': '（暂无简介）',
    'account.info.editUsername': '编辑用户名',
    'account.info.pending': '审核中：',
    'account.info.cancel': '撤回',

    'keySettings.expandAll': '展开所有术语',
    'keySettings.inspect': '显示属性',
    'keySettings.toggleTheme': '切换深浅色',
    'keySettings.notSet': '未设置',
    'keySettings.pressKey': '请按下按键...',
    'keySettings.hint': 'Esc 恢复预设，Backspace 清除绑定。',

    'gameSettings.playbackSpeed': '时机速度',
    'gameSettings.dragInertia': '拖动惯性',
    'gameSettings.reset': '重置',
    'gameSettings.inertia.veryHeavy': '0.1 - 非常重',
    'gameSettings.inertia.heavy': '0.15 - 较重',
    'gameSettings.inertia.medium': '0.25 - 中等 (默认)',
    'gameSettings.inertia.light': '0.5 - 轻盈',
    'gameSettings.inertia.veryLight': '0.8 - 非常灵敏',
    'gameSettings.inertia.instant': '1.0 - 即时',

    'theme.toggle.toLight': '切换为浅色',
    'theme.toggle.toDark': '切换为深色',

    'lang.button.label': '语言：{lang}',
    'lang.name.zh': '中文',
    'lang.name.en': 'English',
    'lang.name.debug': '调试',

    // Footer
    'footer.author': '作者：',

    // Draft panel
    'draft.input.placeholder': '输入HTML代码',
    // Common
    'common.empty': '空',
    'common.cancel': '取消',
    'common.save': '保存',
    'common.expand': '展开',
    'common.collapse': '收起',
    'common.delete': '删除',
    'common.copy': '复制',
    'common.copied': '已复制',
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
    // Announcements
    'announcements.empty': '暂无公告',
    'announcements.important': '重要',
    'announcements.error.loadFailed': '公告加载失败',

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
    'perm.tooltip.仪同三司': '修改账号信息免审核', //修改
    'perm.tooltip.赞拜不名': '允许切换到调试语言'
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
    'nav.game': 'Game',

    'sidebar.account': 'Account',
    'sidebar.approvals': 'Approvals',
    'sidebar.permissions': 'Permissions',
    'sidebar.theme': 'Theme',
    'sidebar.logout': 'Log out',
    'sidebar.announcements': 'Updates',
    'sidebar.keySettings': 'Key Settings',
    'sidebar.settings': 'Settings',
    'sidebar.gameSettings': 'Game Settings',

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
    'modal.announcements.title': 'Updates',
    'modal.keySettings.title': 'Key Settings',
    'modal.gameSettings.title': 'Game Settings',

    'modal.avatar.title': 'Avatar',
    'modal.avatar.upload': 'Upload avatar',
    'modal.avatar.pending': 'Pending',

    'modal.crop.title': 'Crop avatar',
    'modal.crop.cancel': 'Cancel',
    'modal.crop.confirm': 'Crop & upload',

    'account.info.username': 'Username',
    'account.info.userId': 'User ID',
    'account.info.createdAt': 'Joined',
    'account.info.placeholder.intro': '(No intro yet)',
    'account.info.editUsername': 'Edit username',
    'account.info.pending': 'Pending: ',
    'account.info.cancel': 'Revoke',

    'keySettings.expandAll': 'Expand all terms',
    'keySettings.inspect': 'Show Attributes',
    'keySettings.toggleTheme': 'Toggle Theme',
    'keySettings.notSet': 'Not set',
    'keySettings.pressKey': 'Press a key...',
    'keySettings.hint': 'Esc to reset default, Backspace to unassign.',

    'gameSettings.playbackSpeed': 'Timing Speed',
    'gameSettings.dragInertia': 'Drag Inertia',
    'gameSettings.reset': 'Reset',
    'gameSettings.inertia.veryHeavy': '0.1 - Very Heavy',
    'gameSettings.inertia.heavy': '0.15 - Heavy',
    'gameSettings.inertia.medium': '0.25 - Medium (Default)',
    'gameSettings.inertia.light': '0.5 - Light',
    'gameSettings.inertia.veryLight': '0.8 - Very Responsive',
    'gameSettings.inertia.instant': '1.0 - Instant',

    'theme.toggle.toLight': 'Switch to light',
    'theme.toggle.toDark': 'Switch to dark',

    'lang.button.label': 'Language: {lang}',
    'lang.name.zh': '中文',
    'lang.name.en': 'English',
    'lang.name.debug': 'Debug',

    // Footer
    'footer.author': 'Author:',

    // Draft panel
    'draft.input.placeholder': 'Enter HTML code',
    // Common
    'common.empty': 'Empty',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.expand': 'Expand',
    'common.collapse': 'Collapse',
    'common.delete': 'Delete',
    'common.copy': 'Copy',
    'common.copied': 'Copied',
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
    // Announcements
    'announcements.empty': 'No announcements yet',
    'announcements.important': 'Important',
    'announcements.error.loadFailed': 'Failed to load announcements',

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
