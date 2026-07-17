// defineConfig'i 'vite' yerine 'vitest/config'ten aliyoruz: ayni Vite yapilandirmasi
// + asagidaki "test" blogunun tip destegi. Ayri bir vitest.config.ts acmiyoruz ki
// plugin listesi iki dosyada tekrarlanmasin.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom sart: tokenStore localStorage, httpClient ise window.dispatchEvent
    // kullaniyor. Saf Node ortaminda ikisi de tanimsiz olurdu.
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      // lcov -> SonarCloud'un Asama 4'te okuyacagi format (coverage/lcov.info).
      // text -> terminalde aninda ozet.
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        // Sadece uygulamayi DOM'a baglayan giris noktasi; test edilecek mantik yok.
        'src/main.tsx',
        // Yalnizca tip tanimlari - calisma zamaninda kod uretmezler.
        'src/types/**',
        'src/**/*.d.ts',
      ],
    },
  },
})
