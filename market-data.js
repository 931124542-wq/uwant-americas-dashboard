const marketEvidenceDate='2026-10-12';
const marketSources={
 amvo:{name:'AMVO · 2026研究公开页面',url:'https://amvo.org.mx/descarga-evo-2026',period:'2025全年',type:'行业协会'},
 amvoBlog:{name:'AMVO站内 · Pentafon引用2026研究',url:'https://blog.amvo.org.mx/blog/c%C3%B3mo-convertir-el-crecimiento-del-ecommerce-mexicano-en-leads-y-ventas-reales-en-2027',period:'2025全年',type:'协会站内文章'},
 statcan:{name:'Statistics Canada · Retail trade July 2026',url:'https://www150.statcan.gc.ca/n1/daily-quotidien/260924/dq260924a-eng.htm',period:'2026年7月 · 季调',type:'官方统计'},
 statcanScope:{name:'Statistics Canada · 电商统计口径',url:'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=2010005603',period:'月度',type:'官方统计'},
 sprite:{name:'卖家精灵 · 选市场',url:'https://www.sellersprite.com/cn/v2/market-research',period:'站点及字段核查',type:'工具说明'},
 d600:{name:'UWANT美国官网 · D600产品参照',url:'https://uwanthome.com/products/uwant-d600-vacuum-mop',period:'跨地区参数参照',type:'品牌标称'},
 d800:{name:'UWANT美国官网 · D800产品参照',url:'https://uwanthome.com/products/uwant-cordless-wet-dry-vacuum-cleaner-d800',period:'跨地区参数参照',type:'品牌标称'},
 v500:{name:'UWANT美国官网 · V500产品参照',url:'https://uwanthome.com/products/v500-cordless-self-emptying-vacuum-cleaner',period:'跨地区参数参照',type:'品牌标称'},
 y100:{name:'UWANT美国官网 · Y100常温版参照',url:'https://uwanthome.com/products/uwant-portable-carpet-cleaner-y100',period:'常温版；报表版本待确认',type:'品牌标称'},
 m600:{name:'UWANT美国官网 · M600产品参照',url:'https://uwanthome.com/products/uwant-mattress-vacuum-cleaner-m600',period:'跨地区参数参照',type:'品牌标称'}
};
const marketMacro={
 mx:{context:'电商整体增长明确，清洁电器的细分增速仍需补齐。',cards:[
 {label:'全年零售电商规模',value:'9,410',unit:'亿 MXN',foot:'2025全年 · 全品类零售电商',source:'amvo'},
 {label:'零售电商同比增长',value:'+19.2%',unit:'',foot:'2025 vs 2024 · 站内文章引用研究',source:'amvoBlog'},
 {label:'数字买家人数',value:'7,720',unit:'万人',foot:'2025全年 · 全品类',source:'amvo'},
 {label:'清洁电器市场规模',value:'—',unit:'待补',foot:'尚无两国可比的细分类目数据',source:null}],
 note:'全国零售电商增长不能直接代表洗地机增长；只作为渠道环境。AMVO全年数据与加拿大月度季调数据不直接比较。',
 insight:'先验证细分赛道，再决定扩量。把同价位竞争、流量质量和当地交付条件放在一起判断。',
 channels:[['Amazon MX','关键词、自然排名、竞品ASIN','细分需求、广告与Listing机会'],['Mercado Libre','商品ID、卖家、到手价、配送与分期','本地购买条件与实际竞争'],['零售与会员店','Sell-out、门店、套装、库存','渠道动销与展示效果']]},
 ca:{context:'整体零售与电商月度回落，需拆分品类和销售区域。',cards:[
 {label:'月度零售总额',value:'737',unit:'亿 CAD',foot:'2026年7月 · 季调 · 全品类',source:'statcan'},
 {label:'月度零售电商',value:'55',unit:'亿 CAD',foot:'2026年7月 · 季调 · 加拿大本土零售商',source:'statcan'},
 {label:'电商环比变化',value:'−3.5%',unit:'',foot:'2026年7月 vs 6月 · 季调',source:'statcan'},
 {label:'清洁电器市场规模',value:'—',unit:'待补',foot:'不能由整体零售额推导',source:null}],
 note:'电商占零售总额7.5%。统计只含加拿大本土零售商线上销售，不覆盖所有海外网站对加拿大消费者的销售。',
 insight:'不要把全品类单月下降当作清洁电器需求下降。优先核对当地实际成交价、售后承诺和产品评价，再验证增长机会。',
 channels:[['Amazon CA','当地ASIN、搜索词、广告、评价','同平台流量与转化基准'],['本地零售渠道','SKU、卖家、套装、促销和库存','渠道价格与消费者信任'],['品牌官网','英法页面、配送、保修与耗材','服务承诺和购买障碍']]}
};
const marketProducts={
 D600:{category:'洗地机',scene:'硬地板日常干湿清洁',source:'d600',strength:'推入式底座、低位清洁与自清洁可作为演示重点。',weakness:'躺平和热风干燥在竞品中也已存在；差异要落到体验。',position:'功能型竞争候选 · 当地价位待确认',action:'用相同污渍、家具高度和清洁面积演示推入底座及低位清洁，记录维护步骤。',validation:'比较同来源访问的转化、退货原因与贡献利润。',features:['推入式底座','低位清洁','自清洁 / 热风干燥'],caution:'美国官网的参数不能直接认定为墨西哥或加拿大版本。'},
 D800:{category:'洗地机',scene:'边角与家具下方清洁',source:'d800',strength:'机械臂贴边可形成可见的差异化演示。',weakness:'高价是否有说服力，需要验证贴边效果、评价和维护体验。',position:'体验升级候选 · 溢价空间待验证',action:'主图和短视频展示同一路径的边角残留；与同功能型号实测对比，验证升级价值。',validation:'跟踪D800与D600的成交、利润和互相替代，避免只看单品增长。',features:['机械臂贴边','180°躺平','推入式底座'],caution:'美国页面的干燥温度文字与规格表存在不一致，不使用该数值判优。'},
 V500:{category:'无线吸尘器',scene:'吸尘后少接触灰尘、日常碎屑与毛发',source:'v500',strength:'自动集尘、刮尘结构和绿光可形成完整使用体验。',weakness:'自动集尘不是独有；尘袋成本、基站体积和地刷表现也影响选择。',position:'便利性竞争候选 · 与含底座套装比较',action:'把“清扫—回站—集尘”作为完整演示，说明尘袋补购及维护；先核对购买入口与配送。',validation:'相同词组和价格条件下比较转化、广告贡献利润与耗材购买。',features:['自动集尘底座','绿光照明','防缠绕地刷'],caution:'美国官网与其他区域页面的吸力、续航存在版本差异，不跨版本排名。'},
 Y100:{category:'布艺清洗机',scene:'沙发、车座与局部布艺污渍',source:'y100',strength:'场景演示直观，可以突出附件、喷水吸水及收纳。',weakness:'报表“Y100”未确认具体版本；不能直接宣传蒸汽功能。',position:'场景型竞争候选 · 先确认常温 / 蒸汽版',action:'先映射报表SKU、EAN和当地链接；再用同种布料与污渍展示清洁过程、残水和维护。',validation:'按场景拆分广告，跟踪加购、成交与“预期不符”退货。',features:['局部布艺清洁','喷水 / 吸水','附件及软管维护'],caution:'Y100、Y100 Steam、Y100S不自动合并，蒸汽功能要按当地SKU确认。'},
 M600:{category:'除螨仪',scene:'床垫与沙发布艺的日常灰尘清洁',source:'m600',strength:'专用床垫清洁流程与可见集尘有助于解释用途。',weakness:'细分市场需求规模未知；需要解释与普通吸尘器的使用差别。',position:'专用场景候选 · 需求教育与价格同时验证',action:'演示床垫清洁步骤与集尘；对照专用床垫机，核对配件与本地服务。',validation:'跟踪场景素材的有效点击、转化、退货与售后问题。',features:['床垫专用','灰尘显示','过滤系统'],caution:'杀菌、除螨率及健康改善不能仅凭营销页面当作实测结论。'}
};
const marketCanadaCompetitors=[
 {id:'ca-s5',sku:['D600','D800'],brand:'Tineco',model:'FLOOR ONE S5',category:'洗地机',price:399.99,original:599.99,currency:'CAD',channel:'Tineco 加拿大官网',evidence:'加拿大产品页面',availability:'页面标为缺货 / backorder',source:'https://ca-store.tineco.com/products/tineco-floor-one-s5-cordless-lightweight-smart-wet-dry-vacuum-cleaner/',features:'干湿清洁、自动感应、单侧贴边、自清洁；详细规格表标35分钟',focus:'对比底座使用、低位清洁、维护及保修。页面文字存在35/40分钟差异，采用型号规格表并保留提示。',note:'399.99为展示价，不是已核验结算价；缺货价格仅作参照。',reviews:'1,168条品牌网站评价，来源及聚合方式未核；不等于加拿大买家数',relation:'同品类候选'},
 {id:'ca-station',sku:['V500'],brand:'Tineco',model:'PURE ONE Station 5',category:'无线吸尘器',price:429.99,original:599.99,currency:'CAD',channel:'Tineco 加拿大官网',evidence:'加拿大产品页面',availability:'页面标为缺货 / backorder',source:'https://ca-store.tineco.com/products/tineco-pure-one-station-5-cordless-smart-vacuum',features:'含自动清洁 / 集尘基站，2.5L基站集尘桶（品牌标称）',focus:'V500应比较含底座套装；同时核对尘袋、维护、尺寸、过滤与地刷。',note:'与V500功能场景接近；当地UWANT版本及价格未核，不能判定性价比胜出。',reviews:'142条品牌网站评价，不作为销量或份额',relation:'同功能候选'},
 {id:'ca-shark',sku:['Y100'],brand:'Shark',model:'StainStriker PX200C',category:'布艺清洗机',price:null,currency:'CAD',channel:'SharkNinja 加拿大官网',evidence:'加拿大产品页面',availability:'价格及库存待核验',source:'https://www.sharkninja.ca/shark-stainstriker-portable-carpet-upholstery-cleaner/PX200C.html',features:'局部污渍、地毯与布艺清洁；具体附件和清洁剂套装待核',focus:'按常温清洗场景比较；不能把清洁剂方案当蒸汽功能。',note:'已确认当地型号页面，未取得可靠报价。',reviews:null,relation:'同场景候选'},
 {id:'ca-mattress',sku:['M600'],brand:'待锁定',model:'加拿大专用床垫机',category:'除螨仪',price:null,currency:'CAD',channel:'Amazon CA 等 · 待核',evidence:'调研缺口',availability:'未核验',source:null,features:'专用床垫机优先；普通手持机作为替代品另列',focus:'需要本地在售商品、需求词、销量估算及评价。',note:'尚无已核型号，不认定该品类竞争少或市场空白。',reviews:null,relation:'待调研'}
];
const marketDataNeeds=[
 ['P0','当地UWANT商品身份','国家、平台、链接、ASIN/商品ID、EAN、版本、套装','确定谁和谁可比','本地运营 / 产品资料'],
 ['P0','当地真实成交条件','标价、优惠、运费、税口径、分期、库存、到货时效、保修','判断价格优势是否成立','页面记录 + 后台'],
 ['P0','经营基准与成本','每日SKU销量、净销售额、访问、广告、退款、落地/履约成本','验证策略与利润','平台后台 + 财务'],
 ['P1','平台细分类目','近12个月月度销量/销售额估算、价格分布、品牌集中度、样本范围','判断赛道与价位机会','卖家精灵等导出；仅覆盖其平台'],
 ['P1','关键词与竞品趋势','国家/平台、关键词搜索量、自然/广告排名、ASIN趋势、评论变化','发现流量和需求机会','卖家精灵 + 平台搜索报告'],
 ['P1','全国清洁电器大盘','品类定义、国家、年度、规模、增速、线上/线下口径','补齐全国品类趋势','行业研究 / 零售监测'],
 ['P1','Mercado Libre及零售','类目样本、商品ID、Sell-out、促销及门店覆盖','完成墨西哥渠道判断','代理 / 平台 / 零售商'],
 ['P2','消费者反馈','当地近期评价样本、痛点、退货与售后原因','验证真实购买理由','评论采样 + 售后记录']
];
