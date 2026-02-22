# --- PROD 1: собираем фронтенд ---
# Используем Debian-based образ для совместимости с Puppeteer/Chromium
FROM node:20-slim AS frontend-builder
WORKDIR /app

# Устанавливаем системные зависимости для Puppeteer в Debian
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Устанавливаем переменную окружения для использования системного Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем зависимости (включая devDependencies для сборки)
RUN npm ci

# Копируем исходный код (исключая файлы из .dockerignore)
COPY . .

# Собираем приложение с pre-rendering
RUN npm run build
#RUN npm run build

# --- PROD 2: финальный образ nginx ---
FROM nginx:1.25-alpine

# Чистим дефолтный контент
RUN rm -rf /usr/share/nginx/html/*

# Копируем собранный фронтенд
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Копируем наш nginx-конфиг
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Expose порт
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
