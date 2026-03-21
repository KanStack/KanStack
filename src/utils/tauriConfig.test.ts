/// <reference types="vite/client" />
/// <reference types="vitest" />

import { describe, expect, it } from 'vitest'

import tauriConfig from '../../src-tauri/tauri.conf.json'
import tauriReleaseConfig from '../../src-tauri/tauri.release.conf.json'

interface TauriConfig {
  bundle?: {
    active?: boolean
    createUpdaterArtifacts?: boolean
    icon?: string[]
  }
  plugins?: {
    updater?: {
      endpoints?: string[]
      pubkey?: string
    }
  }
}

describe('tauri config', () => {
  it('declares shipped icon assets for packaged builds', () => {
    const config = tauriConfig as TauriConfig
    const icons = config.bundle?.icon ?? []
    const shippedIcons = Object.keys(import.meta.glob('../../src-tauri/icons/*'))

    expect(config.bundle?.active).toBe(true)
    expect(icons).toEqual(
      expect.arrayContaining([
        'icons/32x32.png',
        'icons/128x128.png',
        'icons/128x128@2x.png',
        'icons/icon.icns',
        'icons/icon.ico',
      ]),
    )

    for (const icon of icons) {
      expect(shippedIcons).toContain(`../../src-tauri/${icon}`)
    }
  })

  it('declares updater endpoints and signing metadata', () => {
    const config = tauriConfig as TauriConfig

    expect(config.plugins?.updater?.endpoints).toEqual([
      'https://github.com/KanStack/KanStack/releases/latest/download/latest.json',
    ])
    expect(config.plugins?.updater?.pubkey?.trim()).toBeTruthy()
  })

  it('enables updater artifacts in release builds', () => {
    const config = tauriReleaseConfig as TauriConfig

    expect(config.bundle?.active).toBe(true)
    expect(config.bundle?.createUpdaterArtifacts).toBe(true)
  })
})
