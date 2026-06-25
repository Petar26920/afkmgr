import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const firebaseConfig = {
  apiKey:'AIzaSyD8yIOIKJeeYkuLQYTo64S_LrfUhRRvW0Q',
  authDomain:'afk-manager-31a3c.firebaseapp.com',
  projectId:'afk-manager-31a3c',
  storageBucket:'afk-manager-31a3c.firebasestorage.app',
  messagingSenderId:'964360625277',
  appId:'1:964360625277:web:10a6772622bca912f3a514',
};
const fbApp = initializeApp(firebaseConfig);
const db    = getFirestore(fbApp);
const auth  = getAuth(fbApp);
const DOC_REF = doc(db,'afk','state');

function isAdminNow(){ return !!auth.currentUser; }
function requireAdmin(){ if(!isAdminNow()) throw new Error('Not authenticated as admin'); }

// ─── PANEL DEFS ───
const BUILTIN_PANELS = [
  { id:'timeline',       label:'Break Timeline',   icon:'📊', defaultSpan:9, defaultHeight:null },
  { id:'leave-panel',    label:'On Leave',         icon:'🏖',  defaultSpan:3, defaultHeight:null },
  { id:'triage-strip',   label:'Triage Strip',     icon:'🔀', defaultSpan:7, defaultHeight:null },
  { id:'patching-v',     label:'Patching Agent',   icon:'🔧', defaultSpan:5, defaultHeight:null },
  { id:'top-performers', label:'Top Performers',   icon:'🏆', defaultSpan:4, defaultHeight:null },
  { id:'shift-manager',  label:'Shift Manager',    icon:'🔄', defaultSpan:12, defaultHeight:null },
];

const SHIFTS = {
  weekday: [
    { id:'shift-08-16', label:'08:00–16:00', start:480,  end:960 },
    { id:'shift-09-17', label:'09:00–17:00', start:540,  end:1020 },
    { id:'shift-10-18', label:'10:00–18:00', start:600,  end:1080 },
    { id:'shift-12-20', label:'12:00–20:00', start:720,  end:1200 },
    { id:'shift-18-02', label:'18:00–02:00', start:1080, end:1440+120 },
    { id:'shift-02-08', label:'02:00–08:00', start:120,  end:480 },
  ],
  weekend: [
    { id:'shift-10-18', label:'10:00–18:00', start:600,  end:1080 },
    { id:'shift-18-02', label:'18:00–02:00', start:1080, end:1440+120 },
    { id:'shift-02-10', label:'02:00–10:00', start:120,  end:600 },
  ],
};

const ACCENT_COLORS = [
  {key:'blue',   val:'#3d9eff'}, {key:'green', val:'#00e5a0'}, {key:'amber', val:'#ffb340'},
  {key:'purple', val:'#b57aff'}, {key:'teal',  val:'#00d4d4'}, {key:'red',   val:'#ff4f4f'},
];

const DEFAULT_VIEWER_LAYOUT = [
  { panels:[{id:'timeline',span:9,visible:true},{id:'leave-panel',span:3,visible:true}] },
  { panels:[{id:'triage-strip',span:7,visible:true},{id:'patching-v',span:5,visible:true}] },
  { panels:[{id:'shift-manager',span:12,visible:true}] },
];

const DEFAULT_PHONE_LAYOUT = [
  {id:'shift',label:'On shift now',visible:true},
  {id:'coffee',label:'Coffee break',visible:true},
  {id:'lunch',label:'Lunch break',visible:true},
  {id:'triage',label:'Triage',visible:true},
  {id:'custom',label:'Custom task',visible:true},
];

const DEFAULT_DATA = {
  agents:['Bogdan Repanovic','Danica Pecanac','Ivan Curcic','Sari Abboushi','Luka Martinovic','Aleksa Kostic','Bojan Pavlovic','Stefan Krstic','Luka Jovanovic','Milos Savic','Tamara Trakic','Milica Stepanovic','Dimitrije Milosavljevic','David Kostic','Isidora Stevanovic','Petar Spasic','Radislav Lazarevic'],
  agentBreakVisible:{},
  coffeeBreaks:[
    {agent:'Bojan Pavlovic',start:660,end:690},{agent:'Bogdan Repanovic',start:900,end:930},
    {agent:'Aleksa Kostic',start:900,end:930},{agent:'Stefan Krstic',start:930,end:960},
  ],
  lunchBreaks:[
    {agent:'Bojan Pavlovic',start:720,end:750},{agent:'Tamara Trakic',start:720,end:750},
    {agent:'Aleksa Kostic',start:720,end:750},{agent:'Isidora Stevanovic',start:760,end:790},
    {agent:'Bogdan Repanovic',start:760,end:790},{agent:'Danica Pecanac',start:760,end:790},
    {agent:'Luka Martinovic',start:800,end:830},{agent:'Stefan Krstic',start:800,end:830},
    {agent:'Petar Spasic',start:800,end:830},{agent:'Sari Abboushi',start:900,end:930},
  ],
  triageSlots:[
    {time:'08:00–09:00',agent:'Bojan Pavlovic',start:480,end:540},
    {time:'09:00–10:00',agent:'Tamara Trakic',start:540,end:600},
    {time:'10:00–11:00',agent:'Isidora Stevanovic',start:600,end:660},
    {time:'11:00–12:00',agent:'Bogdan Repanovic',start:660,end:720},
    {time:'12:00–13:00',agent:'Stefan Krstic',start:720,end:780},
    {time:'13:00–14:00',agent:'Aleksa Kostic',start:780,end:840},
    {time:'14:00–15:00',agent:'Petar Spasic',start:840,end:900},
    {time:'15:00–16:00',agent:'Danica Pecanac',start:900,end:960},
    {time:'16:00–17:00',agent:'Luka Martinovic',start:960,end:1020},
    {time:'17:00–18:00',agent:'Ivan Curcic',start:1020,end:1080},
  ],
  rules:['Max 2 agents on coffee/smoke break at the same time','Lunch limited to 3 agents per time slot','Mon & Tue — no break slots booked after 16:00','Book your slot and stick to it. No last-minute swaps.','Emergencies — communicate with the team leader first'],
  patchingAgent:'Ivan Curcic',
  patchWeek:'Week 20',
  agentPasswords:{'Bogdan Repanovic':'bogdan123','Danica Pecanac':'danica123','Ivan Curcic':'ivan123','Sari Abboushi':'sari123','Luka Martinovic':'luka.m123','Aleksa Kostic':'aleksa123','Bojan Pavlovic':'bojan123','Stefan Krstic':'stefan123','Luka Jovanovic':'luka.j123','Milos Savic':'milos123','Tamara Trakic':'tamara123','Milica Stepanovic':'milica123','Dimitrije Milosavljevic':'dimitrije123','David Kostic':'david123','Isidora Stevanovic':'isidora123','Petar Spasic':'petar123','Radislav Lazarevic':'radislav123'},
  onLeave:[],
  shiftAssignments: {},
  shiftManagerViewDate: null,
  viewerLayout: DEFAULT_VIEWER_LAYOUT,
  phoneLayout: DEFAULT_PHONE_LAYOUT,
  customPanels: {},
  customTasks: [],
  editRequests: [],
  topPerformers: {},
  dailyTimelines: {},
  lastUpdated: null,
  cardCollapse: {},
  lastEODClearDate: null,
};

let DATA = JSON.parse(JSON.stringify(DEFAULT_DATA));
let activeModalType = 'coffee';
const PHONE_TIMELINE_EXPANDED_SECTIONS = {};
let _firestoreAvailable = true;
let shiftManagerViewDate = null;
let selectedDailyTimelineKey = null;

function loadShiftManagerViewDate(){
  try{
    const stored = sessionStorage.getItem('shiftManagerViewDate');
    if(stored){
      const d = new Date(stored);
      if(!isNaN(d)) shiftManagerViewDate = formatDateKey(d);
    }
  }catch(e){ shiftManagerViewDate = null; }
}
function setShiftManagerViewDate(dateStr){
  shiftManagerViewDate = dateStr;
  try{ sessionStorage.setItem('shiftManagerViewDate', dateStr); }catch(e){}
}
loadShiftManagerViewDate();

function normalizeData(d){
  return {
    agents:            Array.isArray(d.agents)            ? d.agents            : DEFAULT_DATA.agents,
    agentBreakVisible: d.agentBreakVisible && typeof d.agentBreakVisible === 'object' ? d.agentBreakVisible : {},
    agentScheduleVisible: d.agentScheduleVisible && typeof d.agentScheduleVisible === 'object' ? d.agentScheduleVisible : {},
    coffeeBreaks:      Array.isArray(d.coffeeBreaks)      ? d.coffeeBreaks      : [],
    lunchBreaks:       Array.isArray(d.lunchBreaks)       ? d.lunchBreaks       : [],
    triageSlots:       Array.isArray(d.triageSlots)       ? d.triageSlots       : [],
    rules:             Array.isArray(d.rules)             ? d.rules             : DEFAULT_DATA.rules,
    patchingAgent:     d.patchingAgent ?? DEFAULT_DATA.patchingAgent,
    patchWeek:         d.patchWeek ?? DEFAULT_DATA.patchWeek,
    agentPasswords:    d.agentPasswords && typeof d.agentPasswords === 'object' ? d.agentPasswords : DEFAULT_DATA.agentPasswords,
    onLeave:           Array.isArray(d.onLeave)           ? d.onLeave           : [],
    shiftAssignments:  d.shiftAssignments && typeof d.shiftAssignments === 'object' ? d.shiftAssignments : {},
    shiftManagerViewDate: typeof d.shiftManagerViewDate === 'string' ? d.shiftManagerViewDate : null,
    viewerLayout:      Array.isArray(d.viewerLayout) && d.viewerLayout.length ? d.viewerLayout : DEFAULT_VIEWER_LAYOUT,
    customPanels:      d.customPanels && typeof d.customPanels === 'object' ? d.customPanels : {},
    customTasks:       Array.isArray(d.customTasks)       ? d.customTasks       : [],
    editRequests:      Array.isArray(d.editRequests)      ? d.editRequests      : [],
    topPerformers:     d.topPerformers && typeof d.topPerformers === 'object' ? d.topPerformers : {},
    dailyTimelines:    d.dailyTimelines && typeof d.dailyTimelines === 'object' ? d.dailyTimelines : {},
    phoneLayout:       Array.isArray(d.phoneLayout) && d.phoneLayout.length ? d.phoneLayout : DEFAULT_PHONE_LAYOUT,
    lastUpdated:       d.lastUpdated ?? null,
    cardCollapse:      d.cardCollapse && typeof d.cardCollapse === 'object' ? d.cardCollapse : {},
    clearComfortBreaksAtEOD: typeof d.clearComfortBreaksAtEOD === 'boolean' ? d.clearComfortBreaksAtEOD : false,
    lastEODClearDate:  typeof d.lastEODClearDate === 'string' ? d.lastEODClearDate : null,
  };
}

function agentInBreaks(name){ const v=DATA.agentBreakVisible; return v&&name in v?v[name]:true; }
function agentInSchedule(name){ const v=DATA.agentScheduleVisible; return v&&name in v?v[name]:true; }
function getViewerLayout(){ return (DATA.viewerLayout&&DATA.viewerLayout.length)?DATA.viewerLayout:DEFAULT_VIEWER_LAYOUT; }
function getPhoneLayout(){ return (DATA.phoneLayout&&DATA.phoneLayout.length)?DATA.phoneLayout:DEFAULT_PHONE_LAYOUT; }
function isPhoneSectionVisible(section){ return section.visible !== false && section.visible !== 'false'; }

function normalizeAgentKey(name){
  return String(name||'').normalize('NFD').replace(/[đĐ]/g,'dj').replace(/[\u0300-\u036f]/g,'').replace(/\./g,'').replace(/\s+/g,' ').trim().toLowerCase();
}

function stripMiddleInitials(name){
  const parts = normalizeAgentKey(name).split(' ').filter(Boolean);
  if(parts.length <= 2) return parts.join(' ');
  const filtered = parts.filter((part, index) => index === 0 || index === parts.length - 1 || part.length > 1);
  return filtered.join(' ');
}

function getCurrentISOWeek(){
  const now = new Date();
  const target = new Date(now.valueOf());
  const dayNr = (now.getDay() + 6) % 7; // Monday=0, Sunday=6
  target.setDate(target.getDate() - dayNr + 3); // move to Thursday of current week
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target - firstThursday;
  return 1 + Math.round(diff / 604800000);
}

function getCurrentPatchWeek(){
  return `Week ${getCurrentISOWeek()}`;
}

function findAgentMatch(name){
  const trimmed = String(name||'').trim();
  if(!trimmed) return '';
  const key = normalizeAgentKey(trimmed);
  const exact = (DATA.agents||[]).find(a => normalizeAgentKey(a) === key);
  if(exact) return exact;
  const strippedKey = stripMiddleInitials(trimmed);
  if(strippedKey !== key){
    const match = (DATA.agents||[]).find(a => normalizeAgentKey(a) === strippedKey);
    if(match) return match;
  }
  return trimmed;
}

function parseShiftAgents(value){
  if(Array.isArray(value)) return value.map(v=>findAgentMatch(v)).map(v=>String(v).trim()).filter(Boolean);
  if(typeof value === 'string') return value.split(/[,;\n]/).map(v=>findAgentMatch(v)).filter(Boolean);
  return [];
}

function formatShiftAgents(agents){
  if(!agents || !agents.length) return '—';
  return agents.map(agent => `<div style="margin-bottom:4px;">${agent}</div>`).join('');
}

function getScheduleDisplayName(agent, allAgents){
  const parts = String(agent||'').trim().split(/\s+/).filter(Boolean);
  if(!parts.length) return agent;
  const firstName = parts[0];
  const duplicates = allAgents.filter(a=>String(a||'').trim().split(/\s+/).filter(Boolean)[0] === firstName);
  if(duplicates.length > 1){
    const surname = parts.length > 1 ? parts[parts.length-1] : '';
    return surname ? `${firstName} ${surname[0]}` : firstName;
  }
  return firstName;
}

function getShiftLabel(id){
  const shift = SHIFTS.weekday.concat(SHIFTS.weekend).find(s=>s.id===id);
  return shift ? shift.label : id;
}

function isShiftOnDay(dayIndex, shiftId){
  const list = dayIndex >= 5 ? SHIFTS.weekend : SHIFTS.weekday;
  return list.some(s=>s.id===shiftId);
}

// ─── FIREBASE ───
async function loadData(){
  try {
    const snap = await getDoc(DOC_REF);
    if(snap.exists()){
      const d = snap.data();
      console.debug('Firebase document loaded:', {path: DOC_REF.path, data:d});
      DATA = normalizeData(d);
      _firestoreAvailable = true;
      if(!d.agentPasswords) await setDoc(DOC_REF, DATA, { merge: true });
    } else {
      console.warn('Firebase document not found:', DOC_REF.path);
      _firestoreAvailable = false;
    }
  } catch(e){
    console.warn('Firebase unavailable:', e.message);
    _firestoreAvailable = false;
  }
  render(); setStatusBar();
}

function attachRealtimeListener(){
  if(!_firestoreAvailable) return;
  onSnapshot(DOC_REF, (snap)=>{
    console.debug('Firestore snapshot update:', {exists:snap.exists(), path: DOC_REF.path});
    if(!snap.exists()) return;
    const d = snap.data();
    DATA = normalizeData(d);
    render();
  }, (err)=>console.warn('Realtime listener error:', err.message));
}

async function saveData(){
  DATA.lastUpdated = new Date().toISOString();
  const el = document.getElementById('last-update');
  if(!_firestoreAvailable){ if(el) el.textContent='⚠ Offline — changes not saved'; return; }
  try {
    await setDoc(DOC_REF, DATA, { merge: true }, { merge: true });
    if(el) el.textContent='Saved · '+new Date().toLocaleTimeString();
    renderLastUpdated();
    setTimeout(setStatusBar, 3000);
  } catch(e){
    if(el) el.textContent='⚠ Save failed: '+e.message;
    console.error('Firestore save error:', e);
  }
}

function createTimelineArchiveKey(){
  const dateKey = formatDateKey(new Date());
  const randomId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2,10);
  return `${dateKey}_${Date.now()}_${randomId}`;
}

async function archiveCurrentTimeline(){
  const el = document.getElementById('last-update');
  if(!_firestoreAvailable){ if(el) el.textContent='⚠ Offline — timeline not archived'; return; }
  const dateKey = formatDateKey(new Date());
  const archiveKey = createTimelineArchiveKey();
  if(!DATA.dailyTimelines) DATA.dailyTimelines = {};
  DATA.dailyTimelines[archiveKey] = {
    date: dateKey,
    savedAt: new Date().toISOString(),
    timeline: {
      coffeeBreaks: JSON.parse(JSON.stringify(DATA.coffeeBreaks || [])),
      lunchBreaks: JSON.parse(JSON.stringify(DATA.lunchBreaks || [])),
      triageSlots: JSON.parse(JSON.stringify(DATA.triageSlots || [])),
      customTasks: JSON.parse(JSON.stringify(DATA.customTasks || [])),
      onLeave: JSON.parse(JSON.stringify(DATA.onLeave || [])),
      shiftManagerViewDate: shiftManagerViewDate || dateKey
    }
  };
  DATA.lastUpdated = new Date().toISOString();
  try {
    await setDoc(DOC_REF, DATA, { merge: true });
    if(el) el.textContent = `Archived timeline for ${dateKey}`;
    render();
    renderLastUpdated();
    setTimeout(setStatusBar, 3000);
  } catch(e){
    if(el) el.textContent='⚠ Timeline archive failed: '+e.message;
    console.error('Firestore archive error:', e);
  }
}

async function saveDailyTimeline(){
  const el = document.getElementById('last-update');
  if(!_firestoreAvailable){ if(el) el.textContent='⚠ Offline — timeline not saved'; return; }
  const dateKey = formatDateKey(new Date());
  const archiveKey = createTimelineArchiveKey();
  if(!DATA.dailyTimelines) DATA.dailyTimelines = {};
  DATA.dailyTimelines[archiveKey] = {
    date: dateKey,
    savedAt: new Date().toISOString(),
    timeline: {
      coffeeBreaks: JSON.parse(JSON.stringify(DATA.coffeeBreaks || [])),
      lunchBreaks: JSON.parse(JSON.stringify(DATA.lunchBreaks || [])),
      triageSlots: JSON.parse(JSON.stringify(DATA.triageSlots || [])),
      customTasks: JSON.parse(JSON.stringify(DATA.customTasks || [])),
      onLeave: JSON.parse(JSON.stringify(DATA.onLeave || [])),
      shiftManagerViewDate: shiftManagerViewDate || dateKey
    }
  };
  DATA.coffeeBreaks = [];
  DATA.lunchBreaks = [];
  DATA.triageSlots = [];
  DATA.customTasks = [];
  DATA.onLeave = [];
  DATA.shiftManagerViewDate = null;
  DATA.lastUpdated = new Date().toISOString();
  try {
    await setDoc(DOC_REF, DATA, { merge: true });
    if(el) el.textContent = `Saved & cleared timeline for ${dateKey}`;
    render();
    renderLastUpdated();
    setTimeout(setStatusBar, 3000);
  } catch(e){
    if(el) el.textContent='⚠ Timeline save failed: '+e.message;
    console.error('Firestore save error:', e);
  }
}

// ─── AGENT BREAK SAVE (no auth required — only writes coffeeBreaks) ───
async function saveAgentBreak(){
  const errEl = document.getElementById('abm-err');
  if(!_firestoreAvailable){
    if(errEl) errEl.textContent='⚠ Offline — break was not saved.';
    return;
  }
  try {
    await updateDoc(DOC_REF, { coffeeBreaks: DATA.coffeeBreaks });
  } catch(e){
    console.error('Agent break save failed:', e);
    if(errEl) errEl.textContent='⚠ Could not save break: '+e.message;
    DATA.coffeeBreaks.pop();
    render();
  }
}

// ─── LUNCH BREAK SAVE (only writes lunchBreaks field) ───
async function saveLunchBreak(){
  if(!_firestoreAvailable) return;
  try {
    await updateDoc(DOC_REF, { lunchBreaks: DATA.lunchBreaks });
  } catch(e){
    console.error('Lunch break save failed:', e);
  }
}

// ─── EDIT REQUEST SAVE (only writes editRequests field) ───
async function saveEditRequests(){
  const errEl = document.getElementById('br-err');
  if(!_firestoreAvailable){
    if(errEl) errEl.textContent='⚠ Offline — request was not saved.';
    return;
  }
  try {
    await updateDoc(DOC_REF, { editRequests: DATA.editRequests });
  } catch(e){
    console.error('Edit request save failed:', e);
    if(errEl) errEl.textContent='⚠ Could not save request: '+e.message;
  }
}

function setStatusBar(){
  const el=document.getElementById('last-update');
  if(el) el.textContent=_firestoreAvailable?'Live · synced via Firebase':'⚠ Offline · using default data';
}

// ─── AUTH ───
function showAdminLogin(){
  document.getElementById('admin-email').value='';
  document.getElementById('pw-input').value='';
  document.getElementById('lock-err').textContent='';
  document.getElementById('lock-screen').style.display='flex';
}
function cancelAdminLogin(){ document.getElementById('lock-screen').style.display='none'; }
async function doAdminLogin(){
  const email=document.getElementById('admin-email').value.trim();
  const pw=document.getElementById('pw-input').value;
  const errEl=document.getElementById('lock-err');
  const btn=document.getElementById('lock-unlock-btn');
  if(!email||!pw){ errEl.textContent='Enter email and password.'; return; }
  btn.textContent='Signing in…'; btn.disabled=true; errEl.textContent='';
  try {
    await signInWithEmailAndPassword(auth,email,pw);
  } catch(e){
    const inp=document.getElementById('pw-input');
    inp.classList.add('error'); setTimeout(()=>inp.classList.remove('error'),500);
    if(['auth/invalid-credential','auth/wrong-password','auth/user-not-found'].includes(e.code)) errEl.textContent='Incorrect email or password.';
    else if(e.code==='auth/too-many-requests') errEl.textContent='Too many attempts. Try again later.';
    else errEl.textContent=e.message;
  } finally { btn.textContent='Unlock Admin'; btn.disabled=false; }
}
async function lockApp(){ await signOut(auth); applyMode(); render(); }
function applyMode(){
  const admin=isAdminNow();
  document.getElementById('app').classList.toggle('admin-mode',admin);
  const badge=document.getElementById('mode-badge');
  badge.textContent=admin?'ADMIN':'VIEWER';
  badge.className='mode-badge '+(admin?'admin':'viewer');
  const btn=document.getElementById('admin-btn');
  if(btn) btn.textContent=admin?'🔒 Exit Admin':'🔐 Admin';
}

// ─── HELPERS ───
const AV=[
  {bg:'rgba(61,158,255,0.15)',fg:'#3d9eff'},{bg:'rgba(0,229,160,0.15)',fg:'#00e5a0'},
  {bg:'rgba(181,122,255,0.15)',fg:'#b57aff'},{bg:'rgba(255,179,64,0.15)',fg:'#ffb340'},
  {bg:'rgba(0,212,212,0.15)',fg:'#00d4d4'},{bg:'rgba(255,79,79,0.15)',fg:'#ff4f4f'},
];
function avStyle(name){ let h=0; for(let c of name) h=(h*31+c.charCodeAt(0))&0xffff; const col=AV[h%AV.length]; return `background:${col.bg};color:${col.fg};`; }
function initials(n){ return n.trim().split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2); }
function shortName(n){ const p=n.trim().split(' '); return p[0]+(p[1]?' '+p[1][0]+'.':''); }
const pad=n=>String(n).padStart(2,'0');
function fmtM(m){ return pad(Math.floor(m/60))+':'+pad(m%60); }
function nowMins(){ const n=new Date(); return n.getHours()*60+n.getMinutes()+n.getSeconds()/60; }
const DAY_START=480,DAY_END=1080,SPAN=DAY_END-DAY_START;
function pct(m){ return Math.max(0,Math.min(100,(m-DAY_START)/SPAN*100)).toFixed(2); }
function pctw(d){ return (d/SPAN*100).toFixed(2); }

// ─── LAST UPDATED DISPLAY ───
function renderLastUpdated(){
  const el=document.getElementById('last-updated-display');
  if(!el) return;
  if(DATA.lastUpdated){
    const d=new Date(DATA.lastUpdated);
    el.textContent='Updated '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  } else {
    el.textContent='';
  }
}

function buildTimelineHistoryRow(dateKey, entry){
  const visibleBreaks = (entry.timeline.coffeeBreaks||[]).length + (entry.timeline.lunchBreaks||[]).length;
  const visibleSlots = (entry.timeline.triageSlots||[]).length;
  const visibleTasks = (entry.timeline.customTasks||[]).length;
  const visibleLeave = (entry.timeline.onLeave||[]).length;
  const selected = selectedDailyTimelineKey === dateKey ? 'background:rgba(61,158,255,0.12);border-color:rgba(61,158,255,0.24);' : '';
  return `<div class="break-row" style="display:flex;align-items:center;gap:10px;${selected}">
    <div data-action="select-timeline" data-key="${dateKey}" style="flex:1;min-width:0;cursor:pointer;">
      <div style="font-weight:700;">${dateKey}</div>
      <div style="font-size:11px;color:var(--muted);font-family:var(--mono);">Saved at ${new Date(entry.savedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
    </div>
    <div data-action="select-timeline" data-key="${dateKey}" style="text-align:right;min-width:120px;font-size:11px;color:var(--muted);font-family:var(--mono);cursor:pointer;">
      ${visibleBreaks} breaks · ${visibleSlots} triage · ${visibleTasks} tasks · ${visibleLeave} leave
    </div>
    <button type="button" class="timeline-delete-btn" data-action="delete-timeline" data-key="${dateKey}" style="padding:4px 8px;background:var(--red);color:#fff;border:none;border-radius:4px;font-size:11px;cursor:pointer;flex-shrink:0;font-weight:600;">🗑</button>
  </div>`;
}

function renderDailyTimelineHistory(){
  const list = document.getElementById('timeline-history-list');
  const preview = document.getElementById('timeline-history-preview');
  if(!list||!preview) return;
  const entries = Object.entries(DATA.dailyTimelines || {}).sort((a,b)=>b[0].localeCompare(a[0]));
  if(!entries.length){
    list.innerHTML = '<div class="empty">No saved timelines</div>';
    preview.innerHTML = '<div style="font-size:12px;color:var(--muted);">Saved timeline snapshots will appear here.</div>';
    selectedDailyTimelineKey = null;
    return;
  }
  list.innerHTML = entries.map(([key, entry])=>buildTimelineHistoryRow(key, entry)).join('');
  if(!selectedDailyTimelineKey || !DATA.dailyTimelines[selectedDailyTimelineKey]){
    selectedDailyTimelineKey = entries[0][0];
  }
  renderDailyTimelinePreview();
}

function buildSavedTimelinePanel(entry){
  const now = nowMins(), np = pct(now);
  const timeline = entry.timeline || {};
  const coffeeBreaks = Array.isArray(timeline.coffeeBreaks) ? timeline.coffeeBreaks : [];
  const lunchBreaks = Array.isArray(timeline.lunchBreaks) ? timeline.lunchBreaks : [];
  const triageSlots = Array.isArray(timeline.triageSlots) ? timeline.triageSlots : [];
  const customTasks = Array.isArray(timeline.customTasks) ? timeline.customTasks : [];
  const agents=[...new Set([
    ...coffeeBreaks.map(b=>b.agent),
    ...lunchBreaks.map(b=>b.agent),
    ...triageSlots.map(t=>t.agent),
    ...customTasks.map(t=>t.agent)
  ])];
  const rows = agents.map(ag=>{
    const bbs=[
      ...coffeeBreaks.map((b,i)=>b.agent===ag?{...b,type:'coffee',idx:i}:null).filter(Boolean),
      ...lunchBreaks.map((b,i)=>b.agent===ag?{...b,type:'lunch',idx:i}:null).filter(Boolean)
    ].sort((a,b)=>a.start-b.start).map(b=>`<div class="tl-bar tl-${b.type}"
        style="left:${pct(b.start)}%;width:${pctw(b.end-b.start)}%"
        data-type="${b.type}" data-idx="${b.idx}" data-start="${b.start}" data-end="${b.end}"
        data-tip="${fmtM(b.start)}–${fmtM(b.end)} · ${b.type==='coffee'?'☕ Coffee break':'🍕 Lunch break'} · ${b.agent}"
      ></div>`).join('');
    const tks = customTasks.filter(t=>t.agent===ag).map(t=>{
      const accent=(ACCENT_COLORS.find(c=>c.key===t.color)||ACCENT_COLORS[0]).val;
      return `<div class="tl-bar tl-custom"
        style="left:${pct(t.start)}%;width:${pctw(t.end-t.start)}%;background:${accent}"
        data-tip="${fmtM(t.start)}–${fmtM(t.end)} · ${t.title} · ${t.agent}"
      ></div>`;
    }).join('');
    const tbs = triageSlots.filter(t=>t.agent===ag).map(t=>{
      const isNow = now>=t.start && now<t.end;
      return `<div class="tl-bar tl-triage${isNow?' tl-triage-now':''}"
          style="left:${pct(t.start)}%;width:${pctw(t.end-t.start)}%"
          data-tip="${fmtM(t.start)}–${fmtM(t.end)} · 🔀 Triage · ${t.agent}"
        ></div>`;
    }).join('');
    return `<div class="tl-row"><div class="tl-name">${ag}</div><div class="tl-track">${bbs}${tks}${tbs}<div class="tl-now" style="left:${np}%"></div></div></div>`;
  }).join('');
  return `<div class="card phone-timeline-panel" style="height:100%;min-height:280px;">
    <div class="card-header"><div class="card-title"><span class="pip pip-blue"></span>Saved timeline ${entry.date}</div></div>
    <div id="tl-wrap">${rows}</div>
    <div class="tl-times"><span>08:00</span><span>09:00</span><span>10:00</span><span>11:00</span><span>12:00</span><span>13:00</span><span>14:00</span><span>15:00</span><span>16:00</span><span>17:00</span><span>18:00</span></div>
    <div class="tl-legend"><span><span class="leg-box" style="background:var(--amber)"></span>Coffee</span><span><span class="leg-box" style="background:var(--green)"></span>Lunch</span><span><span class="leg-box" style="background:var(--teal);opacity:0.75;"></span>Triage</span><span><span class="leg-box" style="background:var(--purple)"></span>Custom</span><span><span class="leg-box" style="background:var(--red)"></span>Now</span></div>
  </div>`;
}

function renderDailyTimelinePreview(){
  const preview = document.getElementById('timeline-history-preview');
  const timelineContainer = document.getElementById('timeline-history-timeline');
  if(!preview||!timelineContainer) return;
  if(!selectedDailyTimelineKey || !DATA.dailyTimelines[selectedDailyTimelineKey]){
    preview.innerHTML = '<div style="font-size:12px;color:var(--muted);">Select a saved timeline to view details.</div>';
    timelineContainer.innerHTML = '';
    return;
  }
  const entry = DATA.dailyTimelines[selectedDailyTimelineKey];
  const t = entry.timeline || {};
  preview.innerHTML = `
    <div style="font-size:13px;font-weight:700;margin-bottom:8px;">${selectedDailyTimelineKey}</div>
    <div style="font-size:11px;color:var(--muted);font-family:var(--mono);margin-bottom:10px;">Saved at ${new Date(entry.savedAt).toLocaleString([], {hour:'2-digit',minute:'2-digit',month:'short',day:'numeric'})}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div style="background:rgba(61,158,255,0.08);padding:10px;border-radius:12px;">Coffee breaks<br><strong>${(t.coffeeBreaks||[]).length}</strong></div>
      <div style="background:rgba(255,179,64,0.08);padding:10px;border-radius:12px;">Lunch breaks<br><strong>${(t.lunchBreaks||[]).length}</strong></div>
      <div style="background:rgba(0,229,160,0.08);padding:10px;border-radius:12px;">Triage slots<br><strong>${(t.triageSlots||[]).length}</strong></div>
      <div style="background:rgba(181,122,255,0.08);padding:10px;border-radius:12px;">Tasks<br><strong>${(t.customTasks||[]).length}</strong></div>
      <div style="background:rgba(255,79,79,0.08);padding:10px;border-radius:12px;grid-column:1 / -1;">On leave<br><strong>${(t.onLeave||[]).length}</strong></div>
    </div>
    <div style="margin-top:12px;font-size:11px;color:var(--muted);font-family:var(--mono);">View date: ${t.shiftManagerViewDate || 'today'}</div>
  `;
  timelineContainer.innerHTML = buildSavedTimelinePanel(entry);
}

function selectDailyTimeline(key){
  if(!DATA.dailyTimelines || !DATA.dailyTimelines[key]) return;
  selectedDailyTimelineKey = key;
  renderDailyTimelineHistory();
}

function openTimelineHistoryModal(){
  renderDailyTimelineHistory();
  document.getElementById('timeline-history-modal').classList.add('open');
}

function closeTimelineHistoryModal(){
  document.getElementById('timeline-history-modal').classList.remove('open');
}

let pendingDeleteKey = null;

function confirmDeleteTimeline(){
  const msg = document.getElementById('delete-timeline-msg');
  if(!pendingDeleteKey || !DATA.dailyTimelines || !DATA.dailyTimelines[pendingDeleteKey]) return;
  msg.textContent = `Delete timeline saved for ${pendingDeleteKey}? This cannot be undone.`;
  document.getElementById('delete-timeline-modal').classList.add('open');
}

async function executeDeleteTimeline(){
  if(!pendingDeleteKey || !DATA.dailyTimelines || !DATA.dailyTimelines[pendingDeleteKey]) return;
  delete DATA.dailyTimelines[pendingDeleteKey];
  if(selectedDailyTimelineKey === pendingDeleteKey){
    selectedDailyTimelineKey = null;
  }
  pendingDeleteKey = null;
  document.getElementById('delete-timeline-modal').classList.remove('open');
  if(!_firestoreAvailable){
    renderDailyTimelineHistory();
    return;
  }
  try {
    await setDoc(DOC_REF, DATA, { merge: true });
    renderDailyTimelineHistory();
  } catch(e){
    console.error('Delete timeline failed:', e);
  }
}

// ─── PANEL CONTENT BUILDERS ───
function buildTimelinePanel(heightPx){
  const now=nowMins(), np=pct(now);
  const coffeeBreaks = Array.isArray(DATA.coffeeBreaks) ? DATA.coffeeBreaks : [];
  const lunchBreaks = Array.isArray(DATA.lunchBreaks) ? DATA.lunchBreaks : [];
  const triageSlots = Array.isArray(DATA.triageSlots) ? DATA.triageSlots : [];
  const customTasks = Array.isArray(DATA.customTasks) ? DATA.customTasks : [];
  const agents=[...new Set([
    ...coffeeBreaks.map(b=>b.agent),
    ...lunchBreaks.map(b=>b.agent),
    ...triageSlots.map(t=>t.agent),
    ...customTasks.map(t=>t.agent)
  ])];
  const rows=agents.map(ag=>{
    const bbs=[
      ...coffeeBreaks.map((b,i)=>b.agent===ag?{...b,type:'coffee',idx:i}:null).filter(Boolean),
      ...lunchBreaks.map((b,i)=>b.agent===ag?{...b,type:'lunch',idx:i}:null).filter(Boolean)
    ].sort((a,b)=>a.start-b.start).map(b=>`<div class="tl-bar tl-${b.type}"
        style="left:${pct(b.start)}%;width:${pctw(b.end-b.start)}%"
        data-type="${b.type}" data-idx="${b.idx}" data-start="${b.start}" data-end="${b.end}"
        data-tip="${fmtM(b.start)}–${fmtM(b.end)} · ${b.type==='coffee'?'☕ Coffee break':'🍕 Lunch break'} · ${b.agent}"
      ></div>`).join('');
    const tks = customTasks.filter(t=>t.agent===ag).map(t=>{
      const accent=(ACCENT_COLORS.find(c=>c.key===t.color)||ACCENT_COLORS[0]).val;
      return `<div class="tl-bar tl-custom"
        style="left:${pct(t.start)}%;width:${pctw(t.end-t.start)}%;background:${accent}"
        data-tip="${fmtM(t.start)}–${fmtM(t.end)} · ${t.title} · ${t.agent}"
      ></div>`;
    }).join('');
    const tbs=triageSlots.filter(t=>t.agent===ag).map(t=>{
      const isNow=now>=t.start&&now<t.end;
      return `<div class="tl-bar tl-triage${isNow?' tl-triage-now':''}"
          style="left:${pct(t.start)}%;width:${pctw(t.end-t.start)}%"
          data-tip="${fmtM(t.start)}–${fmtM(t.end)} · 🔀 Triage · ${t.agent}"
        ></div>`;
    }).join('');
    return `<div class="tl-row"><div class="tl-name">${ag}</div><div class="tl-track">${bbs}${tks}${tbs}<div class="tl-now" style="left:${np}%"></div></div></div>`;
  }).join('');
  const hStyle=heightPx?`height:${heightPx}px;overflow:hidden;`:'';
  return `<div class="card phone-timeline-panel" style="height:100%;${hStyle}">
    <div class="card-header"><div class="card-title"><span class="pip pip-blue"></span>Break timeline · 08:00 – 18:00</div></div>
    <div id="tl-wrap">${rows}</div>
    <div class="tl-times"><span>08:00</span><span>09:00</span><span>10:00</span><span>11:00</span><span>12:00</span><span>13:00</span><span>14:00</span><span>15:00</span><span>16:00</span><span>17:00</span><span>18:00</span></div>
    <div class="tl-legend"><span><span class="leg-box" style="background:var(--amber)"></span>Coffee</span><span><span class="leg-box" style="background:var(--green)"></span>Lunch</span><span><span class="leg-box" style="background:var(--teal);opacity:0.75;"></span>Triage</span><span><span class="leg-box" style="background:var(--purple)"></span>Custom</span><span><span class="leg-box" style="background:var(--red)"></span>Now</span></div>
  </div>`;
}

function buildLeavePanelContent(heightPx){
  const hStyle=heightPx?`height:${heightPx}px;overflow:hidden;`:'';
  const id='leave-inner-'+Date.now();

  if(!DATA.onLeave||!DATA.onLeave.length){
    return `<div class="card" style="height:100%;display:flex;flex-direction:column;${hStyle}">
      <div class="card-header" style="margin-bottom:8px;"><div class="card-title"><span class="pip pip-purple"></span>On leave</div></div>
      <div style="font-size:11px;color:var(--muted);font-family:var(--mono);">—</div>
    </div>`;
  }

  const inner = DATA.onLeave.map(l=>`
    <div class="leave-entry">
      <div class="avatar" style="${avStyle(l.agent)};width:28px;height:28px;font-size:10px;flex-shrink:0;">${initials(l.agent)}</div>
      <div>
        <div class="leave-entry-name">${shortName(l.agent)}</div>
        ${l.note?`<div class="leave-entry-note">${l.note}</div>`:''}
      </div>
    </div>`).join('');

  return `<div class="card" style="height:100%;display:flex;flex-direction:column;${hStyle}">
    <div class="card-header" style="margin-bottom:8px;"><div class="card-title"><span class="pip pip-purple"></span>On leave</div></div>
    <div id="${id}" style="display:flex;flex-direction:column;gap:6px;flex:1;overflow:hidden;">${inner}</div>
  </div>
  <script>
  (function(){
    function fit(){
      const wrap = document.getElementById('${id}');
      if(!wrap) return;
      wrap.style.fontSize='';
      wrap.querySelectorAll('.leave-entry-name').forEach(el=>el.style.fontSize='');
      wrap.querySelectorAll('.leave-entry-note').forEach(el=>el.style.fontSize='');
      wrap.querySelectorAll('.avatar').forEach(el=>{el.style.width='28px';el.style.height='28px';el.style.fontSize='';});
      wrap.style.gap='6px';
      if(wrap.scrollHeight <= wrap.clientHeight) return;
      let lo=0.5, hi=1.0, best=0.5;
      for(let i=0;i<12;i++){
        const mid=(lo+hi)/2;
        applyScale(wrap,mid);
        if(wrap.scrollHeight <= wrap.clientHeight){ best=mid; lo=mid; }
        else hi=mid;
      }
      applyScale(wrap,best);
    }
    function applyScale(wrap,s){
      const nameSize = Math.max(10, Math.round(15*s));
      const noteSize = Math.max(8,  Math.round(11*s));
      const avSize   = Math.max(14, Math.round(28*s));
      const avFont   = Math.max(7,  Math.round(avSize*0.38));
      const gap      = Math.max(2,  Math.round(8*s));
      wrap.style.gap = gap+'px';
      wrap.querySelectorAll('.leave-entry-name').forEach(el=>el.style.fontSize=nameSize+'px');
      wrap.querySelectorAll('.leave-entry-note').forEach(el=>el.style.fontSize=noteSize+'px');
      wrap.querySelectorAll('.avatar').forEach(el=>{
        el.style.width=avSize+'px';el.style.height=avSize+'px';el.style.fontSize=avFont+'px';
      });
    }
    requestAnimationFrame(()=>requestAnimationFrame(fit));
  })();
  <\/script>`;
}

function buildTriageStripContent(heightPx){
  const now=nowMins();
  const slots=DATA.triageSlots.map(t=>{
    const isNow=now>=t.start&&now<t.end, isPast=now>=t.end;
    const shortTime=t.time.replace(/(\d+):00/g,'$1').replace('–','-');
    return `<div class="ts-slot ${isNow?'ts-now':isPast?'ts-past':''}">
      ${isNow?'<div class="ts-now-dot"></div>':''}
      <div class="ts-slot-time">${shortTime}</div>
      <div class="ts-slot-name" title="${t.agent}">${shortName(t.agent)}</div>
    </div>`;
  }).join('');
  const hStyle=heightPx?`height:${heightPx}px;overflow:hidden;`:'';
  return `<div class="card" style="height:100%;${hStyle}">
    <div class="card-header" style="margin-bottom:8px;"><div class="card-title"><span class="pip pip-teal"></span>Triage schedule</div></div>
    <div class="triage-strip-wrap">${slots}</div>
  </div>`;
}

function buildPatchingViewerContent(heightPx){
  const hStyle=heightPx?`height:${heightPx}px;overflow:hidden;`:'';
  return `<div class="card" style="height:100%;${hStyle}">
    <div class="card-header"><div class="card-title"><span class="pip pip-purple"></span>Patching agent</div></div>
    <div class="patching-section">
      <div class="patching-week">${getCurrentPatchWeek()}</div>
      <span style="font-size:18px;font-weight:800;color:var(--purple);">${DATA.patchingAgent||'—'}</span>
    </div>
  </div>`;
}

function getTopPerformersDate(){
  const el=document.getElementById('tp-date');
  if(el && el.value) return el.value;
  const d=new Date(); d.setDate(d.getDate()-1);
  return d.toISOString().slice(0,10);
}

function formatTopPerformersLabel(dateKey){
  const today=new Date().toISOString().slice(0,10);
  const d=new Date(); d.setDate(d.getDate()-1);
  const yesterday=d.toISOString().slice(0,10);
  if(dateKey===today) return 'today';
  if(dateKey===yesterday) return 'yesterday';
  return new Date(dateKey+'T12:00:00').toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'});
}

function buildTopPerformersContent(heightPx){
  const dateKey = getTopPerformersDate();
  const tp = DATA.topPerformers || {};
  const entry = tp[dateKey];
  const hStyle = heightPx ? `height:${heightPx}px;overflow:hidden;` : '';
  const dateLabel = formatTopPerformersLabel(dateKey);

  const medals = ['🥇','🥈','🥉'];
  const colors = ['var(--amber)','#aab4c4','#cd7f32'];
  const labelColors = ['rgba(255,179,64,0.15)','rgba(170,180,196,0.15)','rgba(205,127,50,0.15)'];

  let inner;
  const hasTopRanks = entry && (entry.first || entry.second || entry.third);
  const hasTopCategories = entry && (entry.chat || entry.phone || entry.tickets);
  if(!entry || (!hasTopRanks && !hasTopCategories)){
    inner = `<div style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;opacity:0.4;">
      <div style="font-size:28px;">🏆</div>
      <div style="font-size:11px;color:var(--muted);font-family:var(--mono);">Not set for ${dateLabel}</div>
    </div>`;
  } else if(hasTopRanks) {
    const places = [
      {key:'first', label:'1st'},
      {key:'second',label:'2nd'},
      {key:'third', label:'3rd'},
    ];
    inner = `<div style="display:flex;flex-direction:column;gap:8px;flex:1;">
      ${places.map((p,i)=> entry[p.key] ? `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:${labelColors[i]};border:1px solid ${colors[i]}33;">
          <span style="font-size:20px;flex-shrink:0;">${medals[i]}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-size:14px;font-weight:700;color:${colors[i]};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${entry[p.key]}</div>
            <div style="font-size:10px;color:var(--muted);font-family:var(--mono);">${p.label} place · ${new Date().toLocaleDateString([],{month:'short',day:'numeric'})}</div>
          </div>
          <div class="avatar" style="${avStyle(entry[p.key])};width:28px;height:28px;font-size:10px;flex-shrink:0;">${initials(entry[p.key])}</div>
        </div>` : '').join('')}
      ${entry.note ? `<div style="font-size:11px;color:var(--muted);font-family:var(--mono);padding:4px 2px;border-top:1px solid var(--border);margin-top:2px;">${entry.note}</div>` : ''}
    </div>`;
  } else {
    const categories = [
      {key:'chat', emoji:'💬', color: colors[0], labelColor: labelColors[0], label:'Chat top performer'},
      {key:'phone', emoji:'📞', color: colors[1], labelColor: labelColors[1], label:'Phone top performer'},
      {key:'tickets', emoji:'🎫', color: colors[2], labelColor: labelColors[2], label:'Tickets closed'},
    ];
    inner = `<div style="display:flex;flex-direction:column;gap:8px;flex:1;">
      ${categories.map(cat => entry[cat.key] ? `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:${cat.labelColor};border:1px solid ${cat.color}33;">
          <span style="font-size:20px;flex-shrink:0;">${cat.emoji}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-size:14px;font-weight:700;color:${cat.color};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${entry[cat.key]}</div>
            <div style="font-size:10px;color:var(--muted);font-family:var(--mono);">${cat.label} · ${new Date().toLocaleDateString([],{month:'short',day:'numeric'})}</div>
          </div>
          <div class="avatar" style="${avStyle(entry[cat.key])};width:28px;height:28px;font-size:10px;flex-shrink:0;">${initials(entry[cat.key])}</div>
        </div>` : '').join('')}
      ${entry.note ? `<div style="font-size:11px;color:var(--muted);font-family:var(--mono);padding:4px 2px;border-top:1px solid var(--border);margin-top:2px;">${entry.note}</div>` : ''}
    </div>`;
  }

  const titleLabel = formatTopPerformersLabel(dateKey);
  return `<div class="card" style="height:100%;display:flex;flex-direction:column;${hStyle}">
    <div class="card-header" style="margin-bottom:8px;">
      <div class="card-title"><span class="pip" style="background:var(--amber);"></span>Top performers · ${titleLabel}</div>
    </div>
    ${inner}
  </div>`;
}

function shiftIdToLabel(id){
  const shift = SHIFTS.weekday.concat(SHIFTS.weekend).find(s=>s.id===id);
  if(shift) return shift.label;
  const tm = id.match(/^shift-(\d{2,3})-(\d{2,4})$/);
  if(tm){
    const start = parseInt(tm[1],10);
    const end = parseInt(tm[2],10);
    return fmtM(start)+'–'+fmtM(end % 1440);
  }
  return id.replace(/_/g,' ').replace(/-/g,' ');
}

function findShiftIdByTimes(start,end){
  const match = SHIFTS.weekday.concat(SHIFTS.weekend).find(s=>s.start===start && s.end===end);
  if(match) return match.id;
  return `shift-${String(start).padStart(3,'0')}-${String(end).padStart(3,'0')}`;
}
function formatDateKey(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

function buildShiftManagerContent(heightPx){
  const hStyle = heightPx ? `height:${heightPx}px;overflow:auto;` : '';
  const today = new Date();
  const viewDate = shiftManagerViewDate ? new Date(shiftManagerViewDate) : today;
  const dayIndex = (viewDate.getDay() + 6) % 7;
  const viewDateStr = formatDateKey(viewDate);
  const viewDateLabel = viewDate.toLocaleDateString([],{weekday:'long',month:'short',day:'numeric'});
  const isToday = formatDateKey(today) === viewDateStr;
  
  const shifts = DATA.shiftAssignments || {};
  const knownShiftIds = [...SHIFTS.weekday.map(s=>s.id), ...SHIFTS.weekend.map(s=>s.id)];
  const viewDayShiftIds = Object.keys(shifts).filter(k=>k.startsWith(viewDateStr + ':')).map(k=>k.split(':')[1]);
  const viewShiftIds = Array.from(new Set([
    ...knownShiftIds.filter(id => isShiftOnDay(dayIndex, id)),
    ...viewDayShiftIds
  ]));
  const parseShiftStart = id => {
    const tm = id.match(/^shift-(\d{2,3})-(\d{2,4})$/);
    return tm ? parseInt(tm[1],10) : 0;
  };
  viewShiftIds.sort((a,b)=>parseShiftStart(a) - parseShiftStart(b));
  const isAdmin = isAdminNow();
  // group out-of-hours single-person shifts into separate cards
  const singleShiftIds = ['shift-02-08','shift-02-10','shift-12-20','shift-18-02'];
  const groupedAssigned = [];
  singleShiftIds.forEach(id => {
    if(!viewShiftIds.includes(id)) return;
    const key = `${viewDateStr}:${id}`;
    const assigned = parseShiftAgents(shifts[key]).filter(a=>agentInSchedule(a));
    if(assigned && assigned.length) groupedAssigned.push({id,assigned});
  });
  // remove grouped ids from the normal grid
  const remainingShiftIds = viewShiftIds.filter(id=>!singleShiftIds.includes(id));

  let rows = `<div class="shift-manager-row">
      <div class="shift-manager-nav">
        <button type="button" class="shift-nav-btn" data-action="shift-prev-day">◀</button>
        <div>
          <div class="shift-manager-title">${isToday ? 'Today' : 'View'} · ${viewDateLabel}</div>
          <div class="shift-manager-sub">Use ◀ / ▶ to browse days, or click Today.</div>
        </div>
        <button type="button" class="shift-nav-btn" data-action="shift-next-day">▶</button>
        <button type="button" class="shift-nav-btn" data-action="shift-today">Today</button>
      </div>
      ${isAdmin ? `<button type="button" class="shift-nav-btn" data-action="open-shift-import" style="background:var(--blue2);border-color:var(--blue);color:var(--blue);font-size:12px;padding:8px 14px;">📋 Import shifts</button>` : ''}
    </div>`;

  const specialLeftShift = 'shift-08-16';
  const specialRightShift = 'shift-10-18';
  const leftAssigned = remainingShiftIds.includes(specialLeftShift)
    ? parseShiftAgents(shifts[`${viewDateStr}:${specialLeftShift}`]).filter(a=>agentInSchedule(a))
    : [];
  const rightAssigned = remainingShiftIds.includes(specialRightShift)
    ? parseShiftAgents(shifts[`${viewDateStr}:${specialRightShift}`]).filter(a=>agentInSchedule(a))
    : [];
  const otherShiftIds = remainingShiftIds.filter(id => id !== specialLeftShift && id !== specialRightShift);

  const renderCard = (shiftId, assigned, opts={}) => {
    const grouped = opts.grouped || false;
    const label = opts.label || shiftIdToLabel(shiftId);
    const meta = opts.meta || (grouped ? 'Single-person shift' : (knownShiftIds.includes(shiftId) ? 'Scheduled shift' : 'Custom assignment'));
    const extraSelect = isAdmin ? `<div style="margin-top:16px;"><select data-action="shift-assign" data-date="${viewDateStr}" data-shift="${shiftId}" multiple size="4" style="width:100%;min-height:90px;padding:10px;border-radius:14px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px;line-height:1.4;">${DATA.agents.filter(agent=>agentInSchedule(agent)).map(agent => `<option value="${agent}" ${assigned.includes(agent) ? 'selected' : ''}>${agent}</option>`).join('')}</select></div>` : '';
    return `<div class="shift-manager-card${grouped ? ' shift-manager-single-card' : ''}">
          <div class="shift-manager-card-header">
            <div>
              <div class="shift-manager-card-title">${label}</div>
              <div class="shift-manager-card-meta">${meta}</div>
            </div>
            <div class="shift-manager-count">${assigned.length} assigned</div>
          </div>
          <div class="shift-manager-assignments">
            ${assigned.map(agent => `<span class="shift-manager-agent-pill">${getScheduleDisplayName(agent, assigned)}</span>`).join('')}
          </div>
          ${extraSelect}
        </div>`;
  };

  const renderSinglePersonBlock = () => {
    if(groupedAssigned.length === 0) return '';
    return `<div class="shift-manager-card shift-manager-single-card shift-manager-half">
          <div class="shift-manager-card-header">
            <div>
              <div class="shift-manager-card-title">Single-person shifts</div>
              <div class="shift-manager-card-meta">Out-of-hours coverage</div>
            </div>
            <div class="shift-manager-count">${groupedAssigned.length} shift${groupedAssigned.length===1?'':'s'}</div>
          </div>
          <div class="shift-manager-assignments shift-manager-single-list">
            ${groupedAssigned.map(item => {
              const agent = item.assigned[0];
              return `<div class="shift-manager-single-row"><span>${getScheduleDisplayName(agent, item.assigned)}</span><span class="shift-manager-single-time">${shiftIdToLabel(item.id)}</span></div>`;
            }).join('')}
          </div>
        </div>`;
  };

  const renderOtherCards = () => {
    if(otherShiftIds.length === 0) return '';
    let html = `<div class="shift-manager-grid shift-manager-other-grid">`;
    otherShiftIds.forEach(shiftId => {
      const assigned = parseShiftAgents(shifts[`${viewDateStr}:${shiftId}`]).filter(a=>agentInSchedule(a));
      if(assigned.length === 0) return;
      html += renderCard(shiftId, assigned, { grouped: false });
    });
    html += `</div>`;
    return html;
  };

  if(leftAssigned.length && rightAssigned.length && groupedAssigned.length){
    rows += `<div class="shift-manager-grid shift-manager-special-grid">
      <div class="shift-manager-left-column">
        ${renderCard(specialLeftShift, leftAssigned, { grouped: false })}
        ${renderSinglePersonBlock()}
      </div>
      <div class="shift-manager-right-column">
        ${renderCard(specialRightShift, rightAssigned, { grouped: false })}
      </div>
    </div>`;
    rows += renderOtherCards();
  } else {
    const cards = [];
    remainingShiftIds.forEach(shiftId => {
      const assigned = parseShiftAgents(shifts[`${viewDateStr}:${shiftId}`]).filter(a=>agentInSchedule(a));
      if(assigned.length === 0) return;
      cards.push({ id: shiftId, assigned, grouped: false });
    });
    groupedAssigned.forEach(item => {
      cards.push({ id: item.id, assigned: item.assigned, grouped: true });
    });

    if(cards.length === 0){
      rows += `<div class="shift-manager-empty">No shifts found for ${viewDateLabel}.</div>`;
    } else {
      rows += `<div class="shift-manager-grid">`;
      cards.forEach(card => {
        rows += renderCard(card.id, card.assigned, { grouped: card.grouped });
      });
      rows += `</div>`;
    }
  }

  return `<div class="card" style="height:100%;display:flex;flex-direction:column;${hStyle}">
    <div class="card-header" style="margin-bottom:12px;">
      <div class="card-title"><span class="pip" style="background:var(--teal);"></span>Shift Manager</div>
    </div>
    <div style="flex:1;overflow:auto;">${rows}</div>
  </div>`;
}


function buildCustomPanelContent(panelId, heightPx){
  const cp=(DATA.customPanels||{})[panelId]||{title:'Custom Panel',body:'',color:'blue'};
  const accent=ACCENT_COLORS.find(c=>c.key===cp.color)||ACCENT_COLORS[0];
  const hStyle=heightPx?`height:${heightPx}px;overflow:hidden;`:'';
  return `<div class="card" style="height:100%;border-top:2px solid ${accent.val};${hStyle}">
    <div class="card-header" style="margin-bottom:8px;">
      <div class="card-title" style="color:${accent.val};">📝 <span class="custom-panel-title-text">${cp.title||'Custom Panel'}</span></div>
    </div>
    <div class="custom-panel-body">${(cp.body||'').replace(/</g,'&lt;')}</div>
  </div>`;
}

function buildPanelContent(panelId, heightPx){
  if(panelId.startsWith('custom:')) return buildCustomPanelContent(panelId, heightPx);
  switch(panelId){
    case 'timeline':       return buildTimelinePanel(heightPx);
    case 'leave-panel':    return buildLeavePanelContent(heightPx);
    case 'triage-strip':   return buildTriageStripContent(heightPx);
    case 'patching-v':     return buildPatchingViewerContent(heightPx);
    case 'top-performers': return buildTopPerformersContent(heightPx);
    case 'shift-manager':  return buildShiftManagerContent(heightPx);
    default: return `<div class="card"><div class="card-title">${panelId}</div></div>`;
  }
}

// ─── RENDER VIEWER GRID ───
function renderViewerGrid(){
  const grid=document.getElementById('viewer-grid');
  const layout=getViewerLayout();
  let html='';
  layout.forEach((row,rowIdx)=>{
    row.panels.forEach(panel=>{
      if(!panel.visible) return;
      const cs=Math.max(1,Math.min(12,panel.span||6));
      const start=Math.max(1,Math.min(13-cs,panel.start||1));
      const heightPx=panel.height||null;
      html+=`<div class="viewer-panel" style="grid-row:${rowIdx+1};grid-column:${start} / span ${cs};">${buildPanelContent(panel.id, heightPx)}</div>`;
    });
  });
  grid.innerHTML=html;
}

// ─── MAIN RENDER ───
function render(){
  maybeClearComfortBreaksAtEOD();
  renderBreaks('coffee-list',DATA.coffeeBreaks,'coffee');
  renderBreaks('lunch-list',DATA.lunchBreaks,'lunch');
  renderLeaveList();
  renderTriage();
  renderPatching();
  renderRules();
  renderAgents();
  renderCustomTasks();
  renderBreakRequests();
  renderMetrics();
  renderPhoneTimeline();
  renderRequestPip();
  renderViewerGrid();
  renderDailyTimelineHistory();
  renderLastUpdated();
  renderTopPerformers();
  populateAgentSelect();
  renderClearComfortBreaksToggle();
  restoreCardCollapses();
}

function renderBreaks(containerId,breaks,type){
  const el=document.getElementById(containerId); if(!el) return;
  const now=nowMins();
  if(!breaks.length){ el.innerHTML='<div class="empty">No breaks scheduled</div>'; return; }
  el.innerHTML=breaks.map((b,i)=>{
    const active=now>=b.start&&now<b.end;
    const badgeClass=active?'badge-now':(type==='coffee'?'badge-coffee':'badge-lunch');
    const badgeLabel=active?'● NOW':fmtM(b.start)+'–'+fmtM(b.end);
    const admin=isAdminNow();
    return `<div class="break-row" data-type="${type}" data-idx="${i}">
      <div class="avatar" style="${avStyle(b.agent)}">${initials(b.agent)}</div>
      <span class="break-name-display break-name">${b.agent}${b.agentAdded?'<span style="font-size:9px;color:var(--muted);margin-left:4px;">self</span>':''}</span>
      <input class="edit-field name-field" value="${b.agent}" data-action="break-name" data-type="${type}" data-idx="${i}" />
      <input class="edit-field" type="time" value="${fmtM(b.start)}" data-action="break-start" data-type="${type}" data-idx="${i}" />
      <input class="edit-field" type="time" value="${fmtM(b.end)}" data-action="break-end" data-type="${type}" data-idx="${i}" />
      <span class="badge ${badgeClass}">${badgeLabel}</span>
      ${admin?`<button class="del-btn" data-action="break-delete" data-type="${type}" data-idx="${i}" title="Remove">✕</button>`:(b.agentAdded?`<span class="agent-lock" title="Agent-added">🔒</span>`:'')}
    </div>`;
  }).join('');
}

function renderTriage(){
  const el=document.getElementById('triage-grid'); if(!el) return;
  const now=nowMins();
  el.innerHTML=DATA.triageSlots.map((t,i)=>{
    const active=now>=t.start&&now<t.end;
    return `<div class="triage-slot ${active?'now':''}">
      <div class="triage-time">${t.time}</div>
      <div class="triage-agent triage-agent-display">${t.agent}</div>
      <input class="triage-input triage-edit" value="${t.agent}" data-action="triage-agent" data-idx="${i}" />
    </div>`;
  }).join('');
}

function renderPatching(){
  const pd=document.getElementById('patch-display'), pi=document.getElementById('patch-input'), pw=document.getElementById('patch-week-badge');
  if(pd) pd.textContent=DATA.patchingAgent||'—';
  if(pi) pi.value=DATA.patchingAgent||'';
  if(pw) pw.textContent=getCurrentPatchWeek();
  const ps=document.getElementById('m-patch-week-sub'); if(ps) ps.textContent=getCurrentPatchWeek();
}

function renderRules(){
  const el=document.getElementById('rules-list'); if(!el) return;
  el.innerHTML=DATA.rules.map((r,i)=>`<div class="rule-item"><span class="rule-num">0${i+1}</span><span class="rule-text">${r}</span><input class="rule-input" value="${r}" data-action="rule-edit" data-idx="${i}" /><button class="del-btn" data-action="rule-delete" data-idx="${i}" title="Remove">✕</button></div>`).join('');
}

function renderAgents(){
  const el=document.getElementById('agents-grid'); if(!el) return;
  const passwords=DATA.agentPasswords||{};
  el.innerHTML=DATA.agents.map((a,i)=>{
    const pw=passwords[a]||'', visible=agentInBreaks(a), visibleSchedule=agentInSchedule(a);
    return `<div class="agent-item">
      <div class="avatar" style="${avStyle(a)};width:24px;height:24px;font-size:9px;flex-shrink:0;">${initials(a)}</div>
      <span class="agent-item-name">${a}</span>
      <input class="agent-name-input" value="${a}" data-action="agent-name" data-idx="${i}" data-oldname="${a}" />
      <div class="agent-pw-wrap">
        <input class="agent-pw-input" type="password" value="${pw}" placeholder="set password" data-action="agent-pw" data-agent="${a}" data-idx="${i}" title="Break booking password for ${a}" />
        <button class="pw-eye" data-action="agent-pw-toggle" data-idx="${i}" title="Show/hide">👁</button>
      </div>
      <div class="break-vis-wrap" title="Show in break dropdowns">
        <label class="break-vis-toggle"><input type="checkbox" ${visible?'checked':''} data-action="agent-break-vis" data-agent="${a}" data-idx="${i}" /><span class="break-vis-slider"></span></label>
        <span class="break-vis-label">breaks</span>
      </div>
      <div class="break-vis-wrap" title="Show in shift schedule">
        <label class="break-vis-toggle"><input type="checkbox" ${visibleSchedule?'checked':''} data-action="agent-schedule-vis" data-agent="${a}" data-idx="${i}" /><span class="break-vis-slider"></span></label>
        <span class="break-vis-label">schedule</span>
      </div>
      <button class="del-btn" data-action="agent-delete" data-idx="${i}" title="Remove">✕</button>
    </div>`;
  }).join('');
}

function renderCustomTasks(){
  const el=document.getElementById('custom-tasks-list'); if(!el) return;
  if(!DATA.customTasks||!DATA.customTasks.length){ el.innerHTML='<div class="empty">No custom tasks</div>'; return; }
  el.innerHTML = DATA.customTasks.map((t,i)=>{
    const now=nowMins(); const active=now>=t.start&&now<t.end;
    const badgeClass=active?'badge-now':'badge-coffee';
    const times=fmtM(t.start)+'–'+fmtM(t.end);
    return `<div class="break-row" data-idx="${i}">
      <div class="avatar" style="${avStyle(t.agent)}">${initials(t.agent)}</div>
      <div style="flex:1;">
        <div style="font-weight:700;">${t.title}</div>
        <div style="font-size:11px;color:var(--muted);font-family:var(--mono);">${t.agent} · ${times}</div>
      </div>
      <span class="badge ${badgeClass}">${times}</span>
      <button class="del-btn" data-action="task-edit" data-idx="${i}" title="Edit">✎</button>
      <button class="del-btn" data-action="task-delete" data-idx="${i}" title="Remove">✕</button>
    </div>`;
  }).join('');
}

function renderBreakRequests(){
  const el=document.getElementById('break-requests-list'); if(!el) return;
  if(!DATA.editRequests||!DATA.editRequests.length){ el.innerHTML='<div class="empty">No pending requests</div>'; return; }
  el.innerHTML = DATA.editRequests.map((req,i)=>{
    const now=nowMins(); const active=now>=req.originalStart&&now<req.originalEnd;
    const badgeClass=active?'badge-now':'badge-coffee';
    const originalTimes=fmtM(req.originalStart)+'–'+fmtM(req.originalEnd);
    const requestedTimes=fmtM(req.requestedStart)+'–'+fmtM(req.requestedEnd);
    return `<div class="break-row" data-id="${req.id}">
      <div class="avatar" style="${avStyle(req.agent)}">${initials(req.agent)}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;">${req.agent} · ${req.type.charAt(0).toUpperCase()+req.type.slice(1)} request</div>
        <div style="font-size:11px;color:var(--muted);font-family:var(--mono);">${originalTimes} → ${requestedTimes}</div>
        <div style="font-size:11px;color:var(--muted);font-family:var(--mono);margin-top:4px;white-space:normal;line-height:1.4;">${req.reason.replace(/</g,'&lt;')}</div>
      </div>
      <span class="badge ${badgeClass}">${requestedTimes}</span>
      <button class="del-btn" data-action="request-approve" data-id="${req.id}" title="Approve">✓</button>
      <button class="del-btn" data-action="request-decline" data-id="${req.id}" title="Decline">✕</button>
    </div>`;
  }).join('');
}

function renderRequestPip(){
  const el=document.getElementById('request-pip'); if(!el) return;
  const count=(DATA.editRequests||[]).length;
  if(count>0){ el.style.display='inline-flex'; el.textContent=count; }
  else { el.style.display='none'; }
}

function renderLeaveList(){
  const el=document.getElementById('leave-list'); if(!el) return;
  if(!DATA.onLeave||!DATA.onLeave.length){ el.innerHTML='<div class="empty">No one on leave</div>'; return; }
  el.innerHTML=DATA.onLeave.map((l,i)=>`<div class="break-row"><div class="avatar" style="${avStyle(l.agent)}">${initials(l.agent)}</div><div style="flex:1;"><div class="break-name">${l.agent}</div>${l.note?`<div style="font-size:10px;color:var(--muted);font-family:var(--mono);">${l.note}</div>`:''}</div><button class="del-btn" data-action="leave-delete" data-idx="${i}" title="Remove" style="display:block;">✕</button></div>`).join('');
}

function renderMetrics(){
  const now=nowMins();
  const afk=[...new Set([...DATA.coffeeBreaks,...DATA.lunchBreaks].filter(b=>now>=b.start&&now<b.end).map(b=>b.agent))];
  
  // Calculate agents currently on shift
  const isTimeInShift=(time,shift)=>{
    if(shift.end>1440) return time>=shift.start||time<(shift.end-1440);
    return time>=shift.start&&time<shift.end;
  };
  const todayKey=formatDateKey(new Date());
  const yesterday=new Date(); yesterday.setDate(yesterday.getDate()-1);
  const yesterdayKey=formatDateKey(yesterday);
  const shiftEntries=Object.entries(DATA.shiftAssignments||{}).filter(([key])=>key.startsWith(todayKey+':')||key.startsWith(yesterdayKey+':'));
  const usedShiftIds=new Set();
  const onShiftAgents=new Set();
  shiftEntries.forEach(([key,value])=>{
    const parts=key.split(':');
    if(parts.length<2) return;
    const shiftId=parts[1];
    if(usedShiftIds.has(shiftId)) return;
    const shift=SHIFTS.weekday.concat(SHIFTS.weekend).find(s=>s.id===shiftId);
    if(!shift) return;
    if(!isTimeInShift(now,shift)) return;
    const assigned=parseShiftAgents(value).filter(a=>agentInSchedule(a));
    if(!assigned.length) return;
    usedShiftIds.add(shiftId);
    assigned.forEach(agent=>onShiftAgents.add(agent));
  });
  
  // Calculate available agents: on shift - currently on break
  const availableAgents=new Set([...onShiftAgents].filter(agent=>!afk.includes(agent)));
  
  const triN=DATA.triageSlots.find(t=>now>=t.start&&now<t.end);
  document.getElementById('m-total').textContent=availableAgents.size;
  document.getElementById('m-afk').textContent=afk.length;
  document.getElementById('m-afk-sub').textContent=afk.length?afk.slice(0,5).map(n=>n.split(' ')[0]).join(', '):'none right now';
  document.getElementById('m-triage').textContent=triN?triN.agent:'—';
  document.getElementById('m-patch-val').textContent=DATA.patchingAgent||'—';
  const ps=document.getElementById('m-patch-week-sub'); if(ps) ps.textContent=getCurrentPatchWeek();
}

function renderPhoneTimeline(){
  const el=document.getElementById('phone-current-timeline'); if(!el) return;
  const now = nowMins();
  const fmtNow = fmtM(Math.round(now));
  const activeCoffee = (Array.isArray(DATA.coffeeBreaks)?DATA.coffeeBreaks:[]).filter(b=>now>=b.start&&now<b.end);
  const activeLunch  = (Array.isArray(DATA.lunchBreaks)?DATA.lunchBreaks:[]).filter(b=>now>=b.start&&now<b.end);
  const activeTriage = (Array.isArray(DATA.triageSlots)?DATA.triageSlots:[]).filter(t=>now>=t.start&&now<t.end);
  const activeCustom = (Array.isArray(DATA.customTasks)?DATA.customTasks:[]).filter(t=>now>=t.start&&now<t.end);

  const isTimeInShift = (time, shift) => {
    if(shift.end > 1440) return time >= shift.start || time < (shift.end - 1440);
    return time >= shift.start && time < shift.end;
  };

  const todayKey = formatDateKey(new Date());
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterday);
  const shiftEntries = Object.entries(DATA.shiftAssignments || {}).filter(([key]) => key.startsWith(todayKey + ':') || key.startsWith(yesterdayKey + ':'));
  const usedShiftIds = new Set();
  const activeShiftBlocks = shiftEntries.map(([key,value]) => {
    const parts = key.split(':');
    if(parts.length < 2) return null;
    const shiftId = parts[1];
    if(usedShiftIds.has(shiftId)) return null;
    const shift = SHIFTS.weekday.concat(SHIFTS.weekend).find(s=>s.id===shiftId);
    if(!shift) return null;
    if(!isTimeInShift(now, shift)) return null;
    const assigned = parseShiftAgents(value).filter(a=>agentInSchedule(a));
    if(!assigned.length) return null;
    usedShiftIds.add(shiftId);
    return { id: shiftId, assigned, label: getShiftLabel(shiftId), start: shift.start, end: shift.end };
  }).filter(Boolean).sort((a,b)=>a.start - b.start);

  const breakAgentKeys = new Set([
    ...activeCoffee.map(item => normalizeAgentKey(item.agent)),
    ...activeLunch.map(item => normalizeAgentKey(item.agent))
  ].filter(Boolean));
  const shiftAgentKeys = new Set(activeShiftBlocks.flatMap(block => block.assigned.map(a => normalizeAgentKey(a))));
  const shiftBreakKeys = new Set([...breakAgentKeys].filter(key => shiftAgentKeys.has(key)));
  const shiftProgressMap = {};
  activeShiftBlocks.forEach(block => {
    const duration = block.end > block.start ? block.end - block.start : block.end + 1440 - block.start;
    const elapsed = block.end > block.start
      ? Math.max(0, Math.min(duration, now - block.start))
      : now >= block.start ? now - block.start : now + 1440 - block.start;
    const progress = duration > 0 ? Math.max(0, Math.min(1, elapsed / duration)) : 0;
    block.assigned.forEach(agent => {
      shiftProgressMap[normalizeAgentKey(agent)] = progress;
    });
  });

  const breakProgressMap = {};
  [...activeCoffee, ...activeLunch].forEach(item => {
    const duration = item.end > item.start ? item.end - item.start : item.end + 1440 - item.start;
    const elapsed = item.end > item.start
      ? Math.max(0, Math.min(duration, now - item.start))
      : now >= item.start ? now - item.start : now + 1440 - item.start;
    const progress = duration > 0 ? Math.max(0, Math.min(1, elapsed / duration)) : 0;
    breakProgressMap[normalizeAgentKey(item.agent)] = progress;
  });

  const renderAgentPills = (names, sectionKey) => {
    if(!names || !names.length) return '';
    const expanded = sectionKey && PHONE_TIMELINE_EXPANDED_SECTIONS[sectionKey];
    const shownNames = expanded ? names : names.slice(0, 4);
    const extraCount = names.length - shownNames.length;
    const pills = shownNames.map(entry => {
      const label = typeof entry === 'string' ? entry : entry.label;
      const key = typeof entry === 'string' ? normalizeAgentKey(entry) : entry.key || normalizeAgentKey(entry.label);
      const warn = sectionKey === 'shift' && shiftBreakKeys.has(key);
      const progress = sectionKey === 'shift'
        ? (shiftBreakKeys.has(key) ? (breakProgressMap[key] ?? shiftProgressMap[key] ?? null) : (shiftProgressMap[key] ?? null))
        : (sectionKey === 'coffee' || sectionKey === 'lunch')
          ? (breakProgressMap[key] ?? null)
          : null;
      const fill = progress !== null ? `<span class="phone-timeline-agent-pill-fill" style="width:${Math.round(progress * 100)}%"></span>` : '';
      return `<span class="phone-timeline-agent-pill${warn ? ' warning' : ''}${progress !== null ? ' progress' : ''}">${fill}<span class="phone-timeline-agent-pill-text">${label}</span></span>`;
    }).join('');
    const moreBtn = (!expanded && extraCount > 0 && sectionKey)
      ? `<button type="button" class="phone-timeline-agent-pill phone-timeline-more" data-action="expand-phone-section" data-section="${sectionKey}">+${extraCount} more</button>`
      : '';
    return `<div class="phone-timeline-agent-list">${pills}${moreBtn}</div>`;
  };

  const shiftSummary = activeShiftBlocks.length ? (() => {
    const allAgents = [...new Set(activeShiftBlocks.flatMap(block => block.assigned))];
    const periods = activeShiftBlocks.map(block => block.label).join(' · ');
    return `<div class="phone-timeline-item">
      <div class="phone-timeline-item-left">
        <div class="phone-timeline-label">🟢 On shift now</div>
        <div class="phone-timeline-summary">${allAgents.length} assigned · ${periods}</div>
        ${renderAgentPills(allAgents, 'shift')}
      </div>
      <div class="phone-timeline-badge" style="background:rgba(0,212,212,0.15);">${allAgents.length} on shift</div>
    </div>`;
  })() : `<div class="phone-timeline-item">
      <div class="phone-timeline-item-left">
        <div class="phone-timeline-label">🟢 On shift now</div>
        <div class="phone-timeline-summary">No active shifts at the moment</div>
      </div>
      <div class="phone-timeline-badge" style="background:rgba(0,212,212,0.15);">0 on shift</div>
    </div>`;

  const sectionsMap = {
    shift: shiftSummary,
    coffee: null,
    lunch: null,
    triage: null,
    custom: null,
  };
  const makeSummary = (items, label, icon, color, sectionKey) => {
    if(!items.length) return null;
    const names = items.map(item => {
      const labelText = shortName(item.agent||item.title||'');
      return labelText ? { label: labelText, key: normalizeAgentKey(item.agent||item.title||'') } : null;
    }).filter(Boolean);
    const range = items.length===1 ? `${fmtM(items[0].start)}–${fmtM(items[0].end)}` : `${fmtM(Math.min(...items.map(i=>i.start)))}–${fmtM(Math.max(...items.map(i=>i.end)))}`;
    return `<div class="phone-timeline-item">
      <div class="phone-timeline-item-left">
        <div class="phone-timeline-label">${icon} ${label}</div>
        <div class="phone-timeline-summary">${names.length ? `${names.length} active · ${range}` : `Live now · ${range}`}</div>
        ${renderAgentPills(names, sectionKey)}
      </div>
      <div class="phone-timeline-badge" style="background:${color};">${items.length} now</div>
    </div>`;
  };

  const coffeeSection = makeSummary(activeCoffee, 'Coffee break', '☕', 'rgba(255,179,64,0.15)', 'coffee');
  const lunchSection  = makeSummary(activeLunch, 'Lunch break', '🍕', 'rgba(0,229,160,0.15)', 'lunch');
  const triageSection = activeTriage.length ? `<div class="phone-timeline-item">
      <div class="phone-timeline-item-left">
        <div class="phone-timeline-label">🔀 Triage</div>
        <div class="phone-timeline-summary">${activeTriage.length} active · ${fmtM(activeTriage[0].start)}–${fmtM(activeTriage[0].end)}</div>
        ${renderAgentPills(activeTriage.map(t=>t.agent), 'triage')}
      </div>
      <div class="phone-timeline-badge" style="background:rgba(0,212,212,0.15);">${activeTriage.length} now</div>
    </div>` : `<div class="phone-timeline-item">
      <div class="phone-timeline-item-left">
        <div class="phone-timeline-label">🔀 Triage</div>
        <div class="phone-timeline-summary">No active triage coverage right now</div>
      </div>
      <div class="phone-timeline-badge" style="background:rgba(0,212,212,0.15);">0 now</div>
    </div>`;
  const customSection = makeSummary(activeCustom, 'Custom task', '✳️', 'rgba(181,122,255,0.15)', 'custom');

  sectionsMap.coffee = coffeeSection;
  sectionsMap.lunch = lunchSection;
  sectionsMap.triage = triageSection;
  sectionsMap.custom = customSection;

  const sections = [];
  getPhoneLayout().forEach(cfg => {
    if(!isPhoneSectionVisible(cfg)) return;
    const section = sectionsMap[cfg.id];
    if(section) sections.push(section);
  });

  const content = sections.length ? sections.join('') : '<div class="phone-timeline-empty">No live timeline items right now. Check back in a moment.</div>';
  el.innerHTML = `<div class="card phone-current-timeline-card">
    <div class="card-header phone-timeline-header">
      <div><div class="phone-timeline-title">Live snapshot</div><div class="phone-timeline-caption">Now · ${fmtNow}</div></div>
      <div class="phone-timeline-badge" style="background:rgba(255,79,79,0.15);color:var(--red);">Live</div>
    </div>
    <div class="phone-timeline-items">${content}</div>
  </div>`;
}

function populateAgentSelect(){
  const breakAgents=DATA.agents.filter(a=>agentInBreaks(a));
  const sel=document.getElementById('m-agent'); if(sel) sel.innerHTML=breakAgents.map(a=>`<option value="${a}">${a}</option>`).join('');
}

// ─── TOP PERFORMERS ───
function renderTopPerformers(){
  const tp = DATA.topPerformers || {};
  const selectedDate = getTopPerformersDate();
  const entry = tp[selectedDate] || {};
  const today = new Date().toISOString().slice(0,10);

  const dateInput = document.getElementById('tp-date');
  if(dateInput && !dateInput.value){
    dateInput.value = selectedDate;
  }

  const badge = document.getElementById('tp-date-badge');
  if(badge) badge.textContent = new Date(selectedDate+'T12:00:00').toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'});

  const none = `<option value="">— none —</option>`;
  ['tp-chat','tp-phone','tp-tickets'].forEach(id=>{
    const sel = document.getElementById(id); if(!sel) return;
    sel.innerHTML = none + DATA.agents.map(a=>`<option value="${a}">${a}</option>`).join('');
  });
  const c=document.getElementById('tp-chat'), p=document.getElementById('tp-phone'), t=document.getElementById('tp-tickets'), n=document.getElementById('tp-note');
  if(c) c.value = entry.chat    || '';
  if(p) p.value = entry.phone   || '';
  if(t) t.value = entry.tickets || '';
  if(n) n.value = entry.note    || '';

  const hist = document.getElementById('tp-history'); if(!hist) return;
  const sorted = Object.entries(tp).sort((a,b)=>b[0].localeCompare(a[0]));
  if(!sorted.length){ hist.innerHTML='<div style="font-size:12px;color:var(--muted);font-family:var(--mono);">No history yet.</div>'; return; }
  hist.innerHTML = sorted.map(([date, e])=>{
    const d = new Date(date+'T12:00:00');
    const isToday = date===today;
    const entries = [
      e.chat    ? `<span style="color:var(--amber);">💬 ${e.chat}</span>`    : '',
      e.phone   ? `<span style="color:#aab4c4;">📞 ${e.phone}</span>`   : '',
      e.tickets ? `<span style="color:#cd7f32;">🎫 ${e.tickets}</span>` : '',
    ].filter(Boolean).join('<span style="color:var(--muted2);padding:0 6px;">·</span>');
    return `<div style="display:flex;align-items:center;gap:12px;padding:7px 0;border-bottom:1px solid var(--border);">
      <div style="min-width:130px;flex-shrink:0;">
        <div style="font-size:12px;font-weight:700;color:${isToday?'var(--amber)':'var(--text)'};">${isToday?'Today · ':''}${d.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'})}</div>
      </div>
      <div style="flex:1;font-size:12px;display:flex;flex-wrap:wrap;gap:4px;">${entries||'<span style="color:var(--muted);">—</span>'}</div>
      ${e.note?`<div style="font-size:11px;color:var(--muted);font-family:var(--mono);max-width:200px;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${e.note}</div>`:''}
      <button style="background:none;border:none;color:var(--muted2);font-size:13px;cursor:pointer;padding:2px 5px;border-radius:4px;line-height:1;flex-shrink:0;" data-action="tp-delete" data-date="${date}" title="Delete">✕</button>
    </div>`;
  }).join('');
}

function saveTopPerformersEntry(){
  try{requireAdmin();}catch(e){return;}
  const selectedDate = document.getElementById('tp-date')?.value || getTopPerformersDate();
  if(!selectedDate) return;
  if(!DATA.topPerformers) DATA.topPerformers={};
  DATA.topPerformers[selectedDate] = {
    chat:    document.getElementById('tp-chat').value,
    phone:   document.getElementById('tp-phone').value,
    tickets: document.getElementById('tp-tickets').value,
    note:    document.getElementById('tp-note').value.trim(),
  };
  renderTopPerformers();
  renderViewerGrid();
  saveData();
}

// ─── EDIT ACTIONS ───
function updateBreak(type,idx,field,val){ try{requireAdmin();}catch(e){render();return;} const arr=type==='coffee'?DATA.coffeeBreaks:DATA.lunchBreaks; arr[idx][field]=val; render(); saveData(); }
function updateBreakTime(type,idx,field,val){ try{requireAdmin();}catch(e){render();return;} const [h,m]=val.split(':').map(Number); const arr=type==='coffee'?DATA.coffeeBreaks:DATA.lunchBreaks; arr[idx][field]=h*60+m; render(); saveData(); }
function deleteBreak(type,idx){ try{requireAdmin();}catch(e){return;} const arr=type==='coffee'?DATA.coffeeBreaks:DATA.lunchBreaks; arr.splice(idx,1); render(); saveData(); }
function addAgent(){ try{requireAdmin();}catch(e){return;} const name='New Agent'; DATA.agents.push(name); if(!DATA.agentPasswords) DATA.agentPasswords={}; DATA.agentPasswords[name]=''; render(); saveData(); }
function removeAgent(idx){ try{requireAdmin();}catch(e){return;} DATA.agents.splice(idx,1); render(); saveData(); }

// ─── AGENT BREAK MODAL ───
function openAgentBreakModal(){
  const breakAgents=DATA.agents.filter(a=>agentInBreaks(a));
  const sel=document.getElementById('abm-agent'); sel.innerHTML=breakAgents.map(a=>`<option value="${a}">${a}</option>`).join('');
  document.getElementById('abm-pw').value=''; document.getElementById('abm-err').textContent='';
  updateAbmQuota(); document.getElementById('agent-break-modal').classList.add('open');
}
function closeAgentBreakModal(){ document.getElementById('agent-break-modal').classList.remove('open'); }
function agentCoffeeTotalMins(n){ return DATA.coffeeBreaks.filter(b=>b.agent===n).reduce((s,b)=>s+(b.end-b.start),0); }
function updateAbmQuota(){
  const agent=document.getElementById('abm-agent').value;
  const used=agentCoffeeTotalMins(agent);
  const bar=document.getElementById('abm-quota-bar');
  bar.style.width=Math.min(100,(used/30)*100)+'%'; bar.className='quota-bar'+(used>=30?' full':'');
  document.getElementById('abm-quota-label').textContent=`${used} / 30 min`;
}
function confirmAgentBreak(){
  const agent=document.getElementById('abm-agent').value, pw=document.getElementById('abm-pw').value;
  const startVal=document.getElementById('abm-start').value, durMins=parseInt(document.getElementById('abm-duration').value);
  const errEl=document.getElementById('abm-err'); errEl.textContent='';
  const passwords=DATA.agentPasswords||{};
  if(!passwords[agent]||passwords[agent]!==pw){ const inp=document.getElementById('abm-pw'); inp.classList.add('error'); setTimeout(()=>inp.classList.remove('error'),500); errEl.textContent='✕ Incorrect password.'; return; }
  const [sh,sm]=startVal.split(':').map(Number); const start=sh*60+sm, end=start+durMins;
  const alreadyUsed=agentCoffeeTotalMins(agent);
  if(alreadyUsed+durMins>30){ errEl.textContent=`✕ You've used ${alreadyUsed} min. Adding ${durMins} min would exceed the 30-min daily limit.`; return; }
  if(DATA.coffeeBreaks.filter(b=>b.start<end&&b.end>start).length>=2){ errEl.textContent='✕ 2 agents are already on break during that slot.'; return; }
  if(DATA.coffeeBreaks.find(b=>b.agent===agent&&b.start<end&&b.end>start)){ errEl.textContent='✕ You already have a break overlapping this time slot.'; return; }
  DATA.coffeeBreaks.push({agent,start,end,agentAdded:true}); DATA.coffeeBreaks.sort((a,b)=>a.start-b.start);
  closeAgentBreakModal(); render(); saveAgentBreak();
}

// ─── LEAVE MODAL ───
function openLeaveModal(){ const sel=document.getElementById('lv-agent'); sel.innerHTML=DATA.agents.map(a=>`<option value="${a}">${a}</option>`).join(''); document.getElementById('lv-note').value=''; document.getElementById('leave-modal').classList.add('open'); }
function closeLeaveModal(){ document.getElementById('leave-modal').classList.remove('open'); }
function confirmAddLeave(){ try{requireAdmin();}catch(e){return;} const agent=document.getElementById('lv-agent').value, note=document.getElementById('lv-note').value.trim(); if(!DATA.onLeave) DATA.onLeave=[]; if(DATA.onLeave.find(l=>l.agent===agent)){closeLeaveModal();return;} DATA.onLeave.push({agent,note}); closeLeaveModal(); render(); saveData(); }

// ─── EXCEL IMPORT ───
function openExcelModal(){ document.getElementById('excel-paste').value=''; document.getElementById('excel-preview').textContent=''; document.getElementById('excel-modal').classList.add('open'); setTimeout(()=>document.getElementById('excel-paste').focus(),100); }
function closeExcelModal(){ document.getElementById('excel-modal').classList.remove('open'); }
function previewExcel(){
  const raw=document.getElementById('excel-paste').value.trim(); if(!raw){document.getElementById('excel-preview').textContent='';return;}
  const {coffeeBreaks,lunchBreaks,triageSlots,errors}=parseExcelBreaks(raw);
  const total=coffeeBreaks.length+lunchBreaks.length+triageSlots.length;
  const prev=document.getElementById('excel-preview');
  if(total===0){prev.style.color='var(--red)';prev.textContent=errors.length?'⚠ '+errors[0]:'⚠ No break rows detected.';}
  else{prev.style.color='var(--green)';const parts=[];if(coffeeBreaks.length)parts.push(coffeeBreaks.length+' coffee');if(lunchBreaks.length)parts.push(lunchBreaks.length+' lunch');if(triageSlots.length)parts.push(triageSlots.length+' triage');prev.textContent='✓ Detected '+parts.join(', ')+(errors.length?' · ⚠ '+errors.length+' skipped':'');}
}
function parseExcelBreaks(raw){
  const errors=[]; const lines=raw.split('\n').map(l=>l.replace(/\r/,'')).filter(l=>l.trim());
  if(lines.length<2){errors.push('Not enough rows');return{coffeeBreaks:[],lunchBreaks:[],triageSlots:[],errors};}
  const dataLines=lines.slice(1),coffeeRaw=[],lunchRaw=[],triageRaw=[];
  for(const line of dataLines){
    const cols=line.split('\t'); const timeStr=(cols[0]||'').trim(); if(!timeStr||!/\d/.test(timeStr)) continue;
    const tm=timeStr.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/); if(!tm){errors.push('Bad time: '+timeStr);continue;}
    const start=parseInt(tm[1])*60+parseInt(tm[2]),end=parseInt(tm[3])*60+parseInt(tm[4]),dur=end-start;
    const agentCols=cols.slice(1).map(c=>c.trim()).filter(c=>c&&c.length>1); if(!agentCols.length) continue;
    for(const agent of agentCols){const entry={agent,start,end};if(dur<=15)coffeeRaw.push(entry);else if(dur<=45)lunchRaw.push(entry);else triageRaw.push(entry);}
  }
  function mc(entries){if(!entries.length)return[];const sorted=[...entries].sort((a,b)=>a.agent.localeCompare(b.agent)||a.start-b.start);const merged=[];let cur={...sorted[0]};for(let i=1;i<sorted.length;i++){const b=sorted[i];if(b.agent===cur.agent&&b.start===cur.end)cur.end=b.end;else{merged.push(cur);cur={...b};}}merged.push(cur);return merged;}
  const coffeeBreaks=mc(coffeeRaw),lunchBreaks=mc(lunchRaw);
  const triageSlots=[];for(const b of mc(triageRaw)){const ex=triageSlots.find(t=>t.start===b.start&&t.end===b.end);if(ex)ex.agent=b.agent;else triageSlots.push({time:fmtM(b.start)+'–'+fmtM(b.end),agent:b.agent,start:b.start,end:b.end});}
  triageSlots.sort((a,b)=>a.start-b.start);
  return{coffeeBreaks,lunchBreaks,triageSlots,errors};
}
function confirmExcelImport(){
  try{requireAdmin();}catch(e){return;}
  const raw=document.getElementById('excel-paste').value.trim(); if(!raw){alert('Paste some data first.');return;}
  const {coffeeBreaks,lunchBreaks,triageSlots,errors}=parseExcelBreaks(raw);
  const total=coffeeBreaks.length+lunchBreaks.length+triageSlots.length; if(total===0){alert('No break rows detected.');return;}
  const mode=document.querySelector('input[name="import-mode"]:checked').value;
  if(mode==='replace'){
    DATA.coffeeBreaks=coffeeBreaks;DATA.lunchBreaks=lunchBreaks;
    if(triageSlots.length){DATA.triageSlots=DATA.triageSlots.map(t=>{const m=triageSlots.find(s=>s.start===t.start&&s.end===t.end);return m?{...t,agent:m.agent}:t;});triageSlots.forEach(s=>{if(!DATA.triageSlots.find(t=>t.start===s.start&&t.end===s.end))DATA.triageSlots.push(s);});DATA.triageSlots.sort((a,b)=>a.start-b.start);}
  } else {
    const key=b=>b.agent+'|'+b.start;const eck=new Set(DATA.coffeeBreaks.map(key)),elk=new Set(DATA.lunchBreaks.map(key));
    coffeeBreaks.forEach(b=>{if(!eck.has(key(b)))DATA.coffeeBreaks.push(b);});lunchBreaks.forEach(b=>{if(!elk.has(key(b)))DATA.lunchBreaks.push(b);});
    triageSlots.forEach(s=>{const ex=DATA.triageSlots.find(t=>t.start===s.start&&t.end===s.end);if(ex)ex.agent=s.agent;else{DATA.triageSlots.push(s);DATA.triageSlots.sort((a,b)=>a.start-b.start);}});
  }
  closeExcelModal(); render(); saveData();
}

function openShiftImportModal(){ document.getElementById('shift-import-paste').value=''; document.getElementById('shift-import-preview').textContent=''; document.getElementById('shift-import-modal').classList.add('open'); setTimeout(()=>document.getElementById('shift-import-paste').focus(),100); }
function closeShiftImportModal(){ document.getElementById('shift-import-modal').classList.remove('open'); }
function previewShiftImport(){
  const raw=document.getElementById('shift-import-paste').value.trim(); if(!raw){document.getElementById('shift-import-preview').textContent='';return;}
  const {assignments,agents,errors}=parseShiftImportRaw(raw);
  const total=Object.keys(assignments).length;
  const prev=document.getElementById('shift-import-preview');
  if(total===0){prev.style.color='var(--red)';prev.textContent=errors.length?'⚠ '+errors[0]:'⚠ No shifts detected.';return;}
  prev.style.color='var(--green)';
  const parts=[total+' shifts'];
  if(agents.size) parts.push(agents.size+' people');
  if(errors.length) parts.push('⚠ '+errors.length+' skipped');
  prev.textContent='✓ '+parts.join(' · ');
}
function parseShiftImportRaw(raw){
  const errors=[];
  const splitRow = (row, sep) => row.split(sep).map(c=>c.replace(/^"|"$/g,'').trim());
  const lines = raw.split(/\r?\n/).map(l=>l.replace(/\r/g,'')).filter(l=>l.trim());
  if(lines.length < 2){ errors.push('Not enough rows.'); return {assignments:{},agents:new Set(),errors}; }
  const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(',') ? ',' : '\t';
  const header = splitRow(lines[0],sep).map(h=>h.trim());
  const normalizeHeader = h => h.trim().toLowerCase().replace(/\s+/g,' ');
  const normalizedHeader = header.map(normalizeHeader);
  const dateIdx = normalizedHeader.findIndex(h=>/\b(date|day)\b/.test(h));
  const startDateIdx = normalizedHeader.findIndex(h=>/\b(start date|startdt|date)\b/.test(h) && !/\btime\b/.test(h));
  const endDateIdx = normalizedHeader.findIndex(h=>/\b(end date|enddt|date)\b/.test(h) && !/\btime\b/.test(h) && h !== normalizedHeader[startDateIdx]);
  const startTimeIdx = normalizedHeader.findIndex(h=>/\b(start time|start)\b/.test(h) && /\btime\b/.test(h));
  const endTimeIdx = normalizedHeader.findIndex(h=>/\b(end time|end)\b/.test(h) && /\btime\b/.test(h));
  const startIdx = startTimeIdx >= 0 ? startTimeIdx : normalizedHeader.findIndex(h=>/\b(start|begin|from)\b/.test(h));
  const endIdx = endTimeIdx >= 0 ? endTimeIdx : normalizedHeader.findIndex(h=>/\b(end|finish|to)\b/.test(h));
  const shiftIdx = normalizedHeader.findIndex(h=>/\b(shift|schedule|title|name)\b/.test(h));
  const memberIdx = normalizedHeader.findIndex(h=>/\b(member|user|name)\b/.test(h));
  const emailIdx = normalizedHeader.findIndex(h=>/\b(work email|email|e-mail)\b/.test(h));
  const customLabelIdx = normalizedHeader.findIndex(h=>/\b(custom label|label)\b/.test(h));
  const excludedCols = new Set([dateIdx, startIdx, endIdx, startDateIdx, endDateIdx, startTimeIdx, endTimeIdx, shiftIdx].filter(i=>i>=0));
  const assignmentCols = normalizedHeader.map((h,i)=>({h,i})).filter(col=>/\b(assigned to|assigned|user|person|member|name|team|resource|worker)\b/.test(col.h) && !excludedCols.has(col.i)).map(col=>col.i);
  const fallbackAgentCols = normalizedHeader.map((h,i)=>({h,i})).filter(col=>!excludedCols.has(col.i) && col.h.length).map(col=>col.i);
  const agentCols = assignmentCols.length ? assignmentCols : [memberIdx, emailIdx].filter(i=>i>=0).length ? [memberIdx, emailIdx].filter(i=>i>=0) : fallbackAgentCols;

  const parseTimeValue = text => {
    if(!text) return null;
    text = String(text).trim().toLowerCase();
    if(/[\/\-]/.test(text) && !text.match(/^\d{1,2}:\d{2}/)) return null;
    const m = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
    if(!m) return null;
    let h = parseInt(m[1],10);
    const mnt = m[2] ? parseInt(m[2],10) : 0;
    const ampm = m[3];
    if(ampm==='pm' && h<12) h += 12;
    if(ampm==='am' && h===12) h = 0;
    return h*60 + mnt;
  };
  const parseTimeRange = text => {
    if(!text) return [null,null];
    let m = text.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    if(m){ return [parseTimeValue(m[1]), parseTimeValue(m[2])]; }
    const parts = text.split(/\s+/).filter(Boolean);
    if(parts.length>=2){ return [parseTimeValue(parts[0]), parseTimeValue(parts[1])]; }
    return [null,null];
  };
  const parseDateValue = text => {
    if(!text) return null;
    text = String(text).trim();
    const dt = new Date(text);
    if(!isNaN(dt)) return dt;
    const slash = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if(slash){
      let [_,p1,p2,p3] = slash;
      let month = parseInt(p1,10), day = parseInt(p2,10), year = parseInt(p3,10);
      if(year < 100) year += 2000;
      if(month > 12){ [month, day] = [day, month]; }
      return new Date(year, month-1, day);
    }
    return null;
  };
  const parseAgentList = cell => String(cell||'').split(/[,;]\s*/).map(v=>v.trim()).filter(Boolean);
  const assignments = {};
  const importedAgents = new Set();
  let detectedPatchingAgent = null;
  for(let i=1;i<lines.length;i++){
    const row = splitRow(lines[i],sep);
    if(customLabelIdx >= 0 && row[customLabelIdx] && /patching/i.test(row[customLabelIdx])){
      const agentName = parseAgentList(row[memberIdx])[0] || parseAgentList(row[emailIdx])[0];
      if(agentName && !detectedPatchingAgent){
        detectedPatchingAgent = findAgentMatch(agentName);
      }
    }
    const dateCell = startDateIdx >= 0 ? row[startDateIdx] : dateIdx >= 0 ? row[dateIdx] : row[0];
    const parsedDate = parseDateValue(dateCell);
    if(!parsedDate){ errors.push(`Row ${i+1}: invalid date`); continue; }
    const dateStr = formatDateKey(parsedDate);
    let start = startTimeIdx >= 0 ? parseTimeValue(row[startTimeIdx]) : startIdx >= 0 ? parseTimeValue(row[startIdx]) : null;
    let end = endTimeIdx >= 0 ? parseTimeValue(row[endTimeIdx]) : endIdx >= 0 ? parseTimeValue(row[endIdx]) : null;
    const endDate = endDateIdx >= 0 ? parseDateValue(row[endDateIdx]) : null;
    if((start===null || end===null) && shiftIdx >= 0){ const range = row[shiftIdx] || ''; [start,end] = parseTimeRange(range); }
    if((start===null || end===null) && dateIdx >= 0){ const fallback = row[dateIdx] || ''; [start,end] = parseTimeRange(fallback); }
    if(start===null || end===null){ errors.push(`Row ${i+1}: missing shift time`); continue; }
    if(end <= start){
      if(endDate && endDate > parsedDate) end += 1440;
      else if(end <= start) end += 1440;
    }
    const shiftId = findShiftIdByTimes(start,end);
    const agents = [];
    agentCols.forEach(idx => { if(row[idx]) parseAgentList(row[idx]).forEach(a=>agents.push(a)); });
    if(!agents.length){ errors.push(`Row ${i+1}: no assigned agent found`); continue; }
    const normalized = Array.from(new Set(agents.map(a=>findAgentMatch(a)).filter(Boolean)));
    normalized.forEach(a=>importedAgents.add(a));
    const key = `${dateStr}:${shiftId}`;
    const existing = assignments[key] || [];
    assignments[key] = Array.from(new Set([...existing, ...normalized]));
  }
  return {assignments, agents: importedAgents, patchingAgent: detectedPatchingAgent, errors};
}
function confirmShiftImport(){
  try{requireAdmin();}catch(e){return;}
  const raw=document.getElementById('shift-import-paste').value.trim(); if(!raw){alert('Paste some data first.');return;}
  const {assignments,agents,patchingAgent,errors}=parseShiftImportRaw(raw);
  const total=Object.keys(assignments).length;
  if(total===0){alert(errors.length?errors[0]:'No shifts detected.');return;}
  const mode=document.querySelector('input[name="shift-import-mode"]:checked').value;
  if(mode==='replace'){
    DATA.shiftAssignments=assignments;
  } else {
    if(!DATA.shiftAssignments) DATA.shiftAssignments={};
    Object.entries(assignments).forEach(([k,v])=>{DATA.shiftAssignments[k]=v;});
  }
  if(agents.size){
    const allAgents = new Set(DATA.agents||[]);
    agents.forEach(a=>allAgents.add(a));
    DATA.agents = Array.from(allAgents);
  }
  if(patchingAgent){
    DATA.patchingAgent = patchingAgent;
  }
  closeShiftImportModal(); render(); saveData();
}

// ─── ADD BREAK MODAL ───
function openModal(type){ try{requireAdmin();}catch(e){return;} activeModalType=type; document.getElementById('m-type').value=type; document.getElementById('add-modal').classList.add('open'); }
function closeModal(){ document.getElementById('add-modal').classList.remove('open'); }
function confirmAddBreak(){
  try{requireAdmin();}catch(e){closeModal();return;}
  const agent=document.getElementById('m-agent').value,type=document.getElementById('m-type').value;
  const sVal=document.getElementById('m-start').value,eVal=document.getElementById('m-end').value;
  if(!agent||!sVal||!eVal){alert('Fill all fields.');return;}
  const [sh,sm]=sVal.split(':').map(Number),[eh,em]=eVal.split(':').map(Number);
  const entry={agent,start:sh*60+sm,end:eh*60+em};
  if(type==='coffee')DATA.coffeeBreaks.push(entry);else DATA.lunchBreaks.push(entry);
  closeModal(); render(); saveData();
}
document.getElementById('m-type').addEventListener('change',function(){activeModalType=this.value;});

// ─── CUSTOM PANEL MODAL ───
let _cpEditingId=null;
let _cpSelectedColor='blue';

function populateColorSwatches(){
  const container=document.getElementById('cp-color-swatches');
  container.innerHTML='';
  ACCENT_COLORS.forEach(c=>{
    const sw=document.createElement('div');
    sw.className='color-swatch'+(c.key===_cpSelectedColor?' selected':'');
    sw.style.background=c.val;
    sw.title=c.key;
    sw.addEventListener('click',()=>{
      _cpSelectedColor=c.key;
      container.querySelectorAll('.color-swatch').forEach(s=>s.classList.remove('selected'));
      sw.classList.add('selected');
    });
    container.appendChild(sw);
  });
}

function openCustomPanelModal(editId=null){
  _cpEditingId=editId;
  _cpSelectedColor='blue';
  const titleEl=document.getElementById('cp-title'), bodyEl=document.getElementById('cp-body');
  if(editId){
    const cp=(DATA.customPanels||{})[editId]||{};
    titleEl.value=cp.title||''; bodyEl.value=cp.body||'';
    _cpSelectedColor=cp.color||'blue';
    document.querySelector('#custom-panel-modal h2').textContent='✏️ Edit Custom Panel';
    document.getElementById('cp-ok-btn').textContent='Save changes';
  } else {
    titleEl.value=''; bodyEl.value='';
    document.querySelector('#custom-panel-modal h2').textContent='📝 Custom Text Panel';
    document.getElementById('cp-ok-btn').textContent='Add panel';
  }
  populateColorSwatches();
  document.getElementById('custom-panel-modal').classList.add('open');
}
function closeCustomPanelModal(){ document.getElementById('custom-panel-modal').classList.remove('open'); }
function confirmCustomPanel(){
  try{requireAdmin();}catch(e){return;}
  const title=document.getElementById('cp-title').value.trim()||'Custom Panel';
  const body=document.getElementById('cp-body').value;
  if(!DATA.customPanels) DATA.customPanels={};
  let panelId=_cpEditingId;
  if(!panelId){
    panelId='custom:'+Date.now();
    const layout=getViewerLayout();
    if(!layout.length) layout.push({panels:[]});
    layout[layout.length-1].panels.push({id:panelId,span:4,visible:true,height:null});
    DATA.viewerLayout=layout;
  }
  DATA.customPanels[panelId]={title,body,color:_cpSelectedColor};
  closeCustomPanelModal(); render(); saveData();
}

// ─── CUSTOM TASK MODAL ───
let _taskSelectedColor='blue';
let _editingTaskIndex = null;
let _breakRequestTarget = null;
function populateTaskColorSwatches(){
  const container=document.getElementById('task-color-swatches'); if(!container) return; container.innerHTML='';
  ACCENT_COLORS.forEach(c=>{
    const sw=document.createElement('div'); sw.className='color-swatch'+(c.key===_taskSelectedColor?' selected':''); sw.style.background=c.val; sw.title=c.key;
    sw.addEventListener('click',()=>{ _taskSelectedColor=c.key; container.querySelectorAll('.color-swatch').forEach(s=>s.classList.remove('selected')); sw.classList.add('selected'); });
    container.appendChild(sw);
  });
}
function openTaskModal(){ try{requireAdmin();}catch(e){return;} const sel=document.getElementById('task-agent'); sel.innerHTML=DATA.agents.map(a=>`<option value="${a}">${a}</option>`).join(''); document.getElementById('task-title').value=''; document.getElementById('task-start').value='10:00'; document.getElementById('task-end').value='10:30'; _taskSelectedColor='purple'; populateTaskColorSwatches(); document.getElementById('task-modal').classList.add('open'); }
function closeTaskModal(){ document.getElementById('task-modal').classList.remove('open'); }
function confirmAddTask(){
  try{requireAdmin();}catch(e){closeTaskModal();return;}
  const agent=document.getElementById('task-agent').value;
  const title=document.getElementById('task-title').value.trim();
  const s=document.getElementById('task-start').value, ed=document.getElementById('task-end').value;
  if(!agent||!title||!s||!ed){alert('Fill all fields.');return;}
  const [sh,sm]=s.split(':').map(Number), [eh,em]=ed.split(':').map(Number);
  const entry={agent,title,start:sh*60+sm,end:eh*60+em,color:_taskSelectedColor};
  if(_editingTaskIndex!==null){ DATA.customTasks[_editingTaskIndex]=entry; _editingTaskIndex=null; }
  else { if(!DATA.customTasks) DATA.customTasks=[]; DATA.customTasks.push(entry); }
  closeTaskModal(); render(); saveData();
}

function openBreakRequestModal(req){
  _breakRequestTarget = req;
  document.getElementById('br-agent').value = req.agent;
  document.getElementById('br-type').value = req.type==='coffee' ? 'Coffee' : 'Lunch';
  document.getElementById('br-start').value = pad(Math.floor(req.originalStart/60))+':'+pad(req.originalStart%60);
  document.getElementById('br-end').value = pad(Math.floor(req.originalEnd/60))+':'+pad(req.originalEnd%60);
  document.getElementById('br-reason').value = '';
  document.getElementById('br-pw').value = '';
  document.getElementById('br-err').textContent = '';
  document.getElementById('break-request-modal').classList.add('open');
}
function closeBreakRequestModal(){ document.getElementById('break-request-modal').classList.remove('open'); _breakRequestTarget = null; }
function confirmBreakRequest(){
  if(!_breakRequestTarget) return;
  const reason=document.getElementById('br-reason').value.trim();
  const pw=document.getElementById('br-pw').value;
  const errEl=document.getElementById('br-err'); errEl.textContent='';
  if(!reason){ errEl.textContent='Enter a reason for the edit request.'; return; }
  if(!pw){ errEl.textContent='Enter your password.'; return; }
  const passwords=DATA.agentPasswords||{};
  if(passwords[_breakRequestTarget.agent]!==pw){ errEl.textContent='Incorrect password.'; return; }
  const [sh,sm]=document.getElementById('br-start').value.split(':').map(Number);
  const [eh,em]=document.getElementById('br-end').value.split(':').map(Number);
  const requestedStart=sh*60+sm, requestedEnd=eh*60+em;
  if(requestedEnd<=requestedStart){ errEl.textContent='End time must be after start time.'; return; }
  if(!DATA.editRequests) DATA.editRequests=[];
  DATA.editRequests.push({
    id:'req:'+Date.now()+Math.random().toString(36).slice(2,8),
    agent:_breakRequestTarget.agent,
    type:_breakRequestTarget.type,
    originalStart:_breakRequestTarget.originalStart,
    originalEnd:_breakRequestTarget.originalEnd,
    requestedStart,
    requestedEnd,
    reason,
    status:'pending',
    createdAt:new Date().toISOString()
  });
  closeBreakRequestModal(); render(); saveEditRequests();
}

// ─── CLOCK ───
const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
function updateClock(){
  const n=new Date();
  document.getElementById('clock').textContent=pad(n.getHours())+':'+pad(n.getMinutes())+':'+pad(n.getSeconds());
  document.getElementById('date-str').textContent=DAYS[n.getDay()]+', '+n.getDate()+' '+MONTHS[n.getMonth()]+' '+n.getFullYear();
}
setInterval(updateClock,1000); updateClock();
setInterval(render,30000);
setInterval(maybeClearComfortBreaksAtEOD, 60000);

// ─── TIMELINE TOOLTIP ───
const _tlTip = document.getElementById('tl-tooltip');
document.getElementById('viewer-grid').addEventListener('mousemove', e => {
  const bar = e.target.closest('[data-tip]');
  if(!bar){ _tlTip.style.display='none'; return; }
  _tlTip.innerHTML = bar.dataset.tip;
  const x = Math.min(e.clientX+12, window.innerWidth-_tlTip.offsetWidth-16);
  const y = e.clientY-_tlTip.offsetHeight-10;
  _tlTip.style.left = x+'px';
  _tlTip.style.top  = y+'px';
  _tlTip.style.display = 'block';
});
document.getElementById('viewer-grid').addEventListener('mouseleave', ()=>{
  _tlTip.style.display='none';
});

// ════════════════════════════════════════════════
// ─── LAYOUT EDITOR ───
// ════════════════════════════════════════════════
let leLayout=[];
let leDragSrc=null;
let pleLayout=[];
const HEIGHT_STEP=40, HEIGHT_MIN=80, HEIGHT_MAX=600;

function openLayoutEditor(){
  try{requireAdmin();}catch(e){return;}
  leLayout=JSON.parse(JSON.stringify(getViewerLayout()));
  renderLayoutEditor();
  document.getElementById('layout-editor-overlay').classList.add('open');
}
function closeLayoutEditor(){ document.getElementById('layout-editor-overlay').classList.remove('open'); }
function saveLayout(){
  try{requireAdmin();}catch(e){return;}
  DATA.viewerLayout=JSON.parse(JSON.stringify(leLayout));
  closeLayoutEditor(); render(); saveData();
}
function resetLayoutToDefault(){ leLayout=JSON.parse(JSON.stringify(DEFAULT_VIEWER_LAYOUT)); renderLayoutEditor(); }

function getPanelLabel(panelId){
  if(panelId.startsWith('custom:')){
    const cp=(DATA.customPanels||{})[panelId];
    return cp?cp.title:'Custom';
  }
  return BUILTIN_PANELS.find(p=>p.id===panelId)?.label||panelId;
}
function getPhoneSectionLabel(sectionId){
  const section = DEFAULT_PHONE_LAYOUT.find(p=>p.id===sectionId);
  if(section) return section.label;
  const builtin = BUILTIN_PANELS.find(p=>p.id===sectionId);
  if(builtin) return builtin.label;
  return sectionId;
}
function getPanelIcon(panelId){
  if(panelId.startsWith('custom:')) return '📝';
  return BUILTIN_PANELS.find(p=>p.id===panelId)?.icon||'▪';
}

function renderLayoutEditor(){
  const container=document.getElementById('le-rows-container');
  container.innerHTML='';
  leLayout.forEach((row,rowIdx)=>{
    const rowWrap=document.createElement('div');
    rowWrap.style.cssText='display:flex;flex-direction:column;gap:4px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--r2);padding:10px;';

    const rowLabel=document.createElement('div');
    rowLabel.style.cssText='font-size:9px;color:var(--muted2);font-family:var(--mono);letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px;display:flex;align-items:center;justify-content:space-between;';
    rowLabel.innerHTML=`<span>ROW ${rowIdx+1}</span><button class="le-row-btn danger" data-le-action="remove-row" data-row="${rowIdx}" style="font-size:9px;padding:2px 7px;">✕ Remove row</button>`;
    rowWrap.appendChild(rowLabel);

    const rowEl=document.createElement('div');
    rowEl.className='le-row';
    rowEl.dataset.rowIdx=rowIdx;

    const rowPanels=row.panels||[];
    let currentCol=1;
    const normalizedPanels = rowPanels
      .map(panel=>({ ...panel }))
      .sort((a,b)=> (a.start||0) - (b.start||0))
      .map(panel=>{
        const span=Math.max(1,Math.min(12,panel.span||6));
        if(!panel.start || panel.start < currentCol) panel.start=currentCol;
        if(panel.start > 13-span) panel.start = 13-span;
        currentCol = panel.start + span;
        return panel;
      });
    row.panels = normalizedPanels;

    normalizedPanels.forEach((panel,panelIdx)=>{
      rowEl.appendChild(buildTileEl(panel,panelIdx,rowIdx,panel.start));
    });

    rowEl.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='move'; rowEl.classList.add('drag-over');});
    rowEl.addEventListener('dragleave',()=>rowEl.classList.remove('drag-over'));
    rowEl.addEventListener('drop',e=>{
      e.preventDefault();rowEl.classList.remove('drag-over');
      if(!leDragSrc) return;
      const src=leDragSrc; leDragSrc=null;
      const srcRow=leLayout[src.rowIdx];
      const [moved]=srcRow.panels.splice(src.panelIdx,1);
      const dstRow=leLayout[rowIdx];
      if(srcRow.panels.length===0 && srcRow!==dstRow){
        const removeIndex=leLayout.findIndex(r=>r===srcRow);
        if(removeIndex>-1) leLayout.splice(removeIndex,1);
      }
      moved.start = getDropColumnForRow(rowEl, e);
      placePanelInRow(dstRow, moved);
      renderLayoutEditor();
    });

    rowWrap.appendChild(rowEl);

    const rowControls=document.createElement('div');
    rowControls.style.cssText='display:flex;gap:6px;align-items:center;margin-top:4px;';
    rowControls.innerHTML=`<span style="font-size:10px;color:var(--muted);font-family:var(--mono);">Drag panels here or use picker below</span>`;
    rowWrap.appendChild(rowControls);

    container.appendChild(rowWrap);
  });
  renderPanelPicker();
}

function openPhoneLayoutEditor(){
  try{requireAdmin();}catch(e){return;}
  pleLayout = JSON.parse(JSON.stringify(getPhoneLayout()));
  renderPhoneLayoutEditor();
  document.getElementById('phone-layout-editor-overlay').classList.add('open');
}
function closePhoneLayoutEditor(){ document.getElementById('phone-layout-editor-overlay').classList.remove('open'); }
function savePhoneLayout(){
  try{requireAdmin();}catch(e){return;}
  DATA.phoneLayout = JSON.parse(JSON.stringify(pleLayout.map(section => ({
    id: section.id,
    visible: isPhoneSectionVisible(section),
  }))));
  closePhoneLayoutEditor();
  render();
  saveData();
}
function resetPhoneLayout(){
  pleLayout = JSON.parse(JSON.stringify(DEFAULT_PHONE_LAYOUT));
  renderPhoneLayoutEditor();
}
function renderPhoneLayoutEditor(){
  const container = document.getElementById('ple-sections-container');
  container.innerHTML = '';
  pleLayout.forEach((section, idx) => {
    const visible = isPhoneSectionVisible(section);
    const row = document.createElement('div');
    row.className = 'ple-section-row';
    row.dataset.idx = idx;
    row.innerHTML = `
      <div class="ple-section-label">${getPhoneSectionLabel(section.id)}</div>
      <div class="ple-section-actions">
        <button class="le-span-btn" data-ple-action="move-up" data-idx="${idx}" title="Move up">↑</button>
        <button class="le-span-btn" data-ple-action="move-down" data-idx="${idx}" title="Move down">↓</button>
        <button class="le-span-btn" data-ple-action="toggle-visible" data-idx="${idx}" title="Toggle visibility">${visible ? '👁' : '🙈'}</button>
        <button class="le-span-btn" data-ple-action="remove" data-idx="${idx}" title="Remove from phone">✖</button>
      </div>
    `;
    if(!visible){
      const hiddenNote = document.createElement('div');
      hiddenNote.className = 'ple-hidden-note';
      hiddenNote.textContent = 'Hidden in phone view';
      row.appendChild(hiddenNote);
    }
    container.appendChild(row);
  });

  // Available phone snapshot sections picker
  const usedIds = new Set(pleLayout.map(p=>p.id));
  const picker = document.getElementById('ple-panel-picker');
  picker.innerHTML = '';
  const available = DEFAULT_PHONE_LAYOUT.filter(p=>!usedIds.has(p.id));
  if(available.length){
    available.forEach(p=>{
      const btn = document.createElement('button');
      btn.className = 'ple-add-panel-btn';
      btn.dataset.pleAction = 'add-panel';
      btn.dataset.panelId = p.id;
      btn.innerHTML = `${getPhoneSectionLabel(p.id)}`;
      picker.appendChild(btn);
    });
  } else {
    picker.innerHTML = '<div style="color:var(--muted);font-size:12px">No additional snapshot sections available</div>';
  }
}

function getDropColumnForRow(rowEl,e){
  const rect=rowEl.getBoundingClientRect();
  const x=Math.min(Math.max(e.clientX-rect.left,0),rect.width-1);
  const col=Math.floor(x/(rect.width/12))+1;
  return Math.min(Math.max(col,1),12);
}

function placePanelInRow(row,panel){
  const span=Math.max(1,Math.min(12,panel.span||6));
  panel.start = Math.min(Math.max(panel.start||1,1),13-span);
  const occupied=[];
  row.panels.forEach(p=>{
    const start=p.start||1;
    const len=Math.max(1,Math.min(12,p.span||6));
    for(let c=start;c<start+len;c++) occupied.push(c);
  });
  const tryStart=(col)=>{
    for(let c=col;c<col+span;c++){
      if(c>12||occupied.includes(c)) return false;
    }
    return true;
  };
  if(!tryStart(panel.start)){
    let found=null;
    for(let c=panel.start;c>=1;c--){ if(tryStart(c)){ found=c; break; }}
    if(found===null){ for(let c=panel.start+1;c<=13-span;c++){ if(tryStart(c)){ found=c; break; } }}
    panel.start = found || 1;
  }
  row.panels.push(panel);
}

function buildTileEl(panel,panelIdx,rowIdx,startCol){
  const span=Math.max(1,Math.min(12,panel.span||6));
  const heightPx=panel.height||null;
  const tile=document.createElement('div');
  tile.className='le-tile'+(panel.visible===false?' ':'');
  tile.style.cssText=`grid-column:${startCol} / span ${span};grid-row:1;`;
  if(heightPx) tile.style.height=heightPx+'px';
  tile.draggable=true;
  tile.dataset.rowIdx=rowIdx;
  tile.dataset.panelIdx=panelIdx;

  const icon=getPanelIcon(panel.id);
  const label=getPanelLabel(panel.id);
  const isCustom=panel.id.startsWith('custom:');
  const editBtn=isCustom?`<button class="le-span-btn" data-le-action="edit-custom" data-row="${rowIdx}" data-panel="${panelIdx}" title="Edit content" style="background:var(--purple2);border-color:rgba(181,122,255,0.3);color:var(--purple);">✏</button>`:'';

  tile.innerHTML=`
    <div class="le-tile-header">
      <span class="le-tile-icon">${icon}</span>
      <span class="le-tile-name">${label}</span>
      <button class="le-vis-btn" data-le-action="toggle-vis" data-row="${rowIdx}" data-panel="${panelIdx}" title="${panel.visible===false?'Show':'Hide'}">${panel.visible===false?'🙈':'👁'}</button>
    </div>
    <div class="le-tile-controls">
      <div style="display:flex;align-items:center;gap:3px;">
        <span style="font-size:9px;color:var(--muted2);font-family:var(--mono);">W:</span>
        <button class="le-span-btn" data-le-action="span-dec" data-row="${rowIdx}" data-panel="${panelIdx}" title="Narrower">−</button>
        <span class="le-tile-span">${span}col</span>
        <button class="le-span-btn" data-le-action="span-inc" data-row="${rowIdx}" data-panel="${panelIdx}" title="Wider">+</button>
      </div>
      <div style="display:flex;align-items:center;gap:3px;">
        <span style="font-size:9px;color:var(--muted2);font-family:var(--mono);">H:</span>
        <button class="le-span-btn" data-le-action="height-dec" data-row="${rowIdx}" data-panel="${panelIdx}" title="Shorter">↑</button>
        <span class="le-tile-span" id="le-height-${rowIdx}-${panelIdx}">${heightPx?heightPx+'px':'auto'}</span>
        <button class="le-span-btn" data-le-action="height-inc" data-row="${rowIdx}" data-panel="${panelIdx}" title="Taller">↓</button>
        ${heightPx?`<button class="le-span-btn" data-le-action="height-reset" data-row="${rowIdx}" data-panel="${panelIdx}" title="Reset height" style="font-size:9px;width:auto;padding:0 4px;">auto</button>`:''}
      </div>
      ${editBtn}
      <button class="le-span-btn danger" data-le-action="remove-panel" data-row="${rowIdx}" data-panel="${panelIdx}" title="Remove panel">✕</button>
    </div>
    <div class="le-tile-width-bar"><div class="le-tile-width-fill" style="width:${Math.round((span/12)*100)}%;"></div></div>
    ${panel.visible===false?'<div class="le-tile-hidden-overlay"><span>🙈</span></div>':''}
    <div class="le-resize-handle" data-le-action="resize-start" data-row="${rowIdx}" data-panel="${panelIdx}"></div>
  `;

  tile.addEventListener('dragstart',e=>{
    leDragSrc={rowIdx,panelIdx};
    tile.classList.add('dragging');
    e.dataTransfer.effectAllowed='move';
  });
  tile.addEventListener('dragend',()=>tile.classList.remove('dragging'));
  tile.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='move';tile.classList.add('drag-over');});
  tile.addEventListener('dragleave',()=>tile.classList.remove('drag-over'));
  tile.addEventListener('drop',e=>{
    e.preventDefault();
    e.stopPropagation();
    tile.classList.remove('drag-over');
    if(!leDragSrc) return;
    const src=leDragSrc; leDragSrc=null;
    if(src.rowIdx===rowIdx&&src.panelIdx===panelIdx) return;
    const srcRow=leLayout[src.rowIdx];
    const [moved]=srcRow.panels.splice(src.panelIdx,1);
    if(srcRow.panels.length===0&&src.rowIdx!==rowIdx) leLayout.splice(src.rowIdx,1);
    const dstRow=leLayout[rowIdx];
    moved.start = getDropColumnForRow(tile.closest('.le-row'), e);
    placePanelInRow(dstRow, moved);
    renderLayoutEditor();
  });

  const handle=tile.querySelector('.le-resize-handle');
  handle.addEventListener('mousedown',e=>{
    e.preventDefault(); e.stopPropagation();
    const startX=e.clientX, startSpan=span;
    const rowEl=tile.closest('.le-row');
    const colWidth=(rowEl.getBoundingClientRect().width-20)/12;
    function onMove(ev){
      const dx=ev.clientX-startX;
      const dc=Math.round(dx/colWidth);
      const ns=Math.max(1,Math.min(12,startSpan+dc));
      leLayout[rowIdx].panels[panelIdx].span=ns;
      tile.style.gridColumn=`span ${ns}`;
      const sl=tile.querySelector('.le-tile-span');
      if(sl) sl.textContent=ns+'col';
    }
    function onUp(){ document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp); renderLayoutEditor(); }
    document.addEventListener('mousemove',onMove); document.addEventListener('mouseup',onUp);
  });

  return tile;
}

function renderPanelPicker(){
  const picker=document.getElementById('le-panel-picker');
  const usedIds=new Set(leLayout.flatMap(r=>r.panels.map(p=>p.id)));
  picker.innerHTML='<div class="le-picker-title">Available panels — click to add to last row</div>';
  for(const def of BUILTIN_PANELS){
    const chip=document.createElement('button');
    const used=usedIds.has(def.id);
    chip.className='le-picker-chip'+(used?' used':'');
    chip.innerHTML=`${def.icon} ${def.label}`;
    chip.title=used?'Already in layout':'Add to last row';
    if(!used){
      chip.addEventListener('click',()=>{
        if(!leLayout.length) leLayout.push({panels:[]});
        leLayout[leLayout.length-1].panels.push({id:def.id,span:def.defaultSpan,visible:true,height:null});
        renderLayoutEditor();
      });
    }
    picker.appendChild(chip);
  }
  const customChip=document.createElement('button');
  customChip.className='le-picker-chip custom-chip';
  customChip.innerHTML='📝 + New Custom Panel';
  customChip.title='Add a custom text panel';
  customChip.addEventListener('click',()=>{
    closeLayoutEditorTemporarily();
    openCustomPanelModal(null);
  });
  picker.appendChild(customChip);

  const customPanels=DATA.customPanels||{};
  Object.keys(customPanels).forEach(id=>{
    if(usedIds.has(id)) return;
    const cp=customPanels[id];
    const chip=document.createElement('button');
    chip.className='le-picker-chip custom-chip';
    chip.innerHTML=`📝 ${cp.title||'Custom'}`;
    chip.title='Re-add this custom panel';
    chip.addEventListener('click',()=>{
      if(!leLayout.length) leLayout.push({panels:[]});
      leLayout[leLayout.length-1].panels.push({id,span:4,visible:true,height:null});
      renderLayoutEditor();
    });
    picker.appendChild(chip);
  });
}

function closeLayoutEditorTemporarily(){
  document.getElementById('layout-editor-overlay').classList.remove('open');
}
function reopenLayoutEditor(){
  leLayout=JSON.parse(JSON.stringify(DATA.viewerLayout||DEFAULT_VIEWER_LAYOUT));
  renderLayoutEditor();
  document.getElementById('layout-editor-overlay').classList.add('open');
}

document.getElementById('le-rows-container').addEventListener('click',e=>{
  const btn=e.target.closest('[data-le-action]'); if(!btn) return;
  const act=btn.dataset.leAction;
  const rowIdx=parseInt(btn.dataset.row);
  const panelIdx=parseInt(btn.dataset.panel);

  if(act==='span-dec'){
    leLayout[rowIdx].panels[panelIdx].span=Math.max(1,(leLayout[rowIdx].panels[panelIdx].span||6)-1);
    renderLayoutEditor();
  } else if(act==='span-inc'){
    leLayout[rowIdx].panels[panelIdx].span=Math.min(12,(leLayout[rowIdx].panels[panelIdx].span||6)+1);
    renderLayoutEditor();
  } else if(act==='height-inc'){
    const cur=leLayout[rowIdx].panels[panelIdx].height||200;
    leLayout[rowIdx].panels[panelIdx].height=Math.min(HEIGHT_MAX,cur+HEIGHT_STEP);
    renderLayoutEditor();
  } else if(act==='height-dec'){
    const cur=leLayout[rowIdx].panels[panelIdx].height||200;
    leLayout[rowIdx].panels[panelIdx].height=Math.max(HEIGHT_MIN,cur-HEIGHT_STEP);
    renderLayoutEditor();
  } else if(act==='height-reset'){
    leLayout[rowIdx].panels[panelIdx].height=null;
    renderLayoutEditor();
  } else if(act==='toggle-vis'){
    const p=leLayout[rowIdx].panels[panelIdx];
    p.visible=(p.visible===false)?true:false;
    renderLayoutEditor();
  } else if(act==='remove-panel'){
    leLayout[rowIdx].panels.splice(panelIdx,1);
    if(leLayout[rowIdx].panels.length===0) leLayout.splice(rowIdx,1);
    renderLayoutEditor();
  } else if(act==='remove-row'){
    leLayout.splice(rowIdx,1);
    renderLayoutEditor();
  } else if(act==='edit-custom'){
    const panelId=leLayout[rowIdx].panels[panelIdx].id;
    DATA.viewerLayout=JSON.parse(JSON.stringify(leLayout));
    closeLayoutEditorTemporarily();
    openCustomPanelModal(panelId);
  }
});

document.getElementById('le-add-row-btn').addEventListener('click',()=>{
  leLayout.push({panels:[]});
  renderLayoutEditor();
});
document.getElementById('le-save-btn').addEventListener('click',saveLayout);
document.getElementById('le-cancel-btn').addEventListener('click',closeLayoutEditor);
document.getElementById('le-reset-btn').addEventListener('click',resetLayoutToDefault);
document.getElementById('layout-edit-btn').addEventListener('click',openLayoutEditor);
document.getElementById('phone-layout-edit-btn').addEventListener('click',openPhoneLayoutEditor);
document.getElementById('nav-burger-btn').addEventListener('click',e=>{
  e.stopPropagation();
  const headerRight = document.querySelector('.header-right');
  if(headerRight) headerRight.classList.toggle('menu-open');
});
document.addEventListener('click',e=>{
  const headerRight = document.querySelector('.header-right');
  if(!headerRight) return;
  if(!headerRight.contains(e.target)) headerRight.classList.remove('menu-open');
});
document.getElementById('nav-actions').addEventListener('click',()=>{
  const headerRight = document.querySelector('.header-right');
  if(headerRight) headerRight.classList.remove('menu-open');
});
document.getElementById('ple-save-btn').addEventListener('click',savePhoneLayout);
document.getElementById('ple-cancel-btn').addEventListener('click',closePhoneLayoutEditor);
document.getElementById('ple-reset-btn').addEventListener('click',resetPhoneLayout);
document.getElementById('ple-sections-container').addEventListener('click',e=>{
  const btn = e.target.closest('[data-ple-action]'); if(!btn) return;
  const idx = parseInt(btn.dataset.idx,10);
  if(Number.isNaN(idx)) return;
  const act = btn.dataset.pleAction;
  if(act==='move-up' && idx>0){
    [pleLayout[idx-1],pleLayout[idx]]=[pleLayout[idx],pleLayout[idx-1]];
    renderPhoneLayoutEditor();
  } else if(act==='move-down' && idx < pleLayout.length-1){
    [pleLayout[idx],pleLayout[idx+1]]=[pleLayout[idx+1],pleLayout[idx]];
    renderPhoneLayoutEditor();
  } else if(act==='toggle-visible'){
    pleLayout[idx].visible = isPhoneSectionVisible(pleLayout[idx]) ? false : true;
    renderPhoneLayoutEditor();
  } else if(act==='remove'){
    pleLayout.splice(idx,1);
    renderPhoneLayoutEditor();
  }
});

// handle add-panel buttons in picker
document.getElementById('ple-panel-picker').addEventListener('click',e=>{
  const btn = e.target.closest('[data-ple-action]'); if(!btn) return;
  const act = btn.dataset.pleAction;
  if(act==='add-panel'){
    const panelId = btn.dataset.panelId;
    if(!panelId) return;
    pleLayout.push({id:panelId,visible:true});
    renderPhoneLayoutEditor();
  }
});

// ─── CUSTOM PANEL MODAL WIRING ───
document.getElementById('cp-cancel-btn').addEventListener('click',()=>{
  closeCustomPanelModal();
  reopenLayoutEditor();
});
document.getElementById('cp-ok-btn').addEventListener('click',()=>{
  confirmCustomPanel();
  reopenLayoutEditor();
});

// ─── EVENT WIRING ───
document.getElementById('lock-unlock-btn').addEventListener('click',doAdminLogin);
document.getElementById('lock-back-btn').addEventListener('click',cancelAdminLogin);
document.getElementById('pw-input').addEventListener('keydown',e=>{if(e.key==='Enter')doAdminLogin();});
document.getElementById('admin-email').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('pw-input').focus();});
document.getElementById('admin-btn').addEventListener('click',()=>{isAdminNow()?lockApp():showAdminLogin();});
document.getElementById('my-break-btn').addEventListener('click',openAgentBreakModal);
document.getElementById('abm-cancel-btn').addEventListener('click',closeAgentBreakModal);
document.getElementById('abm-ok-btn').addEventListener('click',confirmAgentBreak);
document.getElementById('abm-agent').addEventListener('change',updateAbmQuota);
document.getElementById('abm-pw').addEventListener('keydown',e=>{if(e.key==='Enter')confirmAgentBreak();});
document.getElementById('save-btn').addEventListener('click',saveData);
document.getElementById('archive-timeline-btn').addEventListener('click',archiveCurrentTimeline);
document.getElementById('save-timeline-btn').addEventListener('click',saveDailyTimeline);
const clearComfortBreaksBtn = document.getElementById('clear-comfort-breaks-btn');
if(clearComfortBreaksBtn) clearComfortBreaksBtn.addEventListener('click', openClearBreaksModal);
const clearBreaksCancelBtn = document.getElementById('clear-breaks-cancel-btn');
if(clearBreaksCancelBtn) clearBreaksCancelBtn.addEventListener('click', closeClearBreaksModal);
const clearBreaksConfirmBtn = document.getElementById('clear-breaks-confirm-btn');
if(clearBreaksConfirmBtn) clearBreaksConfirmBtn.addEventListener('click', confirmClearComfortBreaks);
document.getElementById('open-timeline-history-btn').addEventListener('click',openTimelineHistoryModal);
document.getElementById('timeline-history-close-btn').addEventListener('click',closeTimelineHistoryModal);
document.getElementById('timeline-history-list').addEventListener('click',e=>{
  const deleteBtn = e.target.closest('[data-action="delete-timeline"]');
  if(deleteBtn){
    e.stopPropagation();
    pendingDeleteKey = deleteBtn.dataset.key;
    confirmDeleteTimeline();
    return;
  }
  const row = e.target.closest('[data-action="select-timeline"]');
  if(!row) return;
  selectDailyTimeline(row.dataset.key);
});
document.getElementById('delete-timeline-cancel-btn').addEventListener('click',()=>{
  pendingDeleteKey = null;
  document.getElementById('delete-timeline-modal').classList.remove('open');
});
document.getElementById('delete-timeline-confirm-btn').addEventListener('click',executeDeleteTimeline);
document.getElementById('add-coffee-btn').addEventListener('click',()=>openModal('coffee'));
document.getElementById('add-lunch-btn').addEventListener('click',()=>openModal('lunch'));
document.getElementById('import-excel-btn').addEventListener('click',openExcelModal);
document.getElementById('add-task-btn').addEventListener('click',openTaskModal);
document.getElementById('task-cancel-btn').addEventListener('click',closeTaskModal);
document.getElementById('task-ok-btn').addEventListener('click',confirmAddTask);
document.getElementById('add-task-card-btn').addEventListener('click',openTaskModal);
document.getElementById('br-cancel-btn').addEventListener('click',closeBreakRequestModal);
document.getElementById('br-ok-btn').addEventListener('click',confirmBreakRequest);

function handleViewerBreakEditRequest(e){
  const bar=e.target.closest('.tl-bar');
  if(!bar||isAdminNow()) return;
  const type=bar.dataset.type, idx=bar.dataset.idx;
  if(!type||!idx) return;
  const agent=bar.dataset.tip?.split('·').pop().trim()||'';
  const originalStart=parseInt(bar.dataset.start,10), originalEnd=parseInt(bar.dataset.end,10);
  openBreakRequestModal({type,idx:parseInt(idx,10),agent,originalStart,originalEnd});
}

document.getElementById('viewer-grid').addEventListener('dblclick',handleViewerBreakEditRequest);
document.getElementById('viewer-grid').addEventListener('click',e=>{ if(e.detail===2) handleViewerBreakEditRequest(e); });

document.getElementById('custom-tasks-list').addEventListener('click',e=>{
  const btn=e.target.closest('[data-action]'); if(!btn) return; const act=btn.dataset.action; const idx=parseInt(btn.dataset.idx);
  if(act==='task-delete'){ try{requireAdmin();}catch(e){return;} DATA.customTasks.splice(idx,1); render(); saveData(); }
  else if(act==='task-edit'){ try{requireAdmin();}catch(e){return;} const t=DATA.customTasks[idx]; if(!t) return; _editingTaskIndex=idx; document.getElementById('task-agent').value=t.agent; document.getElementById('task-title').value=t.title; document.getElementById('task-start').value=pad(Math.floor(t.start/60))+':'+pad(t.start%60); document.getElementById('task-end').value=pad(Math.floor(t.end/60))+':'+pad(t.end%60); _taskSelectedColor=t.color||'purple'; populateTaskColorSwatches(); document.getElementById('task-modal').classList.add('open'); }
});

document.getElementById('break-requests-list').addEventListener('click',e=>{
  const btn=e.target.closest('[data-action]'); if(!btn) return; const action=btn.dataset.action; const id=btn.dataset.id;
  try{requireAdmin();}catch(e){return;}
  const idx=DATA.editRequests.findIndex(r=>r.id===id); if(idx<0) return;
  if(action==='request-approve'){
    const req=DATA.editRequests[idx];
    const breaks = req.type==='coffee'?DATA.coffeeBreaks:DATA.lunchBreaks;
    const bidx = breaks.findIndex(b=>b.agent===req.agent&&b.start===req.originalStart&&b.end===req.originalEnd);
    if(bidx>=0){ breaks[bidx].start=req.requestedStart; breaks[bidx].end=req.requestedEnd; }
    DATA.editRequests.splice(idx,1);
    render(); 
    saveEditRequests();
    if(req.type==='coffee') saveAgentBreak();
    else saveLunchBreak();
  } else if(action==='request-decline'){
    DATA.editRequests.splice(idx,1);
    render(); saveEditRequests();
  }
});
document.getElementById('modal-cancel-btn').addEventListener('click',closeModal);
document.getElementById('modal-ok-btn').addEventListener('click',confirmAddBreak);
document.getElementById('excel-cancel-btn').addEventListener('click',closeExcelModal);
document.getElementById('excel-ok-btn').addEventListener('click',confirmExcelImport);
document.getElementById('excel-paste').addEventListener('input',previewExcel);
document.getElementById('excel-paste').addEventListener('focus',function(){this.style.borderColor='var(--blue)';});
document.getElementById('excel-paste').addEventListener('blur',function(){this.style.borderColor='var(--border2)';});
document.getElementById('shift-import-cancel-btn').addEventListener('click',closeShiftImportModal);
document.getElementById('shift-import-ok-btn').addEventListener('click',confirmShiftImport);
document.getElementById('shift-import-paste').addEventListener('input',previewShiftImport);
document.getElementById('shift-import-paste').addEventListener('focus',function(){this.style.borderColor='var(--blue)';});
document.getElementById('shift-import-paste').addEventListener('blur',function(){this.style.borderColor='var(--border2)';});
document.getElementById('add-agent-btn').addEventListener('click',addAgent);
document.getElementById('patch-input').addEventListener('input',function(){if(!isAdminNow())return;DATA.patchingAgent=this.value;renderMetrics();saveData();});
document.getElementById('add-leave-btn').addEventListener('click',openLeaveModal);
document.getElementById('lv-cancel-btn').addEventListener('click',closeLeaveModal);
document.getElementById('lv-ok-btn').addEventListener('click',confirmAddLeave);
document.getElementById('lv-note').addEventListener('keydown',e=>{if(e.key==='Enter')confirmAddLeave();});
document.getElementById('tp-save-btn').addEventListener('click',saveTopPerformersEntry);
const tpDateInput = document.getElementById('tp-date');
if(tpDateInput){
  tpDateInput.addEventListener('change',renderTopPerformers);
}

// ─── CARD COLLAPSE HANDLERS ───
document.getElementById('app').addEventListener('click',e=>{
  const btn = e.target.closest('.card-collapse-btn');
  if(btn){
    const dataId = btn.dataset.collapse;
    if(dataId){
      const card = btn.closest('.card');
      if(card){
        card.classList.toggle('collapsed');
        btn.classList.toggle('collapsed');
        if(!DATA.cardCollapse) DATA.cardCollapse = {};
        DATA.cardCollapse[dataId] = card.classList.contains('collapsed');
        saveData();
      }
    }
  }
});

// Restore collapsed state on load
function restoreCardCollapses(){
  if(!DATA.cardCollapse) return;
  Object.entries(DATA.cardCollapse).forEach(([id, isCollapsed])=>{
    const btn = document.querySelector(`[data-collapse="${id}"]`);
    const card = btn?.closest('.card');
    if(card && isCollapsed){
      card.classList.add('collapsed');
      btn.classList.add('collapsed');
    }
  });
}

function clearComfortBreaks(){
  if(!Array.isArray(DATA.coffeeBreaks) || DATA.coffeeBreaks.length === 0) return false;
  DATA.coffeeBreaks = [];
  DATA.lastEODClearDate = formatDateKey(new Date());
  saveData();
  return true;
}

function maybeClearComfortBreaksAtEOD(){
  if(!DATA.clearComfortBreaksAtEOD) return false;
  const now = new Date();
  const currentDateKey = formatDateKey(now);
  if(now.getHours() < 23 || (now.getHours() === 23 && now.getMinutes() < 59)) return false;
  if(DATA.lastEODClearDate === currentDateKey) return false;
  const cleared = clearComfortBreaks();
  if(cleared){ DATA.lastEODClearDate = currentDateKey; }
  return cleared;
}

function openClearBreaksModal(){
  try{ requireAdmin(); } catch(e){ render(); return; }
  const modal = document.getElementById('clear-breaks-modal');
  if(modal) modal.classList.add('open');
}

function closeClearBreaksModal(){
  const modal = document.getElementById('clear-breaks-modal');
  if(modal) modal.classList.remove('open');
}

function confirmClearComfortBreaks(){
  try{ requireAdmin(); } catch(e){ render(); return; }
  const cleared = clearComfortBreaks();
  closeClearBreaksModal();
  render();
  if(!cleared){
    const el = document.getElementById('last-update');
    if(el) el.textContent='No comfort breaks to clear';
  }
}

function renderClearComfortBreaksToggle(){
  const el = document.getElementById('clear-eod-toggle');
  if(!el) return;
  el.checked = !!DATA.clearComfortBreaksAtEOD;
}

document.getElementById('app').addEventListener('change',e=>{
  const el=e.target,act=el.dataset.action,idx=parseInt(el.dataset.idx);
  if(!act) return;
  if(act==='break-name'){updateBreak(el.dataset.type,idx,'agent',el.value);
  }else if(act==='break-start'){updateBreakTime(el.dataset.type,idx,'start',el.value);
  }else if(act==='break-end'){updateBreakTime(el.dataset.type,idx,'end',el.value);
  }else if(act==='triage-agent'){try{requireAdmin();}catch(e){render();return;}DATA.triageSlots[idx].agent=el.value;renderMetrics();renderViewerGrid();saveData();
  }else if(act==='rule-edit'){try{requireAdmin();}catch(e){render();return;}DATA.rules[idx]=el.value;saveData();
  }else if(act==='agent-name'){try{requireAdmin();}catch(e){render();return;}const oldName=el.dataset.oldname;DATA.agents[idx]=el.value;if(DATA.agentPasswords&&oldName in DATA.agentPasswords){DATA.agentPasswords[el.value]=DATA.agentPasswords[oldName];delete DATA.agentPasswords[oldName];}if(DATA.agentBreakVisible&&oldName in DATA.agentBreakVisible){DATA.agentBreakVisible[el.value]=DATA.agentBreakVisible[oldName];delete DATA.agentBreakVisible[oldName];}if(DATA.agentScheduleVisible&&oldName in DATA.agentScheduleVisible){DATA.agentScheduleVisible[el.value]=DATA.agentScheduleVisible[oldName];delete DATA.agentScheduleVisible[oldName];}render();saveData();
  }else if(act==='agent-pw'){try{requireAdmin();}catch(e){return;}if(!DATA.agentPasswords)DATA.agentPasswords={};DATA.agentPasswords[el.dataset.agent]=el.value;saveData();
  }else if(act==='agent-break-vis'){try{requireAdmin();}catch(e){render();return;}if(!DATA.agentBreakVisible)DATA.agentBreakVisible={};DATA.agentBreakVisible[el.dataset.agent]=el.checked;render();saveData();
  }else if(act==='agent-schedule-vis'){try{requireAdmin();}catch(e){render();return;}if(!DATA.agentScheduleVisible)DATA.agentScheduleVisible={};DATA.agentScheduleVisible[el.dataset.agent]=el.checked;render();saveData();
  }else if(act==='clear-eod-toggle'){try{requireAdmin();}catch(e){render();return;}DATA.clearComfortBreaksAtEOD = el.checked; saveData();
  }else if(act==='shift-assign'){try{requireAdmin();}catch(e){render();return;}const key=el.dataset.date+':'+el.dataset.shift;if(!DATA.shiftAssignments)DATA.shiftAssignments={};
      const selected = Array.from(el.selectedOptions||[]).map(opt => opt.value.trim()).filter(Boolean);
      if(selected.length){DATA.shiftAssignments[key]=selected;}else{delete DATA.shiftAssignments[key];}
      render();saveData();
  }
});

document.getElementById('app').addEventListener('click',e=>{
  let el = e.target;
  while(el && el.nodeType === 3) el = el.parentElement;
  while(el && el.nodeType === 1 && !el.dataset.action) el = el.parentElement;
  if(!el || !el.dataset.action) return;
  const act=el.dataset.action,idx=parseInt(el.dataset.idx);
  if(act==='break-delete'){deleteBreak(el.dataset.type,idx);
  }else if(act==='rule-delete'){try{requireAdmin();}catch(e){return;}DATA.rules.splice(idx,1);render();saveData();
  }else if(act==='agent-delete'){removeAgent(idx);
  }else if(act==='leave-delete'){try{requireAdmin();}catch(e){return;}DATA.onLeave.splice(idx,1);render();saveData();
  }else if(act==='agent-pw-toggle'){const wrap=el.closest('.agent-pw-wrap');const inp=wrap.querySelector('.agent-pw-input');inp.type=inp.type==='password'?'text':'password';el.textContent=inp.type==='password'?'👁':'🙈';
  }else if(act==='tp-delete'){try{requireAdmin();}catch(e){return;}const date=el.dataset.date;if(DATA.topPerformers&&DATA.topPerformers[date]){delete DATA.topPerformers[date];renderTopPerformers();renderViewerGrid();saveData();}
  }else if(act==='expand-phone-section'){const section=el.dataset.section;if(section){PHONE_TIMELINE_EXPANDED_SECTIONS[section]=!PHONE_TIMELINE_EXPANDED_SECTIONS[section];render();}
  }else if(act==='open-shift-import'){openShiftImportModal();
  }else if(act==='shift-prev-day'){const d=new Date(shiftManagerViewDate||new Date());d.setDate(d.getDate()-1);setShiftManagerViewDate(formatDateKey(d));render();
  }else if(act==='shift-next-day'){const d=new Date(shiftManagerViewDate||new Date());d.setDate(d.getDate()+1);setShiftManagerViewDate(formatDateKey(d));render();
  }else if(act==='shift-today'){setShiftManagerViewDate(formatDateKey(new Date()));render();
  }
});

// ─── BOOT ───
applyMode();
render();
loadData().then(()=>attachRealtimeListener());
onAuthStateChanged(auth,(user)=>{
  document.getElementById('lock-screen').style.display='none';
  applyMode();
  if(user && !_firestoreAvailable){
    _firestoreAvailable = true;
    loadData().then(()=>attachRealtimeListener()).catch(e=>console.error('Reload after auth failed:', e));
  } else {
    render();
  }
});
