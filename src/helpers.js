import { dataService } from './services/dataService'
export const getInitial=()=>dataService.load()
export const fmtDate=d=>d?new Date(`${d}T00:00:00`).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'—'
export const classLabel=grade=>({PG:'Playgroup','E.Jr':'Euro Junior (LKG)','E.Sr':'Euro Senior (UKG)'}[grade]||grade)
export const initials=s=>s?.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase()||'NA'
