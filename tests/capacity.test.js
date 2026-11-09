import test from 'node:test'
import assert from 'node:assert/strict'
import {CAPACITY_GROUPS,makeCapacityData,boardCapacity,groupCapacity,groupScopeTotals,capacityLocation,capacityRows,syncCapacityAdmissions} from '../src/capacityData.js'
import {makeInitialData,groupFor} from '../src/data.js'
import {promotionFor} from '../src/calculations/capacity.js'
import {mockAdapter} from '../src/adapters/mockAdapter.js'
import {normalizeMobile} from '../src/mobile.js'
import {mergedStudentStage} from '../src/merge.js'
import {capacityByGroup} from '../src/calculations/capacity.js'

const fresh=()=>({...makeInitialData(),capacityPlan:makeCapacityData()})

test('starts with the supplied capacity plan and no invented student records',()=>{
  const data=makeInitialData()
  assert.equal(data.students.length,0)
  assert.equal(data.walkIns.length,0)
  assert.equal(CAPACITY_GROUPS.flatMap(group=>capacityRows(data,group.id)).reduce((n,row)=>n+row.priorStrength,0),1394)
})

test('group performance reports summed sections instead of class count',()=>{
  const data=makeInitialData()
  assert.equal(capacityByGroup(data,'EUROKIDS').sections,7)
  assert.equal(capacityByGroup(data,'SSC KG').sections,7)
})

test('school totals count only terminal class exits; group totals retain internal promotion rows',()=>{
  const data=fresh()
  const boards=['SSC','EUROKIDS','CBSE'].map(board=>boardCapacity(data,board))
  assert.equal(boards.reduce((n,row)=>n+row.priorPromotedOut,0),100)
  assert.equal(boards.reduce((n,row)=>n+row.promotedOut,0),153)
  assert.equal(boards.reduce((n,row)=>n+row.promotedIn,0),0)
  const all=groupScopeTotals(data)
  assert.equal(all.priorPromotedOut,100)
  assert.equal(all.priorPromotedIn,0)
  assert.equal(all.promotedOut,153)
  assert.equal(all.promotedIn,0)
  assert.equal(all.opening2627,1112)
  assert.equal(all.opening,1315)
  assert.equal(all.expectedRetained,1147)
  assert.equal(groupCapacity(data,'ssc-1-5').promotedIn,63)
  assert.equal(groupCapacity(data,'ssc-6-10').promotedIn,44)
  assert.equal(groupCapacity(data,'ssc-1-5').promotedOut,44)
})

test('promotion rules mark only Grade 10 and Euro Senior as external exits',()=>{
  assert.equal(promotionFor({board:'EuroKids',grade:'E.Sr'}).schoolExit,true)
  assert.equal(promotionFor({board:'SSC',grade:'Grade 10'}).schoolExit,true)
  assert.equal(promotionFor({board:'CBSE',grade:'Grade 10'}).schoolExit,true)
  assert.equal(promotionFor({board:'SSC',grade:'E.Sr'}).grade,'Grade 1')
  assert.equal(promotionFor({board:'EuroKids',grade:'UKG'}).schoolExit,true)
  assert.equal(promotionFor({board:'EuroKids',grade:'LKG'}).grade,'E.Sr')
  assert.deepEqual(promotionFor({board:'SSC',grade:'UKG'}).groups,['SSC 1-5'])
  assert.equal(promotionFor({board:'SSC',grade:'UKG'}).schoolExit,undefined)
})

test('mobile number normalization removes formatting for duplicate comparisons',()=>{
  assert.equal(normalizeMobile(' +91 (98765) 432-10 '),'919876543210')
})

test('merging duplicate leads keeps the furthest valid stage and flags conflicting walk-in outcomes pending',()=>{
  assert.equal(mergedStudentStage('New Lead','Positive'),'Positive')
  assert.equal(mergedStudentStage('Lost','Walk-in Positive'),'Walk-in Positive')
  assert.equal(mergedStudentStage('Walk-in Positive','Walk-in Negative'),'Walk-in Pending')
  assert.equal(mergedStudentStage('Admission Form Taken','All Done'),'All Done')
  assert.equal(mergedStudentStage('Lost','Lost'),'Lost')
})

test('unconfirmed board preference is not assigned to multiple groups',()=>{
  assert.deepEqual(groupFor('Not Yet Decided','Grade 2'),[])
  assert.deepEqual(groupFor('Not Yet Decided','UKG'),[])
})

test('EuroKids-style LKG/UKG labels selected with SSC map to SSC KG capacity rows',()=>{
  assert.deepEqual(capacityLocation('SSC','E.Jr'),{group:'ssc-kg',grade:'LKG'})
  assert.deepEqual(capacityLocation('SSC','E.Sr'),{group:'ssc-kg',grade:'UKG'})
})

test('admissions are counted once per student in the selected academic year and only from form taken',()=>{
  const data=fresh()
  data.settings.year='2027–28'
  data.students=[
    {id:'a',board:'SSC',grade:'Grade 1',stage:'Admission Form Taken'},
    {id:'b',board:'SSC',grade:'Grade 1',stage:'Positive'},
  ]
  data.admissions=[
    {id:'a1',studentId:'a',academicYear:'2027-28'},
    {id:'a2',studentId:'a',academicYear:'2027–28'},
    {id:'b1',studentId:'b',academicYear:'2027-28'},
    {id:'old',studentId:'a',academicYear:'2026-27'},
  ]
  syncCapacityAdmissions(data)
  assert.equal(data.capacityPlan['ssc-1-5']['SSC 1'].admissionsGot,1)
})

test('local storage migration preserves real records, fills missing collections, and removes reserved demo IDs',()=>{
  const stored={students:[null,
    {id:'ENQ-DEMO-001',name:'Fake',remarks:'DEMO DATA',grade:'Grade 1',board:'SSC'},
    {id:'ENQ-REAL-1',name:'Real child',grade:'Grade 1',board:'SSC',stage:'New Lead'},
  ],families:[null],walkIns:[null],admissions:[null],followUps:[null],capacityPlan:{'ssc-1-5':{'SSC 1':{priorStrength:60,priorLeft:3,admissionsGot:0}}}}
  const values=new Map([['joshi-admissions-crm-v1',JSON.stringify(stored)]])
  globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)}
  const loaded=mockAdapter.load()
  assert.deepEqual(loaded.students.map(student=>student.id),['ENQ-REAL-1'])
  assert.equal(loaded.capacityPlan['ssc-1-5']['SSC 1'].priorStrength,60)
  assert.equal(loaded.capacityPlan['ssc-1-5']['SSC 1'].joined,5)
  assert.ok(Array.isArray(loaded.followUps))
  assert.equal(loaded.families.length,0)
  assert.equal(loaded.walkIns.length,0)
  assert.equal(loaded.followUps.length,0)
  delete globalThis.localStorage
})
