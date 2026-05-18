(function() {
  'use strict';

  var TOKEN_KEY = 'haodaer_token';
  var USER_KEY = 'haodaer_user';
  var COOKIE_NAME = 'haodaer_token';
  var COOKIE_DOMAIN = '.grandand.com';

  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^| )' + name + '=([^;]+)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function setCookie(name, value) {
    document.cookie = name + '=' + encodeURIComponent(value) +
      '; domain=' + COOKIE_DOMAIN + '; path=/; Secure; SameSite=Lax';
  }

  function getToken() {
    var t = localStorage.getItem(TOKEN_KEY);
    if (t) return t;
    var c = getCookie(COOKIE_NAME);
    if (c) {
      localStorage.setItem(TOKEN_KEY, c);
      return c;
    }
    return null;
  }

  var token = getToken();
  if (token) return;

  // --- Build modal ---
  var alreadyShown = sessionStorage.getItem('haodaer_auth_dismissed');
  if (alreadyShown) return;

  var style = document.createElement('style');
  style.textContent = '#haodaer-auth-overlay{position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Noto Sans SC","PingFang SC",sans-serif}';
  style.textContent += '#haodaer-auth-box{background:#fff;border-radius:16px;width:100%;max-width:672px;margin:0 16px;overflow:hidden;position:relative;animation:haodaer-fadeInUp .25s ease;max-height:90vh;overflow-y:auto}';
  style.textContent += '@keyframes haodaer-fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}';
  style.textContent += '#haodaer-auth-close{position:absolute;top:16px;right:16px;z-index:10;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#f1f5f9;border:none;cursor:pointer;color:#64748b;font-size:14px;transition:background .2s;line-height:1}';
  style.textContent += '#haodaer-auth-close:hover{background:#e2e8f0}';
  style.textContent += '.haodaer-auth-body{display:flex;flex-direction:column}@media(min-width:768px){.haodaer-auth-body{flex-direction:row}}';
  style.textContent += '.haodaer-auth-left{background:linear-gradient(135deg,#3b82f6,#6366f1);padding:40px 32px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff}@media(min-width:768px){.haodaer-auth-left{width:50%}}';
  style.textContent += '.haodaer-auth-left h2{font-size:20px;font-weight:700;margin-bottom:24px}';
  style.textContent += '.haodaer-auth-right{padding:32px;display:flex;flex-direction:column;justify-content:center}@media(min-width:768px){.haodaer-auth-right{width:50%}}';
  style.textContent += '.haodaer-auth-right h2{font-size:20px;font-weight:700;color:#0f172a;margin-bottom:4px}';
  style.textContent += '.haodaer-auth-sub{font-size:14px;color:#64748b;margin-bottom:24px}';
  style.textContent += '.haodaer-auth-field{margin-bottom:16px}';
  style.textContent += '.haodaer-auth-field label{display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:4px}';
  style.textContent += '.haodaer-auth-field input{width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;transition:border-color .2s}';
  style.textContent += '.haodaer-auth-field input:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,0.1)}';
  style.textContent += '.haodaer-auth-code{display:flex;gap:8px}';
  style.textContent += '.haodaer-auth-code input{flex:1}';
  style.textContent += '.haodaer-auth-code button{padding:10px 16px;background:#f1f5f9;color:#374151;border:none;border-radius:8px;font-size:14px;cursor:pointer;white-space:nowrap;transition:background .2s}';
  style.textContent += '.haodaer-auth-code button:hover:not(:disabled){background:#e2e8f0}';
  style.textContent += '.haodaer-auth-code button:disabled{opacity:0.5;cursor:not-allowed}';
  style.textContent += '.haodaer-auth-btn{width:100%;padding:12px;background:#2563eb;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:500;cursor:pointer;transition:background .2s;margin-top:8px}';
  style.textContent += '.haodaer-auth-btn:hover:not(:disabled){background:#1d4ed8}';
  style.textContent += '.haodaer-auth-btn:disabled{opacity:0.5;cursor:not-allowed}';
  style.textContent += '.haodaer-auth-error{margin-bottom:16px;padding:12px;background:#fef2f2;color:#dc2626;font-size:14px;border-radius:8px}';
  style.textContent += '.haodaer-auth-terms{margin-top:16px;font-size:12px;color:#9ca3af;text-align:center}';
  style.textContent += '.haodaer-auth-terms a{color:#2563eb;text-decoration:none}';
  style.textContent += '.haodaer-auth-guest{display:block;margin-top:12px;padding:10px;background:transparent;color:#64748b;border:1px solid #d1d5db;border-radius:12px;font-size:14px;cursor:pointer;width:100%;transition:background .2s}';
  style.textContent += '.haodaer-auth-guest:hover{background:#f9fafb}';
  document.head.appendChild(style);

  var overlay = document.createElement('div');
  overlay.id = 'haodaer-auth-overlay';

  var phone = '', code = '', countdown = 0, loading = false, error = '', timer = null;

  function render() {
    overlay.innerHTML = '';
    var box = document.createElement('div');
    box.id = 'haodaer-auth-box';
    box.innerHTML = '' +
      '<button id="haodaer-auth-close">✕</button>' +
      '<div class="haodaer-auth-body">' +
        '<div class="haodaer-auth-left">' +
          '<h2>扫码登录</h2>' +
          '<div style="width:192px;height:192px;background:#fff;border-radius:12px;padding:12px;margin-bottom:16px;display:flex;align-items:center;justify-content:center">' +
            '<div style="width:100%;height:100%;border:2px dashed #d1d5db;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center">' +
              '<div style="font-size:40px;margin-bottom:4px">📷</div>' +
              '<p style="font-size:12px;color:#9ca3af">扫码登录</p>' +
            '</div>' +
          '</div>' +
          '<p style="font-size:14px;opacity:0.8;margin-bottom:24px">打开 App 或微信扫一扫</p>' +
          '<div style="width:100%">' +
            ['📱好大儿 App', '🧳走天下 App', '💬微信'].map(function(s) {
              return '<div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.1);border-radius:8px;padding:10px 16px;margin-bottom:8px">' +
                '<span style="font-size:20px">' + s[0] + '</span>' +
                '<div><p style="font-size:14px;font-weight:500">' + s.slice(1) + '</p><p style="font-size:12px;opacity:0.6">打开' + s.slice(1) + '扫一扫</p></div></div>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="haodaer-auth-right">' +
          '<h2>手机号登录</h2>' +
          '<p class="haodaer-auth-sub">输入手机号，验证后自动注册/登录</p>' +
          (error ? '<div class="haodaer-auth-error">' + error + '</div>' : '') +
          '<div class="haodaer-auth-field">' +
            '<label>手机号</label>' +
            '<input id="haodaer-auth-phone" type="tel" maxlength="11" placeholder="请输入手机号" value="' + phone + '" />' +
          '</div>' +
          '<div class="haodaer-auth-field">' +
            '<label>验证码</label>' +
            '<div class="haodaer-auth-code">' +
              '<input id="haodaer-auth-code" type="text" maxlength="6" placeholder="请输入验证码" value="' + code + '" />' +
              '<button id="haodaer-send-code"' + (loading || countdown > 0 ? ' disabled' : '') + '>' +
                (countdown > 0 ? countdown + 's' : loading ? '发送中...' : '获取验证码') +
              '</button>' +
            '</div>' +
          '</div>' +
          '<button id="haodaer-login-btn" class="haodaer-auth-btn"' + (loading ? ' disabled' : '') + '>' +
            (loading ? '处理中...' : '登录 / 注册') +
          '</button>' +
          '<button class="haodaer-auth-guest" id="haodaer-guest-btn">先逛逛</button>' +
          '<p class="haodaer-auth-terms">登录即代表同意 <a href="/legal/terms" target="_blank">《服务条款》</a></p>' +
        '</div>' +
      '</div>';

    overlay.appendChild(box);

    document.getElementById('haodaer-auth-close').onclick = dismiss;
    document.getElementById('haodaer-guest-btn').onclick = dismiss;

    var phoneInput = document.getElementById('haodaer-auth-phone');
    phoneInput.oninput = function() {
      phone = this.value.replace(/\D/g, '').slice(0, 11);
      this.value = phone;
    };

    var codeInput = document.getElementById('haodaer-auth-code');
    codeInput.oninput = function() {
      code = this.value.replace(/\D/g, '').slice(0, 6);
      this.value = code;
    };

    document.getElementById('haodaer-send-code').onclick = function() {
      if (loading || countdown > 0) return;
      if (!phone || phone.length < 11) {
        error = '请输入正确的手机号';
        render();
        return;
      }
      error = '';
      loading = true;
      render();
      fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone, purpose: 'login' }),
      }).then(function(r) { return r.json(); }).then(function(d) {
        loading = false;
        if (d.code === 'OK') {
          countdown = 60;
          if (timer) clearInterval(timer);
          timer = setInterval(function() {
            countdown--;
            if (countdown <= 0) { clearInterval(timer); timer = null; }
            render();
          }, 1000);
        } else {
          error = d.message || '发送失败';
        }
        render();
      }).catch(function() {
        loading = false;
        error = '网络错误';
        render();
      });
    };

    document.getElementById('haodaer-login-btn').onclick = function() {
      if (loading) return;
      if (!phone || !code) {
        error = '请填写手机号和验证码';
        render();
        return;
      }
      error = '';
      loading = true;
      render();
      fetch('/api/auth/phone-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone, code: code }),
      }).then(function(r) { return r.json(); }).then(function(d) {
        loading = false;
        if (d.code === 'OK') {
          var tok = d.data.accessToken;
          localStorage.setItem(TOKEN_KEY, tok);
          setCookie(COOKIE_NAME, tok);
          if (d.data.user) localStorage.setItem(USER_KEY, JSON.stringify(d.data.user));
          if (d.data.isNewUser) localStorage.setItem('haodaer_isNewUser', 'true');
          overlay.remove();
          style.remove();
          if (timer) clearInterval(timer);
          // Reload to let app use the token
          location.reload();
        } else {
          error = d.message || '登录失败';
          render();
        }
      }).catch(function() {
        loading = false;
        error = '网络错误';
        render();
      });
    };
  }

  function dismiss() {
    if (timer) clearInterval(timer);
    overlay.remove();
    style.remove();
    sessionStorage.setItem('haodaer_auth_dismissed', '1');
  }

  function showOverlay() {
    document.body.appendChild(overlay);
    render();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showOverlay);
  } else {
    showOverlay();
  }
})();
