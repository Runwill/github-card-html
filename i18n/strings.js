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

    // Permissions panel
    'permissions.title': '权限',
    'permissions.search.placeholder': '按用户名/ID搜索',
    'permissions.search': '搜索',
    'permissions.mode.toggle.title': '切换展示模式：部分/全部',
    'permissions.mode.partial': '部分',
    'permissions.mode.all': '全部',

    // Draft panel
    'draft.input.placeholder': '输入HTML代码',

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
    'perm.tooltip.仪同三司': '可免审直接生效（用户名/简介/头像）'
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

    // Permissions panel
    'permissions.title': 'Permissions',
    'permissions.search.placeholder': 'Search by username/ID',
    'permissions.search': 'Search',
    'permissions.mode.toggle.title': 'Toggle view: Partial/All',
    'permissions.mode.partial': 'Partial',
    'permissions.mode.all': 'All',

    // Draft panel
    'draft.input.placeholder': 'Enter HTML code',

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
    'perm.tooltip.仪同三司': 'Bypass approval (username/intro/avatar)'
  };

  // debug 语言：直接返回 key
  const debug = new Proxy({}, { get: (_, k) => String(k) });

  window.I18N_STRINGS = { zh, en, debug };
})();
