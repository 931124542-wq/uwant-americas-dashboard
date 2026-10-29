# UWANT 美洲经营看板数据审计 · 2026-10-29

## 第一阶段：修改前审计

基线为最新 `main`：`4a4cb86bd6ffd3adf77b9592a25bdf2c3cff6386`，已 fetch 确认与 origin/main 一致。先生成本节、只读校验脚本和 `data-audit-evidence/before/`，再修复业务逻辑。后续修复和实际测试结果追加在文末，不改写修改前证据。

结论：原始历史数值与已保存接口响应一致，但这不等于真实市场销量得到独立验证。当前数据足以研究部分商品价格及已确认父体样本，**不能据此认定完整市场规模，也不能替代 UWANT 实际销售、库存和利润**。筛选解除父体冲突、部分覆盖价格带、渠道默认识别等问题必须先修复。

### 范围与证据

- 清点全部 HTML、JS/CJS/MJS、CSS、JSON、CSV、XLSX、生成入口；文件及 SHA256 见 `data-audit-evidence/before/file-inventory.csv`。包括主工作台、operations iframe、导入校验和备份恢复逻辑。
- 原始趋势缓存位于本机 `work/year-2026/{国家}-{ASIN}.json`；466 件均能定位，逐字段比对 37,280 次，差异 0。缓存含计费信息，不发布原文件。可使用环境变量传入本地缓存复跑。
- `history-data.js` 与 `year-2026/history.json` 语义完全一致，4,660 行；年度 CSV/Excel 含 11—12 月未来状态，共 5,592 行。未来状态与空值保留。
- 只读 OOXML 核对 Excel 的 5,592 条月度、466 条收录、548 条父体变更，按中文列名、国家/品类/状态映射对 CSV，差异 0。结果见 `data-audit-evidence/workbook-validation.json`。首轮比较脚本误按相同列序比对，已纠正映射后重跑；没有修改工作簿。
- 外部报价 30 条逐条核对链接、国家、币种、型号和来源性质，并尝试打开全部来源。外部网页当前内容不能证明 10 月 13 日历史报价；未覆盖结账、地区配送、套装和历史存档时仍标为待核实。逐条外部状态见后附核验清单。
- 本次卖家精灵 MCP 仅 2 次：MX `B09YVGD2ZP` 当前详情、CA `B0D8J8P1L2` 2026-02 趋势。最近剩余 163 次；后续审计使用缓存，禁止无目的重复抓取。

### 数据来源与统计地图

| 模块 / 指标 | 实际读取与原始来源 | 统计期 / 范围 | 转换和公式 | 空值 / 核验 / 当前可用程度 |
|---|---|---|---|---|
| 经营总览、SKU 销量 | `app.js`、`refined.js` → `data.json.sales`；Sell Out Uwant 2026 10 04.xlsx | MX；Amazon/ML；报表截至10-04，实际最后交易10-03，最早05-25；5 SKU，86条 | 按期间/渠道/SKU筛选后加销量；原表没有收入、订单ID、Sessions | 已记录交易87台；只能核对已接入明细，未找到原Excel/平台后台导出，不能外部核实完整性 |
| 活动销售额、销量、单位转化率 | `data.json.event`、`eventMetadata`、`daily`；UWANT Prime Big Deal Days 2026 Results EN.xlsx；`analysis.js`、`accuracy.js` | MX Amazon；10-06—07，采集10-09；daily另含10-04—05对照 | units合计4；收入8221.05 MXN；Sessions12684；单位转化率4/12684，不是订单转化率；对照变化须来自daily实际值 | 控制合计匹配，仅内部一致；10-07可能回补，后续日期未接入 |
| 广告 CPC/CTR/ROAS/ACOS/费用比例 | `data.json.advertising` + event；`accuracy.js` | MX SP 10-06—07；Attribution 品牌口径另列 | 445.14花费；SP归因收入0；CPC=花费/点击，CTR=点击/曝光；ROAS=归因收入/花费；ACOS零分母不可计算；费用比例=SP/订单销售额 | Meta完整费用缺失；Attribution14天与SP窗口不同；原始后台未外部核实 |
| 库存 | `app.js.inventory/table/detail`、`operations.js` → `data.json.inventory`；Inventory Report - Uwant 2026 10 05.xlsx | MX仓库10-05；5 SKU/EAN；未拆平台 | 可用472+分配6=总478；库存构成应按实际明细分母计算；不是实时平台可售 | 5个EAN13校验位通过，不能证明EAN与当地实物版本绑定正确；原Excel/仓库记录待确认 |
| 利润与补货 | `operations.js`、`sales-decisions.js` 用户输入 | 本国/平台/SKU会话假设，非已实现利润 | 单台净额−落地成本−平台/履约费−广告−损失；费率方案净额×(1−费率)−固定变动费用；触发量ceil(日预测×提前期及安全天数)，缺口max(0,触发量−可售−及时在途) | 成本/退款/税/汇率/平台库存未接入。空白不能当0；测算不写回实际数据 |
| 月度市场、品牌、商品研究 | `review.js`/`model.js` → `history-data.js`；iframe按选中范围接收切片 → `market-radar-data.js`、`history-metrics.js` | 2026-01—10；Amazon US/CA/MX/BR；466个当前跟踪商品 | 价格/评分/BSR/评价为期末最后有效点；parentSales父体月估算；历史关系已确认且同父体值一致才去重合计 | 3,518有指标、3,440有父体销量；原始值缓存一致；非Amazon真实成交核验；品牌/品类是当前档案，不是假设当月档案 |
| 9月归档商品/品牌 | `review-data.js`、`sellersprite-live-data.js`、`sellersprite-bi.js` | products/brands dataMonth=202609，US/CA/MX吸尘器Top100返回窗口；BR缺表 | 商品档案和类目聚合两种粒度分别显示；源sales不自动当子体销量；缺父体ID不应可加总 | Top100样本非完整竞品。品牌聚合不等于页面清洗后样本，也不随TopN改变 |
| 近30天类目统计 | `sellersprite-live-data.js` → `sellersprite-bi.js` | 09-29—10-28，来源标注近30天 | 类目总产品/品牌/销量/金额/均价为接口直接字段 | 不与202609品牌Top3拼成同期间判断；类目不等于家用自集尘直接竞品范围 |
| 4品牌补采 | `focus-brands-data.js`、`focus-brands-audit.json`，本机16份 `work/focus-国家-品牌.json` | 10-28采集；161入选、655排除；近30天未给起止日 | 标题规则分类；monthlySales是父体估算，parent是当前关系；品牌标准名与sourceBrand均应保留 | 816返回不是全市场；标题分类不能证明实物版本。没有mattress/MX和BR fabric是名单边界，不是市场不存在 |
| 历史精选竞品 | `sellersprite-products-data.js`、`model.js`、`sellersprite-products.js` | 人工清洗池，统计起止日未提供 | T1/T2/T3为既有人工层级，不按新品牌自动判白牌；自动集尘仅标题证据 | 起止日、部分父体证据不足；不能和9月/自然月合计。不能把原始估算分配给ASIN |
| 公开报价与购买条件 | `competitor-data.js` → `biPublicRows` / `competitor-plus.js` / `research-deep.js` | 10-13观察，MX17/CA13；US/BR没有该组记录 | currencyVerified才进入有效价格；无销量、收入、排名；每条保留源链接、型号后缀/套装及条件 | 历史价格不覆盖为当前报价；TSC应零售；未知域名不能默认品牌官网 |
| 原表竞品、UWANT报价/参数 | `attached-matrix-data.js`、`own-data.js`、`research-data.js`、`new-model-data.js`、`monitored-models.js` | MX/CA原竞品Excel 10-13读取；各SKU各国资料日期独立，V/D/Y/M系列 | 目标MSRP、单点价、区间价、买家价按类型分开；价格±20%只作初筛；配置不评分造结论 | 来源文件/工作表/单元格可追踪；本地版本EAN、库存、税、配送、有效优惠待核；非本国档案不得套用 |
| 巴西公开研究 | `brazil-data.js`、`brazil-market.js`、`brazil-positioning.js` | 10-19各本地证据；Amazon/ML/官网分别列 | BRL；候选/品牌参数/官网报价独立，不从其他国家复制销量 | 当前报价/供货版本仍需核实，不是品牌销售排名 |
| 市场环境 | `market-data.js`、`market.js`、`intelligence-views.js`、`completion-evidence.js` | 公开机构统计各自年份/国别；单独来源说明 | 原公开报告指标；全国电商规模不得推细分清洁类目规模 | 与商品月度/经营实销分开，不计算替代市场规模；并非全部报告本次重新外部核验 |
| 促销日历 | `intelligence.js` promotionCalendar/calendarSources → `calendar.js`、`calendar-hook.js` | 各国2026/2027；各source有独立checkedAt；当地时区今日 | country/year/platform/kind/dateState过滤；official/calendar/pending/conflict；未定/冲突日期为空 | 日期结构/来源可自动查，法律/主办方和卖家后台资格仍需逐源确认，不把年度基线当实时公告 |
| 运营任务 | `app.js.tasks`、`operations.js.opReadiness`、`validation-ledger.js` | 国别建议任务+已确认未来活动；台账为用户输入 | 建议任务数≠正式完成数；完成率、负责人、截止日无输入则不产生；验证前后变化非因果结论 | 未接正式任务系统，无企业实际任务完成率；台账不能代替订单后台 |
| 数据管理/历史/导出 | `radar-validation.js`、`research-deep.js`、`validation-ledger.js`、`shared-state.js`、`review.js`、`market-radar-ui.js` | 标准BI快照与旧样本模板独立；JSON备份/CSV导出 | 国家币种/日期/非负数/重复/父子重叠校验；分组包含统计期和数据性质；CSV应等于当前筛选且空值保留 | 历史CSV/XLSX是全名单；当前CSV是当前筛选。用户导入尚未独立核实。公开静态站文件备份，不是云端共享记录 |

`operations/index.html` 由 `operations/source-entry.txt` 和 `scripts/build-operations.mjs` 生成；不能只改外层model或某一份旧文件。执行时必须同时核对源文件、生成内联脚本与缓存版本。完整文件清单和哈希不在此重复。

### 已确认问题与修复优先级

| ID | 等级 / 分类 | 修改前证据 / 记录 | 影响与推荐处理 |
|---|---|---|---|
| A01 | P0 计算 | `history-metrics.js`只看筛选后记录。US 2026-09父体B0HKG8HXK3，B0H29F2FM7=1635/B0H29BSDQY=1581；父体B0HKHK28ZP，B0H75C3D3B=1285/B0H75D7YCP=1025；B0HG1XM6VL两ASIN9月902/889、10月0/62 | 全部范围排除，单ASIN搜索又计入1635。必须先基于同国家/品类/期间完整来源标识冲突，再筛选；市场、品牌、详情、导出一致 |
| A02 | P0 缺失/计算 | `biCanMetric`只要求listing、全价格、有任一销量；fixture两商品4和null会允许图，`biBins`以`||0`将缺失当0 | 严格要求对应销量/金额覆盖；不够时返回不可用，已知样本KPI独立保留，不将null填0 |
| A03 | P0 统计归属 | 非历史`model.select`直接累加sales；`baseRows`按父体保留第一件。focus的monthlySales工具定义为父体估算；归档/精选有缺父体证据记录 | 使用共享销量单位聚合，ASIN档案和父体指标分开；禁止把父体当单件/未知归属合计，保留原字段及全部ASIN |
| A04 | P1 聚合键 | `HistoryMetrics`仅family|ID，不含国家/币种/月/来源期间 | 当前UI多数单一范围，但混合调用会误合并不同国家/月份同ID。显式复合范围去重，防跨期跨币种抵消 |
| A05 | P1 渠道 | ca-28 BISSELL HydroSteam，www.tsc.ca，历史279.99 CAD，`biPlatformOf`判official | 修为retail；按URL hostname和已知来源映射识别；未知unknown，不能以URL路径含amazon判Amazon。TSC本次可访问，型号后缀仍待核 |
| A06 | P1 导入来源 | 标准校验仅检查Amazon域名+10位ID；ID B000000001配链接/dp/B000000009可通过；旧模板不检查站点域名 | 所有导入及备份恢复检查明确商品链接ID/国家平台，不默默接受错链接；原有格式仍支持 |
| A07 | P1 口径/数据不足 | 1,356个同日多父体月份；另405行有parentSales无parentAsin | 不是本次可凭代码补齐的数据。`record-issues.csv`逐条列出，保留原始parent/child和关系说明，不把所有parentSales直接相加 |
| A08 | P1 口径/周期 | `ssBiOverview`同卡近30天总量+202609 Top3品牌；列表父体/Listing未明时仍为月销量标题 | 将期间和粒度在指标旁分开，移出混期Top3；未知归属原值另列，不伪称单件合计 |
| A09 | P1 原始冲突 | MX B09YVGD2ZP标题Midea、详情EUREKA；本次MCP复核仍相同 | 保持品牌待核，不擅自归Midea/Eureka。源响应已另存；需要商品包装/官方型号证据 |
| A10 | P1 缺失/经营展示 | app/refined部分总量和库存分母为常量；总览+15.4%、SP445.14、8799访问等结论写死，历史期切换仍出现活动结论；sum空值为0 | 有效明细动态计算；只展示对应期说明；无记录/缺字段保持待补。实际原数据不改写 |
| A11 | P2 排名状态 | `biAudit`无rank也生成missing1…10；hasRanks只有有/无；多个rank_scope可拼成一套Top10 | 不适用/待采集/不完整/完整分开；完整要求同一来源统计组的目标名次齐全 |
| A12 | P2 覆盖/分类 | 466当前商品只覆盖vacuum/wash/fabric；没有mattress、MX/BR fabric；不是466个完整市场 | 逐国品类标为跟踪清单边界；需另定类目/关键词采集计划，不在本次自动扩大付费抓取 |
| A13 | P2 体验/口径 | 搜索仅限明细表，KPI范围不变；原文未显式说明 | 明确“仅搜索明细，KPI按全局筛选”，导出依所见明细；不悄悄更改既有局部搜索意义 |
| A14 | P2 保存说明 | 源access文案称在线已接入，但生成站强制UWANT_OFFLINE=true | 与实际文件备份状态保持一致。所有平台实际经营报表仍按文件导入，不声称云端更新 |

修改前自动反例测试 `contract-before.json`：16项，7通过、9失败。通过项目不代表外部真实性；每项输入和预期见 `tests/data-audit-contract.cjs`。金额保留来源小数，展示四舍五入，合计测试使用浮点容差。

### 当前跟踪范围与2月覆盖

| 国家 | vacuum / wash / fabric / mattress | 2月有父体销量 / 当前商品 | 2月有价格 | 备注 |
|---|---|---|---|---|
| US | 147 / 48 / 6 / 0 | 111 / 201 | 109 | 分类来自当前档案 |
| CA | 106 / 34 / 2 / 0 | 75 / 142 | 75 | fabric2件，只有1件有2月父体值，均无可确认历史归属 |
| MX | 97 / 12 / 0 / 0 | 79 / 109 | 79 | 没有跟踪fabric/mattress，不表示没有当地商品 |
| BR | 10 / 4 / 0 / 0 | 0 / 14 | 0 | 10件2月有其他指标，不可据此补销量/价格为0 |

按国/品类/月份的可确认销量、销售额与原始字段覆盖见 `february-coverage.csv`，与有效原始值分母分开。例 CA wash 34条档案、25条父体字段，但确认2个销量单位274台、来源销售额100854.30 CAD；不能显示5056台直接加总。US fabric等价格可用但销量归属未知时仍保留价格分布。

### 人工/外部核验待办

1. 1,356条歧义和405条缺父体ID：需有时间序列的父体变更顺序、独立Listing证明及来源月销量归属说明。当前父体不能自动补作历史父体。清单可按ASIN/月回查，不能以当前详情覆盖历史。
2. A01四组同父体数值冲突：需来源修订/期间内父体拆分证明；筛选不能解除隔离。品牌冲突B09YVGD2ZP需实物型号证据。
3. 161条focus的品牌归一和品类依赖标题及16个品牌查询日志；当前466件是归档清洗池与补采池的并集。未运行全类目mattress/fabric搜索，因此空白是采集范围不足。Tineco Carpet One Cruiser属布艺/地毯清洗大类，是否作为UWANT便携布艺直接竞品需业务确认，不能直接删档。
4. 30条公开报价：保留10-13历史价、币种核验字段、库存未知/套装/后缀提示；当前页面可访问仍不能证明历史到手价。各国授权分销商身份、具体变体、税和配送未全核实。
5. 原经营Excel及平台原始导出不在仓库/已定位文件内；当前只能核对data.json控制合计、EAN校验位，不能确认交易漏单、退货、真实库存和广告归因回补。其他国家无内部实销来源，不允许借用MX。
6. 促销法律日期、资格及冲突入仓日期需当地权威公告/卖家后台确认；本轮结构性校验不等同全部日期外部复核。
7. GitHub Pages公开站不能提供企业微信身份权限与共享保存；本轮不部署登录后端。

### 修复顺序与验收要求

先A01/A02/A03/A04，再A05/A06/A08/A10，最后A11/A13/A14。A07/A09/A12保留待核，不造值。每次修复补已知输入测试，重跑月历史160组合、全部价格边界、跨页面KPI/导出/URL状态。重建operations内联包，核对生成资产与源文件。真实浏览器验证CA fabric、US冲突筛选、MX2月、BR缺失、ML不支持、经营期/渠道、竞品与数据管理，保存前后截图。截图检查仅证明真实渲染，不替代原始数据验证。

## 第二、三阶段：修复与实际验收

### 已完成修复

第一阶段报告及修改前证据单独提交为 `ffafdce`，业务修复在该提交之后进行。原始数据不改写；修复的是适配、校验、汇总、导出和展示。

| 问题 | 实际修改 | 验证 |
|---|---|---|
| A01/A04 | 共享销量单位以国家、币种、平台、数据组、期间及父体/Listing ID去重；冲突判断使用筛选前来源范围。搜索、品牌和价格带不能解除冲突；销量和销售额分别判断 | US B0H29F2FM7 搜索后原1635不再计入，原始值仍保留；同ID跨国跨月独立；零销量保留；相同值仅计一次 |
| A02 | 价格带销量/销售额要求对应单商品字段及价格完整覆盖，否则不可绘制；禁止缺失值以`||0`进入柱状值。已知样本KPI继续保留 | 部分覆盖反例通过；4国价格边界含99.99/100/199.99/200及MX999.99/1000通过；无价格返回紧凑状态 |
| A03/A08 | ASIN档案仅按ASIN去重，父体指标另行去重；focus保留来源原值，归档/精选缺历史归属证据时不加总。单件详情和比较表明确“父体原值，归属或数值待核”。移除近30天KPI中的9月Top3 | 48种非历史范围；原始价格/父体估算/金额逐件保留；归档有真实商品明细但合计未核时显示空，不再用原始相加制造合计 |
| A05/A06 | URL按hostname识别，TSC→retail，已知品牌/分销域名明确映射，未知→unknown；标准与旧模板核对Amazon国家及链接ASIN；标准模板同时检查父体ID格式、ML商品链接ID | ca-28留在CAD零售样本，未知及伪装路径不被识别官方；错误国家、币种、日期、重复、链接错ASIN被拒绝，原输入保留 |
| A10 | 总览/SKU广告和库存核心数值从明细计算；销售额对照须与同范围日表一致且覆盖完整。未记录SKU为空；转化率严格验证分子分母；历史期不显示活动结论 | MX活动8221.05收入/4台/12684访问/445.14 SP保持一致；9月Amazon总览、SKU与导出均11台；模拟字段缺失不变零；库存变化会反映到KPI |
| A11/A13/A14 | 排名四态区分，同榜单范围才算齐全；清洗后的名次保留来源且说明不连续。明细搜索明确局部作用；来源及数据完整度可访问；纠正共享保存文案 | 月度和公开价无排名时“不适用”；多个榜单不能拼Top10；当前站明确公开、无登录权限、文件备份 |

### 后续交叉核对发现并处理的问题

- **A15 P1 数据版本/范围：** `sellersprite-live-data.js`仅缓存每国20条归档商品，而`review-data.js`已缓存US/CA100、MX65。先验证dataMonth相同且20条重叠ASIN的销量、收入、均价、名次全部一致，再复用外层完整缓存、采用同一家用机型排除规则和品牌档案。US/CA/MX三国逐条一致性测试通过。没有新增MCP查询，不能称为完整市场；“来源品牌聚合”仍单独展示，不随商品范围变化。
- **A16 P1 跨页品牌别名：** MX/CA的Dreame/dreame、US的Roborock/roborock原先可能分成不同品牌；统一显示/聚合名，保留sourceBrandName/sourceBrand原字段。月度160个范围逐品牌商品数及合计一致。
- **A17 P1 状态与缓存：** 经营统计期/渠道/选中SKU原先不进URL；新增独立`opsPeriod/opsChannel/opsSku`，不冒用研究dataset。刷新验证sep/Amazon保留。iframe原来固定缓存版本，改为生成内容哈希；浏览器完整刷新后从旧帧切到新帧，避免外层更新、内层仍旧逻辑。
- **A18 P1 导出：** 来源榜单品牌页的全局导出原本会导出未筛选的类目品牌聚合。全局导出现在使用当前样本；独立“导出来源品牌聚合”按钮继续保留，明确不同分母和统计期。
- **A19 P1 采集名单边界（未补采）：** 161条focus档案中7个ASIN未进入466历史名单，均有同父体的已跟踪兄弟商品。清单见`roster-gaps.csv`：US B082VR2BX1、B0FKM65DLZ、B0G4LX2948、B0BLGR4ZL7、B0CW61BSFF；CA B09JF3BR78、B0C2P8SS2Y。不是品类为零或市场不存在，不复制兄弟的历史、不扩大付费查询。
- **A20 P1 人工分组（待确认）：** 原34条T3人工分组中包含8条Dyson、BLACK+DECKER、BISSELL、Levoit、Xiaomi、Electrolux品牌记录。没有白牌/OEM身份依据，界面改为“T3 白牌（分组待核）”，保留原分组，不自动改成T1/T2。每条ASIN见`tier-manual-review.csv`；需要业务重新确认分组含义和归属。
- **A21 P1 交易重复候选（待确认）：** Sell Out有11个“同日/渠道/SKU重复”的候选行（源数组1起算6、21、29、31、36、37、41、50、55、67、78），没有订单ID，不能判定为重复订单并删除。`internal-duplicate-candidates.csv`保留主键与行号；原86行87台没有擅自改动。
- 标题初筛曾将11条Roborock误匹配为robot，是审计脚本正则误报，已修正单词边界，**没有修改任何商品分类**。这不代表全部实物型号及类目经过外部证明。

- **A22 P1 价格/销量异期：** 单商品导入虽有完整价格和销量，也可能是当前快照价与历史销量。价格带销量图及散点现在要求采价快照日与统计结束日一致；异期仍可分别查看原始价格和销量，但不混画关系图。新增已知输入测试，通过。

### 修改文件

业务：`history-metrics.js`、`model.js`、`review.js`、`market-radar-data.js`、`market-radar-ui.js`、`radar-validation.js`、`sellersprite-bi.js`、`sellersprite-products.js`、`research-deep.js`、`app.js`、`refined.js`、`analysis.js`、`operations.js`。
构建与缓存：`scripts/build-operations.mjs`、`operations/index.html`（生成）、`index.html`（资源哈希）、`release.json`、`release-notes.md`。
审计与测试：本报告、`docs/data-audit-evidence/`、`scripts/data-audit.cjs`、`scripts/audit-workbook.py`、`scripts/verify-data.cjs`、`tests/data-audit-contract.cjs`、`tests/operational-data-contract.cjs`、`tests/research-source-contract.cjs`、扩充后的`tests/workspace-contract.cjs`及结果文件。

### 实际自动化结果

`docs/data-audit-evidence/test-run.json`：8个执行组全部通过，运行本身0次网络/MCP调用。

| 执行组 | 实际通过内容 |
|---|---|
| data-audit-contract | 修改前7通过/9失败；修改后17通过/0失败 |
| operational-data-contract | 9项，包含9种期间/渠道组合、真实导出、空/0、单台利润、补货、旧模板来源、经营URL |
| research-source-contract | 48范围，3国归档跨页逐件一致，7个历史名单缺口明确保留 |
| market-monthly | 160国家/品类/月度组合；2月覆盖对validation匹配；空值、父体、导入、语法校验 |
| price-bands | USD/CAD/BRL100一档、MXN1000一档；边界无遗漏/重叠，价格为小数时不进错误档 |
| workspace-contract | 160范围，1030价格带筛选，9子视图；品牌名称/商品数/销量/销售额、KPI与导出一致；同币种范围保留 |
| source-audit | 466原始缓存、37280字段、双历史文件一致、名单映射、271日历节点/93来源结构、5库存EAN、活动控制、14原表SKU页190条报价、68公开观察/配置记录的空销量与币种；10项检查通过 |
| workbook-audit | Excel月度5592×22映射列、收录466×9列、父体变更548×4列对CSV；差异0；工作簿只读，无公式 |

20份原始数据文件与基线保持相同（CSV仅换行符归一后比较），见`source-integrity.json`。**通过的是字段传递、范围与计算一致性，不是SellerSprite估算准确率、真实库存或完整经营利润的外部认证。**

离线复跑：

```sh
node scripts/verify-data.cjs
# 有授权本地原始缓存时：
UWANT_AUDIT_CACHE=../year-2026 node scripts/verify-data.cjs
```

未设置缓存时，原始缓存对照会明确记录NOT_EXECUTED；不会自动调用MCP。需要Python3用于只读OOXML校验，可用UWANT_AUDIT_PYTHON指定解释器。

### 外部核验结果与未核实清单

`external-public-quotes.csv`逐条记录30个链接：25页可读取，5页无法读取（mx-4、mx-9、mx-13、mx-14、mx-17；后三条403）。界面在数据说明中保留本轮访问失败日期与原因。可读取只支持当前来源页标题/渠道核对；**30条10-13历史报价均未取得独立历史存档，不能声称全部历史到手价已核实**。TSC来源确认是零售页，具体型号后缀仍未确认。巴西38条公开候选/配置、宏观报告和93个日历来源没有在本轮全部重新外部打开；结构检查与外部真实性分开记录。

MCP本次共2次、2单位，最近剩余163：MX B09YVGD2ZP当前仍是Midea标题/EUREKA品牌冲突；CA B0D8J8P1L2二月5台/4843.35 CAD/期末999.99且parentChangeHis为空。两份裁剪后的源响应已归档，未包含密钥或计费对象。没有批量重抓历史，没有把接口估算称为Amazon真实成交。

父体1356条歧义、405条缺ID及18条“记录×冲突指标”证据保留。18条并非18个独立父体；其中销售额在US 2026-08 B0HG1XM6VL也有冲突，销量相同不代表金额可以相加。仍缺原始经营Excel/订单ID、平台广告及Attribution成熟归因、平台可售库存、成本税费退货、完整历史父体顺序、7个ASIN补采授权范围，以及T3分组确认。没有这些证据的指标继续标待核/待补，不输出确定市场份额、实际利润或采购指令。

### 浏览器回归与截图

已在真实Chrome运行本地站点：直接2月入口、CA fabric与wash、BR缺失、ML不支持、TSC零售、品牌搜索焦点、品牌详情、浏览器返回、选择商品/差异对比、真实CSV下载、经营期/渠道刷新、利润已知输入100−40−10−5−20−2=23，以及390px移动端（根页面和iframe均390px，无横向页面溢出）。UI利润输入为明确标注的会话测试情景，未作为实际业务数据保存。

实际下载的CA商品对比CSV为1条B0D8J8P1L2，parentSales=5、childSales为空、price=999.99、期间2026-02，见`browser-export-validation.json`。本轮浏览器文件上传未执行；已有Chrome扩展文件URL权限限制，未改变浏览器权限。标准/旧模板解析、合并失败不覆盖原值的逻辑已通过自动测试；不将解析测试冒称为浏览器上传成功。

截图见 `data-audit-screenshots/`，主要对照为：

- `before-filtered-conflict.png` / `after-filtered-conflict.png`：同一US商品、同月搜索，原1635/190494不再作为可信合计。
- `before-operations.png` / `after-operations.png`：活动原值不变，改为明细计算及可解释覆盖；`after-operations-september.png`显示9月Amazon11台。
- `market-ca-fabric.png`：2档案/1价格，父体5保持待核；`market-ca-wash.png`：34档案/25价格、274已知父体样本。
- `market-br-missing.png`、`market-ml-unsupported.png`：缺失不补零、平台不借用Amazon；`public-tsc-retail.png`：TSC保留279.99历史价且归零售。
- `comparison-export.png`、`data-management.png`、`market-mobile.png`：对比、数据管理、移动端。

浏览器中途一次选项值使用US而实际选项为us，属于测试输入错误，改用实际value后切换及刷新通过。曾发现同一SPA标签未完整刷新而仍运行旧资源；完整刷新并验证iframe哈希后，归档市场与品牌均为100件/61品牌。这两项没有被当作应用通过证据跳过。
