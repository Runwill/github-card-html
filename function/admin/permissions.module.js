// ES Module 聚合入口：按原有顺序导入子模块
// 注意：这些子文件应各自避免污染全局，或在需要时自行挂载到 window 命名空间。
// 如需扩展或调整顺序，请在此维护。

import './permissions/ui.js';
import './permissions/api.js';
import './permissions/constants.js';
import './permissions/render.js';
import './permissions/init.js';

// 如存在调试日志模块且需要，可在此显式导入
// import './permissions/logs.js';
