/// <reference types="vite/client" />
/// <reference types="vitest" />

import { describe, expect, it } from 'vitest'

import packageJson from '../../package.json'
import defaultCapabilities from '../../src-tauri/capabilities/default.json'
import tauriConfig from '../../src-tauri/tauri.conf.json'
import tauriReleaseConfig from '../../src-tauri/tauri.release.conf.json'
import cargoToml from '../../src-tauri/Cargo.toml?raw'
import mainRs from '../../src-tauri/src/main.rs?raw'

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

  it('keeps app updater dependencies and permissions wired together', () => {
    expect(packageJson.dependencies).toMatchObject({
      '@tauri-apps/plugin-process': expect.any(String),
      '@tauri-apps/plugin-updater': expect.any(String),
    })
    expect(cargoToml).toContain('tauri-plugin-process')
    expect(cargoToml).toContain('tauri-plugin-updater')
    expect(mainRs).toContain('tauri_plugin_process::init()')
    expect(mainRs).toContain('tauri_plugin_updater::Builder::new().build()')
    expect(defaultCapabilities.permissions).toEqual(
      expect.arrayContaining(['process:default', 'updater:default']),
    )
  })
})
