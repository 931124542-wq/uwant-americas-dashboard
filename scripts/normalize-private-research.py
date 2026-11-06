import json,re,sys,collections,hashlib
from pathlib import Path
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--workspace',required=True);parser.add_argument('--as-of');args=parser.parse_args()
work=Path(args.workspace).resolve();repo=Path(__file__).resolve().parents[1]
if work==repo or repo in work.parents:raise ValueError('Private research workspace must be outside public repository')
from datetime import date
context_path=work/'collection-context.json'
context=json.loads(context_path.read_text())if context_path.exists()else{}
as_of=args.as_of or context.get('retrievedAtDate')
if not as_of:raise ValueError('Supply --as-of with the actual retrieval date or a preserved collection-context.json')
date.fromisoformat(as_of)
from intake_scope import review,norm
from intake_quality import classify
base=json.loads((work/'baseline-ml.json').read_text());baseline={(r['country'],'ml',r['product_code']):r for r in base['records']};markets={'MLM':'MX','MLB':'BR','MLA':'AR','MLC':'CL','MCO':'CO'}
cache_known={tuple(k)for k in json.loads((work/'cache-known-asin-keys.json').read_text())}
ssbaseline={(r['country'],'amazon',r['id']) for r in json.loads((work/'baseline-amazon.json').read_text())}

def ss_type(t,cat):
 x=classify(t,cat);return x["category"] if x["status"]=="included" else None
images_path=(work/'image-asset-reviews.json')
image_reviews=json.loads(images_path.read_text())if images_path.exists()else{}
records={};excluded=[];calls=[];nextjobs=[];page_stats=[]
for p in sorted((work/'raw').glob('*.json')):
 raw=json.loads(p.read_text());q=raw['request'];r=raw['response'];d=r.get('structuredContent')
 if not d:
  try:d=json.loads(r['content'][0]['text'])
  except:d={}
 billing=[]
 for c in r.get('content',[]):
  try:
   if 'billing'in(c.get('text')or''):billing.append(json.loads(c['text'])['billing'])
  except:pass
 calls.append({'file':p.name,'request':q,'error':bool(r.get('isError')),'billing':billing})
 items=d.get('records',[])if p.name.startswith('ml-')else d.get('items',[]);eligible=novel=0
 for item in items:
  if p.name.startswith('ml-'):
   country=markets[q['market_code']];t=item.get('product_name','');category=q['category'];path=norm(' '.join(item.get('taxonomy_trail',[])));title=norm(t)
   status=classify(t,category,item.get('taxonomy_trail',[]),item.get('brand_label'))
   image_review=image_reviews.get(item.get('picture_link'))
   if image_review and not image_review['formConfirmed']:status={'status':'excluded','reason':'image_verified_accessory_or_consumable','category':category,'form':None}
   elif status['status']=='pending'and status['reason']=='taxonomy_conflict_requires_image'and image_review and image_review['formConfirmed']and image_review['category']==status['category']:status={**status,'status':'included','reason':'source_image_household_form_reviewed','imageUrl':item['picture_link'],'reviewDate':image_review['reviewDate']}
   if status['status']!='included':excluded.append({'id':item['product_code'],'country':country,'requestedCategory':category,'title':t,'reason':status['reason'],'file':p.name});continue
   category=status['category'];id=item['product_code'];key=(country,'ml',id);url=item.get('detail_link')or'';m=re.search(r'/p/([A-Z]{3}\d+)',url);stat=country+'|'+(m[1]if m else id)
   rec={**item,'country':country,'platform':'ml','category':category,'productId':id,'title':t,'product_name':t,'currency':item.get('currency_code'),'statisticalKey':stat,'counted':True,'form':status['form'],'scopeReview':status,'classificationBasis':status['reason'],'sourceDate':as_of,'metricPeriod':'near_30_days_unknown_bounds','priceKind':'source_snapshot','sourceFiles':[p.name]}
   isnew=key not in baseline
  else:
   category=ss_type(item.get('title',''),q['category']);country=q['marketplace'];id=item.get('asin');key=(country,'amazon',id)
   if not category or not id:excluded.append({'id':id,'country':country,'requestedCategory':q['category'],'title':item.get('title'),'reason':'不同形态或标题用途待核','file':p.name});continue
   rec={**item,'country':country,'platform':'amazon','category':category,'productId':id,'sourceDate':as_of,'metricPeriod':d.get('dataMode'),'sourceMonth':d.get('dataMonth'),'sourceFiles':[p.name],'metricAggregationEligible':False,'metricIsolationReason':'代表变体/当前父体信号，不自动取得历史父体月份统计资格'};isnew=key not in ssbaseline
  eligible+=1;novel+=isnew and key not in records
  if key in records:
   prev=records[key];prev['sourceFiles']+=rec['sourceFiles'];fields=['selling_price','orders_last_30_days','revenue_last_30_days','currency']if rec['platform']=='ml'else ['price','monthlySales','monthlyRevenue','parent','currency']
   if any(prev.get(f)!=rec.get(f)for f in fields):
    prev.setdefault('conflictingSourceSnapshots',[]).append({f:rec.get(f)for f in fields}|{'file':p.name});prev['metricAggregationEligible']=False;prev['statIsolationReason']='same_id_conflicting_snapshots';prev['counted']=False
  else:records[key]=rec
 page_stats.append({'file':p.name,'request':q,'returned':len(items),'eligible':eligible,'newToBaseline':novel,'page':d.get('page'),'matched':d.get('matched_count')})
# Snapshot duplicate identity is separate from title model identity.
seen=set()
for k,r in records.items():
 if r['platform']=='ml':
  if r['statisticalKey']in seen:r['counted']=False
  seen.add(r['statisticalKey'])
# Decide pagination from observed effective yield. This is not a product-count ceiling.
mlgroups=collections.defaultdict(list)
for p in page_stats:
 if p['file'].startswith('ml-'):mlgroups[(p['request']['market_code'],p['request']['category'],p['request']['keyword'])].append(p)
for (m,c,kw),pages in mlgroups.items():
 pages.sort(key=lambda x:x['request']['page']);last=pages[-1];num=last['request']['page'];total=last['matched']or last['returned'];tail=pages[-2:];low=len(tail)==2 and all(x['newToBaseline']<max(1,x['returned']*.05)for x in tail)
 if num*100<total and not low:nextjobs.append({'market_code':m,'category':c,'keyword':kw,'page':num+1})
allrecords=list(records.values());result={'records':allrecords,'excluded':excluded,'calls':calls,'pages':page_stats,'nextJobs':nextjobs,'counts':dict(collections.Counter(r['country']+'/'+r['platform']+'/'+r['category']for r in allrecords)),'newToCacheAmazon':sum(k not in cache_known and k not in ssbaseline for k in records if k[1]=='amazon'),'newCounts':dict(collections.Counter(r['country']+'/'+r['platform']+'/'+r['category']for k,r in records.items()if k not in baseline and(r['platform']!='amazon'or k not in ssbaseline)))}
(work/'research.json').write_text(json.dumps(result,ensure_ascii=False));print(json.dumps({k:len(v)if isinstance(v,list)else v for k,v in result.items()if k not in ['excluded','calls','pages']},ensure_ascii=False));(work/'next-jobs.json').write_text(json.dumps(nextjobs))
