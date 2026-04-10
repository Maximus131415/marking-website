import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

// ЕДИНАЯ ССЫЛКА НА БЭКЕНД
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Marking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId'); 
  
  const token = localStorage.getItem('token');

  if (!token) {
    navigate('/login'); 
    return null;
  }

  const [order, setOrder] = useState(null); 
  const [images, setImages] = useState([]); 
  const [currentIndex, setCurrentIndex] = useState(0); 
  
  const [boxes, setBoxes] = useState([]); 
  const [isDrawing, setIsDrawing] = useState(false); 
  const [startPos, setStartPos] = useState({ x: 0, y: 0 }); 
  const [currentBox, setCurrentBox] = useState(null); 
  const [activeBoxIndex, setActiveBoxIndex] = useState(null); 

  // НОВОЕ СОСТОЯНИЕ ДЛЯ ПЛОСКОГО СПИСКА КЛАССОВ
  const [flattenedClasses, setFlattenedClasses] = useState([]);

  const containerRef = useRef(null); 

  useEffect(() => {
    const fetchData = async () => {
      try {
        const orderRes = await fetch(`${API_URL}/orders/${orderId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const orderData = await orderRes.json();
        setOrder(orderData);

        // Превращаем словарь {"Группа": ["Тег"]} в плоский массив ["Группа: Тег"]
        if (orderData.classes) {
          if (Array.isArray(orderData.classes)) {
            setFlattenedClasses(orderData.classes); // Защита от старых заказов
          } else {
            const flat = [];
            Object.entries(orderData.classes).forEach(([cat, tags]) => {
              tags.forEach(tag => flat.push(`${cat}: ${tag}`));
            });
            setFlattenedClasses(flat);
          }
        }

        const imagesRes = await fetch(`${API_URL}/orders/${orderId}/images`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const imagesData = await imagesRes.json();
        setImages(imagesData.map(img => ({ ...img, isDone: false, annotations: [] })));
      } catch (e) {
        console.error("Ошибка загрузки данных:", e);
        alert("Не удалось загрузить заказ");
      }
    };
    if (orderId) fetchData();
  }, [orderId, token]);

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
    if (currentBox.w > 2 && currentBox.h > 2) { 
      const newBoxes = [...boxes, currentBox];
      setBoxes(newBoxes);
      setActiveBoxIndex(newBoxes.length - 1); 
    }
    setCurrentBox(null);
  };

  const handleAssignClass = (className) => {
    if (order?.task_type === 'classification') {
      handleSaveAndNext([{ label: className }]);
    } else {
      if (activeBoxIndex === null) return alert("Сначала нарисуйте или выберите рамку!");
      const updatedBoxes = [...boxes];
      updatedBoxes[activeBoxIndex].label = className; 
      setBoxes(updatedBoxes);
      setActiveBoxIndex(null); 
    }
  };

  const handleSaveAndNext = async (finalAnnotations = boxes) => {
    const currentImg = images[currentIndex];
    try {
      await fetch(`${API_URL}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ image_id: currentImg.id, order_id: orderId, annotation_data: finalAnnotations })
      });

      const updatedImages = [...images];
      updatedImages[currentIndex].isDone = true;
      setImages(updatedImages);
      setBoxes([]); 
      setActiveBoxIndex(null);

      if (currentIndex < images.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        alert("🎉 Заказ полностью выполнен! Статус обновлен.");
        navigate('/list'); 
      }
    } catch (e) {
      alert("Ошибка сохранения разметки");
    }
  };

  if (!order || images.length === 0) return <div style={{padding: '50px', color: 'white'}}>Загрузка заказа...</div>;

  return (
    <div className="app-container">
      <div className="viewer-panel">
        <div className="header-panel">
          <div>
            <h2 style={{margin: 0}}>Заказ: {order.title}</h2>
            <span style={{color: '#a0aec0', fontSize: '14px'}}>
              Тип: {order.task_type === 'classification' ? 'Классификация' : 'Выделение объектов'}
            </span>
          </div>
          <button className="btn btn-danger" onClick={() => navigate('/list')}>⏸ Приостановить и выйти</button>
        </div>

        <div className="canvas-container" ref={containerRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <img src={images[currentIndex].url} alt="To Label" className="image-layer" />
          
          <div className="drawing-area">
            {boxes.map((box, i) => (
              <div key={i} className={`bbox ${i === activeBoxIndex ? 'active' : ''}`} style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }} onClick={(e) => { e.stopPropagation(); setActiveBoxIndex(i); }}>
                {box.label && <div className="bbox-label">{box.label}</div>}
              </div>
            ))}
            {isDrawing && currentBox && (
              <div className="bbox active" style={{ left: `${currentBox.x}%`, top: `${currentBox.y}%`, width: `${currentBox.w}%`, height: `${currentBox.h}%` }} />
            )}
          </div>
        </div>
      </div>

      <div className="sidebar">
        <div className="tools-section">
          <h3>Варианты ответов</h3>
          {order.task_type === 'bounding_box' && (
            <p style={{fontSize: '12px', color: '#a0aec0', marginTop: '5px'}}>
              {activeBoxIndex !== null ? "🟢 Выберите класс для текущей рамки:" : "1. Нарисуйте рамку на объекте."}
            </p>
          )}
          <div className="class-buttons">
            {/* ИСПОЛЬЗУЕМ НОВЫЙ ПЛОСКИЙ МАССИВ КЛАССОВ */}
            {flattenedClasses.map((cls, i) => (
              <button key={cls} className="btn" onClick={() => handleAssignClass(cls)} disabled={order.task_type === 'bounding_box' && activeBoxIndex === null} style={{ opacity: (order.task_type === 'bounding_box' && activeBoxIndex === null) ? 0.5 : 1 }}>
                <span className="key-hint">{i + 1}</span> {cls}
              </button>
            ))}
          </div>
          {order.task_type === 'bounding_box' && (
            <button className="btn btn-primary" style={{width: '100%', marginTop: '20px'}} onClick={() => handleSaveAndNext(boxes)}>
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