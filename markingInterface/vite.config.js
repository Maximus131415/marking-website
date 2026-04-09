import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Основная функция конфигурации Vite
export default defineConfig({
  // Подключение плагина для поддержки React (JSX, Fast Refresh и т.д.)
  plugins: [react()],
  
  // Настройки сервера разработки
  server: {
    // Разрешает прослушивание всех сетевых интерфейсов (позволяет доступ извне, например, из Docker или по локальной сети)
    host: true,
    
    // Устанавливает конкретный порт для запуска приложения
    port: 3003,
    
    // Настройки отслеживания изменений в файлах
    watch: { 
      // Включает опрос (polling) вместо системных событий. 
      // Полезно, если файлы находятся в сетевых папках или внутри Docker-контейнера на Windows/macOS
      usePolling: true 
    }
  }
})
