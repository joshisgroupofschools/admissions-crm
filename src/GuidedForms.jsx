import {useState} from 'react'
import {BOARDS,CLASSES,SOURCES,HEARD_SOURCES,localDateISO} from './data'
import {classLabel} from './helpers'
export function EnquiryWizard({form,setForm,save,close}){
 const children=form.children
 const boardsFor=grade=>grade&&['PG','Nursery','LKG','UKG','E.Jr','E.Sr'].includes(grade)?BOARDS.filter(board=>board!=='CBSE'):BOARDS.filter(board=>board!=='EuroKids')
 const childCount=count=>setForm({...form,children:Array.from({length:Number(count)},(_,i)=>children[i]||{})})
 const patchChild=(index,key,value)=>setForm({...form,children:children.map((child,i)=>i===index?{...child,[key]:value}:child)})
 return <form className="form-body" onSubmit={save}>
  <section className="wizard-panel"><h3>Family details</h3><div className="form-grid">
   <label>Number of children<select value={children.length} onChange={event=>childCount(event.target.value)}>{[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</select></label>
   <label>Parent name<input value={form.parent} onChange={event=>setForm({...form,parent:event.target.value})} placeholder="Optional if a student name is given"/></label>
   <label>Primary mobile number<input required value={form.mobile} onChange={event=>setForm({...form,mobile:event.target.value})}/></label>
  </div></section>
  <section className="wizard-panel"><h3>Children</h3>{children.map((child,index)=><div className="child-form" key={index}><strong>{children.length===2?(index?'Younger child':'Elder child'):`Child ${index+1}`}</strong><div className="form-grid">
   <label>Student name<input value={child.name||''} onChange={event=>patchChild(index,'name',event.target.value)} placeholder="Optional if a parent name is given"/></label>
   <label>Class seeking admission<select required value={child.grade||''} onChange={event=>{const grade=event.target.value,allowed=boardsFor(grade);setForm({...form,children:children.map((current,i)=>i===index?{...current,grade,board:allowed.some(board=>board===current.board)?current.board:'Not Yet Decided'}:current)})}}><option value="">Choose class</option>{CLASSES.map(item=><option key={item} value={item}>{classLabel(item)}</option>)}</select></label>
   <label>Board preference<select value={child.board||'Not Yet Decided'} onChange={event=>patchChild(index,'board',event.target.value)}>{boardsFor(child.grade).map(item=><option key={item}>{item}</option>)}</select></label>
  </div></div>)}</section>
  <section className="wizard-panel"><h3>Enquiry details</h3><div className="form-grid">
   <label>Contact channel<select value={form.source} onChange={event=>setForm({...form,source:event.target.value})}>{SOURCES.filter(item=>item!=='Direct Walk-in').map(item=><option key={item}>{item}</option>)}</select></label>
   <fieldset className="heard-field span-two"><legend>How did you hear about our school?</legend><div className="checkbox-options">{HEARD_SOURCES.map(item=><label className="checkline" key={item}><input type="checkbox" checked={(form.heard||[]).includes(item)} onChange={event=>setForm({...form,heard:event.target.checked?[...(form.heard||[]),item]:(form.heard||[]).filter(value=>value!==item)})}/>{item}</label>)}</div></fieldset>
  </div></section>
  <div className="modal-actions"><button type="button" className="button secondary" onClick={close}>Cancel</button><button className="button primary">Save enquiry</button></div>
 </form>
}export function WalkinWizard({form,setForm,save,close}){
 const [step,setStep]=useState(0),[error,setError]=useState(''),children=form.children
 const childCount=count=>setForm({...form,children:Array.from({length:Number(count)},(_,i)=>children[i]||{})})
 const patch=(index,key,value)=>setForm({...form,children:children.map((child,i)=>i===index?{...child,[key]:value}:child)})
 const boardsFor=grade=>grade&&['PG','Nursery','LKG','UKG','E.Jr','E.Sr'].includes(grade)?BOARDS.filter(board=>board!=='CBSE'):grade?BOARDS.filter(board=>board!=='EuroKids'):BOARDS
 const next=()=>{
  if(step===0&&children.some(child=>!child.name?.trim()||!child.dateOfBirth||!child.gender||!child.grade||!child.board)){setError('Complete each student name, date of birth, gender, class and board interest.');return}
  if(step===1&&(!form.fatherName?.trim()||!form.mobile1)){setError('Enter the father name and primary mobile number.');return}
  setError('');setStep(Math.min(1,step+1))
 }
 return <div className="form-body wizard">
  <div className="wizard-steps">{['Student details','Parent contact'].map((label,index)=><div className={index===step?'current':index<step?'complete':''} key={label}><b>{index+1}</b>{label}</div>)}</div>
  {error&&<div className="wizard-error">{error}</div>}
  {step===0&&<section className="wizard-panel"><h3>Section 1: Student details</h3><label className="narrow-field">Number of children<select value={children.length} onChange={event=>childCount(event.target.value)}>{[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</select></label>{children.map((child,index)=><div className="child-form" key={index}><strong>{children.length===2?(index?'Younger child':'Elder child'):`Child ${index+1}`}</strong><div className="form-grid">
   <label>Student name<input required value={child.name||''} onChange={event=>patch(index,'name',event.target.value)}/></label>
   <label>Date of birth<input type="date" max={localDateISO()} required value={child.dateOfBirth||''} onChange={event=>patch(index,'dateOfBirth',event.target.value)}/></label>
   <fieldset className="walkin-choice-field"><legend>Gender</legend><div className="walkin-choice-options">{['Male','Female'].map(option=><label className={`walkin-choice ${child.gender===option?'selected':''}`} key={option}><input type="radio" name={`gender-${index}`} required checked={child.gender===option} onChange={()=>patch(index,'gender',option)}/><span>{option}</span></label>)}</div></fieldset>
   <fieldset className="walkin-choice-field"><legend>Class seeking admission</legend><div className="walkin-choice-options">{CLASSES.map(option=><label className={`walkin-choice ${child.grade===option?'selected':''}`} key={option}><input type="radio" name={`admission-class-${index}`} required checked={child.grade===option} onChange={()=>{const grade=option;setForm({...form,children:children.map((current,i)=>i===index?{...current,grade,board:boardsFor(grade).some(board=>board===current.board)?current.board:''}:current)})}}/><span>{classLabel(option)}</span></label>)}</div></fieldset>
   <fieldset className="walkin-choice-field"><legend>Interested board</legend><div className="walkin-choice-options">{boardsFor(child.grade).map(option=><label className={`walkin-choice ${child.board===option?'selected':''}`} key={option}><input type="radio" name={`board-interest-${index}`} required checked={child.board===option} onChange={()=>patch(index,'board',option)}/><span>{option}</span></label>)}</div></fieldset>
   <label>Previous school<input value={child.previousSchool||''} onChange={event=>patch(index,'previousSchool',event.target.value)}/></label>
  </div></div>)}</section>}
  {step===1&&<section className="wizard-panel"><h3>Section 2: Parent details</h3><div className="form-grid">
   <label>Father name<input required value={form.fatherName||''} onChange={event=>setForm({...form,fatherName:event.target.value})}/></label>
   <label>Occupation<input value={form.occupation||''} onChange={event=>setForm({...form,occupation:event.target.value})}/></label>
   <label>Mobile number<input required value={form.mobile1} onChange={event=>setForm({...form,mobile1:event.target.value})}/></label>
   <label>Alternative mobile number<input value={form.mobile2} onChange={event=>setForm({...form,mobile2:event.target.value})}/></label>
   <label className="span-two">Reason for choosing this school<textarea value={form.reasonForChoosing||''} onChange={event=>setForm({...form,reasonForChoosing:event.target.value})}/></label>
  </div><h3>How did you hear about our school?</h3><p>Select all that apply.</p><div className="checkbox-options">{['Word of Mouth','Social Media','Banners / Flex','Referred by Parent / Staff'].map(item=><label className="checkline" key={item}><input type="checkbox" checked={form.heard.includes(item)} onChange={event=>setForm({...form,heard:event.target.checked?[...form.heard,item]:form.heard.filter(value=>value!==item)})}/>{item}</label>)}</div>{form.heard.includes('Referred by Parent / Staff')&&<label className="narrow-field">Referring person name<input required value={form.referrer} onChange={event=>setForm({...form,referrer:event.target.value})}/></label>}</section>}
  <div className="wizard-actions"><button type="button" className="button secondary" onClick={step?()=>setStep(0):close}>{step?'Back':'Cancel'}</button>{step===0?<button type="button" className="button primary" onClick={next}>Continue</button>:<button type="button" className="button primary" onClick={()=>save({preventDefault(){}})}>Submit walk-in form</button>}</div>
 </div>
}
