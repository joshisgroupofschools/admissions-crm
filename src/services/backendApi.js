const API_URL = import.meta.env?.VITE_APPS_SCRIPT_API_URL || 'https://script.google.com/macros/s/AKfycbyvWM0o5A38O8RY8E0IpgOXEZqP6XSEjIo7ZJLz2nlqJ8P6ssz0ifnI7jImTyWbetocIA/exec'

export function newIdempotencyKey(){
  if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

function requireIdempotencyKey(key){
  if(typeof key!=='string'||key.trim().length<8)throw new Error('Create a request key before saving so retries cannot duplicate the change.')
  return key.trim()
}

async function request(payload){
  let response
  try{
    response=await fetch(API_URL,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify(payload),
    })
  }catch(error){
    throw new Error('Could not reach the shared admissions database. Check your internet connection and try again.')
  }
  let body
  try{body=await response.json()}catch{
    throw new Error('The shared admissions database returned an unreadable response. Please try again.')
  }
  if(!response.ok||!body?.ok){
    const error=new Error(body?.error?.message||'The shared admissions database could not complete that request.')
    error.code=body?.error?.code||'BACKEND_ERROR'
    error.requestId=body?.requestId
    throw error
  }
  return body.result
}

export const backendApi={
  login:code=>request({action:'login',code:String(code||'')}),
  logout:token=>request({action:'logout',token}),
  bootstrap:token=>request({action:'records.bootstrap',token}),
  list:(token,entity,options={})=>request({action:'records.list',token,entity,...options}),
  get:(token,entity,id)=>request({action:'records.get',token,entity,id}),
  create:(token,entity,record,idempotencyKey)=>request({action:'records.create',token,entity,record,idempotencyKey:requireIdempotencyKey(idempotencyKey)}),
  createBatch:(token,entity,records,idempotencyKey)=>request({action:'records.createBatch',token,entity,records,idempotencyKey:requireIdempotencyKey(idempotencyKey)}),
  update:(token,entity,id,patch,expectedVersion,idempotencyKey)=>request({action:'records.update',token,entity,id,patch,expectedVersion,idempotencyKey:requireIdempotencyKey(idempotencyKey)}),
  delete:(token,entity,id,expectedVersion,idempotencyKey)=>request({action:'records.delete',token,entity,id,expectedVersion,idempotencyKey:requireIdempotencyKey(idempotencyKey)}),
}
