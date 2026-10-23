import { useEffect, useRef, useState } from 'react'
import './App.css'

function App() {
  const [pastes, setPastes] = useState(() => {
    const saved = localStorage.getItem('pastes')
    return saved ? JSON.parse(saved) : []
  })
  const [editingId, setEditingId] = useState(null)
  const [viewingPaste, setViewingPaste] = useState(null)
  const [searchParams, setSearchParams] = useState('')
  const titleRef = useRef(null)
  const contentRef = useRef(null)

  const savePaste = () => {
    const title = titleRef.current.value
    const content = contentRef.current.value
    if (editingId) {
      setPastes(current =>
        current.map(paste =>
          paste.id === editingId ? { ...paste, title, content } : paste
        )
      )
      setEditingId(null)
    } else {
      setPastes(prev => [...prev, { title, content, id: crypto.randomUUID() }])
    }
    titleRef.current.value = ''
    contentRef.current.value = ''
  }

  useEffect(() => {
    localStorage.setItem('pastes', JSON.stringify(pastes))
  }, [pastes])

  const deletePaste = deleteId => {
    if (viewingPaste?.id === deleteId) {
      setViewingPaste(null)
    }
    setPastes(current => current.filter(item => item.id !== deleteId))
  }

  const editPaste = (title, content, id) => {
    setEditingId(id)
    titleRef.current.value = title
    contentRef.current.value = content
    titleRef.current.focus()
  }

  const cancelEdit = () => {
    setEditingId(null)
    titleRef.current.value = ''
    contentRef.current.value = ''
  }

  const openPreview = paste => {
    setViewingPaste(paste)
  }

  const closePreview = () => {
    setViewingPaste(null)
  }

  useEffect(() => {
    if (!viewingPaste) {
      return
    }

    const onKeyDown = event => {
      if (event.key === 'Escape') {
        setViewingPaste(null)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [viewingPaste])

  const filtered = pastes.filter(paste =>
    paste.title.toLowerCase().includes(searchParams.toLowerCase())
  )

  return (
    <div className="app">
      <main className="shell">
        <header className="masthead">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-name">PASTE</span>
          </div>
          <div className="status-pill">
            <span className="status-dot" />
            <span>{pastes.length} {pastes.length === 1 ? 'snippet' : 'snippets'} stored</span>
          </div>
        </header>
    <div className='containerMain'>
        <section className={`composer ${editingId ? 'is-editing' : ''}`}>
          <div className="composer-head">
            <span className="composer-label">
              {editingId ? 'Editing snippet' : 'New snippet'}
            </span>
            {editingId && (
              <button type="button" className="ghost-btn" onClick={cancelEdit}>
                Cancel edit
              </button>
            )}
          </div>

          <input
            type="text"
            name="title"
            placeholder="Title"
            ref={titleRef}
            className="field"
          />
          <textarea
            name="content"
            placeholder="Paste your snippet here..."
            ref={contentRef}
            className="field field-code"
            spellCheck={false}
          />

          <div className="composer-foot">
            <span className="hint">Saved locally in this browser</span>
            <button type="button" className="primary-btn" onClick={savePaste}>
              <span>{editingId ? 'Update' : 'Save snippet'}</span>
              <span className="btn-glyph" aria-hidden="true">→</span>
            </button>
          </div>
        </section>

        <section className="library">
          <div className="library-head">
            <h1 className="library-title">
              Library
              <span className="count">{filtered.length}</span>
            </h1>
            <div className="search">
              <span className="search-icon" aria-hidden="true">⌕</span>
              <input
                type="text"
                name="search"
                placeholder="Search titles"
                value={searchParams}
                onChange={e => setSearchParams(e.target.value)}
                disabled={pastes.length === 0}
                className="search-input"
              />
            </div>
          </div>

          {filtered.length !== 0 ? (
            <ul className="paste-grid">
              {filtered.map((paste, index) => (
                <li
                  className={`paste-card ${editingId === paste.id ? 'is-active' : ''}`}
                  key={paste.id}
                  style={{ '--delay': `${index * 60}ms` }}
                >
                  <div className="card-top">
                    <span className="card-index">{String(index + 1).padStart(2, '0')}</span>
                    <h2 className="card-title">{paste.title || 'Untitled'}</h2>
                  </div>
                  <pre className="card-body">{paste.content}</pre>
                  <div className="card-foot">
                    <span className="card-id">{paste.id.slice(0, 8)}</span>
                    <div className="card-actions">
                      <button
                        type="button"
                        className="view-btn"
                        onClick={() => openPreview(paste)}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => editPaste(paste.title, paste.content, paste.id)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger-btn"
                        onClick={() => deletePaste(paste.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">
              <div className="empty-rings" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <h2>{pastes.length === 0 ? 'No pastes yet' : 'No matches'}</h2>
              <p>
                {pastes.length === 0
                  ? 'Your saved snippets will show up here.'
                  : 'Try a different title.'}
              </p>
            </div>
          )}
        </section>
        </div>
      </main>

      {viewingPaste && (
        <div className="preview-backdrop" onClick={closePreview}>
          <section
            className="preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-title"
            onClick={event => event.stopPropagation()}
          >
            <div className="preview-head">
              <h2 id="preview-title">{viewingPaste.title || 'Untitled snippet'}</h2>
              <button type="button" className="ghost-btn" onClick={closePreview}>
                Close
              </button>
            </div>

            <pre className="preview-body">{viewingPaste.content || 'No snippet content.'}</pre>

            <div className="preview-foot">
              <span>{viewingPaste.id.slice(0, 8)}</span>
              <button
                type="button"
                className="view-btn"
                onClick={() => {
                  editPaste(viewingPaste.title, viewingPaste.content, viewingPaste.id)
                  closePreview()
                }}
              >
                Edit this snippet
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
