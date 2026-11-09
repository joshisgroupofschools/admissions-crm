import {mockAdapter} from '../adapters/mockAdapter'
import {activateBackendSession,clearBackendSession,saveBackendState} from './backendStorage.js'
let backendActive=false
export const dataService={
 load:()=>mockAdapter.load(),
 save:data=>backendActive?saveBackendState(data):mockAdapter.save(data),
 reset:()=>mockAdapter.reset(),
 activateBackend(token,loaded){activateBackendSession(token,loaded);backendActive=true},
 clearBackend(){clearBackendSession();backendActive=false},
 update(current,mutate){const next=structuredClone(current);mutate(next);return next}
}
