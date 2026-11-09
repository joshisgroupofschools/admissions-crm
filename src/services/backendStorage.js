import {backendApi,newIdempotencyKey} from './backendApi.js'
import {makeInitialData,groupFor,normalizeBoard} from '../data.js'
import {CAPACITY_GROUPS,normalizeCapacityRow,syncCapacityAdmissions,groupScopeTotals} from '../capacityData.js'
import {normalizeSavedData} from '../adapters/mockAdapter.js'

const BUSINESS_TABLES=['Families','WalkIns','Students','WalkInChildren','WalkInLinks','FollowUps','Admissions','Retention','RetentionHistory','PromotionHistory','CapacityPlan','SchoolSettings']
const ID_FIELDS=['Families','WalkIns','Students','WalkInChildren','WalkInLinks','FollowUps','Admissions','Retention','RetentionHistory','PromotionHistory']
const cleanYear=value=>String(value||'').replace(/[–—−]/g,'-').replace(/\s/g,'')
const norm=value=>String(value||'').trim().toLowerCase().replace(/[–—−]/g,'-').replace(/\s+/g,' ')
const copy=value=>structuredClone(value)
const stripInternal=record=>{const result={...record};delete result._backendVersion;return result}
export async function loadBackendState(token){
  const response=await backendApi.bootstrap(token)
  const result=response.tables||{}
  const school=result.Schools.find(row=>row.code==='JOSHI-VIDYANIKETAN')||result.Schools[0]
  if(!school)throw new Error('The school setup is missing from the shared database.')
  const config={school,years:result.AcademicYears,structure:result.SchoolStructure,settings:result.SchoolSettings}
  const data=makeInitialData()
  const fromRows=(table)=>result[table].map(row=>{
    const source=row.crmDataJSON&&typeof row.crmDataJSON==='object'?copy(row.crmDataJSON):fallbackUiRow(table,row,config)
    source.id=row.id
    source._backendVersion=Number(row.version||1)
    return source
  })
  for(const table of ['Families','Students','WalkIns','FollowUps','Admissions','Retention','RetentionHistory','PromotionHistory']){
    const key={Families:'families',Students:'students',WalkIns:'walkIns',FollowUps:'followUps',Admissions:'admissions',Retention:'retention',RetentionHistory:'retentionHistory',PromotionHistory:'promotionHistory'}[table]
    data[key]=fromRows(table)
  }
  data.walkInMappings=fromRows('WalkInLinks')
  const childrenByWalk=new Map()
  for(const row of result.WalkInChildren){const child=row.crmDataJSON&&typeof row.crmDataJSON==='object'?copy(row.crmDataJSON):fallbackUiRow('WalkInChildren',row,config);const list=childrenByWalk.get(row.walkInId)||[];list[Number(row.position)||0]=child;childrenByWalk.set(row.walkInId,list)}
  data.walkIns=data.walkIns.map(walk=>({...walk,children:childrenByWalk.get(walk.id)?.filter(Boolean)||walk.children||[]}))
  const groupById=new Map(result.SchoolStructure.filter(r=>r.entityType==='group').map(r=>[r.id,r.code.replace(/^group:/,'')]))
  const classById=new Map(result.SchoolStructure.filter(r=>r.entityType==='class').map(r=>[r.id,r.name]))
  for(const row of result.CapacityPlan){
    const group=groupById.get(row.groupId),grade=classById.get(row.classId)
    if(!group||!grade)continue
    data.capacityPlan[group] ||= {}
    const source=row.crmDataJSON&&typeof row.crmDataJSON==='object'?copy(row.crmDataJSON):{
      priorStrength:row.priorStrength,priorLeft:row.priorLeft,joined:row.joined,currentStrength:row.currentStrength,
      promotedOut:row.promotedOut,promotedIn:row.promotedIn,opening:row.opening,expectedLeave:row.expectedLeave,capacity:row.capacity,rooms:row.rooms,
    }
    data.capacityPlan[group][grade]=normalizeCapacityRow(source)
  }
  for(const row of result.SchoolSettings){
    try{data.settings[row.settingKey]=typeof row.valueJSON==='string'?JSON.parse(row.valueJSON):row.valueJSON}catch{data.settings[row.settingKey]=row.valueJSON}
  }
  syncCapacityAdmissions(data)
  const normalized=normalizeSavedData(data)
  return {data:normalized,config,rows:result,counts:businessCounts(normalized)}
}

function fallbackUiRow(table,row,config){
  const board=config.structure.find(r=>r.id===row.boardId)?.name||''
  const group=config.structure.find(r=>r.id===row.groupId)?.name||''
  const cls=config.structure.find(r=>r.id===row.classId)?.name||''
  if(table==='Families')return{id:row.id,parent:row.parentName,fatherName:row.fatherName,occupation:row.occupation,mobile:row.mobile,mobile2:row.alternateMobile,reasonForChoosing:row.reasonForChoosing,heard:row.heardJSON||[]}
  if(table==='Students')return{id:row.id,familyId:row.familyId,name:row.name,admissionNumber:row.admissionNumber,dateOfBirth:row.dateOfBirth,gender:row.gender,board:normalizeBoard(board),group:group,groups:group?[group]:[],grade:row.grade,source:row.source,heard:row.heardJSON||[],stage:row.stage,followUp:row.followUpDate,remarks:row.remarks,history:row.historyJSON||[],remarkHistory:row.remarkHistoryJSON||[],walkInId:row.walkInId,walkInOutcome:row.walkInOutcome,lossReason:row.lossReason,lossReasonDetail:row.lossReasonDetail,previousSchool:row.previousSchool,created:row.createdAt}
  if(table==='WalkIns')return{id:row.id,familyId:row.familyId,submitted:row.submittedAt,fatherName:row.fatherName,occupation:row.occupation,parentMobile:row.parentMobile,secondaryMobile:row.secondaryMobile,reasonForChoosing:row.reasonForChoosing,heard:row.heardJSON||[],outcome:row.outcome,followUp:row.followUpDate,remarks:row.remarks,status:row.status,children:[],studentIds:[]}
  if(table==='WalkInChildren')return{id:row.id,name:row.name,grade:row.grade,board:normalizeBoard(board),dateOfBirth:row.dateOfBirth,gender:row.gender,previousSchool:row.previousSchool}
  if(table==='WalkInLinks')return{id:row.id,walkInId:row.walkInId,studentId:row.studentId,familyId:row.familyId,createdAt:row.createdAt}
  if(table==='FollowUps')return{id:row.id,studentId:row.studentId,walkInId:row.walkInId,familyId:row.familyId,date:row.date,remarks:row.remarks,previousRemarks:row.previousRemarks,nextFollowUp:row.nextFollowUp,completedAt:row.createdAt}
  return{id:row.id,...row}
}

function structureIndexes(config){
  const boards=new Map(),groups=new Map(),classes=new Map()
  for(const row of config.structure){
    if(row.entityType==='board')boards.set(norm(row.name),row.id)
    if(row.entityType==='group')groups.set(norm(row.name),row.id)
    if(row.entityType==='class')classes.set(`${row.parentId}|${norm(row.name)}`,row.id)
  }
  const groupRecords=new Map(config.structure.filter(r=>r.entityType==='group').map(r=>[r.id,r]))
  const classRecord=(board,grade)=>{
    let name=String(grade||'')
    const normalized=normalizeBoard(board)
    if(/^Grade\s+\d+$/i.test(name))name=`${normalized==='EuroKids'?'':normalized+' '}${name.match(/\d+/)[0]}`
    if(normalized==='EuroKids'&&name==='LKG')name='E.Jr'
    if(normalized==='EuroKids'&&name==='UKG')name='E.Sr'
    if(normalized==='SSC'&&name==='E.Jr')name='LKG'
    if(normalized==='SSC'&&name==='E.Sr')name='UKG'
    const parentGroup=groupFor(normalized,grade).map(g=>groups.get(norm(g))).find(Boolean)
    if(parentGroup)return classes.get(`${parentGroup}|${norm(name)}`)||''
    for(const [key,id] of classes){if(key.endsWith(`|${norm(name)}`)){const cls=config.structure.find(c=>c.id===id),g=groupRecords.get(cls?.parentId),b=config.structure.find(c=>c.id===g?.parentId);if(norm(b?.name)===norm(normalized))return id}}
    return ''
  }
  const groupId=(board,grade)=>groupFor(normalizeBoard(board),grade).map(g=>groups.get(norm(g))).find(Boolean)||''
  return{boards,groups,classes,groupId,classId:classRecord}
}

function yearsIndex(config){return new Map(config.years.map(row=>[cleanYear(row.label),row.id]))}
function schoolYear(config,label){return yearsIndex(config).get(cleanYear(label))||''}
function uiRecord(record){return{...stripInternal(record)}}
function crmJSON(record){return uiRecord(record)}

export function buildMigrationPlan(data,config){
  const indexes=structureIndexes(config),schoolId=config.school.id,yearIds=yearsIndex(config),records={}
  const add=(table,record)=>{(records[table] ||= []).push(record)}
  const issues=[]
  const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{8,160}$/.test(id)
  const seen=new Map()
  const trackId=(table,id)=>{if(!validId(id))issues.push(`${table}: a record has a missing or unsupported ID.`);const key=`${table}|${id}`;if(seen.has(key))issues.push(`${table}: duplicate record ID ${id}.`);seen.set(key,true)}
  for(const family of data.families||[]){trackId('Families',family.id);if(!family.mobile)issues.push(`Family ${family.parent||family.id}: mobile number is missing.`);add('Families',{id:family.id,schoolId,parentName:family.parent||family.parentName||family.fatherName||'',fatherName:family.fatherName||family.parent||'',occupation:family.occupation||family.fatherOccupation||'',mobile:String(family.mobile||''),alternateMobile:family.mobile2||family.alternateMobile||'',reasonForChoosing:family.reasonForChoosing||'',heardJSON:family.heard||[],crmDataJSON:crmJSON(family)})}
  for(const walk of data.walkIns||[]){trackId('WalkIns',walk.id);if(!walk.parentMobile)issues.push(`Walk-in ${walk.id}: mobile number is missing.`);add('WalkIns',{id:walk.id,schoolId,familyId:walk.familyId||'',submittedAt:walk.submitted||walk.createdAt||'',fatherName:walk.fatherName||'',occupation:walk.occupation||'',parentMobile:String(walk.parentMobile||''),secondaryMobile:String(walk.secondaryMobile||''),reasonForChoosing:walk.reasonForChoosing||'',heardJSON:walk.heard||[],outcome:walk.outcome||'Pending',followUpDate:walk.followUp||'',remarks:walk.remarks||'',status:walk.status||'unmatched',crmDataJSON:crmJSON(walk)})}
  for(const student of data.students||[]){trackId('Students',student.id);const board=normalizeBoard(student.board),boardId=indexes.boards.get(norm(board))||'';if(board&&!boardId)issues.push(`Student ${student.name}: board “${board}” is not in the school setup.`);const groupId=indexes.groupId(board,student.grade),classId=indexes.classId(board,student.grade);add('Students',{id:student.id,schoolId,familyId:student.familyId||'',admissionNumber:student.admissionNumber||'',name:student.name||'Unnamed student',dateOfBirth:student.dateOfBirth||'',gender:student.gender||'',boardId,groupId,classId,grade:student.grade||'',source:student.source||'',heardJSON:student.heard||[],stage:student.stage||'New Lead',followUpDate:student.followUp||'',remarks:student.remarks||'',historyJSON:student.history||[],remarkHistoryJSON:student.remarkHistory||[],walkInId:student.walkInId||'',walkInOutcome:student.walkInOutcome||'',lossReason:student.lossReason||'',lossReasonDetail:student.lossReasonDetail||'',previousSchool:student.previousSchool||'',crmDataJSON:crmJSON(student)})}
  for(const walk of data.walkIns||[]){(walk.children||[]).forEach((child,index)=>{const board=normalizeBoard(child.board),id=`WIC-${walk.id}-${index+1}`;trackId('WalkInChildren',id);add('WalkInChildren',{id,walkInId:walk.id,position:index+1,name:child.name||`Child ${index+1}`,classId:indexes.classId(board,child.grade),grade:child.grade||'',boardId:indexes.boards.get(norm(board))||'',dateOfBirth:child.dateOfBirth||'',gender:child.gender||'',previousSchool:child.previousSchool||'',crmDataJSON:crmJSON(child)})})}
  for(const link of data.walkInMappings||[]){const id=link.id||`WIM-${link.walkInId}-${link.studentId}`;trackId('WalkInLinks',id);add('WalkInLinks',{id,walkInId:link.walkInId,studentId:link.studentId,familyId:link.familyId||'',crmDataJSON:crmJSON({...link,id})})}
  for(const follow of data.followUps||[]){trackId('FollowUps',follow.id);add('FollowUps',{id:follow.id,studentId:follow.studentId,walkInId:follow.walkInId||'',familyId:follow.familyId||'',date:String(follow.date||follow.completedAt||'').slice(0,10),remarks:follow.remarks||'',previousRemarks:follow.previousRemarks||'',nextFollowUp:follow.nextFollowUp||'',crmDataJSON:crmJSON(follow)})}
  for(const admission of data.admissions||[]){trackId('Admissions',admission.id);const year=cleanYear(admission.academicYear||data.settings.year);if(!yearIds.get(year))issues.push(`Admission ${admission.id}: academic year ${year} is not configured.`);add('Admissions',{id:admission.id,schoolId,studentId:admission.studentId,familyId:admission.familyId||'',academicYearId:yearIds.get(year)||'',academicYear:year,confirmedAt:admission.confirmedAt||'',crmDataJSON:crmJSON(admission)})}
  const retentionIds=new Map((data.retention||[]).map(row=>[String(row.studentId||''),row.id]))
  const studentIds=new Set((data.students||[]).map(row=>row.id))
  for(const row of data.retention||[]){trackId('Retention',row.id);const board=normalizeBoard(row.board),year=cleanYear(row.academicYear||'2026-27');if(!yearIds.get(year))issues.push(`Retention record ${row.id}: academic year ${year} is not configured.`);const linkedStudent=studentIds.has(row.studentId)?row.studentId:'';add('Retention',{id:row.id,schoolId,studentId:linkedStudent,admissionNumber:row.admissionNumber||(!linkedStudent?row.studentId||'':''),name:row.name||'Unnamed student',classId:indexes.classId(board,row.grade),grade:row.grade||'',boardId:indexes.boards.get(norm(board))||'',groupId:indexes.groupId(board,row.grade),academicYearId:yearIds.get(year)||'',status:row.status||'Continuing',reason:row.reason||'',dateFlagged:row.dateFlagged||'',remarks:row.remarks||'',leavingDate:row.leavingDate||'',tcDate:row.tcDate||'',schoolJoined:row.schoolJoined||'',leavingReason:row.leavingReason||'',promotionApplied:!!row.promotionApplied,promotedClassId:indexes.classId(row.promotedBoard||board,row.promotedGrade),promotedBoardId:indexes.boards.get(norm(normalizeBoard(row.promotedBoard||board)))||'',promotedGroupId:(row.promotedGroups||[]).map(name=>indexes.groups.get(norm(name))).find(Boolean)||'',crmDataJSON:crmJSON(row)})}
  for(const history of data.retentionHistory||[]){const id=history.id||`RH-${history.studentId}-${history.date}`;trackId('RetentionHistory',id);const retentionId=history.retentionId||retentionIds.get(String(history.studentId||''))||'';add('RetentionHistory',{id,schoolId,retentionId,studentId:studentIds.has(history.studentId)?history.studentId:'',eventType:history.eventType||history.type||'Status',fromStatus:history.fromStatus||history.from||'',toStatus:history.toStatus||history.to||'',eventDate:history.eventDate||history.date||history.createdAt||new Date().toISOString().slice(0,10),remarks:history.remarks||'',crmDataJSON:crmJSON({...history,id})})}
  for(const promotion of data.promotionHistory||[]){trackId('PromotionHistory',promotion.id);const year=yearIds.get(cleanYear(promotion.academicYear||'2026-27'))||yearIds.get('2026-27')||'';add('PromotionHistory',{id:promotion.id,schoolId,academicYearId:year,studentId:'',fromClassId:'',toClassId:'',fromName:'',toName:'',externalExit:false,promotionBatchId:promotion.id,promotedAt:promotion.createdAt||new Date().toISOString(),crmDataJSON:crmJSON(promotion)})}
  const structure=config.structure.filter(row=>row.entityType==='class')
  for(const cls of structure){const group=config.structure.find(row=>row.id===cls.parentId);const groupName=group?.code.replace(/^group:/,'');const source=data.capacityPlan?.[groupName]?.[cls.name];if(!source){issues.push(`Capacity plan is missing ${groupName} / ${cls.name}.`);continue}const id=`CP-${groupName}-${cls.name}`.replace(/[^A-Za-z0-9_-]/g,'_');trackId('CapacityPlan',id);add('CapacityPlan',{id,schoolId,academicYearId:yearIds.get('2027-28')||'',groupId:group.id,classId:cls.id,priorStrength:Number(source.priorStrength||0),priorLeft:Number(source.priorLeft||0),joined:Number(source.joined||0),currentStrength:Number(source.currentStrength||0),promotedOut:Number(source.promotedOut||0),promotedIn:Number(source.promotedIn||0),opening:Number(source.opening||0),expectedLeave:Number(source.expectedLeave||0),capacity:Number(source.capacity||0),rooms:Number(source.rooms||0),crmDataJSON:crmJSON(source)})}
  const settingIds=new Map((config.settings||[]).filter(row=>row.schoolId===schoolId).map(row=>[row.settingKey,row.id]))
  for(const [key,value] of Object.entries(data.settings||{})){const id=settingIds.get(key)||`SETTING-${key}`;trackId('SchoolSettings',id);add('SchoolSettings',{id,schoolId,settingKey:key,valueJSON:value})}
  if(!yearIds.get(cleanYear(data.settings?.year)))issues.push(`Current academic year ${data.settings?.year||''} is not configured.`)
  const familySet=new Set((data.families||[]).map(row=>row.id));const walkSet=new Set((data.walkIns||[]).map(row=>row.id))
  for(const student of data.students||[]){if(student.familyId&&!familySet.has(student.familyId))issues.push(`Student ${student.id}: family link is missing.`);if(student.walkInId&&!walkSet.has(student.walkInId))issues.push(`Student ${student.id}: walk-in link is missing.`)}
  for(const link of data.walkInMappings||[]){if(!walkSet.has(link.walkInId))issues.push(`Walk-in link ${link.id}: walk-in record is missing.`);if(!studentIds.has(link.studentId))issues.push(`Walk-in link ${link.id}: student record is missing.`)}
  return{records,issues,counts:Object.fromEntries(Object.entries(records).map(([table,items])=>[table,items.length]))}
}

export async function migrateLocalState(token,data,config,onProgress=()=>{}){
  const plan=buildMigrationPlan(data,config)
  if(plan.issues.length)throw Object.assign(new Error('Some records need review before they can be copied safely.'),{migrationIssues:plan.issues})
  const order=['Families','WalkIns','Students','WalkInChildren','WalkInLinks','FollowUps','Admissions','Retention','RetentionHistory','PromotionHistory','CapacityPlan','SchoolSettings']
  let done=0,total=order.reduce((sum,table)=>sum+(plan.records[table]||[]).length,0)
  for(const table of order){
    const rows=plan.records[table]||[]
    for(let i=0;i<rows.length;i+=20){
      const items=rows.slice(i,i+20)
      await backendApi.createBatch(token,table,items,`migration-${table}-${items[0].id}-${items.length}`)
      done+=items.length;onProgress({done,total,table})
    }
  }
  const remote=await loadBackendState(token)
  const expected=businessCounts(data),actual=businessCounts(remote.data)
  const expectedSummary=verificationSummary(data),actualSummary=verificationSummary(remote.data)
  if(JSON.stringify(expected)!==JSON.stringify(actual)||JSON.stringify(expectedSummary)!==JSON.stringify(actualSummary)){
    throw Object.assign(new Error('The copied data did not match the local CRM totals. The original browser data is still intact; the CRM has not switched to the backend.'),{expected,actual,expectedSummary,actualSummary})
  }
  await backendApi.create(token,'SchoolSettings',{id:'SETTING-backendMigrationComplete',schoolId:config.school.id,settingKey:'backendMigrationComplete',valueJSON:true},'migration-marker-v1')
  remote.data.settings.backendMigrationComplete=true
  return{...remote,verified:true,expected,actual,summary:actualSummary}
}

function businessCounts(data){return{families:data.families.length,students:data.students.length,walkIns:data.walkIns.length,walkInMappings:data.walkInMappings.length,followUps:data.followUps.length,admissions:data.admissions.length,retention:data.retention.length,retentionHistory:data.retentionHistory.length,promotionHistory:data.promotionHistory.length,capacityClasses:Object.values(data.capacityPlan).reduce((n,group)=>n+Object.keys(group||{}).length,0)}}
function verificationSummary(data){
  const stages={};for(const student of data.students)stages[student.stage]=(stages[student.stage]||0)+1
  const admissionsByYear={};for(const admission of data.admissions){const year=cleanYear(admission.academicYear);admissionsByYear[year]=(admissionsByYear[year]||0)+1}
  return{stages,admissionsByYear,currentYear:data.settings.year,capacity:groupScopeTotals(data)}
}

function fallbackRecord(table,record,config){
  const indexes=structureIndexes(config),year=cleanYear(record.academicYear||record.academicYearLabel)
  const base={...record,crmDataJSON:record}
  if(table==='Families')return{...base,parentName:record.parent||record.parentName||record.fatherName||'',fatherName:record.fatherName||record.parent||'',mobile:record.mobile||''}
  if(table==='Students')return{...base,schoolId:config.school.id,boardId:indexes.boards.get(norm(normalizeBoard(record.board)))||'',groupId:indexes.groupId(record.board,record.grade),classId:indexes.classId(record.board,record.grade),grade:record.grade||'',name:record.name||'Unnamed student',stage:record.stage||'New Lead',heardJSON:record.heard||[],historyJSON:record.history||[],remarkHistoryJSON:record.remarkHistory||[],followUpDate:record.followUp||''}
  if(table==='WalkIns')return{...base,schoolId:config.school.id,submittedAt:record.submitted||'',parentMobile:record.parentMobile||'',secondaryMobile:record.secondaryMobile||'',status:record.status||'unmatched',outcome:record.outcome||'Pending',heardJSON:record.heard||[]}
  if(table==='WalkInChildren')return{...base,walkInId:record.walkInId,name:record.name||'',grade:record.grade||'',boardId:indexes.boards.get(norm(normalizeBoard(record.board)))||'',classId:indexes.classId(record.board,record.grade)}
  if(table==='WalkInLinks')return{...base,walkInId:record.walkInId,studentId:record.studentId,familyId:record.familyId||''}
  if(table==='FollowUps')return{...base,studentId:record.studentId,date:record.date||'',remarks:record.remarks||'',nextFollowUp:record.nextFollowUp||''}
  if(table==='Admissions')return{...base,schoolId:config.school.id,studentId:record.studentId,familyId:record.familyId||'',academicYear:year,academicYearId:schoolYear(config,year)}
  if(table==='Retention')return{...base,schoolId:config.school.id,name:record.name||'',grade:record.grade||'',academicYearId:schoolYear(config,year),status:record.status||'Continuing'}
  if(table==='RetentionHistory')return{...base,schoolId:config.school.id,eventType:record.eventType||record.type||'Status',eventDate:record.eventDate||record.date||''}
  if(table==='PromotionHistory')return{...base,schoolId:config.school.id,academicYearId:schoolYear(config,year||'2026-27'),promotedAt:record.createdAt||new Date().toISOString()}
  return base
}

export function desiredRecords(data,config){
  const plan=buildMigrationPlan(data,config)
  if(plan.issues.length)throw Object.assign(new Error('A record could not be prepared for saving.'),{migrationIssues:plan.issues})
  return plan.records
}

export function recordForBackend(table,record,config){return fallbackRecord(table,record,config)}
export {BUSINESS_TABLES,businessCounts,verificationSummary}

let backendContext=null
let saveQueue=Promise.resolve()

export function activateBackendSession(token,loaded){
  const versions=new Map(),records=new Map()
  for(const table of BUSINESS_TABLES)for(const row of loaded.rows[table]||[]){versions.set(`${table}|${row.id}`,Number(row.version||0));records.set(`${table}|${row.id}`,row)}
  backendContext={token,config:loaded.config,versions,records,baseline:copy(loaded.data)}
}

export function clearBackendSession(){backendContext=null;saveQueue=Promise.resolve()}

export function saveBackendState(nextData){
  if(!backendContext)return Promise.reject(new Error('The shared database is not connected.'))
  const snapshot=copy(nextData)
  saveQueue=saveQueue.catch(()=>{}).then(async()=>{
    await syncSnapshot(snapshot)
  })
  return saveQueue
}

async function syncSnapshot(nextData){
  if(!backendContext)throw new Error('The sign-in session has ended. Sign in again to save changes.')
  const {token,config,versions}=backendContext
  const desired=desiredRecords(nextData,config)
  const current=desiredRecords(backendContext.baseline,config)
  const byId=table=>new Map((current[table]||[]).map(record=>[record.id,record]))
  const remoteRows=backendContext.records
  const order=['Families','WalkIns','Students','WalkInChildren','WalkInLinks','FollowUps','Admissions','Retention','RetentionHistory','PromotionHistory','CapacityPlan','SchoolSettings']
  for(const table of order){
    const oldById=byId(table),newRows=desired[table]||[]
    for(const record of newRows){
      const old=oldById.get(record.id)
      const remote=remoteRows.get(`${table}|${record.id}`)
      if(!remote){
        if(old)throw new Error(`The shared ${table} record ${record.id} was removed on another device. Refresh before saving.`)
        const saved=await backendApi.create(token,table,record,`live-create-${table}-${record.id}-${newIdempotencyKey()}`)
        versions.set(`${table}|${record.id}`,Number(saved.item?.version||1));remoteRows.set(`${table}|${record.id}`,saved.item)
        continue
      }
      const same=table==='SchoolSettings'
        ? JSON.stringify(remote.valueJSON)===JSON.stringify(record.valueJSON)
        : JSON.stringify(remote.crmDataJSON)===JSON.stringify(record.crmDataJSON)
      if(same)continue
      if(!old)throw new Error(`The shared ${table} record ${record.id} changed on another device. Refresh before saving.`)
      const version=versions.get(`${table}|${record.id}`)??Number(remote.version||0)
      const saved=await backendApi.update(token,table,record.id,Object.fromEntries(Object.entries(record).filter(([key])=>key!=='id')),version,`live-update-${table}-${record.id}-${newIdempotencyKey()}`)
      versions.set(`${table}|${record.id}`,Number(saved.item?.version||version+1));remoteRows.set(`${table}|${record.id}`,saved.item)
    }
  }
  const deletable=['RetentionHistory','PromotionHistory','WalkInLinks','WalkInChildren','FollowUps','Admissions','Retention','Students','WalkIns','Families','CapacityPlan']
  for(const table of deletable){
    const keep=new Set((desired[table]||[]).map(record=>record.id))
    for(const record of current[table]||[]){
      if(keep.has(record.id))continue
      const remote=remoteRows.get(`${table}|${record.id}`)
      if(!remote)continue
      await backendApi.delete(token,table,record.id,versions.get(`${table}|${record.id}`)??Number(remote.version||0),`live-delete-${table}-${record.id}-${newIdempotencyKey()}`)
      versions.delete(`${table}|${record.id}`);remoteRows.delete(`${table}|${record.id}`)
    }
  }
  backendContext.baseline=nextData
}
