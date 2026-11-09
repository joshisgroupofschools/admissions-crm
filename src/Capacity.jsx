import {useEffect,useRef,useState} from 'react'
import {X} from 'lucide-react'
import {CAPACITY_GROUPS,boardCapacity,capacityRows,groupCapacity,groupScopeTotals,normalizeCapacityRow} from './capacityData'

const boards=['SSC','EUROKIDS','CBSE']
const scopes=[
 {id:'ALL',label:'All boards',type:'all'},
 {id:'GROUPS',label:'All groups',type:'groups'},
 {id:'ssc-kg',label:'SSC KG',type:'group'},
 {id:'ssc-1-5',label:'SSC 1-5',type:'group'},
 {id:'ssc-6-10',label:'SSC 6-10',type:'group'},
 {id:'eurokids',label:'EUROKIDS',type:'group'},
 {id:'cbse-1-5',label:'CBSE 1-5',type:'group'},
 {id:'cbse-6-10',label:'CBSE 6-10',type:'group'},
]
const totalKeys=['priorStrength','priorPromotedOut','priorLeft','priorPromotedIn','opening2627','joined','currentStrength','promotedOut','promotedIn','expectedLeave','expectedRetained','capacity','admissionsNeeded','admissionsGot','strength2728','admissionsYet']
const editable=['priorStrength','priorLeft','joined','currentStrength','promotedOut','promotedIn','opening','expectedLeave','capacity','rooms']
const money=n=>Number(n||0).toLocaleString('en-IN')
const minus=n=>Number(n||0)===0?'0':`\u2212${money(n)}`
const sumGroups=groups=>Object.fromEntries(totalKeys.map(key=>[key,groups.reduce((sum,group)=>sum+Number(group[key]||0),0)]))
const groupRows=[
 ['priorStrength','25-26 Strength','plain','year-strength'],
 ['priorPromotedOut','25-26 Promoted Out','minus','negative'],
 ['priorLeft','25-26 Left','minus','negative'],
 ['priorPromotedIn','25-26 Promoted In','plus','positive'],
 ['opening2627','26-27 Opening Strength','plain','neutral'],
 ['joined','26-27 Joined','plus','positive'],
 ['currentStrength','26-27 Strength','plain','year-strength'],
 ['promotedOut','26-27 Promoted Out','minus','negative'],
 ['promotedIn','26-27 Promoted In','plus','positive'],
 ['expectedLeave','27-28 Expected to Leave','minus','negative'],
 ['expectedRetained','27-28 Opening / Expected Retained','plain','neutral'],
 ['admissionsGot','Admissions Got','plus','positive'],
 ['strength2728','27-28 Live Strength','plain','year-strength'],
 ['capacity','27-28 Target / Capacity','plain','target-strength'],
 ['admissionsNeeded','Admissions Needed','plain','positive'],
 ['admissionsYet','Admissions Yet to Get','plain','mild-positive'],
 ['expectedIncrease','Expected Increase','plain','expected-increase'],
 ['realIncrease','Real Increase','plain','mild-positive'],
]
const groupMetricColumns=[
 ['currentStrength','26-27 Actual Strength','plain','year-strength'],
 ['opening','27-28 Strength (After Promotion)','plain','neutral'],
 ['expectedLeave','Expected to Leave','minus','negative'],
 ['expectedRetained','27-28 Expected Retained','plain','neutral'],
 ['capacity','Target / Capacity','plain','target-strength'],
 ['admissionsGot','Admissions Got','plus','positive'],
 ['strength2728','Live Strength','plain','year-strength'],
 ['admissionsYet','Admissions Yet to Get','plain','mild-positive'],
 ['expectedIncrease','Expected Increase','plain','expected-increase'],
 ['realIncrease','Real Increase','plain','mild-positive'],
]
const groupClassMetricColumns=[
 ['currentStrength','26-27 Actual Strength','plain','class-strength'],
 ['opening','27-28 Strength (After Promotion)','plain','class-strength'],
 ['expectedLeave','Expected to Leave','minus','negative'],
 ['expectedRetained','27-28 Expected Retained','plain','class-neutral'],
 ['capacity','Target / Capacity','plain','target-strength'],
 ['admissionsNeeded','Admissions Needed','plain','positive'],
 ['admissionsGot','Admissions Got','plus','positive'],
 ['strength2728','Live Strength','plain','class-live-strength'],
 ['admissionsYet','Admissions Yet to Get','plain','class-positive'],
 ['expectedIncrease','Expected Increase','plain','expected-increase'],
 ['realIncrease','Real Increase','plain','class-positive'],
]
const metricValue=(values,key)=>key==='expectedIncrease'?Number(values.capacity||0)-Number(values.currentStrength||0):key==='realIncrease'?Number(values.strength2728||0)-Number(values.currentStrength||0):Number(values[key]||0)
const signed=(values,key,sign)=>sign==='minus'?minus(metricValue(values,key)):sign==='plus'?(metricValue(values,key)===0?'0':`+${money(metricValue(values,key))}`):money(metricValue(values,key))

export function CapacityScreen({data,update}){
 const [scope,setScope]=useState('GROUPS')
 const [groupId,setGroupId]=useState('')
 const [selected,setSelected]=useState(null)
 const [showFull,setShowFull]=useState(false)
 const matrixWrap=useRef(null)
 useEffect(()=>{if(matrixWrap.current)matrixWrap.current.scrollLeft=0;setShowFull(false)},[scope])
 const boardTotals=Object.fromEntries(boards.map(name=>[name,boardCapacity(data,name)]))
 const groupTotals=CAPACITY_GROUPS.map(group=>({...groupCapacity(data,group.id),group}))
 const groupGrandTotal=groupScopeTotals(data)
 const boardGrandTotal=sumGroups(Object.values(boardTotals))
 const selectedGroup=CAPACITY_GROUPS.find(group=>group.id===groupId)
 const selectedSummary=groupTotals.find(item=>item.group.id===groupId)
 const classValues=selectedGroup?capacityRows(data,selectedGroup.id):[]
 const selectedScope=scopes.find(item=>item.id===scope)
 const columns=scope==='ALL'?[...boards.map(name=>({key:`total-${name}`,label:`TOTAL ${name}`,kind:'board-total',values:boardTotals[name]})),{key:'grand-total',label:'GRAND TOTAL',kind:'grand-total',values:boardGrandTotal}]:scope==='GROUPS'?[...groupTotals.map(item=>({key:item.group.id,label:item.group.name,kind:'group',values:item})),{key:'grand-total',label:'GRAND TOTAL',kind:'grand-total',values:groupGrandTotal}]:selectedScope?.type==='group'?[{key:scope,label:groupTotals.find(item=>item.group.id===scope)?.group.name||scope,kind:'group-total',values:selectedSummary||groupTotals.find(item=>item.group.id===scope)}]:[
  {key:`total-${scope}`,label:`TOTAL ${scope}`,kind:'board-total',values:boardTotals[scope]},
 ]
 const classColumns=selectedGroup?[
  ...classValues.map(row=>({key:row.name,label:row.name,kind:'class',values:row})),
  {key:'total-group',label:`TOTAL ${selectedGroup.name}`,kind:'group-total',values:selectedSummary},
 ]:[]
 function chooseScope(id){setScope(id);setGroupId(scopes.find(item=>item.id===id)?.type==='group'?id:'')}
 function setValue(targetGroup,grade,key,value){update(d=>{d.capacityPlan ||= {};d.capacityPlan[targetGroup] ||= {};const before=d.capacityPlan[targetGroup][grade]||{};d.capacityPlan[targetGroup][grade]=normalizeCapacityRow({...before,[key]:Math.max(0,Math.floor(Number(value)||0))})})}
 const rowLabel=scope!=='ALL'&&scope!=='GROUPS'?groupMetricColumns:groupRows
 const visibleRows=showFull?rowLabel:rowLabel.filter(([,label,,kind])=>['year-strength','positive','mild-positive','target-strength','expected-increase'].includes(kind))
 const tableColumns=selectedGroup?classColumns:columns
 return <>
  <div className="page-header capacity-page-header"><div><div className="eyebrow">SCHOOL CAPACITY - 25-26, 26-27 & 27-28</div><h1>Capacity Planning</h1><p>One table for every group, board total and class figure.</p></div></div>
  <div className="capacity-table-toolbar">
   <div className="capacity-board-tabs">{scopes.map(item=><button key={item.id} className={scope===item.id?'active':''} onClick={()=>chooseScope(item.id)}>{item.label}</button>)}</div>
   {selectedGroup&&<div><h2>{selectedGroup.name}</h2><p>Class figures for this group.</p></div>}
  </div>
  <div className={`capacity-matrix-wrap ${selectedGroup?'capacity-matrix-group-wrap':''}`} ref={matrixWrap}>
   {selectedGroup?<>
    <table className="capacity-matrix class-matrix">
     <thead><tr><th scope="col">Calculation</th>{[...classValues.map(row=>({key:row.name,label:row.name,values:row})),{key:'total',label:`TOTAL ${selectedGroup.name}`,values:selectedSummary}].map(column=><th scope="col" key={column.key}>{column.key==='total'?column.label:<button type="button" className="capacity-class-header-button" title={`Edit ${column.label} figures`} aria-label={`Edit ${column.label} strength and capacity figures`} onClick={()=>setSelected({grade:column.label,group:selectedGroup})}>{column.label}</button>}</th>)}</tr></thead>
     <tbody>{groupClassMetricColumns.map(([key,label,sign,kind])=><tr key={key} className={kind}><th scope="row">{label}</th>{[...classValues,{...selectedSummary,name:'total'}].map(row=><td key={row.name}>{signed(row,key,sign)}</td>)}</tr>)}</tbody>
    </table>
    <div className="capacity-mobile-class-list">
     {[...classValues,{...selectedSummary,name:`TOTAL ${selectedGroup.name}`,isTotal:true}].map(row=><article className="capacity-mobile-class-card" key={row.name}>
      {row.isTotal?<h3>{row.name}</h3>:<button type="button" className="capacity-mobile-class-title" onClick={()=>setSelected({grade:row.name,group:selectedGroup})}>{row.name}<span>Edit</span></button>}
      <div className="capacity-mobile-class-metrics">{groupClassMetricColumns.map(([key,label,sign,kind])=><div className={`capacity-mobile-metric ${kind}`} key={key}><span>{label}</span><strong>{signed(row,key,sign)}</strong></div>)}</div>
     </article>)}
    </div>
   </>:<><table className="capacity-matrix">
    <thead><tr><th scope="col">Calculation</th>{tableColumns.map(column=><th scope="col" className={column.kind} key={column.key}>{column.label}</th>)}</tr></thead>
    <tbody>{visibleRows.map(([key,label,sign,kind])=><tr key={key} className={kind}><th scope="row">{label}</th>{tableColumns.map(column=><td className={column.kind} key={column.key}>{signed(column.values,key,sign)}</td>)}</tr>)}</tbody>
   </table>{(scope==='ALL'||scope==='GROUPS')&&<button type="button" className="capacity-show-full" onClick={()=>setShowFull(value=>!value)}>{showFull?'Show Less ↑':'Show Full Table ↓'}</button>}</>}
  </div>
  {selected&&<div className="modal-backdrop" onMouseDown={event=>event.target===event.currentTarget&&setSelected(null)}><div className="modal wide capacity-detail-modal"><div className="modal-head"><div><h2>{selected.grade} - {selected.group.name}</h2><p>Edit class figures.</p></div><button className="close-button" aria-label="Close edit dialog" onClick={()=>setSelected(null)}><X size={16}/></button></div>{(()=>{const row=capacityRows(data,selected.group.id).find(item=>item.name===selected.grade)||{};const fields=[['priorStrength','25-26 Strength'],['priorLeft','25-26 Left'],['joined','26-27 Joined'],['currentStrength','26-27 Strength'],['promotedOut','26-27 Promoted Out'],['promotedIn','26-27 Promoted In'],['opening','27-28 Opening'],['expectedLeave','27-28 Expected to Leave'],['capacity','27-28 Capacity'],['rooms','27-28 Sections']];return <div className="capacity-detail-body"><div className="capacity-edit-grid">{fields.filter(([key])=>editable.includes(key)).map(([key,label])=><label key={key}>{label}<input type="number" min="0" step="1" value={row[key]??0} onChange={event=>setValue(selected.group.id,selected.grade,key,event.target.value)}/></label>)}</div></div>})()}<div className="modal-actions capacity-detail-actions"><button className="button primary" onClick={()=>setSelected(null)}>Done</button></div></div></div>}
 </>
}

