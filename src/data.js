import {makeCapacityData} from './capacityData.js'

export const GROUPS=['EUROKIDS','SSC KG','SSC 1-5','SSC 6-10','CBSE 1-5','CBSE 6-10']
export const BOARDS=['SSC','CBSE','EuroKids','Not Yet Decided']
export const CLASSES=['PG','Nursery','LKG','UKG','E.Jr','E.Sr',...Array.from({length:10},(_,i)=>`Grade ${i+1}`)]
export const STAGES=['New Lead','Positive','Walk-in Positive','Walk-in Negative','Walk-in Pending','Admission Form Taken','Admission Form Returned','ERP & Fees Assigned','Documents Pending','All Done','Lost']
export const ADMISSION_STAGES=['Admission Form Taken','Admission Form Returned','ERP & Fees Assigned','Documents Pending','All Done']
export const WALK_IN_OUTCOMES=['Positive','Negative','Pending']
export const SOURCES=['Call','SMS','WhatsApp','Social Media','Other','Direct Walk-in']
export const HEARD_SOURCES=['Word of Mouth','Social Media','Banners / Flex','Referred by Parent / Staff']
export const LOSS_REASONS=['Fees Concern','Distance Concern','Not Answering / Unknown','Joined Other School','Relocated','Others']
export const FORMALITY_STAGES=['Admission Form Taken','Admission Form Returned','ERP & Fees Assigned','Documents Pending','All Done']
export const isAdmissionStage=stage=>ADMISSION_STAGES.includes(stage)

export function normalizeBoard(board){const value=String(board||'').trim().toLowerCase().replace(/[–—−]/g,'-');if(value==='eurokids'||value==='euro kids')return'EuroKids';if(value==='ssc')return'SSC';if(value==='cbse')return'CBSE';if(value==='not yet decided'||!value)return'Not Yet Decided';return board}
export function normalizeGroupName(group){return String(group||'').replace(/–|—|−|[–—−]/g,'-').replace(/\s+/g,' ').trim().toLowerCase()}

export function groupFor(board,grade){
 board=normalizeBoard(board)
 if(board==='Not Yet Decided')return[]
 const early=['PG','Nursery','LKG','UKG','E.Jr','E.Sr'].includes(grade)
 if(early){if(board==='EuroKids')return ['EUROKIDS'];if(board==='SSC')return ['SSC KG'];return []}
 const n=Number(grade?.replace('Grade ',''));if(!n)return[]
 if(n<=5)return board==='SSC'?['SSC 1-5']:board==='CBSE'?['CBSE 1-5']:[]
 return board==='SSC'?['SSC 6-10']:board==='CBSE'?['CBSE 6-10']:[]
}

export function formalitiesStage(student){return isAdmissionStage(student.stage)?student.stage:FORMALITY_STAGES.includes(student.formalitiesStage)?student.formalitiesStage:'Admission Form Taken'}
export function localDateISO(date=new Date()){const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');return`${y}-${m}-${d}`}
export function todayISO(){return localDateISO()}

export function makeInitialData(){return{families:[],students:[],walkIns:[],walkInMappings:[],followUps:[],admissions:[],retention:[],retentionHistory:[],promotionHistory:[],capacityPlan:makeCapacityData(),capacityRemarks:{},settings:{year:'2027-28',targets:{},seats:{},capacities:{},rooms:{},documents:['Birth certificate','Previous school record','Photographs','Aadhaar copy']}}}
