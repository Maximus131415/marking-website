import { useAuth } from '../AuthContext';

export default function Cabinet() {
  // Достаем данные пользователя и функцию выхода из нашего контекста
  const { user, logout } = useAuth(); 

  // Если вдруг данные пользователя еще не подгрузились (защита от ошибок)
  if (!user) {
    return <p style={{ textAlign: 'center', padding: '2rem' }}>Загрузка...</p>;
  }

  return (
    <div className="card card-wide">
      {/* Шапка кабинета с кнопкой выхода */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: 0 }}>Личный кабинет</h2>
        <button onClick={logout} className="btn btn-danger" style={{ width: 'auto', marginTop: 0 }}>
          Выйти
        </button>
      </div>

      <p className="text-muted" style={{ textAlign: 'center', marginBottom: '3rem', fontSize: '1.1rem' }}>
        Добро пожаловать, <strong style={{ color: 'var(--text-main)' }}>{user.username}</strong>! <br/>
        Ваш тип аккаунта: <strong style={{ color: 'var(--text-main)' }}>{user.role === 'customer' ? 'Заказчик' : 'Исполнитель'}</strong>
      </p>

      {/* --- ИНТЕРФЕЙС ЗАКАЗЧИКА --- */}
      {user.role === 'customer' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: 0 }}>Ваши заказы на разметку</h3>
            <button className="btn btn-outline" style={{ width: 'auto', marginTop: 0 }}>+ Создать заказ</button>
          </div>
          <ul className="task-list">
            <li className="task-item">
              <div>
                <h4 style={{ marginBottom: '0.25rem' }}>Заказ #1: Классификация изображений автомобилей</h4>
                <p className="text-muted" style={{ fontSize: '0.875rem' }}>Статус: В процессе</p>
              </div>
              <button className="btn btn-outline" style={{ width: 'auto', marginTop: 0 }}>Детали</button>
            </li>
          </ul>
        </div>
      )}

      {/* --- ИНТЕРФЕЙС ИСПОЛНИТЕЛЯ --- */}
      {user.role === 'worker' && (
        <div>
          <h3 style={{ marginBottom: '0.5rem' }}>Доступные задачи</h3>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>У вас 1 задача в работе.</p>
          <ul className="task-list">
            <li className="task-item">
              <div>
                <h4 style={{ marginBottom: '0.25rem' }}>Разметка датасета: Машины на дороге (BBox)</h4>
                <p className="text-muted" style={{ fontSize: '0.875rem' }}>Осталось разметить: 140 фото</p>
              </div>
              <button className="btn" style={{ width: 'auto', marginTop: 0 }}>Продолжить разметку</button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}