// 全局术语状态对象，供按钮等功能模块共享
// 设定合理默认值，避免首次点击成为“初始化”而非“切换”
window.term_status = window.term_status || {};
if (typeof window.term_status.pronoun === 'undefined') {
	window.term_status.pronoun = 1; // 默认显示代词（甲/乙/丙）
}
if (typeof window.term_status.tickQuantifier === 'undefined') {
	window.term_status.tickQuantifier = 1; // 默认显示量词
}
