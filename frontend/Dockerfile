FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

# 1. Говорим Docker'у поймать переменную от Railway во время сборки
ARG VITE_API_URL

# 2. Принудительно делаем её доступной для Vite
ENV VITE_API_URL=$VITE_API_URL

# 3. Собираем проект (теперь Vite точно увидит твою ссылку!)
RUN npm run build

# 4. Устанавливаем легкий сервер для раздачи сайта
RUN npm install -g serve

# 5. Запускаем сайт на порту Railway
CMD serve -s dist -l ${PORT:-3000}