import React, { useState, useEffect } from 'react';

export default function CreateOrder() {
  const [step, setStep] = useState(1); 
  const [isLoading, setIsLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState('classification');
  const [description, setDescription] = useState('');
  const [overlapCount, setOverlapCount] = useState(1); 
  
  const [categories, setCategories] = useState({});
  const [newCategoryName, setNewCategoryName] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [newTag, setNewTag] = useState('');
  
  const [files, setFiles] = useState([]); 

  const [draftOrderId, setDraftOrderId] = useState(null);
  const [serverImages, setServerImages] = useState([]); 
  const [honeypots, setHoneypots] = useState({});

  const [isHpModalOpen, setIsHpModalOpen] = useState(false);
  const [randomFiles, setRandomFiles] = useState([]);
  const [hpIndex, setHpIndex] = useState(0);

  // СОСТОЯНИЕ ДЛЯ АККОРДЕОНА В ХАНИПОТАХ
  const [collapsedCats, setCollapsedCats] = useState({});

  const token = localStorage.getItem('token');

  useEffect(() => {
    document.body.style.overflow = isHpModalOpen ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [isHpModalOpen]);

  const handleAddCategory = (e) => {
    e.preventDefault();
    const catName = newCategoryName.trim();
    if (catName && !categories[catName]) {
      setCategories({ ...categories, [catName]: [] });
      setActiveCategory(catName);
      setNewCategoryName('');
    }
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    const tag = newTag.trim();
    if (tag && activeCategory && !categories[activeCategory].includes(tag)) {
      setCategories({ 
        ...categories, 
        [activeCategory]: [...categories[activeCategory], tag] 
      });
      setNewTag('');
    }
  };

  const removeTag = (cat, tagToRemove) => {
    setCategories({ 
      ...categories, 
      [cat]: categories[cat].filter(t => t !== tagToRemove) 
    });
    setHoneypots({}); 
  };

  const toggleCategory = (cat) => {
    setCollapsedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleFileChange = (e) => setFiles(Array.from(e.target.files));

  const handleUploadDraft = async (e) => {
    e.preventDefault();
    
    if (Object.values(categories).flat().length === 0 || files.length === 0) {
      return alert("Создайте хотя бы одну категорию, добавьте тег и выберите файлы!");
    }

    const invalidFiles = files.filter(file => {
      const isZip = file.name.toLowerCase().endsWith('.zip');
      const isImage = file.type.startsWith('image/') || file.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|bmp)$/);
      return !isZip && !isImage;
    });

    if (invalidFiles.length > 0) return alert(`Ошибка! Загружайте только изображения или .ZIP`);

    setIsLoading(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("task_type", taskType);
    formData.append("description", description);
    formData.append("classes", JSON.stringify(categories)); 
    formData.append("overlap_count", overlapCount);
    
    files.forEach(file => {
      if (file.name.toLowerCase().endsWith('.zip')) formData.append("archive", file);
      else formData.append("images", file);
    });

    try {
      const res = await fetch('https://backendorders-1.onrender.com/orders/draft', {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setDraftOrderId(data.order_id); setServerImages(data.images); setStep(2); 
      } else alert("Ошибка при загрузке.");
    } catch (error) { alert("Ошибка соединения с сервером"); } finally { setIsLoading(false); }
  };

  const handlePublish = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`https://backendorders-1.onrender.com/orders/${draftOrderId}/publish`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ honeypots })
      });
      if (res.ok) {
        alert("Опубликовано!"); window.location.href = 'http://localhost:3001/dashboard';
      } else alert("Ошибка публикации");
    } catch (error) { alert("Ошибка сервера"); } finally { setIsLoading(false); }
  };

  const startHoneypotSetup = () => {
    if (serverImages.length === 0) return alert("Нет изображений.");
    setRandomFiles([...serverImages].sort(() => 0.5 - Math.random())); setHpIndex(0); setIsHpModalOpen(true);
  };

  const goToNextOrClose = () => {
    if (hpIndex < randomFiles.length - 1) setHpIndex(hpIndex + 1);
    else { setIsHpModalOpen(false); alert("Все картинки просмотрены!"); }
  };

  const saveHoneypotAndNext = (imageId, answer) => {
    setHoneypots(prev => ({ ...prev, [imageId]: answer })); goToNextOrClose();
  };

  const skipHoneypot = () => goToNextOrClose();

  // Логика использует уникальное имя (Категория: Тег)
  const toggleHoneypotSingle = (imageId, correctFullName) => {
    setHoneypots(prev => {
      const newHp = { ...prev };
      if (!correctFullName) delete newHp[imageId]; else newHp[imageId] = correctFullName;
      return newHp;
    });
  };

  const toggleHoneypotMulti = (imageId, fullName, isChecked) => {
    setHoneypots(prev => {
      const newHp = { ...prev };
      if (!newHp[imageId]) newHp[imageId] = [];
      if (isChecked) newHp[imageId] = [...newHp[imageId], fullName];
      else {
        newHp[imageId] = newHp[imageId].filter(c => c !== fullName);
        if (newHp[imageId].length === 0) delete newHp[imageId];
      }
      return newHp;
    });
  };

  return (
    <div className="container" style={{ maxWidth: '900px', paddingBottom: '50px' }}>
      <button className="btn btn-outline" onClick={() => window.location.href = 'http://localhost:3001/dashboard'} style={{ marginBottom: '20px' }}>⬅ Назад в кабинет</button>

      {step === 1 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Шаг 1: Настройка и загрузка данных</h2>
          <form onSubmit={handleUploadDraft} style={{ marginTop: '20px' }}>
            
            <label>Название проекта:</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Например: Поиск дефектов" />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label>Тип задачи:</label>
                <select value={taskType} onChange={e => setTaskType(e.target.value)}>
                  <option value="classification">Классификация (Один клик)</option>
                  <option value="bounding_box">Разметка (Выделение объектов)</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Перекрытие:
                  {/* ИСПРАВЛЕННЫЙ CSS ДЛЯ ПОДСКАЗКИ */}
                  <div className="tooltip-container" style={{ position: 'relative', cursor: 'help', background: '#3182ce', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                    ?
                    <div className="tooltip-text" style={{ position: 'absolute', bottom: '150%', left: '50%', transform: 'translateX(-50%)', background: '#1a202c', color: 'white', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', width: '250px', zIndex: 10, display: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                      Количество исполнителей на одну картинку. <br/>1 - быстрее.<br/>3 или 5 - умная агрегация большинства.
                      {/* Маленький треугольник-хвостик */}
                      <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', borderWidth: '6px', borderStyle: 'solid', borderColor: '#1a202c transparent transparent transparent' }}></div>
                    </div>
                  </div>
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[1, 3, 5].map(num => (
                    <button type="button" key={num} onClick={() => setOverlapCount(num)} className={`btn ${overlapCount === num ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1, padding: '10px' }}>
                      {num} чел.
                    </button>
                  ))}
                </div>
                <style>{`.tooltip-container:hover .tooltip-text { display: block !important; }`}</style>
              </div>
            </div>

            <label>Описание задания (инструкция для исполнителя):</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Например: Выделите все машины на фото..." />

            <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
              <label style={{ color: '#3182ce', fontSize: '1.1rem', fontWeight: 'bold' }}>Дерево тегов (Структура классов):</label>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', marginTop: '10px' }}>
                <input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Создать новую категорию..." style={{ margin: 0, flex: 1 }} />
                <button type="button" className="btn btn-outline" onClick={handleAddCategory}>+ Группа</button>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px dashed var(--border-color)' }}>
                {Object.keys(categories).length > 0 ? (
                  <>
                    <select value={activeCategory} onChange={e => setActiveCategory(e.target.value)} style={{ width: '40%', margin: 0 }}>
                      {Object.keys(categories).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder={`Новый тег в "${activeCategory}"...`} style={{ margin: 0, flex: 1 }} />
                    <button type="button" className="btn btn-primary" onClick={handleAddTag}>+ Тег</button>
                  </>
                ) : (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic', width: '100%', textAlign: 'center' }}>
                    Сначала создайте хотя бы одну группу ⬆
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(categories).map(([cat, tags]) => (
                  <div key={cat} style={{ background: 'var(--bg-color)', padding: '15px', borderRadius: '6px', borderLeft: '4px solid #3182ce' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '10px', color: 'var(--text-secondary)' }}>📁 {cat}</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {tags.length === 0 && <span style={{ fontSize: '0.85rem', opacity: 0.5 }}>Пока нет тегов...</span>}
                      {tags.map(tag => (
                        <span key={tag} style={{ background: '#3182ce', color: 'white', padding: '6px 12px', borderRadius: '15px', fontSize: '0.85rem' }}>
                          {tag} <span style={{ cursor: 'pointer', marginLeft: '5px' }} onClick={() => removeTag(cat, tag)}>✖</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ border: '2px dashed var(--border-color)', padding: '20px', textAlign: 'center', borderRadius: '8px', marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Загрузите архив (.ZIP) или картинки:</label>
              <input type="file" multiple accept=".zip, image/*" onChange={handleFileChange} required />
            </div>

            <button type="submit" className="btn" style={{ width: '100%', padding: '12px', fontSize: '1.1rem' }} disabled={isLoading}>
              {isLoading ? "⏳ Распаковка и загрузка..." : "Загрузить данные и продолжить ➡"}
            </button>
          </form>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h2 style={{ marginTop: 0, color: '#3182ce', display: 'flex', alignItems: 'center', gap: '10px' }}>Шаг 2: Настройка тестовых заданий 🎯</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Всего загружено: <b>{serverImages.length}</b> фото.</span>
            <button type="button" className="btn btn-outline" onClick={startHoneypotSetup}>⚡ Быстрая настройка</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px', maxHeight: '500px', overflowY: 'auto' }}>
            {serverImages.map((img) => (
              <div key={img.id} style={{ background: 'var(--bg-color)', padding: '12px', borderRadius: '8px', border: honeypots[img.id] ? '2px solid #48bb78' : '1px solid var(--border-color)' }}>
                <img src={img.url} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px', marginBottom: '12px' }} alt="" />
                
                {taskType === 'classification' ? (
                  <select value={honeypots[img.id] || ""} onChange={(e) => toggleHoneypotSingle(img.id, e.target.value)} style={{ width: '100%', padding: '8px' }}>
                    <option value="">-- Не использовать --</option>
                    {/* Группируем теги прямо в селекте! */}
                    {Object.entries(categories).map(([cat, tags]) => (
                      <optgroup key={cat} label={`📁 ${cat}`}>
                        {tags.map(t => <option key={`${cat}: ${t}`} value={`${cat}: ${t}`}>{t}</option>)}
                      </optgroup>
                    ))}
                  </select>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* АККОРДЕОН ДЛЯ ГРИД-ВИДА */}
                    {Object.entries(categories).map(([cat, tags]) => (
                      <div key={cat} style={{ background: 'var(--bg-primary)', padding: '6px', borderRadius: '4px' }}>
                         <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' }}>{cat}</div>
                         {tags.map(t => {
                           const fullName = `${cat}: ${t}`;
                           return (
                             <label key={fullName} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '4px' }}>
                               <input type="checkbox" style={{ marginRight: '8px' }} checked={honeypots[img.id]?.includes(fullName) || false} onChange={(e) => toggleHoneypotMulti(img.id, fullName, e.target.checked)} /> 
                               <span style={{ fontSize: '0.85rem' }}>{t}</span>
                             </label>
                           );
                         })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button className="btn btn-primary" onClick={handlePublish} disabled={isLoading} style={{ width: '100%', marginTop: '20px', padding: '15px' }}>✅ Опубликовать проект</button>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО ХАНИПОТОВ (АККОРДЕОН ДОБАВЛЕН) */}
      {isHpModalOpen && hpIndex < randomFiles.length && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', background: 'var(--bg-color)', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', borderRadius: '12px' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
              <h3 style={{ margin: 0, color: '#3182ce' }}>Настройка тестовой картинки</h3>
              <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Изображение {hpIndex + 1} из {randomFiles.length}</p>
            </div>
            
            <div style={{ padding: '20px', overflowY: 'auto', flexGrow: 1 }}>
              <img src={randomFiles[hpIndex].url} style={{ width: '100%', maxHeight: '40vh', objectFit: 'contain', borderRadius: '8px', marginBottom: '20px', backgroundColor: '#1a202c' }} alt="" />
              
              <div>
                {taskType === 'classification' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {Object.entries(categories).map(([cat, tags]) => (
                      <div key={cat}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>📁 {cat}</div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          {tags.map(t => {
                            const fullName = `${cat}: ${t}`;
                            return <button key={fullName} className="btn" style={{ background: '#3182ce', color: 'white' }} onClick={() => saveHoneypotAndNext(randomFiles[hpIndex].id, fullName)}>{t}</button>
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 15px 0', fontSize: '1.1rem', fontWeight: 'bold' }}>Что ДОЛЖНО быть выделено на этом фото?</p>
                    
                    {/* АККОРДЕОН КАТЕГОРИЙ В МОДАЛКЕ */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {Object.entries(categories).map(([cat, tags]) => (
                        <div key={cat} style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                          <div onClick={() => toggleCategory(cat)} style={{ fontWeight: 'bold', color: 'white', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', paddingBottom: collapsedCats[cat] ? '0' : '10px' }}>
                            <span>📁 {cat}</span>
                            <span style={{ fontSize: '0.8rem' }}>{collapsedCats[cat] ? '▼ Развернуть' : '▲ Свернуть'}</span>
                          </div>
                          
                          {!collapsedCats[cat] && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {tags.map(t => {
                                const fullName = `${cat}: ${t}`;
                                return (
                                  <label key={fullName} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                    <input type="checkbox" style={{ width: '22px', height: '22px', marginRight: '15px', cursor: 'pointer' }} checked={honeypots[randomFiles[hpIndex].id]?.includes(fullName) || false}
                                      onChange={(e) => toggleHoneypotMulti(randomFiles[hpIndex].id, fullName, e.target.checked)} /> 
                                    <span style={{ fontSize: '1.1rem' }}>{t}</span>
                                  </label>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '15px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', background: 'var(--bg-primary)', flexShrink: 0 }}>
              <button className="btn btn-outline" onClick={skipHoneypot}>Пропустить ➡</button>
              <div style={{ display: 'flex', gap: '10px' }}>
                {taskType === 'bounding_box' && <button className="btn btn-primary" onClick={skipHoneypot}>Сохранить выбор</button>}
                <button className="btn btn-success" onClick={() => setIsHpModalOpen(false)}>Завершить настройку</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}