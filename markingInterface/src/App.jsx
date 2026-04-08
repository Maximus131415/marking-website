import React, { useState, useEffect, useRef } from "react";
import "./styles.css";

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId');
  const urlToken = params.get('token');
  
  if (urlToken) {
    localStorage.setItem('token', urlToken);
    window.history.replaceState({}, document.title, `?orderId=${orderId}`);
  }
  const token = localStorage.getItem('token');

  if (!token) {
    window.location.href = 'http://localhost:3001'; 
    return null;
  }

  // --- Состояния ---
  const [order, setOrder] = useState(null);
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Для Bounding Boxes
  const [boxes, setBoxes] = useState([]); // {x, y, w, h, label} в процентах
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState(null);
  const [activeBoxIndex, setActiveBoxIndex] = useState(null);

  const containerRef = useRef(null);

  // Загрузка данных заказа при старте
  useEffect(() => {
    const fetchData = async () => {
      try {
        const orderRes = await fetch(`http://localhost:8002/orders/${orderId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const orderData = await orderRes.json();
        setOrder(orderData);

        const imagesRes = await fetch(`http://localhost:8002/orders/${orderId}/images`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const imagesData = await imagesRes.json();
        
        // Добавляем к картинкам локальное состояние "размечено"
        setImages(imagesData.map(img => ({ ...img, isDone: false, annotations: [] })));
      } catch (e) {
        console.error("Ошибка загрузки данных:", e);
        alert("Не удалось загрузить заказ");
      }
    };
    if (orderId) fetchData();
  }, [orderId, token]);

  // --- Логика рисования рамок (Bounding Box) ---
  const handleMouseDown = (e) => {
    if (order?.task_type !== 'bounding_box') return;
    const rect = containerRef.current.getBoundingClientRect();
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

    const x = Math.min(startPos.x, currentX);
    const y = Math.min(startPos.y, currentY);
    const w = Math.abs(currentX - startPos.x);
    const h = Math.abs(currentY - startPos.y);

    setCurrentBox({ x, y, w, h, label: null });
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentBox.w > 2 && currentBox.h > 2) { // Защита от случайных кликов
      const newBoxes = [...boxes, currentBox];
      setBoxes(newBoxes);
      setActiveBoxIndex(newBoxes.length - 1); // Активируем новую рамку, чтобы дать ей класс
    }
    setCurrentBox(null);
  };

  // --- Назначение класса ---
  const handleAssignClass = (className) => {
    if (order?.task_type === 'classification') {
      // Для классификации класс присваивается всей картинке
      handleSaveAndNext([{ label: className }]);
    } else {
      // Для боксов класс присваивается активной рамке
      if (activeBoxIndex === null) return alert("Сначала нарисуйте или выберите рамку!");
      const updatedBoxes = [...boxes];
      updatedBoxes[activeBoxIndex].label = className;
      setBoxes(updatedBoxes);
      setActiveBoxIndex(null); // Снимаем выделение
    }
  };

  // --- Сохранение и переход ---
const handleSaveAndNext = async (finalAnnotations = boxes) => {
    const currentImg = images[currentIndex];
    
    try {
      // ОТПРАВЛЯЕМ ДАННЫЕ НА БЭКЕНД
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

      // Локальное обновление UI
      const updatedImages = [...images];
      updatedImages[currentIndex].isDone = true;
      setImages(updatedImages);
      setBoxes([]);
      setActiveBoxIndex(null);

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
  

  // --- Приостановить работу ---
  const handlePause = () => {
    window.location.href = 'http://localhost:3001/dashboard';
  };

  if (!order || images.length === 0) return <div style={{padding: '50px', color: 'white'}}>Загрузка заказа...</div>;

  return (
    <div className="app-container">
      {/* ЛЕВАЯ ЧАСТЬ - ХОЛСТ */}
      <div className="viewer-panel">
        <div className="header-panel">
          <div>
            <h2 style={{margin: 0}}>Заказ: {order.title}</h2>
            <span style={{color: '#a0aec0', fontSize: '14px'}}>
              Тип: {order.task_type === 'classification' ? 'Классификация (Один клик)' : 'Выделение объектов (Нарисуйте рамку)'}
            </span>
          </div>
          <button className="btn btn-danger" onClick={handlePause}>⏸ Приостановить и выйти</button>
        </div>

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
            {/* Рендер готовых рамок */}
            {boxes.map((box, i) => (
              <div 
                key={i} 
                className={`bbox ${i === activeBoxIndex ? 'active' : ''}`}
                style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}
                onClick={(e) => { e.stopPropagation(); setActiveBoxIndex(i); }}
              >
                {box.label && <div className="bbox-label">{box.label}</div>}
              </div>
            ))}
            
            {/* Рендер рамки в процессе рисования */}
            {isDrawing && currentBox && (
              <div className="bbox active" style={{ left: `${currentBox.x}%`, top: `${currentBox.y}%`, width: `${currentBox.w}%`, height: `${currentBox.h}%` }} />
            )}
          </div>
        </div>
      </div>

      {/* ПРАВАЯ ЧАСТЬ - ПАНЕЛЬ ИНСТРУМЕНТОВ */}
      <div className="sidebar">
        <div className="tools-section">
          <h3>Варианты ответов</h3>
          {order.task_type === 'bounding_box' && (
            <p style={{fontSize: '12px', color: '#a0aec0', marginTop: '5px'}}>
              {activeBoxIndex !== null ? "🟢 Выберите класс для текущей рамки:" : "1. Нарисуйте рамку на объекте."}
            </p>
          )}

          <div className="class-buttons">
            {order.classes.map((cls, i) => (
              <button 
                key={cls} 
                className="btn" 
                onClick={() => handleAssignClass(cls)}
                disabled={order.task_type === 'bounding_box' && activeBoxIndex === null}
                style={{ opacity: (order.task_type === 'bounding_box' && activeBoxIndex === null) ? 0.5 : 1 }}
              >
                <span className="key-hint">{i + 1}</span> {cls}
              </button>
            ))}
          </div>

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