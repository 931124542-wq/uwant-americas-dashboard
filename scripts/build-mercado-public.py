"""Publish only the user's retained Mercado observations, never raw API responses.
The input is read-only; excluded products, industry aggregates, credentials,
query filenames, billing and non-retained histories are deliberately not copied.
"""
import argparse,collections,hashlib,json,re
from pathlib import Path
from urllib.parse import urlparse

FIELDS=['country','category','currency','product_code','product_name','detail_link','picture_link','selling_price',
        'orders_last_30_days','revenue_last_30_days','feedback_score','feedback_count','brand_label','brandGroup',
        'merchant_name','first_listed_on','fulfillment_type','available_inventory','classificationBasis',
        'form','statisticalKey','counted','aliasCount']
FORMS={'vacuum':'stick','wash':'floor_washer','fabric':'portable_extractor','mattress':'mattress'}
CURRENCIES={'MX':'MXN','BR':'BRL','AR':'ARS','CL':'CLP','CO':'COP'}
def build(source,out):
    data=json.loads(source.read_text());assert data['scopePolicy']=='same_type_household_only_v1'
    products=[];seen=set()
    for original in data['records']:
        r={key:original.get(key) for key in FIELDS}
        assert r['country'] in CURRENCIES and r['currency']==CURRENCIES[r['country']]
        assert r['form']==FORMS[r['category']] and original['scopeReview']['status']=='included'
        key=(r['country'],r['product_code']);assert key not in seen;seen.add(key)
        for key in ['detail_link','picture_link']:
            value=r[key]
            if value:
                parsed=urlparse(value)
                if parsed.scheme=='http' and parsed.hostname=='http2.mlstatic.com':
                    r[key]='https:'+value[5:];r['imageProtocolUpgraded']=True;parsed=urlparse(r[key])
                assert parsed.scheme=='https' and not parsed.username and not parsed.password
                assert not re.search(r'access[_-]?token|secret[_-]?key|authorization',parsed.query,re.I)
        r['scopeReview']={k:original['scopeReview'][k] for k in ['status','reason','category','form','reviewedOn','imageUrl'] if k in original['scopeReview']}
        if r['scopeReview'].get('imageUrl','').startswith('http://http2.mlstatic.com/'):r['scopeReview']['imageUrl']='https:'+r['scopeReview']['imageUrl'][5:]
        r['sourceDate']=data['asOf'];r['priceKind']='source_snapshot';r['metricPeriod']='near_30_days_unknown_bounds'
        products.append(r)
    ids={r['product_code'] for r in products};trends={}
    for code,t in data['trends'].items():
        if code not in ids or not t.get('data_available'):continue
        trends[code]={k:t[k] for k in ['market_code','product_code','range_start_date','range_end_date','requested_day_count','covered_day_count','data_available','data_coverage','monthly_order_series','aggregation_period','input_method'] if k in t}
    coverage=[{k:q[k] for k in ['market','pageNumbers','expectedPages','matched','complete','truncated','pages'] if k in q} for q in data['coverage']]
    for i,q in enumerate(coverage):q['keyword']='检索 '+str(i+1);q['category']=None
    excluded={country:{'sourceRecords':sum(r['country']==country for r in data['excluded']),
                       'uniqueProducts':len({r['product_code'] for r in data['excluded'] if r['country']==country})} for country in CURRENCIES}
    result={'schemaVersion':1,'scopePolicy':data['scopePolicy'],'asOf':data['asOf'],'source':data['source'],
            'snapshotPeriod':'NEAR_30_DAYS_UNKNOWN_BOUNDS','records':products,'trends':trends,
            'coverage':coverage,'excludedSummary':excluded,'industry':{},'excluded':[],
            'publicationNote':'仅同形态保留商品及其月销量系列；原响应、排除明细、查询文件和计费不公开'}
    out.write_text('window.MERCADO_DATA='+json.dumps(result,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')+';\n')
    return {'records':len(products),'imageHttpsUpgrades':sum(bool(r.get('imageProtocolUpgraded')) for r in products),'histories':len(trends),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
            'publishedSha256':hashlib.sha256(out.read_bytes()).hexdigest(),'inputBytes':source.stat().st_size,'publishedBytes':out.stat().st_size,
            'counts':{country:{category:sum(r['country']==country and r['category']==category for r in products) for category in FORMS} for country in CURRENCIES}}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('out',type=Path);p.add_argument('--manifest',type=Path,required=True);a=p.parse_args()
    assert a.source.resolve()!=a.out.resolve();result=build(a.source,a.out);a.manifest.parent.mkdir(parents=True,exist_ok=True);a.manifest.write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
