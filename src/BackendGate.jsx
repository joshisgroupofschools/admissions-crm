import {useState} from 'react'
import {GraduationCap} from 'lucide-react'

export function BackendGate({onLogin,busy,error,progress}){
 const [code,setCode]=useState('')
 return <main className="backend-gate"><form className="backend-gate-card" onSubmit={event=>{event.preventDefault();onLogin(code)}}>
  <div className="backend-gate-mark"><GraduationCap size={25}/></div>
  <div className="eyebrow">JOSHI'S VIDYANIKETAN</div>
  <h1>Staff sign-in</h1>
  <p>Enter the staff code to open the admissions CRM.</p>
  <label className="backend-code-label">Staff code<input autoFocus type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="one-time-code" value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,'').slice(0,4))} placeholder="Enter code" required disabled={busy}/></label>
  {error&&<div className="backend-gate-error">{error.message||String(error)}{error.migrationIssues?.length>0&&<ul>{error.migrationIssues.slice(0,12).map((issue,index)=><li key={index}>{issue}</li>)}</ul>}</div>}
  {error?.expected&&error?.actual&&<div className="backend-gate-error"><strong>Counts before / after:</strong><ul>{Object.keys(error.expected).map(key=><li key={key}>{key}: {error.expected[key]} / {error.actual[key]??0}</li>)}</ul></div>}
  {busy&&<div className="backend-gate-progress">{progress?.total?`Preparing your shared CRM: ${progress.done} of ${progress.total} records`:'Signing in and loading records...'}</div>}
  <button className="button primary backend-gate-submit" disabled={busy||code.length!==4}>{busy?'Please wait':'Continue'}</button>
  <small>Your existing browser backup stays unchanged.</small>
 </form></main>
}
