import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// --- УСТАНОВКА ТЁМНОЙ ТЕМЫ ПО УМОЛЧАНИЮ ---
if (!localStorage.getItem('theme')) {
  localStorage.setItem('theme', 'dark');
}

// Применяем тему к body до отрисовки компонентов
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
} else {
  document.body.classList.remove('dark');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)