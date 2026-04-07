import React, { useState, useEffect } from "react";
import "./styles.css";

export default function App() {
  // --- БАЗА ДАННЫХ (Заглушка) ---
  const [files, setFiles] = useState([
    {
      id: 0,
      name: "photo_01.jpg",
      url: "https://picsum.photos/id/10/600/400",
      label: null,
    },
    {
      id: 1,
      name: "photo_02.jpg",
      url: "https://picsum.photos/id/20/600/400",
      label: null,
    },
    {
      id: 2,
      name: "photo_03.jpg",
      url: "https://picsum.photos/id/30/600/400",
      label: null,
    },
    {
      id: 3,
      name: "photo_04.jpg",
      url: "https://picsum.photos/id/40/600/400",
      label: null,
    },
    {
      id: 4,
      name: "photo_05.jpg",
      url: "https://picsum.photos/id/50/600/400",
      label: null,
    },
    {
      id: 5,
      name: "photo_06.jpg",
      url: "https://picsum.photos/id/60/600/400",
      label: null,
    },
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const classes = ["Человек", "Машина", "Собака", "Брак"];

  // --- ФУНКЦИЯ РАЗМЕТКИ ---
  const setLabel = (labelName) => {
    const updatedFiles = [...files];
    updatedFiles[currentIndex].label = labelName;
    setFiles(updatedFiles);

    // Авто-переход на следующее фото
    if (currentIndex < files.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // --- ГОРЯЧИЕ КЛАВИШИ ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "1") setLabel(classes[0]);
      if (e.key === "2") setLabel(classes[1]);
      if (e.key === "3") setLabel(classes[2]);
      if (e.key === "4") setLabel(classes[3]);
      // Стрелочки для навигации
      if (e.key === "ArrowLeft")
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      if (e.key === "ArrowRight")
        setCurrentIndex((prev) => Math.min(files.length - 1, prev + 1));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, files, classes]); // Добавили dependencies

  return (
    <div className="app-container">
      {/* ЦЕНТР: Просмотр фото (Самая большая часть) */}
      <div className="viewer-panel">
        <div className="image-wrapper">
          <img src={files[currentIndex].url} alt="To Label" />
        </div>
        <div className="navigation-bar">
          <button
            className="nav-btn"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          >
            ⬅ Назад
          </button>
          <span className="file-info">
            {" "}
            {files[currentIndex].name} ({currentIndex + 1} / {files.length}){" "}
          </span>
          <button
            className="nav-btn"
            onClick={() =>
              setCurrentIndex(Math.min(files.length - 1, currentIndex + 1))
            }
          >
            Вперед ➡
          </button>
        </div>
      </div>

      {/* ПРАВАЯ ПАНЕЛЬ (Красное + Зеленое) */}
      <div className="right-sidebar">
        {/* КРАСНАЯ ЗОНА: Теги и информация */}
        <div className="tags-info-section">
          <h3>Разметка (Клавиши 1-{classes.length})</h3>
          <div className="class-buttons">
            {classes.map((cls, i) => (
              <button
                key={cls}
                className={`class-btn ${
                  files[currentIndex].label === cls ? "selected" : ""
                }`}
                onClick={() => setLabel(cls)}
              >
                <span className="key-hint">{i + 1}</span> {cls}
              </button>
            ))}
          </div>
          <hr />
          <div className="current-status">
            <p>
              Текущая метка:{" "}
              <b
                className={`label-status ${
                  files[currentIndex].label ? "set" : ""
                }`}
              >
                {files[currentIndex].label || "Не задана"}
              </b>
            </p>
          </div>
        </div>

        {/* ЗЕЛЕНАЯ ЗОНА: Список файлов */}
        <div className="files-section">
          <h3>Список файлов</h3>
          <div className="file-list-wrapper">
            {files.map((f, i) => (
              <div
                key={f.id}
                className={`file-row ${i === currentIndex ? "active" : ""} ${
                  f.label ? "labeled" : ""
                }`}
                onClick={() => setCurrentIndex(i)}
              >
                <span className="file-name-text">{f.name}</span>
                {f.label && <span className="file-label-badge">{f.label}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
