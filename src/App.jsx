import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const MONTHS = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"]
const FLOWERS = ["🌸","🌷","🌼","💐","🌺","🌻"]

function iso(d){ return d.toISOString().slice(0,10) }
function clamp(n, min, max){ return Math.max(min, Math.min(max, n)) }
function daysInMonth(year, monthIndex){ return new Date(year, monthIndex+1, 0).getDate() }
function startOfMonth(year, monthIndex){ return new Date(year, monthIndex, 1) }
function range(n){ return Array.from({length:n}, (_,i)=>i) }
function randomInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min }

const LS_USERS   = 'gga-users'
const LS_CURRENT = 'gga-current-user'
const LS_DATA    = 'gga-data'
const LS_FILTERS = 'gga-filters'

function sha1(str){
  let h=0; for(let i=0;i<str.length;i++){ h=((h<<5)-h)+str.charCodeAt(i); h|=0; }
  return (h>>>0).toString(16);
}
function loadLS(key, def){ try{ const v = localStorage.getItem(key); return v? JSON.parse(v): def; }catch(e){ return def; } }
function saveLS(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

export default function App(){
  const [users, setUsers] = useState(()=> loadLS(LS_USERS, []))
  const [current, setCurrent] = useState(()=> loadLS(LS_CURRENT, null))
  const [data, setData] = useState(()=> loadLS(LS_DATA, {}))
  const [year, setYear] = useState(2025)
  const [mobile, setMobile] = useState(false)
  const [showPDFBusy, setShowPDFBusy] = useState(false)
  const [spawnFlowers, setSpawnFlowers] = useState([])

  useEffect(()=> saveLS(LS_USERS, users), [users])
  useEffect(()=> saveLS(LS_CURRENT, current), [current])
  useEffect(()=> saveLS(LS_DATA, data), [data])

  // unregelmäßige Blumen
  useEffect(()=>{
    let alive = true
    const spawner = () => {
      if(!alive) return
      const id = (crypto?.randomUUID?.() || Math.random().toString(36).slice(2))
      setSpawnFlowers(f=>[...f, {id, left: Math.random()*90+5, emoji: FLOWERS[randomInt(0, FLOWERS.length-1)]}])
      setTimeout(spawner, randomInt(1500, 5500))
    }
    const t = setTimeout(spawner, randomInt(800, 2500))
    return ()=>{ alive=false; clearTimeout(t) }
  }, [])

  function removeFlower(id){ setSpawnFlowers(f=> f.filter(x=> x.id!==id)) }

  const me = useMemo(()=> current? users.find(u=>u.username===current.username): null, [users, current])

  function upsertUser(username, color){
    setData(d=> ({...d, [username]: d[username] || { entries:{}, signatures:{}, vacations:[], monthly: defaultMonthly() }}))
  }
  function defaultMonthly(){ const m={}; for(let i=0;i<12;i++){ m[i]={pregnant:0, postpartum:0} } return m }

  function register(username, password){
    username = (username||'').trim()
    if(!username) return alert('Bitte Benutzernamen angeben.')
    if(users.some(u=>u.username.toLowerCase()===username.toLowerCase())){
      alert('Benutzername bereits vergeben.'); return;
    }
    const color = randomProfileColor()
    const u = { username, passHash: sha1(password||''), color }
    setUsers(prev=> [...prev, u])
    setCurrent({ username })
    upsertUser(username, color)
  }
  function login(username, password){
    const u = users.find(x=> x.username.toLowerCase()=== (username||'').toLowerCase())
    if(!u) return alert('Unbekannter Benutzer.')
    if(u.passHash !== sha1(password||'')) return alert('Falsches Passwort.')
    setCurrent({ username: u.username })
  }
  function logout(){ setCurrent(null) }

  function randomProfileColor(){
    const palette = ['#3b82f6','#60a5fa','#93c5fd','#a855f7','#ec4899','#f472b6','#fb7185']
    return palette[randomInt(0, palette.length-1)]
  }
  function canEdit(username){ return me && me.username === username }

  function toggleStatus(targetUser, dateISO, field){
    setData(d=>{
      const u = d[targetUser] || { entries:{}, signatures:{}, vacations:[], monthly: defaultMonthly() }
      const e = {...(u.entries[dateISO]||{})}
      if(field==='absent'){
        e.absent = !e.absent
        if(e.absent){ e.available=false; e.ready=false }
      }else{
        if(e.absent){ return d }
        e[field] = !e[field]
      }
      const entries = {...u.entries, [dateISO]: e}
      return ({...d, [targetUser]: {...u, entries}})
    })
  }
  function signForDay(absentUser, dateISO){
    if(!me) return alert('Bitte zuerst anmelden.')
    if(absentUser===me.username) return
    setData(d=>{
      const u = d[absentUser]; if(!u) return d
      const existing = new Set([...(u.signatures?.[dateISO]||[])])
      existing.add(me.username)
      const signatures = {...u.signatures, [dateISO]: Array.from(existing)}
      return ({...d, [absentUser]: {...u, signatures}})
    })
  }
  function addVacation(startISO, endISO){
    if(!me) return
    if(!startISO || !endISO) return
    const start = new Date(startISO), end = new Date(endISO)
    if(start > end) return alert('Zeitraum ungültig.')
    const dates = []
    for(let dt=new Date(start); dt<=end; dt.setDate(dt.getDate()+1)){
      dates.push(iso(new Date(dt)))
    }
    setData(d=>{
      const u = d[me.username]
      const vacations = [...(u?.vacations||[]), {start:startISO, end:endISO}]
      const entries = {...(u?.entries||{})}
      dates.forEach(ds=>{ entries[ds] = { ...(entries[ds]||{}), absent: true, available:false, ready:false } })
      return ({...d, [me.username]: {...u, vacations, entries}})
    })
  }
  function updateMonthly(monthIndex, field, delta){
    if(!me) return
    setData(d=>{
      const u = d[me.username]
      const monthly = {...(u?.monthly||{})}
      const m = {...(monthly[monthIndex]||{pregnant:0, postpartum:0})}
      m[field] = clamp((m[field]||0)+delta, 0, 9999)
      monthly[monthIndex] = m
      return ({...d, [me.username]: {...u, monthly}})
    })
  }

  const [filters, setFilters] = useState(()=> loadLS(LS_FILTERS, {}))
  const myFilters = filters[me?.username||'__anon__'] || { usersShown:{}, statuses:{available:true, ready:true, absent:true}, showLoads:true }
  useEffect(()=> saveLS(LS_FILTERS, filters), [filters])
  function updateMyFilters(patch){ setFilters(f=> ({...f, [me?.username||'__anon__']: {...myFilters, ...patch} })) }
  function resetFilters(){ updateMyFilters({ usersShown:{}, statuses:{available:true, ready:true, absent:true}, showLoads:true }) }

  const visibleUsers = useMemo(()=>{
    const all = Object.keys(data)
    const set = myFilters.usersShown
    const keys = Object.keys(set||{}).filter(k=>set[k])
    return keys.length? keys: all
  }, [data, myFilters])

  async function exportPDF(){
    setShowPDFBusy(true)
    try{
      const node = document.getElementById('calendar-root')
      if(!node) return
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      const canvas = await html2canvas(node, {scale:2, useCORS:true, backgroundColor:null})
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({orientation:'landscape', unit:'pt', format:'a4'})
      const margin = 24
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const ratio = Math.min((pageW-2*margin)/canvas.width, (pageH-2*margin)/canvas.height)
      const w = canvas.width*ratio, h = canvas.height*ratio
      pdf.addImage(imgData, 'PNG', (pageW-w)/2, (pageH-h)/2, w, h)
      pdf.save(`GGA_${year}_Kalender.pdf`)
    } finally { setShowPDFBusy(false) }
  }

  async function exportXLSX(){
    const XLSX = await import('xlsx')
    const rows = []
    for(const u of Object.keys(data)){
      const du = data[u] || {}
      for(const [dateISO, e] of Object.entries(du.entries||{})){
        rows.push({ user:u, date:dateISO, available:!!e.available, ready:!!e.ready, absent:!!e.absent, signatures:(du.signatures?.[dateISO]||[]).join(', ') })
      }
      for(let m=0;m<12;m++){
        const ml = du.monthly?.[m] || {pregnant:0, postpartum:0}
        rows.push({ user:u, date:`${year}-${String(m+1).padStart(2,'0')}`, pregnant:ml.pregnant, postpartum:ml.postpartum, type:'monthly_load' })
      }
    }
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Kalender')
    const ab = XLSX.write(wb, {type:'array', bookType:'xlsx'})
    const blob = new Blob([ab], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `GGA_${year}_Archiv.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }

  if(!me){
    return (        <div className="min-h-screen w-full bg-gradient-to-br from-blue-500 via-indigo-400 to-pink-400 text-white flex items-center justify-center p-8">          <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8">            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 shadow-xl">              <h1 className="text-2xl font-bold mb-1">GGA one Team – one Mission</h1>              <p className="opacity-90">Sichere Vertretung & Verfügbarkeit für Hebammen (MVP).</p>              <ul className="mt-4 text-sm list-disc list-inside opacity-90">                <li>Registrierung & Login</li>                <li>Jahreskalender 2025+</li>                <li>Status: abwesend / verfügbar / bereit zur Vertretung</li>                <li>Signaturen auf Abwesenheiten</li>                <li>Monatliche Fallzahlen (schwanger/entbunden)</li>                <li>Urlaub & PDF/XLSX Export</li>              </ul>            </div>            <AuthPanel onLogin={login} onRegister={register} />          </div>        </div>      )
  }

  return (      <div className="min-h-screen w-full bg-gradient-to-br from-blue-600 via-indigo-400 to-pink-400 text-gray-900">        <div className="flex items-center gap-3 p-3">          <button onClick={()=> setMobile(m=>!m)} className="px-3 py-1 rounded-lg bg-white/80 hover:bg-white shadow text-sm">            {mobile? 'Desktop-Ansicht': 'Mobile-Ansicht'}          </button>          <select value={year} onChange={e=> setYear(parseInt(e.target.value))} className="px-3 py-1 rounded-lg bg-white/80 shadow text-sm">            {range(7).map(i=> 2025+i).map(y=> <option key={y} value={y}>{y}</option>)}          </select>          <div className="ml-auto flex items-center gap-2">            <span className="text-white/90 text-sm">Angemeldet als</span>            <span className="px-2 py-1 rounded-md text-sm font-semibold" style={{background: me.color, color:'white'}}>@{me.username}</span>            <button onClick={logout} className="px-3 py-1 rounded-lg bg-white/80 hover:bg-white shadow text-sm">Logout</button>          </div>        </div>        <div className="p-3 grid lg:grid-cols-[1fr_320px] gap-3">          <div id="calendar-root" className="bg-white/90 rounded-2xl p-3 shadow-lg">            <HeaderLegend />            <YearCalendar              year={year}              data={data}              currentUser={me}              canEdit={canEdit}              toggleStatus={toggleStatus}              signForDay={signForDay}              mobile={mobile}              filters={myFilters}              visibleUsers={visibleUsers}            />          </div>          <div className="space-y-3">            <FiltersPanel              users={users}              data={data}              visibleUsers={visibleUsers}              filters={myFilters}              onChange={updateMyFilters}              onReset={resetFilters}            />            <VacationPanel onAdd={addVacation} />            <MonthlyLoadPanel year={year} me={me} data={data} onChange={updateMonthly} show={myFilters.showLoads} setShow={(v)=>updateMyFilters({showLoads:v})} />            <div className="bg-white/90 rounded-2xl p-3 shadow-lg">              <h3 className="font-semibold mb-2">Export</h3>              <div className="flex gap-2">                <button onClick={exportPDF} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm disabled:opacity-60" disabled={showPDFBusy}>                  {showPDFBusy? 'PDF wird erstellt…' : 'PDF der aktuellen Ansicht'}                </button>                <button onClick={exportXLSX} className="px-3 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-sm">XLSX (manuell)</button>              </div>              <p className="text-xs text-gray-600 mt-2">Hinweis: Täglicher E-Mail-Versand & GitHub-Archiv erfordern ein Backend (siehe BACKEND_NOTES.md).</p>            </div>          </div>        </div>        <div className="pointer-events-none fixed bottom-2 left-0 right-0 h-12">          <AnimatePresence>            {spawnFlowers.map(f=> (              <motion.div                key={f.id}                initial={{opacity:0, x:-50, y:0}}                animate={{opacity:1, x: typeof window !== 'undefined' ? window.innerWidth+50 : 1000}}                exit={{opacity:0}}                transition={{duration: randomInt(8,16), ease:'linear'}}                className="absolute text-2xl"                style={{ left: f.left+'%' }}                onAnimationComplete={()=> removeFlower(f.id)}              >{f.emoji}</motion.div>            ))}          </AnimatePresence>        </div>      </div>    )
}

function HeaderLegend(){    return (      <div className="flex flex-wrap items-center gap-3 mb-2">        <h2 className="text-lg font-bold">Jahresübersicht</h2>        <span className="text-xs px-2 py-1 rounded-md bg-green-100">b) verfügbar</span>        <span className="text-xs px-2 py-1 rounded-md bg-blue-100">c) bereit für Vertretung</span>        <span className="text-xs px-2 py-1 rounded-md bg-red-100">a) abwesend</span>        <span className="text-xs px-2 py-1 rounded-md bg-yellow-100">Signaturen (Vertretung)</span>      </div>    )  }

function YearCalendar({year, data, currentUser, canEdit, toggleStatus, signForDay, mobile, filters, visibleUsers}){    const months = range(12)    return (      <div className={mobile? 'grid grid-cols-1 gap-3' : 'grid md:grid-cols-2 xl:grid-cols-3 gap-3'}>        {months.map(m=> (          <MonthCard key={m}            year={year}            monthIndex={m}            data={data}            currentUser={currentUser}            canEdit={canEdit}            toggleStatus={toggleStatus}            signForDay={signForDay}            filters={filters}            visibleUsers={visibleUsers}          />        ))}      </div>    )  }

function MonthCard({year, monthIndex, data, currentUser, canEdit, toggleStatus, signForDay, filters, visibleUsers}){    const days = daysInMonth(year, monthIndex)    const first = startOfMonth(year, monthIndex)    const startWeekday = (first.getDay()+6)%7
  const cells = []
  for(let i=0;i<startWeekday;i++){ cells.push(null) }
  for(let d=1; d<=days; d++){ cells.push(new Date(year, monthIndex, d)) }
  while(cells.length % 7 !== 0){ cells.push(null) }

  const usernames = Object.keys(data).filter(u=> visibleUsers.includes(u))

  return (      <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">        <div className="px-3 py-2 bg-gray-50 font-semibold sticky top-0 z-10">{MONTHS[monthIndex]} {year}</div>        <div className="grid grid-cols-7 text-xs bg-gray-50/60">          {['Mo','Di','Mi','Do','Fr','Sa','So'].map(d=> <div key={d} className="px-2 py-1 text-center text-gray-600">{d}</div>)}        </div>        <div className="grid grid-cols-7">          {cells.map((dateObj, idx)=>{            const dateISO = dateObj? iso(dateObj): null
          return (              <div key={idx} className={`min-h-[80px] border border-gray-100 p-1 ${dateObj? 'bg-white': 'bg-gray-50'}`}>                {dateObj && (                  <>                    <div className="text-[10px] text-gray-500 mb-1">{dateObj.getDate()}</div>                    <div className="space-y-1">                      {usernames.map(u=> (                        <DayRow                          key={u}                          username={u}                          dateISO={dateISO}                          profileColor={getUserColor(u)}                          entry={(data[u]?.entries||{})[dateISO]||{}}                          signatures={(data[u]?.signatures||{})[dateISO]||[]}                          canEdit={canEdit(u)}                          onToggle={(field)=> toggleStatus(u, dateISO, field)}                          onSign={()=> signForDay(u, dateISO)}                          filters={filters}                          isMe={currentUser?.username===u}                        />                      ))}                    </div>                  </>                )}              </div>            )
        })}
      </div>
    </div>
  )

  function getUserColor(u){
    const us = loadLS(LS_USERS, [])
    return (us.find(x=>x.username===u)?.color)||'#64748b'
  }
}

function DayRow({username, dateISO, profileColor, entry, signatures, canEdit, onToggle, onSign, filters}){
  const show = shouldShow(entry, filters)
  if(!show) return null
  const badge = (txt, cls) => (<span className={`px-1.5 py-0.5 rounded text-[10px] ${cls}`}>{txt}</span>)

  return (      <div className="flex items-center gap-1">        <div className="w-1.5 h-1.5 rounded-full" style={{background: profileColor}}></div>        <div className="truncate text-[11px] font-medium">@{username}</div>        <div className="ml-auto flex items-center gap-1 flex-wrap">          {entry.available && badge('verfügbar', 'bg-green-100')}          {entry.ready && badge('Vertretung', 'bg-blue-100')}          {entry.absent && badge('abwesend', 'bg-red-100')}          {signatures.length>0 && badge(`Signaturen: ${signatures.length}`, 'bg-yellow-100')}          {canEdit && (            <div className="flex gap-1">              <button onClick={()=> onToggle('available')} className="px-1.5 py-0.5 text-[10px] rounded bg-green-600 text-white">b</button>              <button onClick={()=> onToggle('ready')} className="px-1.5 py-0.5 text-[10px] rounded bg-blue-600 text-white">c</button>              <button onClick={()=> onToggle('absent')} className="px-1.5 py-0.5 text-[10px] rounded bg-red-600 text-white">a</button>            </div>          )}          {!canEdit && entry.absent && (            <button onClick={onSign} className="px-1.5 py-0.5 text-[10px] rounded bg-yellow-500 text-white">signieren</button>          )}        </div>      </div>    )
}

function shouldShow(entry, filters){
  if(!entry || Object.keys(entry).length===0){ return false }
  const {statuses} = filters
  if(entry.absent && statuses.absent) return true
  if(entry.available && statuses.available) return true
  if(entry.ready && statuses.ready) return true
  return false
}

function FiltersPanel({data, filters, onChange, onReset}){
  const allUsers = Object.keys(data)
  function toggleUser(u){ const set = {...(filters.usersShown||{})}; set[u] = !set[u]; onChange({ usersShown: set }) }
  function toggleStatus(k){ const s = {...filters.statuses}; s[k] = !s[k]; onChange({statuses: s}) }
  return (      <div className="bg-white/90 rounded-2xl p-3 shadow-lg">        <h3 className="font-semibold mb-2">Filter & Ansicht</h3>        <div className="text-sm text-gray-700 mb-1">Benutzer</div>        <div className="flex flex-wrap gap-1 mb-2">          {allUsers.length===0 && <span className="text-xs text-gray-500">(Noch keine Einträge)</span>}          {allUsers.map(u=> (            <button key={u} onClick={()=> toggleUser(u)} className={`px-2 py-1 rounded text-xs border ${filters.usersShown?.[u]? 'bg-indigo-600 text-white border-indigo-600':'bg-white hover:bg-gray-50'}`}>@{u}</button>          ))}        </div>        <div className="text-sm text-gray-700 mb-1">Status</div>        <div className="flex gap-1 mb-2">          <button onClick={()=> toggleStatus('available')} className={`px-2 py-1 rounded text-xs border ${filters.statuses.available? 'bg-green-600 text-white border-green-600':'bg-white'}`}>verfügbar</button>          <button onClick={()=> toggleStatus('ready')} className={`px-2 py-1 rounded text-xs border ${filters.statuses.ready? 'bg-blue-600 text-white border-blue-600':'bg-white'}`}>Vertretung</button>          <button onClick={()=> toggleStatus('absent')} className={`px-2 py-1 rounded text-xs border ${filters.statuses.absent? 'bg-red-600 text-white border-red-600':'bg-white'}`}>abwesend</button>        </div>        <div className="flex gap-2">          <button onClick={onReset} className="px-3 py-1.5 rounded bg-gray-200 hover:bg-gray-300 text-sm">Zurücksetzen</button>        </div>      </div>    )
}

function VacationPanel({onAdd}){
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  return (      <div className="bg-white/90 rounded-2xl p-3 shadow-lg">        <h3 className="font-semibold mb-2">Urlaub eintragen</h3>        <div className="flex flex-col gap-2">          <input type="date" value={start} onChange={e=> setStart(e.target.value)} className="px-2 py-1 rounded border"/>          <input type="date" value={end} onChange={e=> setEnd(e.target.value)} className="px-2 py-1 rounded border"/>          <button onClick={()=> onAdd(start, end)} className="px-3 py-1.5 rounded bg-pink-600 hover:bg-pink-700 text-white text-sm">Speichern</button>        </div>      </div>    )
}

function MonthlyLoadPanel({year, me, data, onChange, show, setShow}){
  if(!me) return null
  const u = data[me.username] || {}; const monthly = u.monthly || {}
  return (      <div className="bg-white/90 rounded-2xl p-3 shadow-lg">        <div className="flex items-center justify-between">          <h3 className="font-semibold">Monatliche Fallzahlen ({year})</h3>          <label className="text-sm flex items-center gap-2">            <input type="checkbox" checked={show} onChange={e=> setShow(e.target.checked)} /> anzeigen          </label>        </div>        {show && (          <div className="mt-2 grid grid-cols-1 gap-2">            {range(12).map(m=> (              <div key={m} className="flex items-center gap-2 text-sm">                <div className="w-16 text-gray-700">{MONTHS[m]}</div>                <div className="flex items-center gap-1">                  <span className="text-xs">schwanger</span>                  <button onClick={()=> onChange(m,'pregnant',-1)} className="px-2 border rounded">-</button>                  <span className="w-10 text-center">{monthly[m]?.pregnant||0}</span>                  <button onClick={()=> onChange(m,'pregnant',+1)} className="px-2 border rounded">+</button>                </div>                <div className="flex items-center gap-1 ml-3">                  <span className="text-xs">entbunden</span>                  <button onClick={()=> onChange(m,'postpartum',-1)} className="px-2 border rounded">-</button>                  <span className="w-10 text-center">{monthly[m]?.postpartum||0}</span>                  <button onClick={()=> onChange(m,'postpartum',+1)} className="px-2 border rounded">+</button>                </div>              </div>            ))}          </div>        )}      </div>    )
}

function AuthPanel({onLogin, onRegister}){
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  return (      <div className="bg-white/10 backdrop-blur rounded-2xl p-6 shadow-xl">        <div className="flex gap-2 mb-4">          <button onClick={()=> setMode('login')} className={`px-3 py-1 rounded ${mode==='login'? 'bg-white text-gray-900':'bg-white/20 text-white'}`}>Login</button>          <button onClick={()=> setMode('register')} className={`px-3 py-1 rounded ${mode==='register'? 'bg-white text-gray-900':'bg-white/20 text-white'}`}>Registrieren</button>        </div>        <div className="space-y-2">          <input placeholder="Benutzername" value={username} onChange={e=> setUsername(e.target.value)} className="w-full px-3 py-2 rounded bg-white text-gray-900"/>          <input placeholder="Passwort" type="password" value={password} onChange={e=> setPassword(e.target.value)} className="w-full px-3 py-2 rounded bg-white text-gray-900"/>          {mode==='login' ? (            <button onClick={()=> onLogin(username, password)} className="w-full px-3 py-2 rounded bg-indigo-600 text-white">Anmelden</button>          ) : (            <button onClick={()=> onRegister(username, password)} className="w-full px-3 py-2 rounded bg-pink-600 text-white">Konto erstellen</button>          )}          <p className="text-xs text-white/80 mt-1">Hinweis: Demo-Login speichert lokal (kein echter Auth-Server).</p>        </div>      </div>    )
}
