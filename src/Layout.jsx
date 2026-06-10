import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Apple,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Contrast,
  Crown,
  Dumbbell,
  Home,
  Menu,
  MessageCircle,
  Moon,
  Sun,
  Target,
  TrendingUp,
  Trophy,
  User,
  Users,
  Utensils,
  X
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { appClient } from '@/api/appClient';
import Logo from '@/components/ui/Logo';
import NotificationBell from '@/components/notifications/NotificationBell';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import NotificationScheduler from '@/components/notifications/NotificationScheduler';
import { progressInLevel } from '@/lib/leveling';
import { setA11y, useA11y } from '@/lib/a11y';

const SIDEBAR_KEY = 'health-app-sidebar-collapsed';

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const a11y = useA11y();
  const resolvedTheme = a11y.theme === 'system'
    ? (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : a11y.theme;
  const highContrast = a11y.highContrast;

  const { data: cachedProfiles = [], isPending: profileLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      try {
        const isAuth = await appClient.auth.isAuthenticated();
        if (!isAuth) return [];
        const user = await appClient.auth.me();
        return appClient.entities.UserProfile.filter({ created_by: user.email }, '-created_date', 1);
      } catch {
        return [];
      }
    },
    staleTime: 30_000
  });

  useEffect(() => {
    const savedSidebar = window.localStorage.getItem(SIDEBAR_KEY);
    if (savedSidebar === 'true' || savedSidebar === 'false') {
      setSidebarCollapsed(savedSidebar === 'true');
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const onEsc = (event) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentPageName]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const profile = cachedProfiles?.[0] || null;
  const isNutritionistTheme = profile?.user_type === 'nutritionist';

  useEffect(() => {
    document.documentElement.classList.toggle('theme-nutritionist', isNutritionistTheme);
    return () => {
      document.documentElement.classList.remove('theme-nutritionist');
    };
  }, [isNutritionistTheme]);
  const authPages = ['Login', 'Register', 'ForgotPassword', 'ResetPassword'];
  if (authPages.includes(currentPageName)) {
    return <>{children}</>;
  }

  const isNutritionist = profile?.user_type === 'nutritionist';

  const userNavSections = [
    {
      title: 'Principal',
      items: [
        { icon: Home, label: 'Início', page: 'Home' },
        { icon: Target, label: 'Metas', page: 'Goals' },
        { icon: Dumbbell, label: 'Treinos', page: 'WorkoutTracker' },
        { icon: Utensils, label: 'Refeições', page: 'MealPlans' },
        { icon: Apple, label: 'Nutrição', page: 'NutritionTracker' }
      ]
    },
    {
      title: 'Comunidade',
      items: [
        { icon: Users, label: 'Social', page: 'SocialFeed' },
        { icon: Users, label: 'Grupos', page: 'Groups' },
        { icon: MessageCircle, label: 'Chat', page: 'Chat' },
        { icon: Users, label: 'Nutricionistas', page: 'Nutritionists' }
      ]
    },
    {
      title: 'Desempenho',
      items: [
        { icon: BarChart3, label: 'Progresso', page: 'Progress' },
        { icon: Activity, label: 'Saúde', page: 'HealthData' },
        { icon: Trophy, label: 'Conquistas', page: 'Achievements' },
        { icon: TrendingUp, label: 'Ranking', page: 'Leaderboard' },
        { icon: User, label: 'Perfil', page: 'Profile' }
      ]
    }
  ];

  const nutritionistNavSections = [
    {
      title: 'Atendimento',
      items: [
        { icon: Home, label: 'Dashboard', page: 'NutritionistDashboard' },
        { icon: Target, label: 'Metas', page: 'PatientGoalManager' },
        { icon: MessageCircle, label: 'Chat', page: 'Chat' },
        { icon: User, label: 'Perfil', page: 'Profile' }
      ]
    }
  ];

  const navSections = isNutritionist ? nutritionistNavSections : userNavSections;
  const navItems = navSections.flatMap((section) => section.items);
  const mobilePrimaryNav = navItems.slice(0, 4);

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const toggleContrast = () => setA11y({ highContrast: !highContrast });
  const toggleTheme = () => setA11y({ theme: resolvedTheme === 'dark' ? 'light' : 'dark' });

  const levelInfo = progressInLevel(profile?.xp);
  const sidebarLevelXP = levelInfo.xpInLevel;
  const sidebarLevelSize = levelInfo.levelSize;
  const sidebarXpProgress = levelInfo.progressPct;

  const themeButtonLabel = resolvedTheme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro';
  const contrastButtonLabel = highContrast ? 'Desativar alto contraste' : 'Ativar alto contraste';
  const sidebarButtonLabel = sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral';

  return (
    <div className={`min-h-screen ${highContrast ? 'high-contrast' : ''}`}>
      <a href="#main-content" className="skip-link">Pular para o conteúdo</a>

      <NotificationCenter
        isOpen={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
      />
      <NotificationScheduler profile={profile} />

      <div className="hidden md:flex fixed top-4 right-4 z-40 items-center gap-2">
        <NotificationBell onClick={() => setNotificationCenterOpen(true)} />
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-subtle)] shadow-[var(--app-shadow-1)] hover:text-[var(--app-ink)] transition-colors grid place-items-center"
          aria-label={themeButtonLabel}
          type="button"
        >
          {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          onClick={toggleContrast}
          className="w-10 h-10 rounded-full border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-subtle)] shadow-[var(--app-shadow-1)] hover:text-[var(--app-ink)] transition-colors grid place-items-center"
          aria-label={contrastButtonLabel}
          type="button"
        >
          <Contrast size={18} />
        </button>
      </div>

      <header className="md:hidden fixed top-0 inset-x-0 z-40 px-4 pt-3">
        <div className="rounded-2xl border border-[var(--app-line)] bg-[color:var(--app-surface)]/92 backdrop-blur-xl shadow-[var(--app-shadow-2)] px-3 py-2.5 flex items-center">
          <div className="flex-1" />
          <Logo size="sm" showText={false} />
          <div className="flex-1 flex items-center justify-end gap-2">
            <NotificationBell onClick={() => setNotificationCenterOpen(true)} />
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-subtle)] grid place-items-center"
              aria-label={themeButtonLabel}
              type="button"
            >
              {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={toggleContrast}
              className="w-9 h-9 rounded-xl border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-subtle)] grid place-items-center"
              aria-label={contrastButtonLabel}
              type="button"
            >
              <Contrast size={16} />
            </button>
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="w-9 h-9 rounded-xl border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-subtle)] grid place-items-center"
              aria-label="Abrir menu principal"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-drawer"
              type="button"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      <aside
        className={`hidden md:block fixed left-0 top-0 bottom-0 z-40 p-3 transition-[width] duration-300 ${
          sidebarCollapsed ? 'w-[6rem]' : 'w-[18rem]'
        }`}
      >
        <button
          onClick={() => setSidebarCollapsed((prev) => !prev)}
          className="hidden md:grid place-items-center absolute top-10 -right-3 h-8 w-8 rounded-full border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-subtle)] hover:text-[var(--app-ink)] shadow-[var(--app-shadow-2)] transition-colors z-[45]"
          aria-label={sidebarButtonLabel}
          title={sidebarButtonLabel}
          type="button"
        >
          {sidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>

        <div className={`saas-sidebar-shell h-full ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
          <div className={`border-b border-[var(--app-line)] ${sidebarCollapsed ? 'px-2 py-4' : 'px-4 py-5'}`}>
            <div className="flex items-center gap-2 justify-center">
              <button
                type="button"
                onClick={() => {
                  if (sidebarCollapsed) setSidebarCollapsed(false);
                }}
                className={`${sidebarCollapsed ? 'cursor-pointer' : 'cursor-default'}`}
                aria-label={sidebarCollapsed ? 'Expandir menu lateral pelo logo' : undefined}
                title={sidebarCollapsed ? 'Clique para expandir o menu' : undefined}
              >
                <Logo size={sidebarCollapsed ? 'sm' : 'md'} showText={false} />
              </button>
            </div>
            {!sidebarCollapsed && (
              <p className="text-xs text-[var(--app-subtle)] mt-2 text-center">Painel de navegação</p>
            )}
          </div>

          <nav className={`flex-1 py-3 overflow-y-auto ${sidebarCollapsed ? 'px-2' : 'px-3'}`} aria-label="Navegação principal">
            <div className="space-y-3">
              {navSections.map((section) => (
                <div key={section.title}>
                  {!sidebarCollapsed && (
                    <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--app-subtle)]/90">
                      {section.title}
                    </p>
                  )}
                  <ul className="space-y-1.5">
                    {section.items.map((item) => {
                      const isActive = currentPageName === item.page;
                      return (
                        <li key={item.page}>
                          <Link
                            to={createPageUrl(item.page)}
                            className={`saas-nav-item ${isActive ? 'is-active' : ''} ${sidebarCollapsed ? 'is-collapsed' : ''}`}
                            aria-current={isActive ? 'page' : undefined}
                            title={sidebarCollapsed ? item.label : undefined}
                          >
                            <item.icon size={18} />
                            {!sidebarCollapsed && <span>{item.label}</span>}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </nav>

          {!isNutritionist && !sidebarCollapsed && (
            <div className="px-3 pt-2">
              <Link to={createPageUrl('Plans')}>
                <div
                  className={`rounded-2xl px-3 py-3 border ${
                    profile?.plan_type === 'premium'
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200/80 dark:from-amber-500/15 dark:to-orange-500/15 dark:border-amber-400/35'
                      : profile?.plan_type === 'basic'
                        ? 'bg-gradient-to-r from-sky-50 to-blue-50 border-sky-200/80 dark:from-sky-500/15 dark:to-blue-500/15 dark:border-sky-400/35'
                        : 'bg-[var(--app-surface-soft)] border-[var(--app-line)]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Crown
                      size={15}
                      className={
                        profile?.plan_type === 'premium'
                          ? 'text-amber-500'
                          : profile?.plan_type === 'basic'
                            ? 'text-sky-600'
                            : 'text-slate-400'
                      }
                    />
                    <span className="text-sm font-semibold text-[var(--app-ink)]">
                      {profile?.plan_type === 'premium' ? 'Premium' :
                        profile?.plan_type === 'basic' ? 'Básico' : 'Gratuito'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--app-subtle)]">
                    {profile?.plan_type === 'free'
                      ? 'Faça upgrade para recursos avançados'
                      : 'Aproveite os benefícios do seu plano'}
                  </p>
                </div>
              </Link>
            </div>
          )}

          {!isNutritionist && sidebarCollapsed && (
            <div className="px-2 pt-2">
              <Link
                to={createPageUrl('Plans')}
                className="saas-nav-item is-collapsed"
                title="Planos"
              >
                <Crown size={18} className="text-amber-500" />
              </Link>
            </div>
          )}

          <div className={`py-3 border-t border-[var(--app-line)] mt-3 ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
            <div className={`rounded-2xl border border-[var(--app-line)] bg-[var(--app-surface-soft)] ${sidebarCollapsed ? 'px-2 py-2.5' : 'px-3 py-3'}`}>
              <div className={`flex ${sidebarCollapsed ? 'flex-col items-center gap-2' : 'items-center gap-3'}`}>
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center overflow-hidden">
                  {profileLoading ? (
                    <div className="w-full h-full bg-emerald-200/60 dark:bg-emerald-500/30 animate-pulse" />
                  ) : profile?.photo_url ? (
                    <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                      {profile?.first_name?.[0] || '?'}
                    </span>
                  )}
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0">
                    {profileLoading ? (
                      <>
                        <div className="h-3.5 w-24 rounded bg-[var(--app-line)] animate-pulse mb-1.5" />
                        <div className="h-3 w-16 rounded bg-[var(--app-line)] animate-pulse" />
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-[var(--app-ink)] truncate">
                          {profile?.first_name} {profile?.last_name}
                        </p>
                        <p className="text-xs text-[var(--app-subtle)] truncate">
                          {isNutritionist
                            ? (profile?.crm_nutrition || 'Nutricionista')
                            : `Nível ${profile?.level || 1} - ${profile?.xp || 0} XP`}
                        </p>
                      </>
                    )}
                  </div>
                )}
                {sidebarCollapsed && !profileLoading && !isNutritionist && (
                  <p className="text-[11px] text-[var(--app-subtle)]">Nv {profile?.level || 1}</p>
                )}
              </div>
              {!isNutritionist && (
                <div className={sidebarCollapsed ? 'mt-1.5' : 'mt-2.5'}>
                  <div className="h-1.5 bg-[var(--app-line)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600"
                      style={{ width: `${sidebarXpProgress}%` }}
                    />
                  </div>
                  {!sidebarCollapsed && (
                    <p className="text-[11px] text-[var(--app-subtle)] mt-1.5">{sidebarLevelXP}/{sidebarLevelSize} XP no nível atual</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      <div
        className={`md:hidden fixed inset-0 z-50 transition-all duration-300 ${
          mobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <div
          className={`absolute inset-0 bg-slate-900/35 backdrop-blur-[1px] transition-opacity duration-300 ${
            mobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
        <aside
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navegação"
          className={`mobile-menu-sheet absolute top-0 bottom-0 left-0 w-[86%] max-w-[330px] transition-transform duration-300 ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="px-4 py-4 border-b border-[var(--app-line)] flex items-start">
            <div className="w-8" aria-hidden="true" />
            <div className="flex-1 flex flex-col items-center">
              <Logo size="sm" showText={false} />
              <p className="text-[11px] text-[var(--app-subtle)] mt-1.5">Menu principal</p>
            </div>
            <button
              onClick={closeMobileMenu}
              className="w-8 h-8 rounded-lg border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-subtle)] grid place-items-center"
              type="button"
              aria-label="Fechar menu"
            >
              <X size={16} />
            </button>
          </div>

          <nav className="px-3 py-3 overflow-y-auto h-[calc(100%-170px)]" aria-label="Navegação mobile">
            <div className="space-y-3">
              {navSections.map((section) => (
                <div key={section.title}>
                  <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--app-subtle)]/90">
                    {section.title}
                  </p>
                  <ul className="space-y-1.5">
                    {section.items.map((item) => {
                      const isActive = currentPageName === item.page;
                      return (
                        <li key={item.page}>
                          <Link
                            to={createPageUrl(item.page)}
                            onClick={closeMobileMenu}
                            className={`saas-nav-item ${isActive ? 'is-active' : ''}`}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            <item.icon size={18} />
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </nav>

          {!isNutritionist && (
            <div className="px-3 pb-4">
              <div className="rounded-2xl border border-[var(--app-line)] bg-[var(--app-surface-soft)] px-3 py-3 text-xs text-[var(--app-subtle)]">
                Nível {profile?.level || 1} - {profile?.xp || 0} XP
              </div>
            </div>
          )}
        </aside>
      </div>

      <main
        id="main-content"
        tabIndex={-1}
        className={`pb-24 pt-[78px] md:pt-0 md:pb-0 ${sidebarCollapsed ? 'md:pl-[6rem]' : 'md:pl-[18rem]'}`}
      >
        {children}
      </main>

      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-40" aria-label="Atalhos mobile">
        <div className="saas-mobile-nav">
          <ul className="flex items-center justify-between gap-1">
            {mobilePrimaryNav.map((item) => {
              const isActive = currentPageName === item.page;
              return (
                <li key={item.page} className="flex-1">
                  <Link
                    to={createPageUrl(item.page)}
                    className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl transition-all ${
                      isActive
                        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15'
                        : 'text-[var(--app-subtle)] hover:text-[var(--app-ink)]'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <item.icon size={18} />
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
            <li className="flex-1">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="w-full flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl text-[var(--app-subtle)] hover:text-[var(--app-ink)]"
                type="button"
                aria-label="Abrir menu completo"
              >
                <Menu size={18} />
                <span className="text-[11px] font-medium">Menu</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  );
}
