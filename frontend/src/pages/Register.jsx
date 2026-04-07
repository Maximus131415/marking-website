import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Register() {
  // Хуки для работы с URL и перенаправлением
  const location = useLocation();
  const navigate = useNavigate();
  
  // Достаем параметр role из адресной строки (например, ?role=customer)
  const queryParams = new URLSearchParams(location.search);
  const initialRole = queryParams.get('role') || 'worker'; // worker по умолчанию

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '', 
    role: initialRole    
  });

  // ВАЖНО: Вот та самая потерянная функция! 
  // Она берет имя поля (name) и записывает в него значение (value)
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert('Ошибка: Пароли не совпадают!');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: formData.role
        })
      });

      if (response.ok) {
        alert('Регистрация прошла успешно! Теперь вы можете войти.');
        navigate('/login');
      } else {
        const errorData = await response.json();
        // Защита от разных форматов ошибок
        const errorMessage = Array.isArray(errorData.detail) 
          ? errorData.detail[0].msg 
          : errorData.detail;
        alert(`Ошибка регистрации: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Ошибка сети:', error);
      alert('Сервер недоступен.');
    }
  };
  
  return (
    <div className="card card-auth">
      <h2>Регистрация</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Имя пользователя</label>
          {/* Благодаря name="username" функция handleChange поймет, куда писать текст */}
          <input name="username" placeholder="Иван Иванов" onChange={handleChange} required />
        </div>
        
        <div className="form-group">
          <label>Email</label>
          <input type="email" name="email" placeholder="email@example.com" onChange={handleChange} required />
        </div>
        
        <div className="form-group">
          <label>Пароль</label>
          <input type="password" name="password" placeholder="Придумайте пароль" onChange={handleChange} required />
        </div>
        
        <div className="form-group">
          <label>Подтвердите пароль</label>
          <input type="password" name="confirmPassword" placeholder="Повторите пароль" onChange={handleChange} required />
        </div>
        
        <div className="form-group">
          <label>Тип аккаунта</label>
          <select name="role" value={formData.role} onChange={handleChange}>
            <option value="worker">Исполнитель (Разметчик)</option>
            <option value="customer">Заказчик</option>
          </select>
        </div>
        
        <button type="submit" className="btn">Зарегистрироваться</button>
      </form>
    </div>
  );
}