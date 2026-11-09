import {makeInitialData,groupFor,normalizeBoard,WALK_IN_OUTCOMES,isAdmissionStage} from '../data.js'
import {syncCapacityAdmissions} from '../capacityData.js'

const KEY='joshi-admissions-crm-v1'
const normalizeYear=value=>String(value||'').replace(/[–—−]/g,'-').replace(/\s/g,'')
const isRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)

export function normalizeSavedData(saved={}){
  const defaults=makeInitialData()
  const data={...defaults,...saved}
  for(const key of ['families','students','walkIns','walkInMappings','followUps','admissions','retention','retentionHistory','promotionHistory'])data[key]=Array.isArray(data[key])?data[key].filter(isRecord):[]
  data.settings={...defaults.settings,...(data.settings||{})}
  const savedCapacity=data.capacityPlan&&typeof data.capacityPlan==='object'?data.capacityPlan:{}
  data.capacityPlan=Object.fromEntries(Object.entries(defaults.capacityPlan).map(([group,rows])=>[group,Object.fromEntries(Object.entries(rows).map(([grade,row])=>[grade,{...row,...(savedCapacity[group]?.[grade]||{})}]))]))
  data.capacityRemarks=data.capacityRemarks&&typeof data.capacityRemarks==='object'?data.capacityRemarks:{}

  data.students=data.students.filter(student=>!student.id?.startsWith('ENQ-DEMO-'))
  const studentIds=new Set(data.students.map(student=>student.id))
  data.families=data.families.filter(family=>!String(family.id||'').startsWith('FAM-DEMO-'))
  for(const family of data.families){family.heard=Array.isArray(family.heard)?family.heard:[];family.alternateMobiles=Array.isArray(family.alternateMobiles)?family.alternateMobiles:[]}
  data.walkIns=data.walkIns.filter(walk=>!String(walk.id||'').startsWith('WI-DEMO-'))
  data.admissions=data.admissions.filter(admission=>studentIds.has(admission.studentId))

  for(const student of data.students){
    const legacy=student.stage
    student.name=String(student.name||'Unnamed student')
    student.grade=String(student.grade||'')
    student.stage=String(student.stage||'New Lead')
    student.board=normalizeBoard(student.board)
    student.groups=groupFor(student.board,student.grade)
    student.history=Array.isArray(student.history)?student.history:[]
    student.heard=Array.isArray(student.heard)?student.heard:[]
    if(student.walkInId&&!WALK_IN_OUTCOMES.includes(student.walkInOutcome))student.walkInOutcome='Pending'
    if(legacy==='Admission Confirmed'){const old=student.formalitiesStage||'';student.stage=old==='ERP & fees assigned'?'ERP & Fees Assigned':old==='Documents pending'?'Documents Pending':old==='All done'?'All Done':'Admission Form Taken'}
    else if(['Contacted','Likely to Join','On Hold'].includes(legacy))student.stage='Positive'
    else if(legacy==='Walk-in Completed')student.stage=student.walkInOutcome==='Positive'?'Walk-in Positive':student.walkInOutcome==='Negative'?'Walk-in Negative':'Walk-in Pending'
    else if(legacy==='Not Interested')student.stage='Lost'
    if(isAdmissionStage(student.stage))student.formalitiesStage=student.stage
  }
  data.walkIns=data.walkIns.map(walk=>({...walk,children:Array.isArray(walk.children)?walk.children:[],heard:Array.isArray(walk.heard)?walk.heard:[],studentIds:Array.isArray(walk.studentIds)?walk.studentIds:[]}))
  data.walkInMappings=data.walkInMappings.length?data.walkInMappings:data.walkIns.flatMap(w=>(w.studentIds||[]).map(studentId=>({id:`WIM-${w.id}-${studentId}`,walkInId:w.id,studentId,familyId:w.familyId,createdAt:w.submitted||new Date().toISOString()})))
  for(const walk of data.walkIns){
    for(const student of data.students)if(student.walkInId===walk.id&&!walk.studentIds.includes(student.id))walk.studentIds.push(student.id)
    for(const id of walk.studentIds){const student=data.students.find(item=>item.id===id);if(student&&!student.walkInId)student.walkInId=walk.id}
    const outcomes=walk.studentIds.map(id=>data.students.find(item=>item.id===id)?.walkInOutcome).filter(Boolean)
    walk.outcome=outcomes.length&&outcomes.every(value=>value==='Positive')?'Positive':outcomes.length&&outcomes.every(value=>value==='Negative')?'Negative':'Pending'
  }
  for(const admission of data.admissions)if(!admission.academicYear)admission.academicYear=data.settings.year
  const seenAdmissions=new Set()
  data.admissions=data.admissions.filter(item=>{const key=`${item.studentId}|${normalizeYear(item.academicYear)}`;if(!studentIds.has(item.studentId)||seenAdmissions.has(key))return false;seenAdmissions.add(key);return true})
  const admissionsByStudentYear=new Set(data.admissions.map(item=>`${item.studentId}|${normalizeYear(item.academicYear)}`))
  for(const student of data.students.filter(item=>isAdmissionStage(item.stage))){
    const key=`${student.id}|${normalizeYear(data.settings.year)}`
    if(!admissionsByStudentYear.has(key)){data.admissions.push({id:`ADM-${student.id}-${normalizeYear(data.settings.year)}`,studentId:student.id,familyId:student.familyId,academicYear:data.settings.year,confirmedAt:student.created||new Date().toISOString()});admissionsByStudentYear.add(key)}
  }
  syncCapacityAdmissions(data)
  return data
}

export const mockAdapter={
  load(){
    try{const value=localStorage.getItem(KEY);return normalizeSavedData(value?JSON.parse(value):makeInitialData())}
    catch(error){try{const damaged=localStorage.getItem(KEY);if(damaged)localStorage.setItem(`${KEY}-recovery-${Date.now()}`,damaged)}catch{}console.error('Could not load saved admission data; starting with an empty workspace.',error);return makeInitialData()}
  },
  save(data){try{localStorage.setItem(KEY,JSON.stringify(data));return data}catch(error){console.error('Could not save admission data.',error);throw error}},
  reset(){const data=makeInitialData();localStorage.setItem(KEY,JSON.stringify(data));return data}
}
