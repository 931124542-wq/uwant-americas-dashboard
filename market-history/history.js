/* Reads only a selected file or the embedded data in a portable local copy. */
(function () {
  const countries = {
    MX:['墨西哥','MXN','amazon.com.mx','MLM31572'],
    CA:['加拿大','CAD','amazon.ca'],
    US:['美国','USD','amazon.com'],
    BR:['巴西','BRL','amazon.com.br','MLB4337'],
    AR:['阿根廷','ARS',null,'MLA4337'],
    CL:['智利','CLP',null,'MLC4337'],
    CO:['哥伦比亚','COP',null,'MCO115340']
  };
  const categories = {wash:'洗地机',vacuum:'吸尘器',fabric:'布艺清洗机',mattress:'除螨仪'};
  const published=window.UWANT_PUBLIC_HISTORY;
  const photos=window.RankPhotos;
  const marketURL = 'https://931124542-wq.github.io/uwant-americas-dashboard/';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const int = new Intl.NumberFormat('zh-CN');
  const decimal = new Intl.NumberFormat('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
  const money = (value,divisor) => value === null ? '—' : decimal.format(value/divisor);
  const qty = value => value === null ? '—' : int.format(value);
  const month = value => /^20\d{2}-(0[1-9]|1[0-2])$/.test(value || '');
  const date = value => /^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value || '');
  const monthNumber = value => Number(value.slice(0,4))*12 + Number(value.slice(5));
  const asin = value => typeof value==='string'&&/^[A-Z0-9]{10}$/.test(value);
  const amount = value => value===null || (Number.isSafeInteger(value)&&value>=0);
  const sum = values => values.some(value=>value!==null)?values.reduce((total,value)=>total+(value??0),0):null;
  let archive = null;
  let importSequence = 0;

  function verify(data) {
    const fail = () => {throw Error('无法读取这份月度数据。请选择 UWANT 月度市场数据文件。');};
    if(data?.format!=='uwant-market-archive-v1')fail();
    const {amazon,mercado}=data;
    if(!date(amazon?.date)||!date(mercado?.observedDate)||
       !Array.isArray(amazon.rows)||!Array.isArray(amazon.rankMonths)||amazon.rows.length>240)fail();
    const scopes=new Map();
    for(const row of amazon.rows){
      if(!Array.isArray(row)||row.length!==6)fail();
      const [country,category,period,units,revenue,groups]=row;
      const key=[country,category,period].join('|');
      if(!Object.hasOwn(countries,country)||!countries[country][2]||!Object.hasOwn(categories,category)||
         !month(period)||period>=amazon.date.slice(0,7)||!amount(units)||!amount(revenue)||(units===null&&revenue===null)||
         !Number.isSafeInteger(groups)||groups<1||groups>2000||scopes.has(key))fail();
      scopes.set(key,[units,revenue,groups]);
    }
    for(const entry of amazon.rankMonths){
      if(!Array.isArray(entry)||entry.length!==4)fail();
      const [country,category,period,items]=entry;
      const key=[country,category,period].join('|'),summary=scopes.get(key);
      if(!summary||!Array.isArray(items)||items.length!==summary[2])fail();
      const ids=new Set();
      for(const row of items){
        if(!Array.isArray(row)||row.length!==6)fail();
        const [id,listing,units,revenue,price,title]=row;
        if(!asin(id)||!asin(listing)||![units,revenue,price].every(amount)||(units===null&&revenue===null)||
           typeof title!=='string'||title.length>240||ids.has(id))fail();
        ids.add(id);
      }
      const units=sum(items.map(item=>item[2])),revenue=sum(items.map(item=>item[3]));
      if(units!==summary[0]||(revenue===null)!==(summary[1]===null)||
         (revenue!==null&&Math.abs(revenue-summary[1])>5000))fail();
      scopes.delete(key);
    }
    if(scopes.size)fail();
    const markets=mercado.markets;
    if(!markets||typeof markets!=='object'||Array.isArray(markets)||Object.keys(markets).length>5)fail();
    for(const [country,rows] of Object.entries(markets)){
      if(!Object.hasOwn(countries,country)||!countries[country][3]||!Array.isArray(rows)||rows.length<1||rows.length>36)fail();
      const seen=new Set();
      for(const row of rows){
        if(!Array.isArray(row)||row.length!==4)fail();
        const [period,...values]=row;
        if(!month(period)||period>=mercado.observedDate.slice(0,7)||seen.has(period)||
           !values.every(amount)||values.every(value=>value===null))fail();
        seen.add(period);
      }
    }
    return data;
  }

  function options(element,values,selected){
    element.replaceChildren(...values.map(([id,label])=>new Option(label,id,false,id===selected)));
  }
  function setMarkets(selected){
    const column=$('platform').value==='amazon'?2:3;
    options($('country'),Object.entries(countries).filter(([,value])=>value[column]).map(([id,value])=>[id,value[0]]),selected||'MX');
    syncBasis();
  }
  function syncBasis(){
    $('basis-field').hidden=$('platform').value!=='ml'||$('category').value!=='vacuum';
  }
  function readScope(){
    const platform=$('platform').value,country=$('country').value,category=$('category').value;
    const scope={platform,country,category,startMonth:$('startMonth').value,endMonth:$('endMonth').value};
    if(platform==='ml')scope.scope=!$('basis-field').hidden&&$('basis').value==='category'?'category':'sample';
    return scope;
  }
  function writeScope(){
    const params=new URLSearchParams(readScope());
    try{history.replaceState(null,'','?'+params+location.hash);}catch{}
  }
  function downloadable(rows,name){
    const body=rows.map(row=>row.map(value=>'"'+String(value??'').replaceAll('"','""')+'"').join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob(['\uFEFF',body],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=name;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function rankedProduct({id,name,url,country}){
    const photo=photos.markup(photos.lookup(id,country));
    const label=url?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(name)+'</a>':esc(name);
    return '<div class="ranking-product">'+photo+'<div class="ranking-item-copy">'+label+'<small>'+esc(id)+'</small></div></div>';
  }

  function rankSection(scope, selected, currency){
    if(!selected.length)return '';
    const step=scope.country==='MX'?1000:scope.country==='BR'?500:100;
    const labels=new Map();
    const bandFor=price=>{
      if(!(price>0))return '';
      const value=price/1e6,band=window.ResearchModel.categoryPriceBand(scope,value);
      const index=String(band?.index??Math.min(9,Math.floor(value/step)));
      const lower=Number(index)*step;
      if(!labels.has(index))labels.set(index,band?.label??(index==='9'?int.format(lower)+' 及以上':int.format(lower)+' 至低于 '+int.format(lower+step)));
      return index;
    };
    for(const [, , ,items] of selected)for(const row of items)bandFor(row[4]);
    const bands=[...labels.keys()].sort((a,b)=>Number(a)-Number(b));
    const box=document.createElement('section');
    box.className='panel';box.id='top10';
    box.innerHTML='<h2 data-rank-heading>销量 Top 10</h2><p>价格带按对应月份的归档报价划分。</p>'+
      '<div class="rank-controls"><label>排名依据<select data-rank-metric><option value="units">销量</option><option value="revenue">销售额</option></select></label>'+
      '<label>价格带（'+currency+'）<select data-rank-band><option value="">全部</option>'+
      bands.map(i=>'<option value="'+i+'">'+labels.get(i)+'</option>').join('')+'</select></label></div><div data-rank-table></div>';
    const metric=box.querySelector('[data-rank-metric]'), band=box.querySelector('[data-rank-band]');
    if(new URLSearchParams(location.search).get('rankMetric')==='revenue')metric.value='revenue';
    const previousBand=new URLSearchParams(location.search).get('rankBand');
    if(bands.includes(previousBand))band.value=previousBand;
    const renderRank=()=>{
      const groups=new Map();
      for(const [, ,period,items] of selected)for(const [id,listing,units,revenue,quote,title] of items){
        if(band.value&&bandFor(quote)!==band.value)continue;
        const item=groups.get(id)||{id,units:null,revenue:null,period:''};
        if(units!==null)item.units=(item.units??0)+units;
        if(revenue!==null)item.revenue=(item.revenue??0)+revenue;
        if(period>=item.period)Object.assign(item,{listing,quote,title,period});
        groups.set(id,item);
      }
      const key=metric.value,name=key==='units'?'销量':'销售额';
      box.querySelector('[data-rank-heading]').textContent=name+' Top 10';
      const rows=[...groups.values()].filter(row=>row[key]>0).sort((a,b)=>b[key]-a[key]||a.id.localeCompare(b.id)).slice(0,10);
      box.querySelector('[data-rank-table]').innerHTML=rows.length?'<div class="table"><table><thead><tr><th>名次</th><th>商品</th>'+
        '<th>参考报价（'+currency+'）</th><th>销量（台）</th><th>销售额（'+currency+'）</th></tr></thead><tbody>'+
        rows.map((row,i)=>'<tr><td>'+(i+1)+'</td><th scope="row" class="product">'+rankedProduct({
          id:row.listing,name:row.title||row.listing,url:'https://www.'+countries[scope.country][2]+'/dp/'+row.listing,country:scope.country
        })+'</th><td>'+(row.quote>0?money(row.quote,1e6)+'<small>'+row.period+'</small>':'—')+
          '</td><td>'+qty(row.units)+'</td><td>'+money(row.revenue,1e6)+'</td></tr>').join('')+'</tbody></table></div>':'<p>当前范围暂无用于排名的数据。</p>';
    };
    metric.onchange=renderRank;band.onchange=renderRank;renderRank();
    return box;
  }

  function mercadoRanking(months){
    const groups=new Map();
    for(const [, ,items] of months)for(const [key,id,units] of items){
      const entry=groups.get(key)||{id,units:0};
      entry.units+=units;
      groups.set(key,entry);
    }
    const models=new Set(),products=published.mercado.products;
    const ranked=[...groups.values()].filter(row=>row.units>0).sort((a,b)=>b.units-a.units||a.id.localeCompare(b.id)).filter(row=>{
      const model=products[row.id]?.[2]||row.id;
      if(models.has(model))return false;
      models.add(model);
      return true;
    }).slice(0,10);
    if(!ranked.length)return '';
    return '<section class="panel" id="top10"><h2>销量 Top 10</h2><p>所选完整月有记录的同类商品。</p>'+
      '<div class="table"><table><thead><tr><th>名次</th><th>商品</th><th>销量（台）</th></tr></thead><tbody>'+
      ranked.map((row,i)=>{
        const [name,link]=products[row.id]||[row.id,''];
        return '<tr><td>'+(i+1)+'</td><th scope="row" class="product">'+rankedProduct({id:row.id,name,url:link})+'</th><td>'+
          qty(row.units)+'</td></tr>';
      }).join('')+'</tbody></table></div></section>';
  }

  function reportFor(scope){
    const {platform,country,category}=scope,local=countries[country],key=[country,category].join('|');
    const match=row=>row[0]===country&&row[1]===category;
    if(platform==='amazon'){
      const own=archive?.amazon?.rows.some(match);
      const current=own?archive.amazon:published?.amazon;
      return {
        rows:(current?.rows||[]).filter(match).map(([, ,period,units,revenue,groups])=>[period,units,revenue,groups]),
        ranking:(current?.rankMonths||[]).filter(match),openMonths:own?[]:(current?.openMonths||[]).filter(match).map(row=>row[2]),
        divisor:1e6,
        heading:local[0]+' Amazon · '+categories[category],
        note:'同类商品的销量和销售额为估算。'
      };
    }
    if(scope.scope==='category'){
      return {
        rows:archive?.mercado?.markets[country]||[],
        divisor:100,extra:'月均价（'+window.MarketCurrency.code(country,local[1])+'）',price:true,
        heading:local[0]+'美客多 · 吸尘器类目',
        note:'平台吸尘器类目 '+local[3]+' 涵盖多种形态。',
        missing:archive?'所选范围暂无平台类目资料。':'打开本机文件后查看平台类目数据。'
      };
    }
    const history=published?.mercado?.scopes[key]||[];
    return {
      rows:history.map(([period,units,groups])=>[period,units,null,groups.length]),history,
      divisor:100,
      heading:local[0]+'美客多 · '+categories[category],
      note:'同类商品的整月销量为估算。'
    };
  }

  function render(){
    const scope=readScope(), {platform,country,category,startMonth:start,endMonth:end}=scope;
    const localCurrency=countries[country][1],currency=window.MarketCurrency.code(country,localCurrency),container=$('report');
    const validRange=month(start)&&month(end)&&start<=end;
    const linkScope={page:'market',country,platform,category,marketPeriod:'monthly'};
    if(validRange)Object.assign(linkScope,{startMonth:start,endMonth:end});
    $('market-overview').href=marketURL+'#'+new URLSearchParams(linkScope).toString();
    if(!validRange){container.innerHTML='<p class="panel">请选择有效的起始月与结束月。</p>';return;}
    const report=reportFor(scope);
    if(scope.scope==='category'&&!archive)$('local-data').open=true;
    const inRange=period=>period>=start&&period<=end;
    const rows=report.rows.filter(row=>inRange(row[0])).sort((a,b)=>a[0].localeCompare(b[0])).map(([period,units,revenue,extra])=>[
      period,units,window.MarketCurrency.amount(revenue,country,localCurrency,period),
      report.price?window.MarketCurrency.amount(extra,country,localCurrency,period):extra
    ]);
    const listingMonths=report.history?.filter(row=>inRange(row[0]))||[];
    const expected=monthNumber(end)-monthNumber(start)+1;
    const missing=report.openMonths?.filter(inRange)||[];
    const coverage=column=>rows.filter(row=>row[column]!==null).length;
    const table=rows.length?'<div class="table"><table><thead><tr><th>月份</th><th>销量（台）</th><th>销售额（'+currency+
      '）</th>'+(report.price?'<th>'+report.extra+'</th>':'')+'</tr></thead><tbody>'+
      rows.map(([period,units,revenue,extra])=>'<tr data-report-month="'+period+'"><th scope="row">'+period+'</th><td>'+
        qty(units)+'</td><td>'+money(revenue,report.divisor)+'</td>'+(report.price?'<td>'+money(extra,report.divisor)+'</td>':'')+'</tr>').join('')+
      '</tbody></table></div>':'<p>'+(report.missing||'所选范围暂无可用月度记录。')+'</p>';
    container.innerHTML='<section class="panel"><div class="row"><div><h2>'+report.heading+'</h2>'+
      '<p>'+report.note+'</p>'+(country==='AR'?'<p>金额以美元（USD）展示，按<a href="'+esc(window.MarketCurrency.source)+'" target="_blank" rel="noopener noreferrer">阿根廷央行</a>月均汇率折算。</p>':'')+'</div>'+
      (rows.length?'<button type="button" data-month-export>导出所选月份</button>':'')+'</div></section>'+
      '<section class="metrics"><article><span>期间销量估算（台）</span><strong data-total-units>'+
      qty(sum(rows.map(r=>r[1])))+'</strong></article><article><span>期间销售额估算（'+currency+'）</span><strong data-total-revenue>'+
      money(sum(rows.map(r=>r[2])),report.divisor)+'</strong></article></section><section class="panel"><div class="row"><h2>逐月数据</h2>'+
      '</div>'+
      (coverage(1)>0&&coverage(1)<expected?'<p class="subtitle">部分月份暂无整月销量。</p>':'')+
      (missing.length?'<p class="subtitle">'+missing.join('、')+' 未满整月。</p>':'')+table+'</section>';
    if(report.ranking){
      const rank=rankSection(scope,report.ranking.filter(row=>inRange(row[2])),currency);
      if(rank)container.append(rank);
    }
    if(report.history)container.insertAdjacentHTML('beforeend',mercadoRanking(listingMonths));
    const exportButton=container.querySelector('[data-month-export]');
    if(exportButton)exportButton.onclick=()=>downloadable([
      ['国家','平台','品类或平台类目','月份','币种','销量估算（台）','销售额估算',
       ...(report.price?[report.extra]:[])],
      ...rows.map(([period,units,revenue,extra])=>[country,platform==='amazon'?'Amazon':'Mercado Libre',report.price?countries[country][3]:category,
       period,currency,units,revenue===null?null:(revenue/report.divisor).toFixed(2),
       ...(report.price?[extra===null?null:(extra/report.divisor).toFixed(2)]:[])])
    ],'UWANT_'+platform+'_'+country+'_'+category+'_'+(scope.scope||'sample')+'_'+start+'_'+end+'.csv');
  }

  const query=new URLSearchParams(location.search);
  const legacyCategory=query.get('platform')==='ml'&&!query.has('category')&&!query.has('scope');
  $('platform').value=query.get('platform')==='amazon'?'amazon':'ml';
  $('basis').value=query.get('scope')==='category'?'category':'sample';
  options($('category'),Object.entries(categories),query.get('category')||'vacuum');
  setMarkets(query.get('country'));
  $('startMonth').value=month(query.get('startMonth'))?query.get('startMonth'):'2026-01';
  $('endMonth').value=month(query.get('endMonth'))?query.get('endMonth'):'2026-10';
  $('platform').onchange=()=>setMarkets($('country').value);
  $('category').onchange=syncBasis;
  $('basis').onchange=()=>{writeScope();render();};
  $('scope').onsubmit=event=>{
    event.preventDefault();
    writeScope();
    render();
  };
  $('archive-file').onchange=async event=>{
    const file=event.target.files[0];if(!file)return;
    const sequence=++importSequence;
    try {
      if(file.size>2*1024*1024)throw Error('请选择不超过 2 MB 的月度数据文件。');
      const data=JSON.parse(await file.text());
      if(sequence!==importSequence)return;
      archive=verify(data);
      $('file-status').textContent='已读取本机数据文件。';
      if(legacyCategory&&!$('basis-field').hidden&&!new URLSearchParams(location.search).has('scope'))$('basis').value='category';
      render();
      if(location.hash==='#top10')requestAnimationFrame(()=>$('top10')?.scrollIntoView());
    }catch(error){
      if(sequence===importSequence)$('file-status').textContent=error instanceof SyntaxError?'这份文件不是有效的月度数据。':error.message;
    }finally{if(sequence===importSequence)event.target.value='';}
  };
  const embedded=$('embedded-archive');
  if(embedded){
    try{archive=verify(JSON.parse(embedded.textContent));$('file-status').textContent='已载入本机历史资料。';if(legacyCategory)$('basis').value='category';}
    catch(error){$('file-status').textContent=error.message;}
  }
  render();
})();
