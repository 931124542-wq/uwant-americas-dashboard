"""Publish an explicitly authorized, normalized product increment, never provider responses."""
import argparse,json,re
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--workspace',required=True);p.add_argument('--authorized-date',required=True);a=p.parse_args()
repo=Path(__file__).resolve().parents[1];w=Path(a.workspace).resolve()
if w==repo or repo in w.parents:raise ValueError('private workspace must be outside public repository')
f=repo/'published-research-data.js';prefix='window.UWANT_PUBLISHED_RESEARCH='
public=json.loads(f.read_text().removeprefix(prefix).rstrip(';\n'));private=json.loads((w/'private-payload.json').read_text())
assets=json.loads((w/'live-assets.json').read_text());hist=json.loads((w/'live-history.json').read_text());details=json.loads((w/'live-details.json').read_text());cached=json.loads((w/'cache-supplement.json').read_text())
changed={(r['country'].lower(),r['asin']) for r in assets+details}|{(r['country'].lower(),r['asin']) for r in cached if r['emptyClaimsHaveSourceBullets']}
blocked={'rawValue','featureEvidence','sourceFeatures','sourceFiles','sourceFile','locator','file','sha256','requestIds','billing','chargedUnits','remainingUnits','response','structuredContent','raw','operatingContext','ownMappings','researchSnapshots','rawSourceSequence','account','token','secret'}
def clean(v):
 if isinstance(v,dict):return {k:clean(x) for k,x in v.items() if k not in blocked}
 if isinstance(v,list):return [clean(x) for x in v]
 if isinstance(v,str):
  if '/Users/' in v or '/private/' in v or re.search(r'Bearer\s|(?:secret|token|api[_-]?key)\s*[:=]',v,re.I):return None
  return v.replace('personal_local_only','public_sanitized')
 return v
def pick(v,keys):return clean({k:v[k] for k in keys.split() if k in v})
legacy=public['legacyCapture'];patches=legacy['evidencePatches'];patchkeys='country platform productId category brand identityStatus identityEvidence model modelEvidence modelStatus versionStatus imageUrl imageEvidence sourceDate sourceUrl claims title titleEvidence evidenceReferences unresolvedIssues'
for r in private['legacyCapture']['evidencePatches']:
 key=(r['country'],r['productId'])
 if key not in changed:continue
 out=pick(r,patchkeys);i=next((i for i,v in enumerate(patches) if (v['country'],v['productId'])==key),None)
 if out.get('titleEvidence',{}).get('retrievedAt'):
  out['titleEvidence']['sourceDate']=out['titleEvidence']['retrievedAt'][:10]
  out['titleEvidence']['sourceDateKind']='retrieval_date_not_price_observation'
 if i is None:patches.append(out)
 else:patches[i]=out
monthkeys='month monthStatus country category asin productId title currency parentAsin parentBasis price bsr rating reviews parentUnitSales parentSalesRevenue childUnitSales childSalesRevenue priceBasis source retrievedAt sourceUrl unitsEligible revenueEligible recordStatus issues'
historykeys={(r['country'].lower(),r['asin']) for r in hist};listingkeys='id country platform category productId brand title model modelEvidence modelStatus modelKey versionId versionStatus productType role source sourceDate sourceUrl price currency expectedCurrency priceKind dataNature identityStatus imageUrl imageEvidence sellerType ratingSnapshot ratingsSnapshot reviewsSnapshot claims evidenceReferences unresolvedIssues metricEligibility metricAggregationEligible captureAccess historicalParentEvents capturedHistory'
for key in historykeys:
 src=next(r for r in private['legacyCapture']['listings'] if (r['country'],r['productId'])==key)
 out=next((r for r in legacy['listings'] if (r['country'],r['productId'])==key),None)
 if out is None:
  out=pick(src,listingkeys);out['capturedHistory']=[];legacy['listings'].append(out)
 out['captureAccess']='public_sanitized';out['historicalParentEvents']=clean(src.get('historicalParentEvents',[]))
 prior=out.get('capturedHistory',[])
 for r in src.get('capturedHistory',[]):
  if str(r.get('retrievedAt',''))[:10]!=a.authorized_date:continue
  r=pick(r,monthkeys);r['unitsEligible']=False;r['revenueEligible']=False
  if not any(x.get('month')==r['month'] and x.get('retrievedAt')==r.get('retrievedAt') for x in prior):prior.append(r)
 out['capturedHistory']=prior
entry={'authorizedDate':a.authorized_date,'scope':'normalized_product_fields_and_ineligible_monthly_observations','contentProducts':len(assets),'detailProducts':len(details),'historicalProducts':len(historykeys),'historicalProductMonths':len(hist),'newListings':0,'rawResponsesIncluded':False,'billingIncluded':False}
public['publication']['supplements']=[x for x in public['publication'].get('supplements',[]) if (x['authorizedDate'],x['scope'])!=(entry['authorizedDate'],entry['scope'])]+[entry]
# asOf remains the prior ML snapshot date. Product evidence keeps its own query/source dates.
text=prefix+json.dumps(public,ensure_ascii=False,separators=(',',':'))+';\n'
assert not re.search(r'/Users/|mcp-secret|Bearer\s|chargedUnits|remainingUnits|"billing"|"response"|ss-(?:CA|MX|BR|US)-(?:content|history)',text)
f.write_text(text)
print(json.dumps({'productPatches':len(changed),'publishedHistoryProducts':len(historykeys),'newHistoricalObservations':len(hist),'legacyProfiles':len(legacy['listings']),'publicSnapshotAsOfUnchanged':public['asOf']},ensure_ascii=False))
