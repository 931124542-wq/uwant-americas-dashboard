(function () {
  const incoming = new URLSearchParams(location.hash.slice(1));
  const countries = ResearchModel.countries;
  const platforms = {all:'全部平台',...ResearchQuality.platforms};
  const categories = MarketPresentation.categoryLabels;
  const select = (options,key) => Object.hasOwn(options,incoming.get(key)) ? incoming.get(key) : '';
  const country = select(countries,'country'), platform = select(platforms,'platform'), category = select(categories,'category');
  const month = value => /^20\d{2}-(0[1-9]|1[0-2])$/.test(value||'');
  const start = incoming.get('startMonth'), end = incoming.get('endMonth');
  const dataset = incoming.get('dataset');
  const scope = new URLSearchParams();
  for (const [key,value] of Object.entries({country,platform,category})) if (value) scope.set(key,value);
  if (month(dataset)||['archive','curated','focus'].includes(dataset)) scope.set('dataset',dataset);
  if (month(start)&&month(end)&&start<=end){scope.set('startMonth',start);scope.set('endMonth',end);}
  if (['monthly','snapshot'].includes(incoming.get('marketPeriod'))) scope.set('marketPeriod',incoming.get('marketPeriod'));
  const own=incoming.get('own');
  if (/^[A-Z][0-9]{3}[A-Z]?$/.test(own||'')) scope.set('own',own);
  const formatMonth = value => value.slice(0,4)+'年'+Number(value.slice(5))+'月';
  const datasetLabels = {archive:'2026年9月（月榜）',focus:'近30天（品牌数据）',curated:'历史竞品数据'};
  const period = scope.has('startMonth')
    ? start===end ? formatMonth(start) : formatMonth(start)+'至'+formatMonth(end)
    : month(dataset) ? formatMonth(dataset) : Object.hasOwn(datasetLabels,dataset) ? datasetLabels[dataset] : '';
  const labels=[countries[country]?.name,platforms[platform],categories[category],period,
    scope.has('own')?'对标 '+own:''].filter(Boolean);
  if(labels.length){
    const caption=document.querySelector('[data-guide-scope]');
    caption.textContent='当前视图范围：'+labels.join(' · ');
    caption.hidden=false;
  }

  document.querySelectorAll('.guide-links a').forEach(link => {
    const route = new URLSearchParams(link.hash.slice(1));
    if (!route.has('page') || route.has('module')) return;
    const target = new URLSearchParams(scope);
    for (const [key,value] of route) target.set(key,value);
    link.href='../#'+target;
  });

  const mercadoCountries=['MX','BR','AR','CL','CO'], amazonCountries=['MX','CA','US','BR'];
  const readerPlatform=['amazon','ml'].includes(platform)?platform:amazonCountries.includes(country)&&!mercadoCountries.includes(country)?'amazon':'ml';
  const readerCountries=readerPlatform==='amazon'?amazonCountries:mercadoCountries;
  const reader=new URLSearchParams({platform:readerPlatform});
  if(readerCountries.includes(country))reader.set('country',country);
  if(category)reader.set('category',category);
  if(readerPlatform==='ml')reader.set('scope','sample');
  for(const key of ['startMonth','endMonth']){
    const value=scope.get(key)||(month(dataset)?dataset:null);
    if(value)reader.set(key,value);
  }
  document.querySelector('[data-monthly-page]').href='../market-history/?'+reader;

  const isOperations = incoming.get('module') === 'operations';
  const page=incoming.get('page'), view=incoming.get('view');
  const back = isOperations ? new URLSearchParams({module:'operations',page:'overview'}) : new URLSearchParams(scope);
  const pages = isOperations ? ['overview','analysis','products','inventory','profit','calendar','tasks','access'] : ['market','brands','competitors'];
  back.set('page',pages.includes(page)?page:isOperations?'overview':'market');
  if(isOperations&&country&&!['CL','CO'].includes(country))back.set('country',country);
  if(!isOperations && ['overview','products','monthly','keywords','data','pricing','macro'].includes(view)) back.set('view',view);
  document.querySelector('[data-guide-return]').href='../#'+back;
})();
