'use client';

import { useState, useEffect, useCallback } from 'react';
import { setToken, setUser, setIsNewUser } from '@/lib/auth';

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  onLogin: (user: any) => void;
  force?: boolean;
};

export default function AuthModal({ open, onClose, onLogin, force }: AuthModalProps) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const sendCode = useCallback(async () => {
    if (!phone || phone.length < 11) { setError('请输入正确的手机号'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, purpose: 'login' }),
      });
      const d = await res.json();
      if (d.code === 'OK') {
        setCountdown(60);
      } else {
        setError(d.message || '发送失败');
      }
    } catch { setError('网络错误'); }
    finally { setLoading(false); }
  }, [phone]);

  const doLogin = useCallback(async () => {
    if (!phone || !code) { setError('请填写手机号和验证码'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/phone-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const d = await res.json();
      if (d.code === 'OK') {
        setToken(d.data.accessToken);
        setUser(d.data.user);
        if (d.data.isNewUser) setIsNewUser(true);
        else setIsNewUser(false);
        onLogin(d.data.user);
      } else {
        setError(d.message || '登录失败');
      }
    } catch { setError('网络错误'); }
    finally { setLoading(false); }
  }, [phone, code, onLogin]);

  if (!open) return null;

  const scanMethods = [
    { name: '好大儿 App', icon: '📱', desc: '打开好大儿 App 扫一扫' },
    { name: '走天下 App', icon: '🧳', desc: '打开好大儿走天下 App 扫一扫' },
    { name: '微信', icon: '💬', desc: '使用微信扫一扫' },
  ];

  const renderLoginButton = () => {
    if (loading) return '处理中...';
    return '登录 / 注册';
  };

  const renderCodeButton = () => {
    if (countdown > 0) return `${countdown}s`;
    if (loading) return '发送中...';
    return '获取验证码';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => !force && onClose()} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-fadeInUp">
        {!force && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
          >
            ✕
          </button>
        )}

        <div className="flex flex-col md:flex-row">
          {/* Left: QR Code */}
          <div className="md:w-1/2 bg-gradient-to-br from-green-500 to-indigo-600 p-8 flex flex-col items-center justify-center text-white">
            <h2 className="text-xl font-bold mb-6">扫码登录</h2>
            <div className="w-48 h-48 bg-white rounded-xl p-3 mb-4 flex items-center justify-center">
              <div className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl mb-2">📷</div>
                  <p className="text-xs text-gray-400">扫码登录</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-white/80 mb-6">打开 App 或微信扫一扫</p>
            <div className="space-y-3 w-full">
              {scanMethods.map(m => (
                <div key={m.name} className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-2.5">
                  <span className="text-xl">{m.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-white/60">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Phone Login */}
          <div className="md:w-1/2 p-8 flex flex-col justify-center">
            <h2 className="text-xl font-bold text-gray-900 mb-1">手机号登录</h2>
            <p className="text-sm text-gray-500 mb-6">输入手机号，验证后自动注册/登录</p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="请输入手机号"
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow"
                maxLength={11}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">验证码</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="请输入验证码"
                  className="flex-1 px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow"
                  maxLength={6}
                />
                <button
                  onClick={sendCode}
                  disabled={loading || countdown > 0}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {renderCodeButton()}
                </button>
              </div>
            </div>

            <button
              onClick={doLogin}
              disabled={loading}
              className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
            >
              {renderLoginButton()}
            </button>

            <p className="mt-4 text-xs text-gray-400 text-center">
              登录即代表同意{' '}
              <a href="/legal/terms" target="_blank" className="text-green-600 hover:underline">《服务条款》</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
