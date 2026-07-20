// Vitest her test dosyasindan once bunu calistirir (vite.config.ts -> test.setupFiles).

// toBeInTheDocument, toHaveValue gibi DOM'a ozel eslestiricileri expect'e ekler.
import '@testing-library/jest-dom/vitest'

import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// SART: testing-library'nin OTOMATIK temizligi yalnizca vitest "globals: true"
// ile calisiyor; bizde kapali. Temizlik olmadan her render() bir oncekinin
// ustune birikir ve sorgular "Found multiple elements with the role button"
// hatasi verir.
afterEach(() => {
  cleanup()
})
