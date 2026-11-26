import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { buttonClassName } from '../components/ui/buttonClassName';
import { logout, restoreSession, selectUser } from '../features/auth/authSlice';
import { ThemeToggle } from '../features/theme/ThemeToggle';
import { ToastRegion } from '../features/toasts/ToastRegion';
import { gsap, prefersReducedMotion, useGSAP } from '../lib/motion';
import { useAppDispatch, useAppSelector } from './hooks';
import { UserMenu } from './UserMenu';
import styles from './AppLayout.module.css';

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.navLink} ${styles.navActive}` : styles.navLink;

export function AppLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);

  useEffect(() => {
    void dispatch(restoreSession());
  }, [dispatch]);

  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  useGSAP(
    () => {
      if (prefersReducedMotion() || !mainRef.current) return;
      gsap.fromTo(
        mainRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', clearProps: 'opacity,transform' },
      );
    },
    { dependencies: [pathname] },
  );

  const handleLogout = () => {
    void dispatch(logout());
    void navigate('/login');
  };

  return (
    <>
      <a href="#main" className={styles.skip}>
        Перейти к содержимому
      </a>
      <header className={styles.header}>
        <div className={styles.bar}>
          <Link to="/" className={styles.logo} aria-label="Mixback — на главную">
            <span className={styles.logoMark} aria-hidden="true" />
            Mixback
          </Link>
          <nav aria-label="Основная навигация" className={styles.nav}>
            <NavLink to="/engineers" className={navClass}>
              Звукорежиссёры
            </NavLink>
            {user && (
              <>
                <NavLink to="/orders" className={navClass}>
                  Заказы
                </NavLink>
                <NavLink to="/projects" className={navClass}>
                  Проекты
                </NavLink>
              </>
            )}
          </nav>
          <div className={styles.user}>
            <ThemeToggle />
            {user ? (
              <UserMenu user={user} onLogout={handleLogout} />
            ) : (
              <Link to="/login" className={buttonClassName({ size: 'sm' })}>
                Войти
              </Link>
            )}
          </div>
        </div>
      </header>
      <main id="main" ref={mainRef} className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerBar}>
          <span>Mixback — биржа звукорежиссёров с правками на волне</span>
          <nav aria-label="О сервисе" className={styles.footerNav}>
            <Link to="/">Главная</Link>
            <Link to="/about">О проекте</Link>
          </nav>
          <span>Учебный проект · данные хранятся в вашем браузере</span>
        </div>
      </footer>
      <ToastRegion />
    </>
  );
}
