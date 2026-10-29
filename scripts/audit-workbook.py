"""Read-only OOXML/CSV consistency audit; no spreadsheet dependency or rewrite."""
import csv,json,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
root=Path(__file__).resolve().parent.parent
out=root/'docs/data-audit-evidence';out.mkdir(parents=True,exist_ok=True)
ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
report={'readOnly':True,'sheets':[],'errors':[]}
country={'US':'美国','CA':'加拿大','MX':'墨西哥','BR':'巴西'}
category={'vacuum':'吸尘器','wash':'洗地机','fabric':'布艺清洗机','mattress':'除螨仪'}
status={'AVAILABLE':'有记录','NO_RECORDED_DATA':'未收录','QUERY_FAILED':'查询失败','NOT_QUERIED':'未查询','FUTURE':'尚未发生','QUERIED':'已查询'}
fields=[['country','month','category','brand','asin','currency','parentSales','parentSalesAmount','childSales','childSalesAmount','price','bsr','rating','reviews','parentAsin','parentBasis','monthState','recordStatus','title','currentParentAsin','sourceBrand','brandConflict'],['country','category','brand','asin','queryStatus','monthsWithSales','monthsWithAnyMetric','errorCode','title'],['country','asin','date','parentAsin']]
def transform(r,k):
    v=r[k]
    if k=='country':return country[v]
    if k=='category':return category[v]
    if k in ('recordStatus','queryStatus'):return status[v]
    if k=='brandConflict':return '标题与详情品牌不一致，保留待核' if v=='true' else ''
    return v
with zipfile.ZipFile(root/'year-2026/UWANT_2026_产品月度数据.xlsx') as z:
    shared=[]
    if 'xl/sharedStrings.xml' in z.namelist():
        shared=[''.join(e.itertext()) for e in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',ns)]
    names=[e.attrib['name'] for e in ET.fromstring(z.read('xl/workbook.xml')).findall('s:sheets/s:sheet',ns)]
    for i,filename in enumerate(['2026-monthly.csv','product-coverage.csv','parent-changes.csv'],1):
        source=list(csv.DictReader((root/'year-2026'/filename).open(encoding='utf-8-sig',newline='')))
        csvrows=[[transform(r,k) for k in fields[i-1]] for r in source]
        sheet=ET.fromstring(z.read(f'xl/worksheets/sheet{i}.xml'))
        rows=[]; formulas=0
        for row in sheet.findall('s:sheetData/s:row',ns):
            values={}
            for c in row.findall('s:c',ns):
                col=''.join(ch for ch in c.attrib['r'] if ch.isalpha());idx=0
                for ch in col:idx=idx*26+ord(ch)-64
                typ=c.attrib.get('t');v=c.find('s:v',ns);inline=c.find('s:is',ns)
                val=''.join(inline.itertext()) if typ=='inlineStr' and inline is not None else v.text if v is not None else ''
                if typ=='s':val=shared[int(val)]
                if typ=='b':val='true' if val=='1' else 'false'
                if c.find('s:f',ns) is not None:formulas+=1
                values[idx-1]=val
            rows.append((int(row.attrib['r']),[values.get(k,'') for k in range(len(fields[i-1]))]))
        # Workbook has three introduction rows; row 4 is the column header.
        actual=[r for n,r in rows if n>=5]
        mismatch=[]
        if len(actual)!=len(csvrows):mismatch.append({'rowCount':[len(actual),len(csvrows)]})
        for ri,(a,b) in enumerate(zip(actual,csvrows),5):
            for ci,(x,y) in enumerate(zip(a,b)):
                same=x==y
                if not same and x not in ('',None) and y not in ('',None):
                    try:same=abs(float(x)-float(y))<=max(1e-8,abs(float(y))*1e-12)
                    except ValueError:pass
                if not same:mismatch.append({'excelRow':ri,'column':ci+1,'xlsx':x,'csv':y})
        report['sheets'].append({'name':names[i-1],'csv':filename,'rows':len(actual),'mappedColumns':len(fields[i-1]),'formulas':formulas,'mismatches':len(mismatch)})
        report['errors']+=mismatch[:30]
report['passed']=not report['errors']
(out/'workbook-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
raise SystemExit(0 if report['passed'] else 1)
