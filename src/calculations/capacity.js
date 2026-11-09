import {groupFor,GROUPS as LEGACY_GROUPS,localDateISO,normalizeBoard,normalizeGroupName} from '../data.js'
import {CAPACITY_GROUPS, capacityRows, totalsForRows} from '../capacityData.js'

export function promotionFor(student){const board=normalizeBoard(student.board),grade=student.grade,isEuro=board==='EuroKids';let next;if(grade==='Grade 10'||(isEuro&&['E.Sr','UKG'].includes(grade)))return{grade:'Graduated / Promoted Out',board,groups:[],schoolExit:true};if(grade==='PG')next='Nursery';else if(grade==='Nursery')next=isEuro?'E.Jr':'LKG';else if(grade==='LKG')next=isEuro?'E.Sr':'UKG';else if(grade==='UKG')next=isEuro?'Graduated / Promoted Out':'Grade 1';else if(grade==='E.Jr')next='E.Sr';else if(grade==='E.Sr')next='Grade 1';else if(/^Grade \d+$/.test(grade))next=`Grade ${Number(grade.replace('Grade ',''))+1}`;else return{grade:'Choose next class',board,groups:[],requiresReview:true};if(next==='Graduated / Promoted Out')return{grade:next,board,groups:[],schoolExit:true};const groups=groupFor(board,next);return{grade:next,board,groups,...(!groups.length?{requiresReview:true}:{})}}
const effectiveLeft=(s,cutoff)=>s.status==='Left / TC Issued'&&s.leavingDate&&s.leavingDate<=cutoff
export function retentionSummary(data){const records=data.retention||[],today=localDateISO();return{prior:records.filter(s=>!effectiveLeft(s,today)).length,couldLeave:records.filter(s=>s.status==='Could Leave').length,promotedOut:records.filter(s=>s.promotionApplied&&promotionFor(s).schoolExit).length,retained:records.filter(s=>s.status==='Continuing'&&!promotionFor(s).schoolExit).length}}

// Compatibility for the existing dashboard's six-group performance panel.
const legacyIds=['eurokids','ssc-kg','ssc-1-5','ssc-6-10','cbse-1-5','cbse-6-10']
export function capacityByGroup(data,group){
  const id=legacyIds[LEGACY_GROUPS.indexOf(group)]
  const rows=capacityRows(data,id),t=totalsForRows(rows),capacity=t.capacity||0,admissionsDone=t.admissionsGot||0
  return{group,priorStrength:t.priorStrength||0,promotedIn:t.promotedIn||0,promotedOut:t.promotedOut||0,openingStrength:t.opening||0,couldLeave:t.expectedLeave||0,projectedRetained:t.expectedRetained||0,capacity,sections:t.rooms||0,admissionsDone,projectedAdmissionsNeeded:t.admissionsNeeded||0,admissionsYetToGet:t.admissionsYet||0,projectedStrength:t.strength2728||0,actualAvailableSeats:Math.max(0,capacity-(t.strength2728||0))}
}

export function capacitySummaryForFilters(data,filters={}){
  const rows=CAPACITY_GROUPS
    .filter(group=>(!filters.board||normalizeBoard(group.board)===normalizeBoard(filters.board))&&(!filters.group||normalizeGroupName(group.name)===normalizeGroupName(filters.group)))
    .flatMap(group=>capacityRows(data,group.id).filter(row=>{
      if(!filters.grade)return true
      if(/^Grade (\d+)$/.test(filters.grade))return row.name===`${group.board} ${filters.grade.match(/\d+$/)[0]}`
      if(group.id==='ssc-kg'&&row.name==='LKG')return ['LKG','E.Jr'].includes(filters.grade)
      if(group.id==='ssc-kg'&&row.name==='UKG')return ['UKG','E.Sr'].includes(filters.grade)
      if(group.id==='eurokids'&&row.name==='E.Jr')return ['LKG','E.Jr'].includes(filters.grade)
      if(group.id==='eurokids'&&row.name==='E.Sr')return ['UKG','E.Sr'].includes(filters.grade)
      return row.name===filters.grade
    }))
  return rows.reduce((summary,row)=>({
    seatsRemaining:summary.seatsRemaining+Math.max(0,Number(row.capacity||0)-Number(row.strength2728||0)),
    admissionsYetToGet:summary.admissionsYetToGet+Number(row.admissionsYet||0),
  }),{seatsRemaining:0,admissionsYetToGet:0})
}
