(() => {
  'use strict';
  const STORAGE_KEY = 'routerakshak-demo-v1';
  const initialStudents = [
    { id:'ST-1042', name:'Aarav Mehta', grade:'Class 5 · A', initials:'AM', color:'mint', bus:'RR-012', route:'Route A', guardian:'Neha Mehta', guardianContact:'Guardian app (demo)', status:'WAITING FOR PICKUP', leg:'morning', lastEvent:null },
    { id:'ST-1088', name:'Anaya Kapoor', grade:'Class 4 · B', initials:'AK', color:'lavender', bus:'RR-012', route:'Route A', guardian:'Rohan Kapoor', guardianContact:'Guardian app (demo)', status:'IN THE BUS', leg:'morning', lastEvent:{type:'BOARDING',label:'Boarding confirmed',at:new Date(Date.now()-9*60000).toISOString(),actor:'Demo conductor'} },
    { id:'ST-1103', name:'Ishaan Verma', grade:'Class 6 · A', initials:'IV', color:'peach', bus:'RR-018', route:'Route B', guardian:'Pooja Verma', guardianContact:'Guardian app (demo)', status:'IN SCHOOL', leg:'afternoon', lastEvent:{type:'SCHOOL_ARRIVAL',label:'School arrival',at:new Date(Date.now()-28*60000).toISOString(),actor:'Demo school staff'} },
    { id:'ST-1127', name:'Myra Singh', grade:'Class 3 · C', initials:'MS', color:'blue', bus:'RR-018', route:'Route B', guardian:'Aman Singh', guardianContact:'Guardian app (demo)', status:'WAITING FOR PICKUP', leg:'morning', lastEvent:null },
    { id:'ST-1151', name:'Vivaan Joshi', grade:'Class 7 · B', initials:'VJ', color:'mint', bus:'RR-012', route:'Route A', guardian:'Kavita Joshi', guardianContact:'Guardian app (demo)', status:'HOME DROPPED', leg:'complete', lastEvent:{type:'HOME_DROP',label:'Home drop confirmed',at:new Date(Date.now()-55*60000).toISOString(),actor:'Demo conductor'} },
    { id:'ST-1196', name:'Saanvi Rao', grade:'Class 5 · A', initials:'SR', color:'lavender', bus:'RR-018', route:'Route B', guardian:'Deepak Rao', guardianContact:'Guardian app (demo)', status:'IN THE BUS', leg:'afternoon', lastEvent:{type:'RETURN_BOARDING',label:'Return boarding',at:new Date(Date.now()-6*60000).toISOString(),actor:'Demo conductor'} }
  ];
  const seedEvents = initialStudents.filter(s=>s.lastEvent).map(s=>({id:'seed-'+s.id,type:s.lastEvent.type,label:s.lastEvent.label,studentId:s.id,studentName:s.name,bus:s.bus,route:s.route,leg:s.leg,at:s.lastEvent.at,actor:s.lastEvent.actor,guardian:s.guardian,notificationStatus:'demo-only'})).sort((a,b)=>new Date(b.at)-new Date(a.at));
  let state = loadState();
  let currentView = 'overview';
  const demoSessionKey = 'routerakshak-demo-session';
  let searchTerm = '';
  let statusFilter = 'all';
  let pendingAction = null;
  let gpsTick = 0;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function loadState() {
    try { const raw=localStorage.getItem(STORAGE_KEY); if(raw){const parsed=JSON.parse(raw);if(Array.isArray(parsed.students)&&Array.isArray(parsed.events))return parsed;} } catch(e) { /* storage may be disabled */ }
    return { students: initialStudents, events: seedEvents, notifications: [], role:'conductor' };
  }
  function saveState(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(e){toast('Browser storage unavailable','This session may not persist after refresh.','warning');}}
  const statusClass = status => ({'WAITING FOR PICKUP':'waiting','IN THE BUS':'inbus','IN SCHOOL':'inschool','HOME DROPPED':'home'}[status]||'waiting');
  function formatTime(iso){if(!iso)return 'Not recorded';const d=new Date(iso);return d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});}
  function formatDate(iso){if(!iso)return '—';const d=new Date(iso);return d.toLocaleDateString([], {day:'2-digit',month:'short'})+' · '+formatTime(iso);}
  function relativeTime(iso){if(!iso)return 'No event yet';const mins=Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/60000));if(mins<1)return 'Just now';if(mins<60)return mins+' min ago';return Math.floor(mins/60)+' hr ago';}
  function initials(name){return name.split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase();}
  function nextAction(student){if(student.status==='WAITING FOR PICKUP')return {type:'BOARDING',label:'Confirm boarding',next:'IN THE BUS',leg:'morning',roles:['conductor','driver']};if(student.status==='IN THE BUS'&&student.leg==='morning')return {type:'SCHOOL_ARRIVAL',label:'Confirm school arrival',next:'IN SCHOOL',leg:'school',roles:['school_staff']};if(student.status==='IN SCHOOL')return {type:'RETURN_BOARDING',label:'Confirm return boarding',next:'IN THE BUS',leg:'afternoon',roles:['conductor','driver']};if(student.status==='IN THE BUS'&&student.leg==='afternoon')return {type:'HOME_DROP',label:'Confirm home drop',next:'HOME DROPPED',leg:'complete',roles:['conductor','driver']};if(student.status==='HOME DROPPED')return {type:'NEW_DAY',label:'Reset for next day',next:'WAITING FOR PICKUP',leg:'morning',roles:['admin']};return null;}
  function roleLabel(role){return ({admin:'School admin',school_staff:'School staff',conductor:'Driver / conductor',driver:'Driver',guardian:'Guardian (read-only)'})[role]||role;}
  function canAct(student,action){return action && action.roles.includes(state.role);}
  function render(){applyRoleExperience();renderMetrics();renderStudents();renderRecent();renderAuditCount();if(currentView!=='overview')renderFullView();}
  function visibleStudents(){
    if(state.role==='guardian') return state.students.filter(s=>s.id==='ST-1088');
    if(state.role==='driver'||state.role==='conductor') return state.students.filter(s=>s.bus==='RR-012');
    return state.students;
  }
  function applyRoleExperience(){
    const role=state.role||'admin';
    document.querySelectorAll('.nav-item').forEach(b=>{
      const v=b.dataset.view;
      const allowed=role==='admin'||(role==='school_staff'&&['overview','students','audit'].includes(v))||(['driver','conductor'].includes(role)&&['overview','students','fleet'].includes(v))||(role==='guardian'&&['overview','students'].includes(v));
      b.classList.toggle('hidden',!allowed);
    });
    const badge=document.querySelector('.top-actions .avatar');if(badge)badge.textContent=role==='guardian'?'PA':role==='admin'?'AD':role==='school_staff'?'ST':'DR';
    const copy=document.querySelector('.profile-copy strong');if(copy)copy.textContent=roleLabel(role);
    const note=document.querySelector('.privacy-note p');if(note)note.textContent=role==='guardian'?'Parent preview: linked demo child only.':'Demo data only. Notifications are not sent.';
  }
  function renderMetrics(){const s=state.students;$('metricBus').textContent=s.filter(x=>x.status==='IN THE BUS').length;$('metricSchool').textContent=s.filter(x=>x.status==='IN SCHOOL').length;$('metricHome').textContent=s.filter(x=>x.status==='HOME DROPPED').length;$('metricBuses').textContent=new Set(s.filter(x=>x.status!=='HOME DROPPED').map(x=>x.bus)).size;$('auditCount').textContent=state.events.length;$('todayLabel').textContent=new Date().toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'});}
  function filteredStudents(){return visibleStudents().filter(s=>(!searchTerm||[s.name,s.id,s.bus,s.route,s.guardian].some(v=>v.toLowerCase().includes(searchTerm)))&&(statusFilter==='all'||s.status===statusFilter));}
  function actionButton(s){const a=nextAction(s);if(!a)return '<span class="muted-text">Complete</span>';if(!canAct(s,a))return '<span class="muted-text">'+(state.role==='guardian'?'View only':'Role restricted')+'</span>';return '<button class="row-action" data-action="'+esc(s.id)+'">'+esc(a.label)+' <span>→</span></button>';}
  function renderStudents(){const list=filteredStudents();$('studentRows').innerHTML=list.map(s=>'<tr><td><div class="student-cell"><span class="student-avatar '+esc(s.color)+'">'+esc(s.initials||initials(s.name))+'</span><span><strong>'+esc(s.name)+'</strong><small>'+esc(s.id)+' · '+esc(s.grade)+'</small></span></div></td><td><strong>'+esc(s.route)+'</strong><small class="table-subline">Bus '+esc(s.bus)+'</small></td><td><span class="status-pill '+statusClass(s.status)+'"><i></i>'+esc(s.status)+'</span><small class="table-subline">'+(s.leg==='afternoon'?'Return trip':s.leg==='morning'?'Morning trip':s.leg==='school'?'School arrival':s.leg==='complete'?'Trip complete':'—')+'</small></td><td><strong>'+esc(s.lastEvent?formatTime(s.lastEvent.at):'—')+'</strong><small class="table-subline">'+esc(s.lastEvent?s.lastEvent.label:'No event yet')+'</small></td><td>'+actionButton(s)+'</td></tr>').join('')||'<tr><td colspan="5"><div class="empty-state">No students match this filter.</div></td></tr>';$('recordCount').textContent=list.length+' students';}
  function renderRecent(){const events=state.events.slice().sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,5);$('recentEvents').innerHTML=events.map(e=>'<div class="event-row"><div class="event-icon '+(e.type==='SCHOOL_ARRIVAL'?'green-event':e.type==='HOME_DROP'?'amber-event':'teal-event')+'">'+(e.type==='SCHOOL_ARRIVAL'?'⌂':e.type==='HOME_DROP'?'✓':'▣')+'</div><div class="event-copy"><strong>'+esc(e.studentName)+' <span>'+esc(e.label)+'</span></strong><small>'+esc(e.bus)+' · '+esc(e.actor)+'</small></div><time>'+esc(relativeTime(e.at))+'</time></div>').join('')||'<div class="empty-state">No events yet. Confirm a student journey event to begin.</div>';}
  function renderAuditCount(){$('auditCount').textContent=state.events.length;}
  function renderFullView(){const title=currentView==='students'?'Student journey register':currentView==='fleet'?'Fleet & routes':'Audit history';$('crumb').textContent=title;$('fullKicker').textContent=currentView==='audit'?'APPEND-ONLY DEMO LOG':'MANAGEMENT';$('fullTitle').textContent=title;$('fullDesc').textContent=currentView==='students'?'Manual check-in and check-out for the selected journey.':currentView==='fleet'?'Vehicles, assigned routes and simulated telemetry.':'Timestamped actions recorded in this browser session.';let html='';if(currentView==='students'){html='<div class="full-controls"><label class="search-box"><span>⌕</span><input id="fullSearch" placeholder="Search student or guardian…" value="'+esc(searchTerm)+'" /></label><label class="role-control"><span>Acting as (demo)</span><select id="roleSelect"><option value="conductor" '+(state.role==='conductor'?'selected':'')+'>Driver / conductor</option><option value="driver" '+(state.role==='driver'?'selected':'')+'>Driver</option><option value="school_staff" '+(state.role==='school_staff'?'selected':'')+'>School staff</option><option value="admin" '+(state.role==='admin'?'selected':'')+'>School admin</option><option value="guardian" '+(state.role==='guardian'?'selected':'')+'>Guardian · read-only</option></select></label></div><div class="role-warning">Role switcher is for UI demonstration only. Production permissions must be enforced on the server.</div><div class="register-grid">'+visibleStudents().map(s=>{const a=nextAction(s);return '<article class="register-card"><div class="register-card-top"><span class="student-avatar '+esc(s.color)+'">'+esc(s.initials||initials(s.name))+'</span><span class="status-pill '+statusClass(s.status)+'"><i></i>'+esc(s.status)+'</span></div><h3>'+esc(s.name)+'</h3><p>'+esc(s.id)+' · '+esc(s.grade)+'</p><div class="register-details"><span>Route</span><strong>'+esc(s.route)+' · '+esc(s.bus)+'</strong><span>Guardian</span><strong>'+esc(s.guardian)+'</strong><span>Last event</span><strong>'+esc(s.lastEvent?formatDate(s.lastEvent.at):'Not recorded')+'</strong></div>'+(a&&canAct(s,a)?'<button class="primary-button full-action" data-action="'+esc(s.id)+'">'+esc(a.label)+' →</button>':a?'<button class="secondary-button full-action" disabled>'+esc(state.role==='guardian'?'Guardian view only':'Not permitted for this role')+'</button>':'<span class="completed-label">✓ Journey complete</span>')+'</article>';}).join('')+'</div>';}
    else if(currentView==='fleet'){html='<div class="fleet-register">'+Array.from(new Set(state.students.map(s=>s.bus))).map((bus,i)=>{const students=state.students.filter(s=>s.bus===bus);const route=students[0]?.route||'Unassigned';return '<article class="fleet-card"><div class="fleet-card-head"><div class="vehicle-icon">▣</div><span class="live-tag"><i></i> SIMULATED</span></div><h3>'+esc(bus)+'</h3><p>'+esc(route)+' · '+(i===0?'North Campus Loop':'East Connector')+'</p><div class="fleet-numbers"><div><strong>'+students.length+'</strong><small>Assigned students</small></div><div><strong>'+students.filter(s=>s.status==='IN THE BUS').length+'</strong><small>Currently aboard</small></div></div><div class="progress-track"><span style="width:'+(i===0?'58':'34')+'%"></span></div><small class="table-subline">GPS coordinates are simulated, not live.</small></article>';}).join('')+'</div><div class="role-warning">Vehicle dots and route progress are illustrative. No real vehicle or child is being tracked.</div>';}
    else {html='<div class="audit-tools"><div><strong>'+state.events.length+' recorded events</strong><p>Demo-only browser log · Times shown in local timezone</p></div><button class="secondary-button" id="exportAudit">Export CSV ↓</button></div><div class="table-wrap audit-table-wrap"><table><thead><tr><th>TIMESTAMP</th><th>STUDENT</th><th>EVENT</th><th>BUS / ROUTE</th><th>ACTOR</th><th>GUARDIAN ALERT</th></tr></thead><tbody>'+state.events.slice().sort((a,b)=>new Date(b.at)-new Date(a.at)).map(e=>'<tr><td>'+esc(formatDate(e.at))+'</td><td><strong>'+esc(e.studentName)+'</strong><small class="table-subline">'+esc(e.studentId)+'</small></td><td>'+esc(e.label)+'</td><td>'+esc(e.bus)+' / '+esc(e.route)+'</td><td>'+esc(e.actor)+'</td><td><span class="status-pill waiting"><i></i>Demo only</span></td></tr>').join('')+'</tbody></table></div><p class="role-warning">This browser log can be edited or cleared by the local user; it is not a tamper-proof production audit trail.</p>';}
    $('fullContent').innerHTML=html;}
  function setView(view){currentView=view;document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('overviewGrid').classList.toggle('hidden',view!=='overview');$('lowerGrid').classList.toggle('hidden',view!=='overview');$('fullView').classList.toggle('hidden',view==='overview');$('pageTitle').innerHTML=view==='overview'?'School transport, <em>at a glance.</em>':view==='students'?'Student <em>attendance register.</em>':view==='fleet'?'Vehicles & <em>routes.</em>':'Attendance <em>event log.</em>';$('pageSubtitle').textContent=view==='overview'?'Check who is aboard, who has reached school, and which hand-off still needs confirming.':view==='students'?'Record each boarding and drop-off only after staff have confirmed it.':view==='fleet'?'Review vehicle assignments and illustrative route movement.':'Review the time and operator recorded for each attendance change.';$('crumb').textContent=view==='overview'?'Overview':view==='students'?'Student journey':view==='fleet'?'Fleet & routes':'Event history';render();window.scrollTo({top:0,behavior:'smooth'});}
  function requestAction(studentId){const s=state.students.find(x=>x.id===studentId);if(!s)return;const a=nextAction(s);if(!a)return;if(!canAct(s,a)){toast('Action not permitted','Current demo role cannot confirm this event.','warning');return;}pendingAction={studentId,action:a};$('dialogIcon').textContent=a.type==='SCHOOL_ARRIVAL'?'⌂':a.type==='HOME_DROP'?'✓':'▣';$('dialogTitle').textContent=a.label+'?';$('dialogMessage').textContent='Student: '+s.name+' · '+s.id+'\nBus: '+s.bus+' · '+s.route+'\nActor: '+roleLabel(state.role)+'. This will save a timestamped event to this browser and create a demo guardian notification.';$('dialogMessage').style.whiteSpace='pre-line';$('dialogConfirm').textContent='Confirm event';$('confirmDialog').showModal();}
  function confirmAction(){if(!pendingAction)return;const {studentId,action}=pendingAction;const s=state.students.find(x=>x.id===studentId);if(!s){pendingAction=null;return;}const current=nextAction(s);if(!current||current.type!==action.type||!canAct(s,current)){pendingAction=null;$('confirmDialog').close();toast('Could not confirm','The journey changed or the action is no longer permitted.','warning');return;}const now=new Date().toISOString();const event={id:makeId(),type:action.type,label:action.label,studentId:s.id,studentName:s.name,bus:s.bus,route:s.route,leg:action.leg,at:now,actor:roleLabel(state.role),guardian:s.guardian,notificationStatus:'queued-demo'};s.status=action.next;s.leg=action.leg;s.lastEvent={type:event.type,label:event.label,at:now,actor:event.actor};state.events.unshift(event);state.notifications.unshift({id:makeId(),eventId:event.id,guardian:s.guardian,studentId:s.id,studentName:s.name,title:notificationTitle(event.type,s.name),body:notificationBody(event.type,s.name,s.bus),at:now,channel:'in-app demo',status:'not-sent'});saveState();pendingAction=null;$('confirmDialog').close();render();toast('Journey updated',s.name+' · '+s.status,'success');}
  function makeId(){return 'evt-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);}
  function notificationTitle(type,name){if(type==='BOARDING')return name+' boarded the bus';if(type==='SCHOOL_ARRIVAL')return name+' arrived at school';if(type==='RETURN_BOARDING')return name+' started the return journey';if(type==='HOME_DROP')return name+' was marked home dropped';return 'Journey updated for '+name;}
  function notificationBody(type,name,bus){if(type==='BOARDING')return 'Boarding confirmed on '+bus+'.';if(type==='SCHOOL_ARRIVAL')return 'Authorized school arrival confirmation recorded.';if(type==='RETURN_BOARDING')return 'Return boarding confirmed on '+bus+'.';if(type==='HOME_DROP')return 'Authorized home drop confirmation recorded.';return 'A journey event was recorded.';}
  function toast(title,message,tone='success'){const el=document.createElement('div');el.className='toast '+tone;el.innerHTML='<span class="toast-symbol">'+(tone==='warning'?'!':'✓')+'</span><span><strong>'+esc(title)+'</strong><small>'+esc(message)+'</small></span><button aria-label="Dismiss notification">×</button>';el.querySelector('button').addEventListener('click',()=>el.remove());$('toastStack').appendChild(el);setTimeout(()=>{if(el.isConnected)el.remove();},5200);}
  function exportCsv(){const headers=['timestamp_iso','student_id','student_name','event_type','event_label','bus','route','trip_leg','actor','guardian','notification_status'];const rows=state.events.map(e=>[e.at,e.studentId,e.studentName,e.type,e.label,e.bus,e.route,e.leg,e.actor,e.guardian,e.notificationStatus]);const csv=[headers,...rows].map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='routerakshak-demo-audit.csv';a.click();URL.revokeObjectURL(url);}
  document.addEventListener('click',e=>{const nav=e.target.closest('[data-view]');if(nav&&!nav.classList.contains('hidden')){setView(nav.dataset.view);return;}const action=e.target.closest('[data-action]');if(action){requestAction(action.dataset.action);return;}if(e.target.id==='backOverview')setView('overview');if(e.target.id==='exportAudit')exportCsv();});
  document.addEventListener('input',e=>{if(e.target.id==='searchInput'){searchTerm=e.target.value.toLowerCase().trim();renderStudents();}if(e.target.id==='fullSearch'){const val=e.target.value.toLowerCase().trim();document.querySelectorAll('.register-card').forEach(card=>card.classList.toggle('hidden',!card.textContent.toLowerCase().includes(val)));}});
  document.addEventListener('change',e=>{if(e.target.id==='statusFilter'){statusFilter=e.target.value;renderStudents();}if(e.target.id==='roleSelect'){state.role=e.target.value;saveState();render();toast('Demo role changed',roleLabel(state.role)+(state.role==='guardian'?' · read-only access':' · permissions shown for demo'),'success');}});
  $('dialogConfirm').addEventListener('click',e=>{e.preventDefault();confirmAction();});
  function applyTheme(theme){
    const dark=theme==='dark';
    document.body.classList.toggle('dark-theme',dark);
    const toggle=$('themeToggle');
    if(toggle){
      toggle.textContent=dark?'☼':'☾';
      toggle.setAttribute('aria-label',dark?'Switch to light theme':'Switch to dark theme');
      toggle.title=dark?'Switch to light theme':'Switch to dark theme';
    }
    try{localStorage.setItem('routerakshak-theme',dark?'dark':'light');}catch(e){}
  }
  let savedTheme='light';
  try{savedTheme=localStorage.getItem('routerakshak-theme')||'light';}catch(e){}
  applyTheme(savedTheme);
  $('themeToggle').addEventListener('click',()=>applyTheme(document.body.classList.contains('dark-theme')?'light':'dark'));
  // Clearly simulated telemetry; this never changes student attendance.
  function tickGps(){gpsTick=(gpsTick+1)%100;const lat=(28.6139+Math.sin(gpsTick/12)*0.012).toFixed(4);const lon=(77.2090+Math.cos(gpsTick/14)*0.015).toFixed(4);$('gpsCoord').textContent=lat+'° N · '+lon+'° E';$('gpsSpeed').textContent=(18+Math.round((Math.sin(gpsTick/5)+1)*7))+' km/h';const progress=48+Math.round((Math.sin(gpsTick/17)+1)*9);$('routeProgress').style.width=progress+'%';$('progressLabel').textContent=progress+'% complete';}
  const loginGate=$('loginGate'), appShell=$('appShell');
  function openDemoWorkspace(){
    if(loginGate) loginGate.classList.add('hidden');
    if(appShell) appShell.classList.remove('hidden');
  }
  const demoLoginForm=$('demoLoginForm');
  if(demoLoginForm) demoLoginForm.addEventListener('submit',e=>{
    e.preventDefault();
    state.role=$('loginRole')?.value || 'admin';
    saveState();
    try { sessionStorage.setItem(demoSessionKey,'active'); } catch(err) { /* session storage may be blocked */ }
    openDemoWorkspace();
    setView('overview');
    toast('Demo workspace opened',roleLabel(state.role),'success');
  });
  let demoSessionActive=false;
  try { demoSessionActive=sessionStorage.getItem(demoSessionKey)==='active'; } catch(err) { /* session storage may be blocked */ }
  if(demoSessionActive){openDemoWorkspace();}else{
    if(loginGate) loginGate.classList.remove('hidden');
    if(appShell) appShell.classList.add('hidden');
  }
  render();tickGps();setInterval(tickGps,4500);
})();
