import React, { useState, useEffect, useRef } from "react";
import "./styles.css";

export default function App() {
  // --- ИЗВЛЕЧЕНИЕ ПАРАМЕТРОВ ИЗ URL ---
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId'); // ID заказа для запросов к API
  const urlToken = params.get('token'); // Временный токен доступа из ссылки
  
  // Если токен есть в URL, сохраняем его в браузер и очищаем строку адреса
  if (urlToken) {
    localStorage.setItem('token', urlToken);
    window.history.replaceState({}, document.title, `?orderId=${orderId}`);
  }
  const token = localStorage.getItem('token');

  // Если токена нет, выкидываем пользователя на страницу авторизации (порт 3001)
  if (!token) {
    window.location.href = 'http://localhost:3001'; 
    return null;
  }

  // --- СОСТОЯНИЯ (STATE) ---
  const [order, setOrder] = useState(null); // Данные заказа (название, типы задач, доступные классы)
  const [images, setImages] = useState([]); // Список объектов изображений
  const [currentIndex, setCurrentIndex] = useState(0); // Номер картинки, которую размечаем сейчас
  
  // Состояния для рисования рамок (Bounding Boxes)
  const [boxes, setBoxes] = useState([]); // Массив готовых рамок: {x, y, w, h, label}
  const [isDrawing, setIsDrawing] = useState(false); // Режим "мышь нажата и двигается"
  const [startPos, setStartPos] = useState({ x: 0, y: 0 }); // Точка, где пользователь нажал кнопку мыши
  const [currentBox, setCurrentBox] = useState(null); // Рамка, которая меняет размер прямо под курсором
  const [activeBoxIndex, setActiveBoxIndex] = useState(null); // Индекс рамки, которой мы сейчас выбираем класс

  const containerRef = useRef(null); // Ссылка на DOM-элемент контейнера для расчёта координат

  // --- ЗАГРУЗКА ДАННЫХ ПРИ ПЕРВОМ РЕНДЕРЕ ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Получаем общую информацию о заказе
        const orderRes = await fetch(`http://localhost:8002/orders/${orderId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const orderData = await orderRes.json();
        setOrder(orderData);

        // Получаем список всех картинок, привязанных к заказу
        const imagesRes = await fetch(`http://localhost:8002/orders/${orderId}/images`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const imagesData = await imagesRes.json();
        
        // Инициализируем локальное состояние картинок
        setImages(imagesData.map(img => ({ ...img, isDone: false, annotations: [] })));
      } catch (e) {
        console.error("Ошибка загрузки данных:", e);
        alert("Не удалось загрузить заказ");
      }
    };
    if (orderId) fetchData();
  }, [orderId, token]);

  // --- ЛОГИКА РИСОВАНИЯ РАМОК ---
  const handleMouseDown = (e) => {
    // Рисовать можно только если тип задачи — 'bounding_box'
    if (order?.task_type !== 'bounding_box') return;
    
    const rect = containerRef.current.getBoundingClientRect();
    // Переводим координаты клика в проценты относительно размера картинки
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setStartPos({ x, y });
    setIsDrawing(true);
    setCurrentBox({ x, y, w: 0, h: 0, label: null });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentY = ((e.clientY - rect.top) / rect.height) * 100;

    // Рассчитываем координаты и размеры (Math.min/abs позволяют рисовать в любую сторону)
    const x = Math.min(startPos.x, currentX);
    const y = Math.min(startPos.y, currentY);
    const w = Math.abs(currentX - startPos.x);
    const h = Math.abs(currentY - startPos.y);

    setCurrentBox({ x, y, w, h, label: null });
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Если рамка не крошечная (защита от случайных кликов), добавляем её в список
    if (currentBox.w > 2 && currentBox.h > 2) { 
      const newBoxes = [...boxes, currentBox];
      setBoxes(newBoxes);
      setActiveBoxIndex(newBoxes.length - 1); // Сразу делаем её активной для выбора класса
    }
    setCurrentBox(null);
  };

  // --- НАЗНАЧЕНИЕ КЛАССА (ТЕГА) ---
  const handleAssignClass = (className) => {
    if (order?.task_type === 'classification') {
      // В режиме классификации один клик по кнопке сразу сохраняет результат для всего фото
      handleSaveAndNext([{ label: className }]);
    } else {
      // В режиме рамок — проверяем, выделена ли какая-то рамка
      if (activeBoxIndex === null) return alert("Сначала нарисуйте или выберите рамку!");
      const updatedBoxes = [...boxes];
      updatedBoxes[activeBoxIndex].label = className; // Записываем выбранный класс в рамку
      setBoxes(updatedBoxes);
      setActiveBoxIndex(null); // Снимаем фокус с рамки
    }
  };

  // --- СОХРАНЕНИЕ И ПЕРЕХОД К СЛЕДУЮЩЕМУ КАДРУ ---
  const handleSaveAndNext = async (finalAnnotations = boxes) => {
    const currentImg = images[currentIndex];
    
    try {
      // Отправляем массив разметок (аннотаций) на сервер
      await fetch('http://localhost:8002/annotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          image_id: currentImg.id,
          order_id: orderId,
          annotation_data: finalAnnotations
        })
      });

      // Обновляем состояние интерфейса локально
      const updatedImages = [...images];
      updatedImages[currentIndex].isDone = true;
      setImages(updatedImages);
      setBoxes([]); // Очищаем холст для следующей картинки
      setActiveBoxIndex(null);

      // Проверяем, есть ли еще картинки в списке
      if (currentIndex < images.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        alert("🎉 Заказ полностью выполнен! Статус обновлен.");
        window.location.href = 'http://localhost:3001/dashboard';
      }
    } catch (e) {
      alert("Ошибка сохранения разметки");
    }
  };

  // Выход из интерфейса разметки обратно в личный кабинет
  const handlePause = () => {
    window.location.href = 'http://localhost:3001/dashboard';
  };

  // Пока данные не загружены, показываем экран загрузки
  if (!order || images.length === 0) return <div style={{padding: '50px', color: 'white'}}>Загрузка заказа...</div>;

  return (
    <div className="app-container">
      {/* ЛЕВАЯ ЧАСТЬ — РАБОЧАЯ ОБЛАСТЬ С КАРТИНКОЙ */}
      <div className="viewer-panel">
        <div className="header-panel">
          <div>
            <h2 style={{margin: 0}}>Заказ: {order.title}</h2>
            <span style={{color: '#a0aec0', fontSize: '14px'}}>
              Тип: {order.task_type === 'classification' ? 'Классификация' : 'Выделение объектов'}
            </span>
          </div>
          <button className="btn btn-danger" onClick={handlePause}>⏸ Приостановить и выйти</button>
        </div>

        {/* Область холста, где мы слушаем события мыши */}
        <div 
          className="canvas-container" 
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img src={images[currentIndex].url} alt="To Label" className="image-layer" />
          
          <div className="drawing-area">
            {/* Рендерим список уже созданных рамок */}
            {boxes.map((box, i) => (
              <div 
                key={i} 
                className={`bbox ${i === activeBoxIndex ? 'active' : ''}`}
                style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}
                onClick={(e) => { e.stopPropagation(); setActiveBoxIndex(i); }}
              >
                {/* Если у рамки уже выбран класс, показываем его название */}
                {box.label && <div className="bbox-label">{box.label}</div>}
              </div>
            ))}
            
            {/* Рендерим временную рамку, которую пользователь тянет прямо сейчас */}
            {isDrawing && currentBox && (
              <div className="bbox active" style={{ left: `${currentBox.x}%`, top: `${currentBox.y}%`, width: `${currentBox.w}%`, height: `${currentBox.h}%` }} />
            )}
          </div>
        </div>
      </div>

      {/* ПРАВАЯ ЧАСТЬ — ПАНЕЛЬ УПРАВЛЕНИЯ */}
      <div className="sidebar">
        <div className="tools-section">
          <h3>Варианты ответов</h3>
          {order.task_type === 'bounding_box' && (
            <p style={{fontSize: '12px', color: '#a0aec0', marginTop: '5px'}}>
              {activeBoxIndex !== null ? "🟢 Выберите класс для текущей рамки:" : "1. Нарисуйте рамку на объекте."}
            </p>
          )}

          <div className="class-buttons">
            {/* Генерируем кнопки для каждого класса, указанного в заказе */}
            {order.classes.map((cls, i) => (
              <button 
                key={cls} 
                className="btn" 
                onClick={() => handleAssignClass(cls)}
                // Кнопки классов для рамок заблокированы, пока не выбрана рамка
                disabled={order.task_type === 'bounding_box' && activeBoxIndex === null}
                style={{ opacity: (order.task_type === 'bounding_box' && activeBoxIndex === null) ? 0.5 : 1 }}
              >
                <span className="key-hint">{i + 1}</span> {cls}
              </button>
            ))}
          </div>

          {/* Кнопка подтверждения видна только в режиме рамок (в классификации сохранение идет по клику на класс) */}
          {order.task_type === 'bounding_box' && (
            <button 
              className="btn btn-primary" 
              style={{width: '100%', marginTop: '20px'}}
              onClick={() => handleSaveAndNext(boxes)}
            >
              Подтвердить кадр и продолжить ➡
            </button>
          )}
        </div>

        {/* СПИСОК ФАЙЛОВ И ПРОГРЕСС БАР */}
        <div className="files-section">
          <h3>Прогресс ({images.filter(i => i.isDone).length} / {images.length})</h3>
          <div style={{marginTop: '15px'}}>
            {images.map((img, i) => (
              <div key={img.id} className={`file-row ${i === currentIndex ? "active" : ""} ${img.isDone ? "done" : ""}`}>
                <span>Фото #{i + 1}</span>
                {img.isDone ? <span style={{color: '#48bb78'}}>✔ Размечено</span> : <span>В очереди</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
