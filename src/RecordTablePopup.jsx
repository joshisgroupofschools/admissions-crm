import {useMemo,useState} from 'react'
import {X} from 'lucide-react'
import {ADMISSION_STAGES,BOARDS,CLASSES,HEARD_SOURCES,isAdmissionStage} from './data'
import {classLabel,fmtDate} from './helpers'

const FOLLOW_SORT='Earliest Follow-up First'
const SORTS=['Latest Enquiry First','Oldest Enquiry First',FOLLOW_SORT,'Latest Follow-up First','Student Name A–Z','Class','Stage']
const stageName=record=>{
 if(record.stage==='New Lead')return 'Not Contacted Yet'
 if(record.stage==='Positive')return 'Spoke on Call'
 if(record.stage==='Contacted - Seems Positive')return 'Contacted – Seems Positive'
 if(record.stage==='Contacted - Seems Negative')return 'Contacted – Seems Negative'
 if(record.stage==='Contacted - Undecided')return 'Contacted – Undecided'
 if(record.stage==='Contacted - Not Answering')return 'Contacted – Not Answering'
 if(record.stage==='Not Contacted')return 'Not Contacted'
 if(record.stage==='Not Answering')return 'Not Answering'
 if(record.stage==='Lost'&&record.walkInOutcome)return `Walk-in – ${record.walkInOutcome}`
 if(String(record.stage||'').startsWith('Walk-in'))return `Walk-in – ${record.walkInOutcome||record.stage.replace('Walk-in ','')}`
 if(isAdmissionStage(record.stage))return 'Taken Admission'
 if(record.stage==='Lost')return 'Lost Admission'
 return record.stage||'Pending'
}
const boardName=record=>record.board||''
function rowsFor(records,kind){
 if(kind!=='walkins')return records.map(record=>({id:record.id,record,child:record,created:record.created||'',walkIn:null}))
 return records.flatMap(walk=>{
  const children=walk.children?.length?walk.children:[{name:'(No child details)',grade:'',board:''}]
  return children.map((child,index)=>({id:`${walk.id}-${index}`,record:walk,child,created:walk.submitted||walk.created||'',walkIn:walk}))
 })
}

export function RecordTablePopup({title,records=[],families=[],kind='students',sourceOptions=HEARD_SOURCES,defaultSort,onClose,onOpen}){
 const [search,setSearch]=useState(''),[grade,setGrade]=useState(''),[board,setBoard]=useState(''),[stage,setStage]=useState(''),[source,setSource]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[sort,setSort]=useState(defaultSort||'Latest Enquiry First')
  const rows=useMemo(()=>{
  const prepared=rowsFor(records,kind).map(row=>{
   const child=row.child||{},record=row.record,family=families.find(item=>item.id===record.familyId||item.id===child.familyId)
   const heard=child.heard?.length?child.heard:record.heard?.length?record.heard:family?.heard||[]
   const mapped={...row,child,family,heard,phone:family?.mobile||record.parentMobile||'',stage:kind==='walkins'?(record.outcome||'Pending'):stageName(child),board:boardName(child),grade:child.grade||'',studentName:child.name||record.fatherName||record.parent||'',remark:child.remarks||record.remarks||'',referral:[...new Set([...(heard||[]),record.referrer].filter(Boolean))].join(', ')||child.source||record.source||'',previousSchool:child.previousSchool||record.previousSchool||'',followUp:child.followUp||record.followUp||''}
   return mapped
  })
  const needle=search.trim().toLowerCase()
  const filtered=prepared.filter(row=>{
   if(grade&&row.grade!==grade)return false
   if(board&&row.board!==board)return false
   if(stage&&row.stage!==stage)return false
   if(source&&!row.heard.includes(source)&&row.record.source!==source)return false
   if(from&&row.created<from)return false
   if(to&&row.created>to)return false
   if(needle&&!`${row.studentName} ${row.grade} ${row.board} ${row.phone} ${row.referral} ${row.stage} ${row.remark} ${row.previousSchool}`.toLowerCase().includes(needle))return false
   return true
  })
  const dateSort=(a,b,key,direction)=>String(a[key]||'').localeCompare(String(b[key]||''))*direction
  filtered.sort((a,b)=>{
   if(sort==='Latest Enquiry First')return dateSort(a,b,'created',-1)
   if(sort==='Oldest Enquiry First')return dateSort(a,b,'created',1)
   if(sort===FOLLOW_SORT)return dateSort(a,b,'followUp',1)||dateSort(a,b,'created',-1)
   if(sort==='Latest Follow-up First')return dateSort(a,b,'followUp',-1)
   if(sort==='Student Name A–Z')return a.studentName.localeCompare(b.studentName)
   if(sort==='Class')return a.grade.localeCompare(b.grade,undefined,{numeric:true})||a.studentName.localeCompare(b.studentName)
   if(sort==='Stage')return a.stage.localeCompare(b.stage)||a.studentName.localeCompare(b.studentName)
   return 0
  })
  return filtered
 },[records,families,kind,search,grade,board,stage,source,from,to,sort])
  const stages=[...new Set(rowsFor(records,kind).map(row=>kind==='walkins'?(row.record.outcome||'Pending'):stageName(row.child||row.record)))].filter(Boolean).sort()
 const clear=()=>{setSearch('');setGrade('');setBoard('');setStage('');setSource('');setFrom('');setTo('');setSort(defaultSort||'Latest Enquiry First')}
 const openRow=row=>onOpen?.(row.record,row.walkIn)
 return <div className="records-overlay" role="dialog" aria-modal="true" aria-label={title} onMouseDown={event=>event.target===event.currentTarget&&onClose()}>
  <section className="records-popup">
   <header className="records-popup-head"><div><h2>{title}</h2><p>{rows.length} records · Select a row to open the student record</p></div><button type="button" className="records-popup-close" aria-label="Close records" onClick={onClose}><X size={21}/></button></header>
   <div className="records-filters" aria-label="Filter and sort records">
    <label className="records-search">Search<input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Student, phone, school or remark"/></label>
    <label>Class<select value={grade} onChange={event=>setGrade(event.target.value)}><option value="">All classes</option>{CLASSES.map(item=><option value={item} key={item}>{classLabel(item)}</option>)}</select></label>
    <label>Board<select value={board} onChange={event=>setBoard(event.target.value)}><option value="">All boards</option>{BOARDS.map(item=><option value={item} key={item}>{item}</option>)}</select></label>
    <label>Stage<select value={stage} onChange={event=>setStage(event.target.value)}><option value="">All stages</option>{stages.map(item=><option value={item} key={item}>{item}</option>)}</select></label>
   <label>Source / Referred by<select value={source} onChange={event=>setSource(event.target.value)}><option value="">All sources</option>{sourceOptions.map(item=><option value={item} key={item}>{item}</option>)}</select></label>
    <label>From date<input type="date" value={from} onChange={event=>setFrom(event.target.value)}/></label>
    <label>To date<input type="date" value={to} onChange={event=>setTo(event.target.value)}/></label>
    <label className="records-sort">Sort By<select value={sort} onChange={event=>setSort(event.target.value)}>{SORTS.map(item=><option value={item} key={item}>{item}</option>)}</select></label>
    <button type="button" className="records-clear" onClick={clear}>Clear filters</button>
   </div>
   <div className="records-table-scroll"><table className="records-excel-table"><thead><tr><th>S.No</th><th>Date of Enquiry</th><th>Student Name</th><th>Class</th><th>Board</th><th>Referred By</th><th>Previous School</th><th>Phone Number</th><th>Stage of Enquiry</th><th>Remark</th><th>Next Follow-up Date</th></tr></thead><tbody>
    {rows.map((row,index)=><tr key={row.id} tabIndex={0} onClick={()=>openRow(row)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openRow(row)}}}><td data-label="S.No">{index+1}</td><td data-label="Date of Enquiry">{fmtDate(row.created)}</td><td data-label="Student Name" className="records-student-name">{row.studentName}</td><td data-label="Class">{classLabel(row.grade)||'—'}</td><td data-label="Board">{row.board||'—'}</td><td data-label="Referred By">{row.referral||'—'}</td><td data-label="Previous School">{row.previousSchool||'—'}</td><td data-label="Phone Number">{row.phone||'—'}</td><td data-label="Stage of Enquiry">{row.stage}</td><td data-label="Remark" className="records-remark">{row.remark||'—'}</td><td data-label="Next Follow-up Date">{fmtDate(row.followUp)}</td></tr>)}
    {!rows.length&&<tr><td colSpan="11" className="records-empty">No matching records.</td></tr>}
   </tbody></table></div>
   <footer className="records-popup-foot">Showing {rows.length} records <span>· Click a row to open it</span></footer>
  </section>
 </div>
}
