import { useEffect, useRef, useState } from 'react'
import './App.css'
import axios from 'axios'
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || ''
const PREVIEW_OPEN_MS = 280
const PREVIEW_CLOSE_MS = 280

function App() {
  const [pastes, setPastes] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [viewingPaste, setViewingPaste] = useState(null)
  const [isOpeningPreview, setIsOpeningPreview] = useState(false)
  const [isClosingPreview, setIsClosingPreview] = useState(false)
  const [openMotion, setOpenMotion] = useState({ x: 0, y: 0, scale: 0.3, rotate: 0 })
  const [closeMotion, setCloseMotion] = useState({ x: 0, y: 0, scale: 0.3, rotate: 0 })
  const [searchParams, setSearchParams] = useState('')
  const titleRef = useRef(null)
  const contentRef = useRef(null)
  const cardRefs = useRef(new Map())
  const previewRef = useRef(null)
  const openTimerRef = useRef(null)
  const closeTimerRef = useRef(null)

  const normalizePaste = paste => ({
    id: paste?._id ?? paste?.id,
    title: paste?.title ?? '',
    content: paste?.content ?? ''
  })

  const setCardRef = (id, node) => {
    if (node) {
      cardRefs.current.set(id, node)
      return
    }

    cardRefs.current.delete(id)
  }

  const savePaste = async () => {
    const title = titleRef.current.value.trim()
    const content = contentRef.current.value

    if (!title) {
      titleRef.current.focus()
      return
    }

    if (editingId) {
      const prev = pastes
      setPastes(current =>
        current.map(paste =>
          paste.id === editingId ? { ...paste, title, content } : paste
        )
      )

      try {
        const { data } = await axios.put(`/api/editCard/${editingId}`, { title, content })
        const updated = normalizePaste(data?.updatedProduct ?? data)
        if (updated?.id) {
          setPastes(current => current.map(paste => (paste.id === editingId ? updated : paste)))
        }
      } catch {
        setPastes(prev)
        return
      }

      setEditingId(null)
    } else {
      try {
        const { data } = await axios.post('/api/postCard', { title, content })
        const created = normalizePaste(data?.newProduct ?? data)
        if (created?.id) {
          setPastes(prev => [...prev, created])
        }
      } catch {
        return
      }
    }
    titleRef.current.value = ''
    contentRef.current.value = ''
  }

  useEffect(() => {
    let cancelled = false

    const loadPastes = async () => {
      try {
        const { data } = await axios.get('/api/getCard')
        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.products)
            ? data.products
            : []

        if (!cancelled) {
          setPastes(items.map(normalizePaste).filter(paste => paste.id))
        }
      } catch {
        if (!cancelled) {
          setPastes([])
        }
      }
    }

    loadPastes()
    return () => {
      cancelled = true
    }
  }, [])

  const deletePaste = async deleteId => {
    if (viewingPaste?.id === deleteId) {
      clearTimeout(openTimerRef.current)
      clearTimeout(closeTimerRef.current)
      setIsOpeningPreview(false)
      setIsClosingPreview(false)
      setViewingPaste(null)
    }
    const prev = pastes
    setPastes(current => current.filter(item => item.id !== deleteId))

    try {
      await axios.delete(`/api/deleteCard/${deleteId}`)
    } catch {
      setPastes(prev)
    }
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
    const cardEl = cardRefs.current.get(paste.id)

    clearTimeout(openTimerRef.current)
    clearTimeout(closeTimerRef.current)
    setIsClosingPreview(false)

    if (!cardEl) {
      setViewingPaste(paste)
      setIsOpeningPreview(false)
      return
    }

    const cardRect = cardEl.getBoundingClientRect()
    const viewportCenterX = window.innerWidth / 2
    const viewportCenterY = window.innerHeight / 2
    const estimatedModalWidth = Math.min(760, Math.max(320, window.innerWidth - 32))
    const fromScale = Math.max(0.22, Math.min(0.5, cardRect.width / estimatedModalWidth))

    setOpenMotion({
      x: cardRect.left + cardRect.width / 2 - viewportCenterX,
      y: cardRect.top + cardRect.height / 2 - viewportCenterY,
      scale: fromScale,
      rotate: cardRect.left + cardRect.width / 2 < viewportCenterX ? -4 : 4
    })

    setViewingPaste(paste)
    setIsOpeningPreview(true)

    openTimerRef.current = setTimeout(() => {
      setIsOpeningPreview(false)
    }, PREVIEW_OPEN_MS)
  }

  const closePreview = () => {
    if (!viewingPaste || isClosingPreview) {
      return
    }

    const previewEl = previewRef.current
    const cardEl = cardRefs.current.get(viewingPaste.id)

    if (!previewEl || !cardEl) {
      setViewingPaste(null)
      return
    }

    const previewRect = previewEl.getBoundingClientRect()
    const cardRect = cardEl.getBoundingClientRect()
    const previewCenterX = previewRect.left + previewRect.width / 2
    const previewCenterY = previewRect.top + previewRect.height / 2
    const cardCenterX = cardRect.left + cardRect.width / 2
    const cardCenterY = cardRect.top + cardRect.height / 2
    const targetScale = Math.max(0.22, Math.min(0.5, cardRect.width / previewRect.width))

    setCloseMotion({
      x: cardCenterX - previewCenterX,
      y: cardCenterY - previewCenterY,
      scale: targetScale,
      rotate: cardCenterX < previewCenterX ? -4 : 4
    })
    setIsClosingPreview(true)
    setIsOpeningPreview(false)

    clearTimeout(openTimerRef.current)
    clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setViewingPaste(null)
      setIsClosingPreview(false)
    }, PREVIEW_CLOSE_MS)
  }

  useEffect(() => {
    if (!viewingPaste) {
      return
    }

    const onKeyDown = event => {
      if (event.key === 'Escape') {
        closePreview()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [viewingPaste, isClosingPreview])

  useEffect(
    () => () => {
      clearTimeout(openTimerRef.current)
      clearTimeout(closeTimerRef.current)
    },
    []
  )

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
                  ref={node => setCardRef(paste.id, node)}
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
        <div
          className={`preview-backdrop ${isClosingPreview ? 'is-closing' : ''}`}
          onClick={closePreview}
        >
          <section
            className={`preview-modal ${isOpeningPreview ? 'is-opening' : ''} ${isClosingPreview ? 'is-closing' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-title"
            ref={previewRef}
            style={{
              '--preview-from-x': `${openMotion.x}px`,
              '--preview-from-y': `${openMotion.y}px`,
              '--preview-from-scale': openMotion.scale,
              '--preview-from-rotate': `${openMotion.rotate}deg`,
              '--preview-to-x': `${closeMotion.x}px`,
              '--preview-to-y': `${closeMotion.y}px`,
              '--preview-to-scale': closeMotion.scale,
              '--preview-to-rotate': `${closeMotion.rotate}deg`
            }}
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
