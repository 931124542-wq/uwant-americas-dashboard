/* Public product facts only. Retrieved page text is not a live stock or price guarantee. */
window.PRODUCT_PUBLIC_EVIDENCE={asOf:'2026-11-04',records:[
 {country:'mx',platform:'official',category:'vacuum',brand:'Shark',model:'Clean & Empty BU3120LAA',modelKey:'mx:shark:bu3120laa-official',modelStatus:'manufacturer_model',productId:'BU3120LAA',productType:'dry',identityStatus:'observed_model',versionStatus:'unconfirmed',dataNature:'observation',source:'SharkNinja墨西哥商品页（检索服务返回页面文本）',sourceDate:null,retrievedDate:'2026-11-03',sourceUrl:'https://www.sharkninja.mx/aspiradora-inalambrica-shark-con-autolimpieza-y-vaciado-automatico/BU3120LAA.html',currency:'MXN',price:null,priceKind:'observation',imageUrl:null,
  sourceDateNote:'2026-11-03读取检索服务页面文本；直连HTTP403。保留型号与品牌标称，未确认当前供货、到手价或促销有效性。',
  claims:[
   {key:'powerSource',label:'供电形态',value:'无线',basis:'品牌墨西哥商品说明（检索页面文本，非实时供货核验）',sourceDate:null,locator:'Descripción del producto'},
   {key:'autoempty',label:'自集尘',value:'自集尘底座（品牌标称）',booleanValue:true,basis:'品牌墨西哥商品说明',sourceDate:null,locator:'Modelo BU3120LAA / base de vaciado'},
   {key:'runtime',label:'续航及条件',value:'最长40分钟；ECO手持模式（品牌标称）',basis:'品牌墨西哥商品说明，条件不得省略',sourceDate:null,locator:'Detalles del producto'},
   {key:'capacity',label:'机身尘杯',value:'0.38 L（品牌标称）',basis:'品牌墨西哥规格',sourceDate:null,locator:'Capacidad del depósito de polvo'},
   {key:'baseCapacity',label:'集尘底座',value:'1.3 L（品牌标称，非机身尘杯）',basis:'品牌墨西哥商品说明',sourceDate:null,locator:'Base de vaciado'},
   {key:'power',label:'输入功率',value:'180 W（品牌标称，非吸力AW）',basis:'品牌墨西哥规格',sourceDate:null,locator:'Vatios'},
   {key:'voltage',label:'电压标称',value:'120 V（品牌标称）',basis:'品牌墨西哥规格',sourceDate:null,locator:'Tensión'},
   {key:'warranty',label:'保修',value:'5年有限保修；购买渠道和适用条件仍需核对',basis:'品牌墨西哥商品页，不套用到其他国家/卖家',sourceDate:null,locator:'Garantía limitada'}
  ],
  sourceObservations:[{kind:'cached_page',value:8499,currency:'MXN',observedDate:'2026-11-03',recordUpdatedAt:null,seller:null,conditions:'来自检索页面文本；原始价格采集时点、库存、到手价和优惠码有效性未核，不参与当前报价排序'}],
  evidenceReferences:[{url:'https://www.sharkninja.mx/aspiradora-inalambrica-shark-con-autolimpieza-y-vaciado-automatico/BU3120LAA.html',label:'墨西哥品牌型号、规格与保修说明',sourceDate:null,locator:'2026-11-03取得页面文本',fields:['型号','自集尘','续航条件','容量','功率','电压','保修']}],
  unresolvedIssues:['官网页面文本可支持型号和品牌标称；当前交易价格与库存仍未核实','同型号跨渠道的颜色、套装和保修资格不自动等同']},
 {country:'ca',platform:'bestbuy',category:'vacuum',brand:'Shark',model:'IP3253 / IP3251（来源内部冲突）',productId:'19915695',productType:'dry',identityStatus:'conflict',versionStatus:'conflict',dataNature:'candidate',source:'Best Buy Canada商品页（检索页面文本）',sourceDate:null,retrievedDate:'2026-11-03',sourceUrl:'https://www.bestbuy.ca/fr-ca/produit/aspirateur-balai-sans-fil-powerdetect-clean-empty-de-shark/19915695',currency:'CAD',price:null,priceKind:'observation',imageUrl:null,soldBy:'Shark Ninja Official Distributor（第三方市场卖家，名称不等于品牌直营认证）',
  sourceDateNote:'直连HTTP403。页面型号栏IP3253，介绍正文IP3251；未合并型号。页面19.99/月是会员说明，不当作商品价格。',
  claims:[{key:'warranty',label:'保修依据',value:'页面要求咨询卖家，未给出保修年限',basis:'Best Buy Canada当地页面文本',sourceDate:null,locator:'Renseignements sur la garantie'}],
  evidenceReferences:[{url:'https://www.bestbuy.ca/fr-ca/produit/aspirateur-balai-sans-fil-powerdetect-clean-empty-de-shark/19915695',label:'加拿大Listing、卖家与型号冲突证据',sourceDate:null,locator:'Modèle / À propos de cet article / Garantie',fields:['型号冲突','卖家','保修缺口']}],unresolvedIssues:['型号栏IP3253与正文IP3251冲突，保留候选；不按已确认新品或型号组合并','未取得可核实商品报价；会员费用和美国官网美元价均不使用']}
]};

/* Free Mexico manufacturer evidence, read 2026-11-04; no metric qualification changes. */
(function(){
 const url='https://mx.roborock.com/pages/roborock-f25-series',image='https://cdn.shopify.com/s/files/1/0751/1778/9405/files/Roborock_F25_RT_ID.png?v=1758792729';
 const facts=[['runtime','最长40分钟，ECO模式（F25 RT列）'],['weight','4.0 kg（F25 RT列，品牌标称）'],['cleanWater','870 ml（F25 RT列）'],['dirtyWater','720 ml（F25 RT列）']];
 for(const platform of ['official','amazon'])window.PRODUCT_PUBLIC_EVIDENCE.records.push({country:'mx',platform,category:'wash',brand:'Roborock',model:'F25 RT',modelKey:'mx:roborock:f25-rt',modelStatus:'manufacturer_linked_local_model',productId:platform==='amazon'?'B0FBRQKPTD':'F25-RT-MX',productType:'wash',identityStatus:'observed_model',versionStatus:'unconfirmed',dataNature:'observation',price:null,currency:'MXN',priceKind:'observation',sourceDate:'2026-11-04',source:'Roborock墨西哥官方型号表与Amazon购买链接（直接HTTP200）',sourceUrl:platform==='amazon'?'https://www.amazon.com.mx/dp/B0FBRQKPTD':url,imageUrl:image,imageEvidence:{sourceUrl:url,sourceDate:'2026-11-04',productId:'F25 RT',locator:'F25 RT型号图，alt=Roborock F25 RT；不是其他F25型号图片'},claims:facts.map(([key,value])=>({key,value,basis:'墨西哥品牌规格表F25 RT列，非独立实测',sourceDate:'2026-11-04',sourceUrl:url,locator:'Key Specs / Roborock F25 RT'})),evidenceReferences:[{url,sourceDate:'2026-11-04',label:'F25 RT列、准确型号图及Amazon跳转链接',fields:['model','image','runtime','weight','cleanWater','dirtyWater','asin']},{url:'https://www.amazon.com.mx/roborock-Aspiradora-Inal%C3%A1mbrica-Autolimpieza-Autosecado/dp/B0FBRQKPTD?th=1',sourceDate:'2026-11-04',label:'品牌墨西哥页面的F25 RT购买链接；不证明历史父体或当日库存',fields:['asin']}],unresolvedIssues:['官网F25 RT购买链接明确指向B0FBRQKPTD；仅确认当地型号关联，不确认完整套装、电压或历史父体。','官网另把B0DHTTNJ2Y标为F25/F25 BX，后缀仍有歧义，不将其合并到F25 RT。','不把F25 ACE的SlideTech、自动加液或App配置复制给RT。','没有本型号有效当日报价，不从其他地区或缓存填价；新身份不解除任何销量隔离。']});
 const patches=[
  {url:'https://mx.dreametech.com/products/dreame-h12-pro',facts:[['power','300 W（额定功率，非吸力）'],['weight','4.9 kg（品牌规格）'],['runtime','最长35分钟（品牌规格，实际条件另核）'],['cleanWater','900 ml（品牌规格）'],['dirtyWater','700 ml（品牌规格）'],['mode','自动、吸水、Ultra三模式'],['selfclean','放回基站后按键冲洗滚刷，滚刷双向旋转'],['drying','自清洁后热风烘干约1.5小时；不是运行续航'],['edge','双侧贴边滚刷（品牌页面标称）']],note:'2026-11-04取得品牌墨西哥页面文本，直连TLS失败；规格保留原始采集时间未知状态，不据此更新报价或库存。'},
  {url:'https://tinecomx.com/products/floor-one-stretch-s6',facts:[['suction','18,000 Pa（当地页面标称）'],['cleanWater','0.8 L（当地页面标称）'],['dirtyWater','0.72 L（当地页面标称）'],['drying','85°C热风烘干约5分钟；不是清洁续航或出水温度'],['selfclean','热水双向滚刷清洗；清理滚刷和吸污通道'],['tangle','滚刷防缠绕（当地页面标称）'],['edge','双侧贴边滚刷（当地页面标称）'],['warranty','站点标示1年；自称官方分销商，不等于品牌直营认证']],note:'2026-11-04检索页面出现6,749 MXN及缺货提示，但直连429，原始采集时点未知；保留已有带日期报价，不将新缓存价当作当日报价。'}
 ];
 for(const patch of patches){const r=window.PRODUCT_EVIDENCE_ADDITIONS.records.find(r=>r.sourceUrl===patch.url);if(!r)continue;r.claims.push(...patch.facts.map(([key,value])=>({key,value,sourceDate:null,retrievedDate:'2026-11-04',sourceUrl:patch.url,basis:'当地品牌/分销页面文本；原始采集时点未提供',locator:'商品正文与规格区'})));r.evidenceReferences.push({url:patch.url,label:patch.note,sourceDate:null,retrievedDate:'2026-11-04',fields:patch.facts.map(x=>x[0])});r.unresolvedIssues.push(patch.note);}
})();
