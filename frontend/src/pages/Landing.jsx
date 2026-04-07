import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div>
      <section className="landing-hero">
        <h1>DataMark</h1>
        <p>Современная платформа для качественной и быстрой разметки ваших данных силами человека.</p>
        
        <Link to="/register" className="btn" style={{ width: 'auto', display: 'inline-block' }}>
          Присоединиться к платформе
        </Link>
      </section>

      <section className="landing-roles">
        
        <div className="role-card">
          <div>
            <h3>Заказчик</h3>
            <p className="subtitle">Мне нужен качественный датасет</p>
            <p>
              Загружайте ваши изображения, создавайте проекты и получайте размеченные данные в удобном формате. 
              Мы гарантируем качество и соблюдение сроков.
            </p>
          </div>
          {/* Передаем параметр role=customer в URL */}
          <Link to="/register?role=customer" className="btn btn-outline" style={{ marginTop: '1.5rem' }}>
            Разметить мои данные
          </Link>
        </div>

        <div className="role-card">
          <div>
            <h3>Исполнитель (Разметчик)</h3>
            <p className="subtitle">Хочу зарабатывать на разметке</p>
            <p>
              Выполняйте простые задачи по классификации фото или выделению объектов. 
              Работайте в удобное время, развивайте навыки и получайте оплату за выполненные задачи.
            </p>
          </div>
          {/* Передаем параметр role=worker в URL */}
          <Link to="/register?role=worker" className="btn" style={{ marginTop: '1.5rem' }}>
            Начать зарабатывать
          </Link>
        </div>

      </section>
    </div>
  );
}