import React, { useState } from 'react'
import { GalleryLandingApp } from './scenes/GalleryLandingApp'
import { NotebooksListApp } from './scenes/NotebooksListApp'
import { TextOnlyNotebookApp } from './scenes/TextOnlyNotebookApp'
import { SidePanelNotebooksApp } from './scenes/SidePanelNotebooksApp'
import { LemonUIShowcaseApp } from './scenes/LemonUIShowcaseApp'
import { LemonButton } from './components/lemon-ui'

export type SceneType = 'landing' | 'list' | 'detail' | 'sidepanel' | 'lemonui'

export default function App() {
  const [currentScene, setCurrentScene] = useState<SceneType>('landing')
  const [activeTitle, setActiveTitle] = useState('testing my notebook')

  const handleSelectNotebook = (_id: string, title: string) => {
    setActiveTitle(title)
    setCurrentScene('detail')
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* ── Quick Scene Navigation Switcher ─────────────────────── */}
      <div
        style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          zIndex: 99999,
          backgroundColor: 'var(--color-bg-surface-primary)',
          border: '1px solid var(--border-3000)',
          borderRadius: '2rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
          padding: '0.375rem 0.625rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
        }}
      >
        <LemonButton
          size="small"
          type={currentScene === 'landing' ? 'primary' : 'tertiary'}
          onClick={() => setCurrentScene('landing')}
        >
          🏠 Index
        </LemonButton>
        <LemonButton
          size="small"
          type={currentScene === 'list' ? 'primary' : 'tertiary'}
          onClick={() => setCurrentScene('list')}
        >
          1. List
        </LemonButton>
        <LemonButton
          size="small"
          type={currentScene === 'detail' ? 'primary' : 'tertiary'}
          onClick={() => setCurrentScene('detail')}
        >
          2. Detail
        </LemonButton>
        <LemonButton
          size="small"
          type={currentScene === 'sidepanel' ? 'primary' : 'tertiary'}
          onClick={() => setCurrentScene('sidepanel')}
        >
          3. Drawer
        </LemonButton>
        <LemonButton
          size="small"
          type={currentScene === 'lemonui' ? 'primary' : 'tertiary'}
          onClick={() => setCurrentScene('lemonui')}
        >
          🍋 Lemon UI
        </LemonButton>
      </div>

      {/* ── Render Active Scene ─────────────────────────────────── */}
      {currentScene === 'landing' && (
        <GalleryLandingApp onSelectScene={(sceneId) => setCurrentScene(sceneId)} />
      )}

      {currentScene === 'list' && (
        <NotebooksListApp onSelectNotebook={handleSelectNotebook} />
      )}

      {currentScene === 'detail' && (
        <TextOnlyNotebookApp
          initialTitle={activeTitle}
          onBack={() => setCurrentScene('list')}
        />
      )}

      {currentScene === 'sidepanel' && (
        <SidePanelNotebooksApp onBack={() => setCurrentScene('list')} />
      )}

      {currentScene === 'lemonui' && (
        <LemonUIShowcaseApp onBack={() => setCurrentScene('landing')} />
      )}
    </div>
  )
}
