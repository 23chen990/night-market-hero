import json,pathlib,subprocess,os,hashlib,datetime
root=pathlib.Path(__file__).resolve().parents[2];out=pathlib.Path(__file__).resolve().parent
stamp=out/'attempt-2-execution.json'
if stamp.exists(): raise SystemExit('Attempt 2 already started; do not duplicate its build.')
record={'attempt':2,'previousAttempt':1,'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'buildCount':0,'steps':[],'status':'RUNNING'}
def save(): stamp.write_text(json.dumps(record,indent=2)+'\n')
save()
for label,command in [('lint',['pnpm','lint']),('typecheck',['pnpm','typecheck']),('tests',['pnpm','test']),('build',['pnpm','build']),('natural',['node','--import','tsx','qa-evidence/gate-removal-20261008.mjs']),('file-launch',['pnpm','test:file'])]:
 if label=='build':record['buildCount']+=1;save()
 with open(out/f'{label}-attempt-2.log','wb') as log:
  r=subprocess.run(command,cwd=root,env=dict(os.environ,QA_LABEL='attempt-2'),stdout=log,stderr=subprocess.STDOUT)
 record['steps'].append({'name':label,'exitCode':r.returncode,'log':str(out/f'{label}-attempt-2.log')})
 if label=='build' and r.returncode==0:record['buildHash']=hashlib.sha256((root/'dist/index.html').read_bytes()).hexdigest()
 if r.returncode:record['status']='BLOCKED';save();break
 save()
else:record['status']='RUNTIME_PASSED'
record['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();save()
