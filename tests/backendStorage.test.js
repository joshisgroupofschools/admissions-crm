import test from 'node:test'
import assert from 'node:assert/strict'
import {makeInitialData} from '../src/data.js'
import {CAPACITY_GROUPS} from '../src/capacityData.js'
import {buildMigrationPlan,businessCounts} from '../src/services/backendStorage.js'

function configuration(){
 const school={id:'school-test-id',code:'JOSHI-VIDYANIKETAN',name:"Joshi's Vidyaniketan"}
 const boards=[['SSC','board:ssc'],['CBSE','board:cbse'],['EuroKids','board:eurokids'],['Not Yet Decided','board:not-yet-decided']].map(([name,code],index)=>({id:`board-test-${index}`,schoolId:school.id,entityType:'board',name,code,parentId:''}))
 const groups=[],classes=[]
 for(const group of CAPACITY_GROUPS){
  const board=boards.find(item=>item.name.toUpperCase()===group.board.toUpperCase())
  const groupRow={id:`group-test-${group.id}`,schoolId:school.id,entityType:'group',name:group.name,code:`group:${group.id}`,parentId:board.id}
  groups.push(groupRow)
  for(const [index,[name]] of group.classes.entries())classes.push({id:`class-test-${group.id}-${index}`,schoolId:school.id,entityType:'class',name,code:`class:${group.id}:${name}`,parentId:groupRow.id})
 }
 const years=['2025-26','2026-27','2027-28'].map((label,index)=>({id:`year-test-${index}`,schoolId:school.id,label}))
 return{school,years,structure:[...boards,...groups,...classes],settings:[{id:'setting-existing-documents',schoolId:school.id,settingKey:'documents',valueJSON:['Birth certificate']}]}
}

test('migration mapping retains linked CRM records and all capacity classes',()=>{
 const data=makeInitialData(),config=configuration()
 data.families=[{id:'FAM-test-family-1',parent:'Parent A',fatherName:'Parent A',mobile:'9876543210',mobile2:'9876500000',heard:['Call']}]
 data.students=[{id:'ENQ-test-student-1',familyId:'FAM-test-family-1',name:'Child A',grade:'Grade 1',board:'SSC',groups:['SSC 1-5'],stage:'Positive',created:'2026-04-01',history:[{date:'2026-04-01',text:'Enquiry created'}],heard:[] }]
 data.walkIns=[{id:'WI-test-walkin-1',familyId:'FAM-test-family-1',fatherName:'Parent A',parentMobile:'9876543210',secondaryMobile:'9876500000',submitted:'2026-04-03',status:'mapped',outcome:'Positive',children:[{name:'Child A',grade:'Grade 1',board:'SSC',gender:'Female',dateOfBirth:'2019-01-01'}],studentIds:['ENQ-test-student-1']}]
 data.walkInMappings=[{id:'WIM-test-link-1',walkInId:'WI-test-walkin-1',studentId:'ENQ-test-student-1',familyId:'FAM-test-family-1'}]
 data.followUps=[{id:'FUP-test-follow-1',studentId:'ENQ-test-student-1',familyId:'FAM-test-family-1',date:'2026-04-02',remarks:'Spoke to parent',nextFollowUp:'2026-04-08'}]
 data.admissions=[{id:'ADM-test-admission-1',studentId:'ENQ-test-student-1',familyId:'FAM-test-family-1',academicYear:'2027-28',confirmedAt:'2026-04-10'}]
 data.retention=[{id:'RET-test-retention-1',studentId:'ADM-9001',admissionNumber:'ADM-9001',name:'Existing pupil',grade:'Grade 1',board:'SSC',academicYear:'2026-27',status:'Continuing',history:[]}]
 data.retentionHistory=[{id:'RH-test-history-1',studentId:'ADM-9001',from:'Could Leave',to:'Continuing',date:'2026-04-06'}]
 data.promotionHistory=[{id:'PROMO-test-batch-1',createdAt:'2026-04-07',count:1,studentIds:['RET-test-retention-1']}]
 const plan=buildMigrationPlan(data,config)
 assert.deepEqual(plan.issues,[])
 assert.equal(plan.counts.Families,1)
 assert.equal(plan.counts.Students,1)
 assert.equal(plan.counts.WalkIns,1)
 assert.equal(plan.counts.WalkInChildren,1)
 assert.equal(plan.counts.WalkInLinks,1)
 assert.equal(plan.counts.FollowUps,1)
 assert.equal(plan.counts.Admissions,1)
 assert.equal(plan.counts.Retention,1)
 assert.equal(plan.counts.RetentionHistory,1)
 assert.equal(plan.counts.PromotionHistory,1)
 assert.equal(plan.counts.CapacityPlan,28)
 assert.equal(plan.records.SchoolSettings.find(row=>row.settingKey==='documents').id,'setting-existing-documents')
 assert.equal(plan.records.Retention[0].studentId,'')
 assert.equal(plan.records.Retention[0].admissionNumber,'ADM-9001')
 assert.deepEqual(plan.records.WalkIns[0].crmDataJSON.children,data.walkIns[0].children)
 assert.equal(businessCounts(data).students,1)
})

test('migration preflight stops when a family is missing its mobile number',()=>{
 const data=makeInitialData(),config=configuration()
 data.families=[{id:'FAM-test-family-2',parent:'Parent B',mobile:''}]
 const plan=buildMigrationPlan(data,config)
 assert.ok(plan.issues.some(issue=>issue.includes('mobile number is missing')))
})
