const admissionStages=['Admission Form Taken','Admission Form Returned','ERP & Fees Assigned','Documents Pending','All Done']
const walkInStages=['Walk-in Positive','Walk-in Negative','Walk-in Pending']

export function mergedStudentStage(primary,duplicate){
  const first=primary||'New Lead',second=duplicate||'New Lead'
  if(admissionStages.includes(first)||admissionStages.includes(second)){
    return admissionStages[Math.max(admissionStages.indexOf(first),admissionStages.indexOf(second))]
  }
  if(first==='Lost'&&second==='Lost')return'Lost'
  if(first==='Lost')return second
  if(second==='Lost')return first
  if(walkInStages.includes(first)&&walkInStages.includes(second))return first===second?first:'Walk-in Pending'
  const rank={ 'New Lead':0,Positive:1,'Walk-in Positive':2,'Walk-in Negative':2,'Walk-in Pending':2 }
  return (rank[second]??-1)>(rank[first]??-1)?second:first
}
