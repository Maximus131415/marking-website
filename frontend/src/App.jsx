import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';

// Импортируем наши страницы
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Cabinet from './pages/Cabinet';

// Импортируем логику авторизации и защиты роутов
import { AuthProvider, useAuth } from './AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Выносим шапку в отдельный компонент, чтобы иметь доступ к useAuth
function Navigation({ theme, toggleTheme }) {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar" style={{ justifyContent: 'space-between' }}>
      <div className="nav-links">
        <Link to="/" style={{ fontWeight: '800', fontSize: '1.2rem', color: 'var(--text-main)' }}>
          DataMark
        </Link>
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {/* Кнопка смены темы */}
        <button 
          onClick={toggleTheme} 
          className="btn-outline" 
          style={{ padding: '0.4rem 0.8rem', cursor: 'pointer', border: 'none', backgroundColor: 'transparent', width: 'auto' }}
          title="Сменить тему"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        
        {/* Логика отображения кнопок в зависимости от статуса */}
        {!user ? (
          <Link to="/login" className="btn btn-outline" style={{ padding: '0.4rem 1rem', width: 'auto', marginTop: 0 }}>
            Войти
          </Link>
        ) : (
          <>
            <Link to="/cabinet" className="btn-outline" style={{ padding: '0.4rem 1rem', border: 'none', marginTop: 0 }}>
              Личный кабинет
            </Link>
            <button onClick={logout} className="btn btn-danger" style={{ padding: '0.4rem 1rem', width: 'auto', marginTop: 0 }}>
              Выйти
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Подключаем нашу умную шапку */}
        <Navigation theme={theme} toggleTheme={toggleTheme} />

        <div className="container">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
              path="/cabinet" 
              element={
                <ProtectedRoute>
                  <Cabinet />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;