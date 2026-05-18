'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FadeInUp } from '@/components/Animation';
import AuthModal from '@/components/AuthModal';
import ProfileSetup from '@/components/ProfileSetup';
import { isLoggedIn, getIsNewUser, getToken, setUser, getUser } from '@/lib/auth';

type Guide = {
  id: string;
  title: string;
  summary: string;
  destination: string;
  coverImage: string;
  category: string;
  author: { nickname: string; avatar: string };
};

const childFeatures = [
  { name: '足迹地图', icon: '📍', href: '/checkin' },
  { name: '儿童画廊', icon: '📸', href: '/gallery' },
  { name: '孩子说', icon: '💭', href: '/kidsays' },
  { name: '主题挑战', icon: '🏆', href: '/challenges' },
  { name: '亲子投票', icon: '📊', href: '/votes' },
];

const introCards = [
  { icon: '🏖️', title: '目的地精选', desc: '从海滩到山野，精选适合亲子出游的目的地和玩法' },
  { icon: '👨‍👩‍👧‍👦', title: '真实亲子经验', desc: '来自家长们的真实旅行分享，不踩坑的实用建议' },
  { icon: '📝', title: '详细行程攻略', desc: '包含预算、交通、住宿、美食的完整行程规划' },
];

const photos = [
  { src: 'https://images.unsplash.com/photo-1596073419667-9d77d59f033b?w=400&q=80', label: '海滩亲子时光' },
  { src: 'https://images.unsplash.com/photo-1576662712957-9c79ae1280f8?w=400&q=80', label: '山野徒步' },
  { src: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&q=80', label: '文化探索' },
  { src: 'https://images.unsplash.com/photo-1523803326055-72a2a5360074?w=400&q=80', label: '亲子骑行' },
];

function GuideSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="h-48 bg-gray-100 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-gray-100 rounded animate-pulse w-3/4" />
        <div className="h-4 bg-gray-100 rounded animate-pulse" />
        <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
      </div>
    </div>
  );
}

export default function Home() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    fetch('/api/guides')
      .then(r => r.json())
      .then(d => {
        setGuides(d.data || []);
        setLoading(false);
      })
      .catch(() => {
        setError('加载失败，请稍后重试');
        setLoading(false);
      });
  }, []);

  // Check for new user setup after login
  useEffect(() => {
    if (isLoggedIn() && getIsNewUser()) {
      const u = getUser();
      if (!u?.nickname || u.nickname.startsWith('user_')) {
        setShowSetup(true);
      }
    }
  }, []);

  const handlePublishClick = (e: React.MouseEvent) => {
    if (!isLoggedIn()) {
      e.preventDefault();
      setShowAuth(true);
    }
  };

  const handleLogin = (user: any) => {
    const isNew = getIsNewUser();
    if (isNew && (!user.nickname || user.nickname.startsWith('user_'))) {
      setShowSetup(true);
    }
  };

  const handleSetupComplete = () => {
    setShowSetup(false);
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then(r => r.json()).then(d => {
      if (d.code === 'OK') {
        setUser(d.data);
      }
    }).catch(() => {});
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* ===== HERO ===== */}
      <section className="relative h-[460px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&q=80')" }}
        />
        
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-50 to-transparent" />
        <div className="relative z-10 text-center text-white px-4 max-w-3xl mx-auto animate-fadeInUp">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 drop-shadow-lg">
            好大儿走天下
          </h1>
          <p className="text-2xl md:text-3xl font-medium mb-4 text-white/95">
            孩子说好才是真的好
          </p>
          <p className="text-lg md:text-xl text-white/70 mb-10">
            真实亲子旅行攻略，和孩子一起探索世界
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/guides/create"
              onClick={handlePublishClick}
              className="inline-flex items-center gap-2 px-10 py-4 bg-green-600 text-white rounded-full font-semibold text-lg hover:bg-green-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              发布攻略
            </Link>
            <Link
              href="#guides"
              className="inline-flex items-center gap-2 px-10 py-4 bg-white/20 text-white rounded-full font-semibold text-lg border-2 border-white/40 hover:bg-white/30 transition-all hover:-translate-y-0.5"
            >
              浏览攻略
            </Link>
          </div>
        </div>
      </section>

      {/* ===== INTRO CARDS ===== */}
      <section className="max-w-7xl mx-auto px-4 -mt-10 relative z-20 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {introCards.map((item, i) => (
            <FadeInUp key={item.title} delay={i * 120} className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all hover:-translate-y-1">
              <div className="text-4xl mb-3">{item.icon}</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </FadeInUp>
          ))}
        </div>
      </section>

      {/* ===== PHOTO GRID ===== */}
      <section className="max-w-7xl mx-auto px-4 mb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.label}
              className="relative rounded-xl overflow-hidden aspect-[4/3] group cursor-pointer"
            >
              <img
                src={photo.src}
                alt={photo.label}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <span className="absolute bottom-3 left-3 text-white text-sm font-medium drop-shadow">
                {photo.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 儿童互动 ===== */}
      <section className="max-w-7xl mx-auto px-4 mb-12">
        <h2 className="text-xl font-bold text-gray-800 mb-4">儿童互动</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {childFeatures.map((f) => (
            <Link
              key={f.name}
              href={f.href}
              className="flex-shrink-0 flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <span className="text-2xl">{f.icon}</span>
              <span className="font-semibold text-sm text-gray-700">{f.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== 攻略列表 ===== */}
      <section id="guides" className="max-w-7xl mx-auto px-4 pb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">亲子攻略</h2>
          <Link
            href="/guides/create"
            onClick={handlePublishClick}
            className="text-sm text-green-600 hover:text-green-800 font-medium"
          >
            发布攻略 →
          </Link>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <GuideSkeleton key={i} />)}
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">😵</div>
            <p className="text-lg mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-green-600 hover:text-green-800 text-sm font-medium underline underline-offset-2"
            >
              刷新重试
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {guides.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {guides.map((guide) => (
                  <Link key={guide.id} href={`/guides/${guide.id}`}>
                    <article className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all hover:-translate-y-1 group">
                      <div className="h-48 relative overflow-hidden">
                        {guide.coverImage ? (
                          <img
                            src={guide.coverImage}
                            alt={guide.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                            <span className="text-2xl font-bold text-white drop-shadow-lg">
                              {guide.destination}
                            </span>
                          </div>
                        )}
                        {guide.category && (
                          <span className="absolute top-3 left-3 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm text-white">
                            {guide.category}
                          </span>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors line-clamp-1">
                          {guide.title}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                          {guide.summary}
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                          <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs text-green-600 font-medium">
                            {guide.author?.nickname?.[0] || '匿'}
                          </span>
                          <span>{guide.author?.nickname || '匿名'}</span>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🗺️</div>
                <p className="text-lg text-gray-400 mb-2">还没有攻略，快来发布第一篇吧！</p>
                <p className="text-sm text-gray-300 mb-6">分享你的亲子旅行经验，帮助更多家庭出发</p>
                <Link
                  href="/guides/create"
                  onClick={handlePublishClick}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-full text-sm font-medium hover:bg-green-700 transition-all shadow-md hover:shadow-lg"
                >
                  立即发布
                </Link>
              </div>
            )}
          </>
        )}
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <Link href="/faq" className="hover:text-gray-700 transition-colors">常见问题</Link>
              <Link href="/legal/privacy" className="hover:text-gray-700 transition-colors">隐私政策</Link>
              <Link href="/legal/terms" className="hover:text-gray-700 transition-colors">服务条款</Link>
            </div>
            <p>© {new Date().getFullYear()} 好大儿走天下</p>
          </div>
        </div>
      </footer>

      {/* Auth Modal & Profile Setup */}
      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        onLogin={handleLogin}
        force={false}
      />
      <ProfileSetup
        open={showSetup}
        onComplete={handleSetupComplete}
      />
    </main>
  );
}
