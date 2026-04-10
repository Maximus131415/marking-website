import React from 'react'
import ReactDOM from 'react-dom/client'
// Импортируем главный компонент приложения (верхушку дерева компонентов)
import App from './App.jsx'

// Находим в index.html пустой блок <div id="root"></div>
// и создаем в нем "корень" (root) для нашего React-приложения
ReactDOM.createRoot(document.getElementById('root')).render(
  // React.StrictMode — это оболочка для поиска потенциальных проблем в коде.
  // Она работает только в режиме разработки и помогает писать более чистый код.
  <React.StrictMode>
    {/* Отрисовываем главный компонент App внутри этого корня */}
    <App />
  </React.StrictMode>,
)
