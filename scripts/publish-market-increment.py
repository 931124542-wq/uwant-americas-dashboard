"""Publish reviewed product fields from an external intake workspace, never responses.

The active rolling snapshot stays fixed. Later observations and calendar history
keep their own dates; additional catalogue entries do not enlarge its denominator.
"""
import argparse, json, re
from urllib.parse import urlsplit,urlunsplit,parse_qsl,urlencode
from pathlib import Path

p=argparse.ArgumentParser()
p.add_argument('--workspace', required=True)
p.add_argument('--authorized-date', required=True)
a=p.parse_args()
repo=Path(__file__).resolve().parents[1]
w=Path(a.workspace).resolve()
if w==repo or repo in w.parents: raise ValueError('Use an external private workspace')
if not re.fullmatch(r'\d{4}-\d{2}-\d{2}',a.authorized_date): raise ValueError('ISO date required')
target=repo/'published-research-data.js'
prefix='window.UWANT_PUBLISHED_RESEARCH='
out=json.loads(target.read_text().removeprefix(prefix).rstrip(';\n'))
intake=json.loads((w/'private-payload.json').read_text())
baseline=json.loads((w/'baseline-ml.json').read_text())
known={(r['country'],r['product_code']) for r in baseline['records']}
blocked={'merchant_code','sourceFile','locator','file','sha256','requestIds','billing','chargedUnits','remainingUnits','response','structuredContent','raw','operatingContext','ownMappings','account','token','secret'}
def clean(v):
 if isinstance(v,dict):return {k:clean(x) for k,x in v.items() if k not in blocked}
 if isinstance(v,list):return [clean(x) for x in v]
 if isinstance(v,str):
  if v.startswith('https://'):
   u=urlsplit(v)
   if 'mercadolibre.' in u.netloc or 'mercadolivre.' in u.netloc:v=urlunsplit((u.scheme,u.netloc,u.path,urlencode([(k,x)for k,x in parse_qsl(u.query,keep_blank_values=True)if k.lower()not in {'ua','matt_tool','sid','origin'} and not k.lower().startswith('utm_')]),''))
  if re.search(r'/Users/|/private/|Bearer\s|(?:secret|token|api[_-]?key)\s*[:=]',v,re.I):raise ValueError('Restricted string')
 return v
fields='country platform category productId title currency expectedCurrency product_code product_name detail_link picture_link selling_price orders_last_30_days revenue_last_30_days feedback_count feedback_score brand_label merchant_name taxonomy_name taxonomy_trail first_listed_on form statisticalKey counted classificationBasis sourceDate metricPeriod priceKind model modelEvidence modelGroup claims versionStatus imageLinkValid brandGroup imageStatus priceObservationDate priceSourceUpdatedAt priceEvidenceStatus retrievedAtDate statPriceEligible statIsolationReason statPriceIsolationReason brandEvidence modelReferences conditionStatus scopeReview'.split()
def product(r):
 v=clean({k:r[k] for k in fields if k in r})
 v['sourceFiles']=['published_product_observation']
 return v
fresh=[product(r) for r in intake['records'] if r['platform']=='ml' and r['sourceDate']==a.authorized_date]
byid={(r['country'],r['productId']):r for r in out['records'] if not (r.get('platform')=='ml' and r.get('sourceDate')==a.authorized_date and (r['country'],r['productId']) not in known)}
added=[]
for r in fresh:
 k=(r['country'],r['productId'])
 if k not in known:
  byid[k]=r;added.append(r)
out['records']=list(byid.values())
# Do not replace an older price/sales snapshot when only selected queries were refreshed.
obs={(r['country'],r['productId'],r['sourceDate']):r for r in out.get('mlSourceObservations',[]) if r['sourceDate']!=a.authorized_date}
for r in fresh:obs[r['country'],r['productId'],r['sourceDate']]=r
out['mlSourceObservations']=list(obs.values())
history_fields='market_code product_code range_start_date range_end_date requested_day_count data_available data_coverage aggregation_period notices covered_day_count monthly_order_series sourceDate historyUsable'.split()
newhist=[]
out['histories']={k:v for k,v in out['histories'].items() if k in baseline['trends'] or v.get('sourceDate')!=a.authorized_date}
for k,v in intake['histories'].items():
 if k in baseline['trends']:continue
 t=clean({f:v[f] for f in history_fields if f in v})
 # A complete request window can certify only months wholly inside that window.
 full=t.get('data_coverage',{}).get('full_coverage') is True and t.get('covered_day_count')==t.get('requested_day_count')
 for row in t['monthly_order_series']:
  row['monthStatus']='open' if row['month']==t['sourceDate'][:7] else 'closed_daily_completeness_unknown'
  if full and t.get('range_start_date','')<=row['month']+'-01' and row['month']<t.get('range_end_date','')[:7]:row['monthStatus']='closed_full_daily_coverage'
 out['histories'][k]=t;newhist.append(k)
coverage={(r.get('market'),r.get('category'),r.get('keyword'),r.get('querySignature'),r.get('sourceDate')):r for r in out['mlCoverage'] if r.get('sourceDate')!=a.authorized_date}
for r in intake['mlCoverage']:
 r=clean(r);coverage[r.get('market'),r.get('category'),r.get('keyword'),r.get('querySignature'),r.get('sourceDate')]=r
out['mlCoverage']=list(coverage.values())
image_reviews=w/'image-asset-reviews.json'
if image_reviews.exists():out['imageFormReviews']=clean(json.loads(image_reviews.read_text()))
corrections=w/'scope-corrections.json'
if corrections.exists():out['scopeCorrections']=clean(json.loads(corrections.read_text()))
exclusions=w/'scope-exclusions.json'
if exclusions.exists():out['scopeExclusions']=clean(json.loads(exclusions.read_text()))
repairs=w/'image-url-repairs.json'
if repairs.exists():
 baseline_file=w/'baseline-publication.json'
 baseline_repairs=json.loads(baseline_file.read_text()).get('imageUrlRepairs',{}) if baseline_file.exists() else {}
 for url,proof in clean(json.loads(repairs.read_text())).items():
  old=out['imageUrlRepairs'].get(url)
  baseproof=baseline_repairs.get(url)
  prior=[*(old or {}).get('priorValidations',[])]
  for item in [baseproof,old]:
   if item and item.get('observedAt')!=proof.get('observedAt'):
    item={k:v for k,v in item.items() if k!='priorValidations'}
    if item not in prior:prior.append(item)
  if prior:proof['priorValidations']=prior
  out['imageUrlRepairs'][url]=proof
references_path=w/'additional-manufacturer-references.json'
if references_path.exists():
 refs={(r['country'],r['category'],r['brand'],r['model']):r for r in out['manufacturerReferences']}
 for r in json.loads(references_path.read_text()):refs[r['country'],r['category'],r['brand'],r['model']]=clean(r)
 out['manufacturerReferences']=list(refs.values())
retail_path=w/'additional-retail-listings.json'
if retail_path.exists():
 retail={(r['country'],r.get('channel'),r['productId']):r for r in out.get('retailListings',[])}
 for r in json.loads(retail_path.read_text()):
  r=clean(r);retail[r['country'],r.get('channel'),r['productId']]=r
  normalized={**r,'country':r['country'].upper(),'sourceFiles':['published_public_official_product'],'priceEvidenceStatus':'public_official_page_observation'}
  key=(normalized['country'],normalized['productId'])
  out['records']=[v for v in out['records'] if not(v['platform']=='retail' and (v['country'],v['productId'])==key)]+[normalized]
 out['retailListings']=list(retail.values())
entry={'authorizedDate':a.authorized_date,'scope':'dated_product_increment_and_calendar_buckets','newListings':len(added),'refreshedProductObservations':len(fresh),'historicalProducts':len(newhist),'historicalProductMonths':sum(len(out['histories'][k]['monthly_order_series']) for k in newhist),'activeSnapshotUnchanged':out['asOf'],'rawResponsesIncluded':False,'billingIncluded':False}
out['publication']['supplements']=[r for r in out['publication'].get('supplements',[]) if (r['authorizedDate'],r['scope'])!=(entry['authorizedDate'],entry['scope'])]+[entry]
text=prefix+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n'
assert not re.search(r'/Users/|mcp-secret|Bearer\s|chargedUnits|remainingUnits|"billing"|"response"|customer_account_code|credit_balance|available_points',text)
target.write_text(text)
(w/'reports/publication-increment.json').write_text(json.dumps(entry,ensure_ascii=False,indent=2))
print(json.dumps(entry,ensure_ascii=False))
