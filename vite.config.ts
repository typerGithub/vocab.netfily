import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    // 1) Слушать на всех интерфейсах (доступ извне, по локальной сети и т.д.)
    host: true, // эквивалент '0.0.0.0'

    // 2) Не фиксируем конкретный порт и НЕ требуем строго его —
    // если порт занят, Vite выберет следующий свободный
    // (можно задать стартовый, например 5173)
    // port: 5173,
    strictPort: false,

    // 3) Разрешить CORS для всех источников
    cors: true,

    // (опционально) если используешь HMR через прокси/туннель:
    // hmr: { clientPort: 443 } // пример для Cloudflare/Nginx SSL
    // (опционально) прокси с подменой Origin
    // proxy: {
    //   '/api': { target: 'http://localhost:3000', changeOrigin: true }
    // },
  },

  // То же самое можно включить и для режима `vite preview`
  preview: {
    host: true,
    // port: 4173, // опционально
    strictPort: false,
    cors: true,
  },
})
