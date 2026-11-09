import {mockAdapter} from '../adapters/mockAdapter'
export const dataService={
 load:()=>mockAdapter.load(),
 save:data=>mockAdapter.save(data),
 reset:()=>mockAdapter.reset(),
 update(current,mutate){const next=structuredClone(current);mutate(next);return next}
}
