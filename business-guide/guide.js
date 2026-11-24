(function () {
  const incoming = new URLSearchParams(location.hash.slice(1));
  const countries = {MX:'墨西哥',CA:'加拿大',US:'美国',BR:'巴西',AR:'阿根廷',CL:'智利',CO:'哥伦比亚'};
  const platforms = {amazon:'Amazon',ml:'Mercado Libre',all:'全部渠道',bestbuy:'Best Buy',retail:'当地零售',official:'品牌官网',unknown:'渠道待核'};
  const categories = {wash:'洗地机',vacuum:'吸尘器',fabric:'布艺清洗机',mattress:'除螨仪'};
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
  const period = scope.has('startMonth') ? start===end?start:start+' 至 '+end : month(dataset)?dataset:'';
  const caption=document.querySelector('[data-guide-scope]');
  const labels=[countries[country],platforms[platform],categories[category],period].filter(Boolean);
  if(labels.length){caption.textContent=labels.join(' / ');caption.hidden=false;}

  document.querySelectorAll('.destinations a').forEach(link => {
    const route = new URLSearchParams(link.hash.slice(1));
    if (!route.has('page') || route.has('module')) return;
    const target = new URLSearchParams(scope);
    for (const [key,value] of route) target.set(key,value);
    link.href='../#'+target;
  });
  const isOperations = incoming.get('module') === 'operations';
  const page=incoming.get('page'), view=incoming.get('view');
  const back = isOperations ? new URLSearchParams({module:'operations',page:'overview'}) : new URLSearchParams(scope);
  const pages = isOperations ? ['overview','analysis','products','inventory','profit','calendar','tasks','access'] : ['market','brands','competitors'];
  back.set('page',pages.includes(page)?page:isOperations?'overview':'market');
  if(!isOperations && ['overview','products','monthly','keywords','data','pricing','macro'].includes(view)) back.set('view',view);
  document.querySelector('[data-guide-return]').href='../#'+back;
})();
