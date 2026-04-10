import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Marking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId'); 
  const token = localStorage.getItem('token');

  const [order, setOrder] = useState(null); 
  const [images, setImages] = useState([]); 
  const [currentIndex, setCurrentIndex] = useState(0); 
  
  const [boxes, setBoxes] = useState([]); 
  const [isDrawing, setIsDrawing] = useState(false); 
  const [startPos, setStartPos] = useState({ x: 0, y: 0 }); 
  const [currentBox, setCurrentBox] = useState(null); 
  const [activeBoxIndex, setActiveBoxIndex] = useState(null); 

  const [collapsedCats, setCollapsedCats] = useState({});
  const [zoom, setZoom] = useState(1);

  const containerRef = useRef(null); 

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    const fetchData = async () => {
      try {
        const orderRes = await fetch(`${API_URL}/orders/${orderId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setOrder(await orderRes.json());

        const imagesRes = await fetch(`${API_URL}/orders/${orderId}/images`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const imagesData = await imagesRes.json();
        const mappedImages = imagesData.map(img => ({ ...img, isDone: img.isDone || false, annotations: [] }));
        setImages(mappedImages);

        const firstUndone = mappedImages.findIndex(img => !img.isDone);
        setCurrentIndex(firstUndone !== -1 ? firstUndone : 0);
      } catch (e) {
        alert("Не удалось загрузить заказ");
      }
    };
    if (orderId) fetchData();
  }, [orderId, token, navigate]);

  const handleMouseDown = (e) => {
    if (order?.task_type !== 'bounding_box') return;
    
    // БЛОКИРОВКА: Запрещаем рисовать, если есть рамка без тега
    if (boxes.some(b => !b.label)) {
      alert("Сначала выберите класс для уже нарисованной рамки!");
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    // Ограничиваем клик рамками холста
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    
    setStartPos({ x, y });
    setIsDrawing(true);
    setCurrentBox({ x, y, w: 0, h: 0, label: null });
    setActiveBoxIndex(null);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    // ОГРАНИЧЕНИЕ ВЫХОДА ЗА КРАЯ КАРТИНКИ
    const currentX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const currentY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

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
      setActiveBoxIndex(newBoxes.length - 1); // Автоматически выделяем новую рамку
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

  const toggleCategory = (cat) => {
    setCollapsedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleDeleteSelected = () => {
    if (activeBoxIndex !== null) {
      setBoxes(boxes.filter((_, idx) => idx !== activeBoxIndex));
      setActiveBoxIndex(null);
    }
  };

  const handleSaveAndNext = async (finalAnnotations = boxes) => {
    if (order?.task_type === 'bounding_box') {
      if (finalAnnotations.length === 0) return alert("❌ Ошибка: Выделите хотя бы один объект на фото!");
      if (finalAnnotations.some(b => !b.label)) return alert("❌ Ошибка: Вы забыли присвоить класс рамке!");
    }

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
      setZoom(1); 

      const nextUndone = updatedImages.findIndex(img => !img.isDone);
      if (nextUndone !== -1) {
        setCurrentIndex(nextUndone);
      } else {
        alert("🎉 Заказ полностью выполнен! Статус обновлен.");
        navigate('/list'); 
      }
    } catch (e) {
      alert("Ошибка сохранения разметки");
    }
  };

  if (!order || images.length === 0) return <div style={{padding: '50px', color: 'white'}}>Загрузка заказа...</div>;

  const groupedClasses = (typeof order.classes === 'object' && !Array.isArray(order.classes)) 
    ? order.classes 
    : { "Доступные классы": Array.isArray(order.classes) ? order.classes : [] };

  return (
    <div className="app-container">
      <div className="viewer-panel">
        <div className="header-panel">
          <div>
            <h2 style={{margin: 0}}>Заказ: {order.title}</h2>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-outline" onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}>➖ Масштаб</button>
            <button className="btn btn-outline" onClick={() => setZoom(z => Math.min(3, z + 0.2))}>➕ Масштаб</button>
            <button className="btn btn-danger" onClick={() => navigate('/list')}>⏸ Выйти</button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', background: '#000', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div 
            className="canvas-container" 
            ref={containerRef} 
            onMouseDown={handleMouseDown} 
            onMouseMove={handleMouseMove} 
            onMouseUp={handleMouseUp} 
            onMouseLeave={handleMouseUp}
            style={{ 
              transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.2s ease', 
              width: '100%', height: '100%', position: 'relative', overflow: 'hidden' // overflow: hidden не дает рамкам вылезти визуально
            }}
          >
            <img src={images[currentIndex].url} alt="To Label" className="image-layer" draggable="false" />
            
            <div className="drawing-area">
              {boxes.map((box, i) => (
                <div key={i} className={`bbox ${i === activeBoxIndex ? 'active' : ''} ${!box.label ? 'bbox-warning' : ''}`} style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%`, borderColor: !box.label ? '#e53e3e' : '' }} onClick={(e) => { e.stopPropagation(); setActiveBoxIndex(i); }}>
                  {box.label ? <div className="bbox-label">{box.label}</div> : <div className="bbox-label" style={{background: '#e53e3e'}}>Нет тега!</div>}
                </div>
              ))}
              {isDrawing && currentBox && (
                <div className="bbox active" style={{ left: `${currentBox.x}%`, top: `${currentBox.y}%`, width: `${currentBox.w}%`, height: `${currentBox.h}%` }} />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="sidebar">
        <div className="tools-section" style={{ flex: 1, overflowY: 'auto' }}>
          <h3>Варианты ответов</h3>
          
          {/* ПАНЕЛЬ УПРАВЛЕНИЯ РАМКАМИ */}
          {order.task_type === 'bounding_box' && (
            <div style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', marginTop: '15px' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <button className="btn btn-danger" style={{ flex: 1, fontSize: '0.85rem' }} onClick={handleDeleteSelected} disabled={activeBoxIndex === null}>
                  ✖ Удалить выбранную
                </button>
                <button className="btn btn-outline" style={{ flex: 1, fontSize: '0.85rem' }} onClick={() => {setBoxes([]); setActiveBoxIndex(null);}} disabled={boxes.length === 0}>
                  🗑 Сбросить все
                </button>
              </div>
              <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0}}>
                {activeBoxIndex !== null ? "🟢 Выберите класс для красной рамки ниже:" : "1. Нарисуйте рамку на объекте."}
              </p>
            </div>
          )}

          <div className="class-buttons" style={{ marginTop: '15px' }}>
            {Object.entries(groupedClasses).map(([cat, tags]) => (
              <div key={cat} style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '8px', marginBottom: '8px' }}>
                <div onClick={() => toggleCategory(cat)} style={{ fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', color: '#a0aec0' }}>
                  <span>📁 {cat}</span>
                  <span>{collapsedCats[cat] ? '▼' : '▲'}</span>
                </div>
                {!collapsedCats[cat] && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                    {tags.map(tag => {
                      const fullName = `${cat}: ${tag}`;
                      return (
                        <button key={fullName} className="btn" onClick={() => handleAssignClass(fullName)} disabled={order.task_type === 'bounding_box' && activeBoxIndex === null} style={{ opacity: (order.task_type === 'bounding_box' && activeBoxIndex === null) ? 0.5 : 1, textAlign: 'left', padding: '8px' }}>
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {order.task_type === 'bounding_box' && (
            <button className="btn btn-primary" style={{width: '100%', marginTop: '20px', position: 'sticky', bottom: 0}} onClick={() => handleSaveAndNext(boxes)}>
              Подтвердить кадр и продолжить ➡
            </button>
          )}
        </div>

        <div className="files-section" style={{ maxHeight: '35vh' }}>
          <h3>Прогресс ({images.filter(i => i.isDone).length} / {images.length})</h3>
          <div style={{marginTop: '15px'}}>
            {images.map((img, i) => (
              <div key={img.id} className={`file-row ${i === currentIndex ? "active" : ""} ${img.isDone ? "done" : ""}`} onClick={() => !img.isDone && setCurrentIndex(i)} style={{ cursor: !img.isDone ? 'pointer' : 'default' }}>
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