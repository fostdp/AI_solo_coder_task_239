import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/alumni' && location.pathname === '/') return true;
    return location.pathname === path;
  };

  return (
    <header className="header">
      <div className="container">
        <nav className="nav">
          <Link to="/alumni" className="nav-brand">
            校友通讯录
          </Link>
          <ul className="nav-links">
            <li>
              <Link
                to="/alumni"
                className={`nav-link ${isActive('/alumni') || isActive('/') ? 'active' : ''}`}
              >
                名片墙
              </Link>
            </li>
            <li>
              <Link
                to="/events"
                className={`nav-link ${isActive('/events') ? 'active' : ''}`}
              >
                活动
              </Link>
            </li>
            <li>
              <Link
                to="/circles"
                className={`nav-link ${isActive('/circles') ? 'active' : ''}`}
              >
                圈子
              </Link>
            </li>
            <li>
              <Link
                to="/news"
                className={`nav-link ${isActive('/news') ? 'active' : ''}`}
              >
                新闻
              </Link>
            </li>
            <li>
              <Link
                to="/messages"
                className={`nav-link ${isActive('/messages') ? 'active' : ''}`}
              >
                私信
              </Link>
            </li>
            <li>
              <Link
                to="/profile"
                className={`nav-link ${isActive('/profile') ? 'active' : ''}`}
              >
                我的资料
              </Link>
            </li>
            {isAdmin && (
              <li>
                <Link
                  to="/admin"
                  className={`nav-link ${isActive('/admin') ? 'active' : ''}`}
                >
                  管理后台
                </Link>
              </li>
            )}
            <li>
              <span style={{ color: 'rgba(255,255,255,0.8)', marginRight: '0.5rem' }}>
                {user?.name}
                {isAdmin && ' (管理员)'}
              </span>
              <button
                className="btn btn-outline"
                style={{ color: 'white', borderColor: 'white' }}
                onClick={handleLogout}
              >
                退出
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
