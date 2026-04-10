FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Собираем Vite-проект
RUN npm run build

# Устанавливаем простой статический сервер
RUN npm install -g serve

# Запускаем сервер на порту Railway
CMD serve -s dist -l ${PORT:-3000}