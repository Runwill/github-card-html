// 安全的登录检查管理器
class LoginManager {
    constructor() {
        this.tokenKey = 'token'; // 保持与原系统一致的键名
        this.redirectDelay = 100;
        this.init();
    }

    init() {
        // 只在非登录页面执行检查
        if (window.location.pathname.includes('login.html')) {
            console.log('当前在登录页面，跳过认证检查');
            return;
        }

        // 如果DOM已经加载完成，立即执行检查
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                console.log('DOM加载完成，开始认证检查');
                this.checkAuthentication();
            });
        } else {
            // DOM已经准备好，立即执行
            console.log('DOM已准备好，立即执行认证检查');
            setTimeout(() => this.checkAuthentication(), 0);
        }
    }

    // 安全地获取token
    getToken() {
        try {
            const token = localStorage.getItem(this.tokenKey);
            console.log('获取到的token:', token ? `${token.substring(0, 10)}...` : 'null');
            return token && token.trim() !== '' ? token : null;
        } catch (error) {
            console.warn('无法访问localStorage:', error);
            return null;
        }
    }

    // 验证token格式（基础验证）
    isValidTokenFormat(token) {
        if (!token || typeof token !== 'string') {
            console.log('Token验证失败: token为空或不是字符串');
            return false;
        }
        
        // 基本长度检查
        if (token.length < 3) {
            console.log('Token验证失败: 长度太短');
            return false;
        }
        
        console.log('Token格式验证通过');
        return true;
    }

    // 检查认证状态
    checkAuthentication() {
        const token = this.getToken();
        
        // 如果没有token，重定向到登录页
        if (!token) {
            console.log('未找到token，重定向到登录页');
            this.redirectToLogin();
            return false;
        }

        // 验证token格式
        if (!this.isValidTokenFormat(token)) {
            console.log('token格式无效，重定向到登录页');
            this.clearToken();
            this.redirectToLogin();
            return false;
        }

        // 仅对JWT token检查过期时间
        if (token.includes('.') && this.isTokenExpired(token)) {
            console.log('JWT token已过期，重定向到登录页');
            this.clearToken();
            this.redirectToLogin();
            return false;
        }

        console.log('认证检查通过，允许访问页面');
        return true;
    }

    // 检查token是否过期（仅对JWT）
    isTokenExpired(token) {
        // 只对JWT token进行过期检查
        if (!token.includes('.')) {
            console.log('非JWT token，跳过过期检查');
            return false;
        }

        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                console.log('JWT格式不正确');
                return true;
            }

            const payload = JSON.parse(atob(parts[1]));
            
            // 如果没有过期时间，则认为不过期
            if (!payload.exp) {
                console.log('JWT没有过期时间，认为有效');
                return false;
            }

            const currentTime = Math.floor(Date.now() / 1000);
            const isExpired = payload.exp < currentTime;
            console.log('JWT过期检查:', isExpired ? '已过期' : '有效');
            return isExpired;
        } catch (error) {
            console.warn('Token解析失败:', error);
            return true; // 解析失败则认为过期
        }
    }

    // 安全地重定向到登录页
    redirectToLogin() {
        // 防止无限重定向
        if (window.location.pathname.includes('login.html')) {
            console.log('已在登录页面，取消重定向');
            return;
        }

        console.log('准备重定向到登录页面');

        setTimeout(() => {
            // 保存当前页面用于登录后重定向
            const currentPage = window.location.href;
            try {
                sessionStorage.setItem('redirectAfterLogin', currentPage);
                console.log('已保存重定向地址:', currentPage);
            } catch (error) {
                console.warn('无法保存重定向地址:', error);
            }
            
            window.location.href = 'login.html';
        }, this.redirectDelay);
    }

    // 处理登录后的重定向
    handleLoginRedirect() {
        try {
            const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
            if (redirectUrl && redirectUrl !== window.location.href) {
                sessionStorage.removeItem('redirectAfterLogin');
                console.log('重定向到:', redirectUrl);
                window.location.href = redirectUrl;
                return true;
            }
        } catch (error) {
            console.warn('处理登录重定向失败:', error);
        }
        return false;
    }

    // 清理token
    clearToken() {
        try {
            localStorage.removeItem(this.tokenKey);
        } catch (error) {
            console.warn('清理token失败:', error);
        }
    }

    // 设置token
    setToken(token) {
        if (!token || !this.isValidTokenFormat(token)) {
            throw new Error('无效的token格式');
        }
        
        try {
            localStorage.setItem(this.tokenKey, token);
        } catch (error) {
            console.error('保存token失败:', error);
            throw error;
        }
    }

    // 登出
    logout() {
        this.clearToken();
        // 清理其他相关数据
        sessionStorage.removeItem('redirectAfterLogin');
        this.redirectToLogin();
    }
}

// 初始化登录管理器
const loginManager = new LoginManager();

// 为登录页面提供的辅助方法
window.loginManager = loginManager;

// 在登录页面可以调用这个方法来处理登录成功后的重定向
window.handleSuccessfulLogin = function() {
    console.log('登录成功，检查是否需要重定向');
    
    // 检查是否有保存的重定向地址
    if (!loginManager.handleLoginRedirect()) {
        // 如果没有重定向地址，跳转到默认页面
        console.log('没有重定向地址，跳转到首页');
        window.location.href = 'index.html';
    }
};
