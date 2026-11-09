"""Publish only user-authorized normalized product research; never a raw capture."""
import argparse,json,re
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--workspace',required=True);a=p.parse_args();repo=Path(__file__).resolve().parents[1];w=Path(a.workspace).resolve()
if w==repo or repo in w.parents:raise ValueError('external workspace required')
s=json.loads((w/'private-payload.json').read_text())
# Explicit outer allowlists; account context, provider reports, raw content and billing are absent.
record='country platform category productId title currency expectedCurrency product_code product_name detail_link picture_link selling_price orders_last_30_days revenue_last_30_days feedback_count feedback_score brand_label brand merchant_name taxonomy_name taxonomy_trail first_listed_on form statisticalKey counted classificationBasis sourceDate metricPeriod priceKind model modelEvidence modelGroup claims versionStatus imageLinkValid brandGroup imageStatus priceObservationDate priceSourceUpdatedAt priceEvidenceStatus retrievedAtDate statPriceEligible statIsolationReason statPriceIsolationReason brandEvidence modelReferences conditionStatus scopeReview imageReview rating monthlyReviewCount bsr price monthlySales monthlyRevenue parent metricAggregationEligible metricIsolationReason sourceUrl channel channelLabel soldBy reviewCount priceNote'.split()
listing='id country platform category productId brand sourceBrand title model modelEvidence modelStatus modelKey versionId versionStatus productType role source sourceDate sourceDateNote sourceUrl price currency expectedCurrency sourceObservations priceKind dataNature identityStatus imageUrl imageEvidence sellerType soldBy shippedBy availabilityStatus ratingSnapshot ratingsSnapshot reviewsSnapshot sourceBsr ratingsCountBasis claims evidenceReferences unresolvedIssues metricEligibility metricAggregationEligible quarantineRequired historicalLink sourceUpdatedAt priceStatus currentParentReference capturedHistory currencyBasis capturedTrends historicalParentEvents stage4History productTypeEvidence parentStatus captureAccess researchSnapshots'.split()
month='country marketplace platform category brand brandConflict sourceBrand asin title productType model currentParentAsin parentAsin parentBasis currency month monthState monthStatus recordStatus source retrievedAt imageUrl parentSales parentSalesAmount sourceParentSales sourceParentSalesAmount childSales childSalesAmount price averagePrice bsr rating reviews captureAccess parentEvidence parentReason versionStatus fieldEvidence priceBasis averagePriceBasis currencyBasis sourceKind parentUnitSales childUnitSales parentSalesRevenue childSalesRevenue unitsEligible revenueEligible issues productId sourceDate sourceUrl cacheOnly currentParentReference'.split()
blocked={'merchant_code','sourceFiles','sourceFile','locator','captureSequence','sourceSequence','evidenceSequence','account','account_id','customer_account_code','operatingContext','ownMappings','keywordSnapshots','marketReports','raw','response','structuredContent','sourceFeatures','capturedTrendsSource','sourceListSnapshot','discoveryObservation'}
def clean(v):
 if isinstance(v,dict):return {k:clean(x) for k,x in v.items() if k not in blocked}
 if isinstance(v,list):return [clean(x) for x in v]
 if isinstance(v,str):
  if '/Users/' in v or '/private/' in v or re.search(r'(?:secret|token|api[_-]?key)\s*[:=]',v,re.I):return None
  return v.replace('personal_local_only','public_sanitized')
 return v
def pick(v,keys):return clean({k:v[k] for k in keys if k in v})
def prof(v,keys):
 r=pick(v,keys);r['sourceFiles']=['published_product_observation'];return r
out={'schemaVersion':1,'access':'public_sanitized','asOf':s['asOf'],'publication':{'authorizedBy':'user','authorizedDate':'2026-11-09','scope':'normalized_product_research_only','rawResponsesIncluded':False,'internalOperationsIncluded':False}}
for k in ['imageUrlRepairs','manufacturerReferences','baselineScopeIsolation','mlCoverage']:out[k]=clean(s[k])
rdata=json.loads((w/'research.json').read_text());out['excludedSummary']={c:{'sourceRecords':sum(r['country']==c for r in rdata['excluded']),'uniqueProducts':len({r['id'] for r in rdata['excluded'] if r['country']==c})} for c in ['MX','BR','AR','CL','CO']}
out['records']=[prof(r,record) for r in s['records']];out['priorMlRecords']=[prof(r,record) for r in s['priorMlRecords']]
out['amazonListings']=[pick(r,listing) for r in s['amazonListings']]
for r in out['amazonListings']:r['researchSnapshots']=[] # normalized source metrics live in records, never duplicate provider structures
out['retailListings']=[pick(r,list(set(record+listing))) for r in s['retailListings']]
out['histories']={k:pick(v,'market_code product_code range_start_date range_end_date requested_day_count data_available data_coverage aggregation_period notices covered_day_count monthly_order_series sourceDate historyUsable'.split()) for k,v in s['histories'].items()}
legacy=s['legacyCapture'];out['legacyCapture']={'access':'public_sanitized','listings':[pick(r,listing) for r in legacy['listings']], 'formalMonthlyRows':[pick(r,month) for r in legacy['formalMonthlyRows']], 'priceMonthlyRows':[pick(r,month) for r in legacy['priceMonthlyRows']], 'evidencePatches':[pick(r,'country platform productId category brand identityStatus identityEvidence model modelEvidence modelStatus versionStatus imageUrl imageEvidence sourceDate sourceUrl claims'.split()) for r in legacy['evidencePatches']]}
out['cachedCalendar']=[pick(r,month) for r in s['cachedCalendar']]
body=json.dumps(out,ensure_ascii=False,separators=(',',':'));(repo/'published-research-data.js').write_text('window.UWANT_PUBLISHED_RESEARCH='+body+';\n')
print(json.dumps({'bytes':len(body.encode()),'records':len(out['records']),'histories':len(out['histories']),'priorAmazon':len(legacy['listings']),'priorMonths':len(legacy['formalMonthlyRows'])+len(legacy['priceMonthlyRows'])}))
