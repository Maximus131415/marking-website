import React, { useEffect, useState } from 'react';

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('market'); 
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  const fetchOrders = async () => {
    let url = 'https://backendorders-1.onrender.com/orders';
    if (role === 'worker') url += `?filter_type=${tab}`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setOrders(await res.json());
  };

  useEffect(() => { fetchOrders(); }, [tab, role]);

  const takeOrder = async (orderId) => {
    try {
      const res = await fetch(`https://backendorders-1.onrender.com/orders/${orderId}/take`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) window.location.href = `http://localhost:3003?orderId=${orderId}&token=${token}`;
      else { alert("Заказ уже недоступен!"); fetchOrders(); }
    } catch (e) { console.error(e); }
  };

  const continueOrder = (orderId) => window.location.href = `http://localhost:3003?orderId=${orderId}&token=${token}`;

  const downloadResults = async (orderId) => {
    try {
      const res = await fetch(`https://backendorders-1.onrender.com/orders/${orderId}/export`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `results_${data.order_title}.json`; a.click();
      } else alert("Ошибка выгрузки");
    } catch (e) { console.error(e); }
  };

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      <button className="btn btn-outline" onClick={() => window.location.href = 'http://localhost:3001/dashboard'} style={{ marginBottom: '20px' }}>⬅ Назад в кабинет</button>

      {role === 'customer' ? (
        <div style={{ marginBottom: '20px' }}>
          <h2>Мои проекты</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Ваши крупные датасеты (система сама дробит их на части для исполнителей):</p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px' }}>
          <h2 style={{ cursor: 'pointer', margin: 0, color: tab === 'market' ? 'var(--text-primary)' : 'var(--text-secondary)' }} onClick={() => setTab('market')}>Биржа задач 🌍</h2>
          <h2 style={{ cursor: 'pointer', margin: 0, color: tab === 'my_tasks' ? 'var(--text-primary)' : 'var(--text-secondary)' }} onClick={() => setTab('my_tasks')}>Мои в работе ⏳</h2>
        </div>
      )}

      <div style={{ display: 'grid', gap: '15px' }}>
        {orders.length === 0 ? ( <div className="card" style={{ textAlign: 'center' }}>Пока здесь пусто.</div> ) : (
          orders.map(order => (
            <div key={order.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: role === 'customer' ? '60%' : 'auto' }}>
                <h4 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{order.title}</h4>
                <div style={{ display: 'flex', gap: '10px', fontSize: '0.85rem', marginBottom: role === 'customer' ? '10px' : '0' }}>
                  <span style={{ background: 'var(--bg-primary)', padding: '4px 8px', borderRadius: '4px' }}>
                    Тип: {order.task_type === 'classification' ? 'Классификация' : 'Разметка'}
                  </span>
                  <span style={{ background: 'var(--bg-primary)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    Всего картинок: {order.image_count}
                  </span>
                  {role === 'worker' && (
                    <span style={{ background: order.is_my_completed ? '#c6f6d5' : 'var(--bg-primary)', color: order.is_my_completed ? '#22543d' : 'var(--text-secondary)', padding: '4px 8px', borderRadius: '4px' }}>
                      {order.is_my_completed ? '✔ Выполнено' : 'В процессе'}
                    </span>
                  )}
                </div>
                
                {/* ПРОГРЕСС БАР ДЛЯ ЗАКАЗЧИКА */}
                {role === 'customer' && (
                  <div style={{ background: 'var(--bg-primary)', height: '12px', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ width: `${order.progress}%`, height: '100%', background: order.progress === 100 ? '#48bb78' : '#3182ce', transition: 'width 0.3s' }}></div>
                    <span style={{ position: 'absolute', right: '5px', top: '-1px', fontSize: '0.65rem', color: order.progress > 50 ? 'white' : 'var(--text-secondary)', fontWeight: 'bold' }}>{order.progress}%</span>
                  </div>
                )}
              </div>
              
              {role === 'worker' && tab === 'market' && !order.is_my_completed && <button className="btn" onClick={() => takeOrder(order.id)}>Взять в работу</button>}
              {role === 'worker' && tab === 'my_tasks' && !order.is_my_completed && <button className="btn btn-outline" onClick={() => continueOrder(order.id)}>Продолжить ➡</button>}
              
              {role === 'customer' && (
                <div>
                  {order.progress === 100 ? (
                    <button className="btn btn-success" onClick={() => downloadResults(order.id)}>Скачать Итог 📥</button>
                  ) : (
                    <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Ожидание ({order.completed_images} / {order.image_count})</span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}