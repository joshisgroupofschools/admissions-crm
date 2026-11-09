// School-provided capacity figures. These are explicit source values, not student projections.
export const CAPACITY_GROUPS = [
  {id:'ssc-kg',name:'SSC KG',board:'SSC',classes:[
    ['PG',0,0,0,6,6,0,0,0,0,0,10,10,0,10,0,0],
    ['Nursery',29,7,22,28,28,0,0,6,1,5,30,25,0,25,1,5],
    ['LKG',57,10,47,25,47,0,0,28,5,23,70,47,0,47,3,23],
    ['UKG',66,14,52,16,63,63,0,47,10,37,70,33,0,33,3,37],
  ]},
  {id:'eurokids',name:'EUROKIDS',board:'EUROKIDS',classes:[
    ['PG',23,3,20,7,7,0,0,0,0,0,10,10,0,10,1,0],
    ['Nursery',26,5,21,30,50,0,0,7,1,6,50,44,0,44,2,6],
    ['E.Jr',16,4,12,15,36,0,0,50,13,37,50,13,0,13,2,37],
    ['E.Sr',6,0,6,4,16,16,0,36,0,36,50,14,0,14,2,36],
  ]},
  {id:'ssc-1-5',name:'SSC 1-5',board:'SSC',classes:[
    ['SSC 1',68,10,58,5,57,0,63,63,9,54,70,16,0,16,2,54],
    ['SSC 2',58,8,50,12,70,0,0,57,8,49,70,21,0,21,2,49],
    ['SSC 3',66,11,55,4,54,0,0,70,12,58,70,12,0,12,2,58],
    ['SSC 4',48,11,37,6,61,0,0,54,12,42,70,28,0,28,2,42],
    ['SSC 5',75,15,60,7,44,44,0,61,12,49,70,21,0,21,2,49],
  ]},
  {id:'ssc-6-10',name:'SSC 6-10',board:'SSC',classes:[
    ['SSC 6',55,9,46,12,72,0,44,44,7,37,65,28,0,28,2,37],
    ['SSC 7',68,11,57,12,58,0,0,72,12,60,70,10,0,10,2,60],
    ['SSC 8',96,11,85,8,65,0,0,58,7,51,70,19,0,19,2,51],
    ['SSC 9',116,4,112,6,91,0,0,65,2,63,70,7,0,7,2,63],
    ['SSC 10',94,0,94,2,114,114,0,91,0,91,95,4,0,4,3,91],
  ]},
  {id:'cbse-1-5',name:'CBSE 1-5',board:'CBSE',classes:[
    ['CBSE 1',56,2,54,32,32,0,0,0,0,0,40,40,0,40,1,0],
    ['CBSE 2',59,6,53,19,73,0,0,32,3,29,70,41,0,41,2,29],
    ['CBSE 3',54,8,46,23,76,0,0,73,11,62,70,8,0,8,2,62],
    ['CBSE 4',57,10,47,15,61,0,0,76,13,63,70,7,0,7,2,63],
    ['CBSE 5',37,5,32,21,68,68,0,61,8,53,70,17,0,17,2,53],
  ]},
  {id:'cbse-6-10',name:'CBSE 6-10',board:'CBSE',classes:[
    ['CBSE 6',70,11,59,14,46,0,68,68,11,57,70,13,0,13,2,57],
    ['CBSE 7',42,4,38,12,71,0,0,46,4,42,70,28,0,28,2,42],
    ['CBSE 8',28,2,26,11,49,0,0,71,5,66,70,4,0,4,2,66],
    ['CBSE 9',24,1,23,4,30,0,0,49,2,47,70,23,0,23,2,47],
    ['CBSE 10',0,0,0,0,23,23,0,30,0,30,40,10,0,10,1,30],
  ]},
]

export const CAPACITY_FIELDS=[
  ['priorStrength','25-26 Strength'],['priorLeft','25-26 Left'],['priorRetained','25-26 Retained'],
  ['joined','26-27 Joined'],['currentStrength','26-27 Strength'],['promotedOut','26-27 Promoted Out'],
  ['promotedIn','26-27 Promoted In'],['opening','27-28 Opening'],['expectedLeave','27-28 Expected to Leave'],
  ['expectedRetained','27-28 Expected Retained'],['capacity','27-28 Capacity'],['admissionsNeeded','27-28 Admissions Needed'],
  ['admissionsGot','27-28 Admissions Got'],['admissionsYet','27-28 Admissions Yet to Get'],['rooms','27-28 Sections'],
  ['strength2728','27-28 Strength'],
]
const mapRow=values=>Object.fromEntries(CAPACITY_FIELDS.map(([key],index)=>[key,values[index+1]]))
export const makeCapacityData=()=>Object.fromEntries(CAPACITY_GROUPS.map(group=>[group.id,Object.fromEntries(group.classes.map(row=>[row[0],mapRow(row)]))]))
const priorPromotionExitGrades=['UKG','E.Sr','SSC 5','SSC 10','CBSE 5','CBSE 10']
export function capacityRowValues(row){const priorPromotedOut=priorPromotionExitGrades.includes(row.name)?Number(row.priorRetained??Math.max(0,Number(row.priorStrength||0)-Number(row.priorLeft||0))):0;return{...row,priorPromotedOut,opening2627:Math.max(0,Number(row.priorRetained||0)-priorPromotedOut),closing2627:Number(row.opening||0)}}
export function capacityRows(data,group){return CAPACITY_GROUPS.find(g=>g.id===group)?.classes.map(([name])=>capacityRowValues({name,...(data.capacityPlan?.[group]?.[name]||{})}))||[]}
export function totalsForRows(rows,{includeInternalPromotions=false}={}){const totals=Object.fromEntries(CAPACITY_FIELDS.map(([key])=>[key,rows.reduce((sum,row)=>sum+Number(row[key]||0),0)]));const terminalRows=rows.filter(row=>['SSC 10','CBSE 10','E.Sr'].includes(row.name));totals.priorPromotedOut=terminalRows.reduce((sum,row)=>sum+Number(row.priorRetained||0),0);totals.promotedOut=includeInternalPromotions?rows.reduce((sum,row)=>sum+Number(row.promotedOut||0),0):terminalRows.reduce((sum,row)=>sum+Number(row.promotedOut||0),0);totals.promotedIn=includeInternalPromotions?rows.reduce((sum,row)=>sum+Number(row.promotedIn||0),0):0;totals.priorRetained=totals.priorStrength-totals.priorLeft;totals.opening2627=Math.max(0,totals.priorRetained-totals.priorPromotedOut);totals.closing2627=totals.opening;totals.expectedRetained=Math.max(0,totals.opening-totals.expectedLeave);totals.admissionsNeeded=Math.max(0,totals.capacity-totals.expectedRetained);totals.admissionsYet=Math.max(0,totals.admissionsNeeded-totals.admissionsGot);totals.strength2728=totals.expectedRetained+totals.admissionsGot;return totals}
const groupPromotionPredecessor={'ssc-1-5':'ssc-kg','ssc-6-10':'ssc-1-5','cbse-6-10':'cbse-1-5'}
function groupPriorPromotedOut(rows){return rows.filter(row=>priorPromotionExitGrades.includes(row.name)).reduce((sum,row)=>sum+Number(row.priorPromotedOut||0),0)}
export function groupCapacity(data,groupId){const rows=capacityRows(data,groupId),totals=totalsForRows(rows,{includeInternalPromotions:true});totals.priorPromotedOut=groupPriorPromotedOut(rows);const predecessor=groupPromotionPredecessor[groupId];totals.priorPromotedIn=predecessor?groupPriorPromotedOut(capacityRows(data,predecessor)):0;totals.opening2627=Math.max(0,totals.priorRetained-totals.priorPromotedOut+totals.priorPromotedIn);return totals}
export function boardCapacity(data,board){const groups=CAPACITY_GROUPS.filter(g=>g.board===board);return{board,groups:groups.map(group=>({group,...groupCapacity(data,group.id)})),...totalsForRows(groups.flatMap(group=>capacityRows(data,group.id)))}}
export function groupScopeTotals(data){const groups=CAPACITY_GROUPS.map(group=>groupCapacity(data,group.id)),rows=CAPACITY_GROUPS.flatMap(group=>capacityRows(data,group.id)),groupSum=Object.fromEntries([...CAPACITY_FIELDS.map(([key])=>key),'opening2627','priorPromotedIn'].map(key=>[key,groups.reduce((sum,group)=>sum+Number(group[key]||0),0)])),school=totalsForRows(rows);return{...groupSum,priorPromotedOut:school.priorPromotedOut,promotedOut:school.promotedOut,promotedIn:school.promotedIn,priorPromotedIn:0}}
export function normalizeCapacityRow(row){const next={...row};next.priorRetained=Math.max(0,Number(next.priorStrength||0)-Number(next.priorLeft||0));next.expectedRetained=Math.max(0,Number(next.opening||0)-Number(next.expectedLeave||0));next.admissionsNeeded=Math.max(0,Number(next.capacity||0)-next.expectedRetained);next.admissionsYet=Math.max(0,next.admissionsNeeded-Number(next.admissionsGot||0));next.strength2728=next.expectedRetained+Number(next.admissionsGot||0);return next}
export function capacityLocation(board,grade){const normalized=String(board||'').toUpperCase();let rowName=/^Grade \d+$/.test(grade)?`${normalized} ${grade.replace('Grade ','')}`:grade;if(normalized==='EUROKIDS'){if(grade==='LKG')rowName='E.Jr';if(grade==='UKG')rowName='E.Sr'}if(normalized==='SSC'){if(grade==='E.Jr')rowName='LKG';if(grade==='E.Sr')rowName='UKG'}const match=CAPACITY_GROUPS.find(g=>g.board===normalized&&g.classes.some(([name])=>name===rowName));return match?{group:match.id,grade:rowName}:null}
export function syncCapacityAdmissions(data){const cleanYear=value=>String(value||'').replace(/[–—−]/g,'-').replace(/\s/g,''),year=cleanYear(data.settings?.year),counts={},seen=new Set();for(const admission of data.admissions||[]){const admissionYear=cleanYear(admission.academicYear),key=`${admission.studentId}|${admissionYear}`;if(seen.has(key)||admissionYear!==year)continue;seen.add(key);const student=data.students?.find(s=>s.id===admission.studentId);if(!student||!['Admission Form Taken','Admission Form Returned','ERP & Fees Assigned','Documents Pending','All Done'].includes(student.stage))continue;const loc=capacityLocation(student.board,student.grade);if(loc)counts[`${loc.group}|${loc.grade}`]=(counts[`${loc.group}|${loc.grade}`]||0)+1}for(const group of CAPACITY_GROUPS)for(const [grade]of group.classes){const row=data.capacityPlan?.[group.id]?.[grade];if(row){row.admissionsGot=counts[`${group.id}|${grade}`]||0;data.capacityPlan[group.id][grade]=normalizeCapacityRow(row)}}return data}
