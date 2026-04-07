import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const { login } = useAuth(); 
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Делаем РЕАЛЬНЫЙ запрос к твоему FastAPI
      const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password }) 
      });

      if (response.ok) {
        const data = await response.json();
        // data.user и data.token теперь приходят из базы данных SQLite!
        login(data.user, data.token); 
        
        // Перенаправляем в Личный кабинет
        navigate('/cabinet'); 
      } else {
        const errorData = await response.json();
        alert(`Ошибка входа: ${errorData.detail}`);
      }
    } catch (error) {
      console.error('Ошибка сети:', error);
      alert('Не удалось подключиться к серверу. Бэкенд запущен?');
    }
  };

  return (
    <div className="card card-auth">
      <h2>Вход в систему</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email</label>
          <input 
            type="email" 
            placeholder="Введите ваш email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
        </div>
        <div className="form-group">
          <label>Пароль</label>
          <input 
            type="password" 
            placeholder="Введите пароль" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
        </div>
        <button type="submit" className="btn">Войти</button>
      </form>
    </div>
  );
}