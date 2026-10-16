import { useEffect, useRef, useState } from 'react'
import './App.css'
function App() {
  const [pastes,setPastes]=useState(()=>{
    const saved = localStorage.getItem("pastes")
    return saved ? JSON.parse(saved):[]})
    const [editingId,setEditingId]=useState(null)
    const [searchParams,setSearchParams]=useState('')
  let titleRef = useRef(null)
  let contentRef = useRef(null)
  const savePaste = () => {
    const title = titleRef.current.value
    const content = contentRef.current.value
    if (editingId){
      setPastes(current=>
        current.map(paste => 
          paste.id===editingId?
          {...paste,title,content}
          :paste
        )
      )
    setEditingId(null)}
    else{
    setPastes (prev=>[...prev,{title : title,content: content,id:crypto.randomUUID()}])}
    titleRef.current.value=""
    contentRef.current.value=""
  }
  useEffect(()=>{
    localStorage.setItem('pastes',JSON.stringify(pastes))
  },[pastes])
  const deletePaste = (deleteId) => {
    setPastes (current=>current.filter(item=>item.id!==deleteId))
  }
  const editPaste = (title,content,id) => {
    setEditingId(id)
    titleRef.current.value=title
    contentRef.current.value=content
  }
  const filtered = pastes.filter(paste=>paste.title.toLowerCase()
      .includes(searchParams.toLowerCase()))

  return (
    <>
      <input type='text' name='title' placeholder='Title' ref={titleRef}>
      
      </input>  
      <textarea type='text' name='content' placeholder='Snippet' ref={contentRef}>
      
      </textarea>  
      <button onClick={savePaste}>
        Save
      </button>
      <div className='pastedContainer'>
        <h1>Pastes</h1>
        <input type='text' name='search' placeholder='Search' onChange={(e)=>setSearchParams(e.target.value)} disabled={pastes.length==0}/>
       {(filtered.length!==0)?
      filtered.map(paste=>(
        <div className='pasteCard' key={paste.id}>
          <p>Title:{paste.title}</p>
          <p>Content:{paste.content}</p><button onClick={()=>{deletePaste(paste.id)}}>Delete</button>
          <button onClick={()=>{editPaste(paste.title,paste.content,paste.id)}}>Edit</button>
          <p>{paste.id}</p>
          </div>
    )):
          <div className='noPaste'>
            <h2>No pastes yet</h2>
            <p>Your saved snippets will show up here.</p>
          </div>
      }
      
      </div>
    </>
  )
}

export default App
