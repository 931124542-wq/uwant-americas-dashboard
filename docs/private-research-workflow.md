# 私有研究数据采集与更新

新增个人 MCP 商品档案、原始响应、余额、商户资料和内部经营资料保存在公开仓库之外。公开页面不请求本机研究接口，也不包含研究数据。研究覆盖不能被解释为完整市场覆盖。

使用独立目录保存 `raw/*.json`。每个响应包含 `request` 和 `response`，后者保留服务商原始 `structuredContent` 或原始 JSON 文本。文件名区分平台、市场、关键词和页码。相同请求不能无目的重采；若响应保存失败，应记录服务调用与存储失败，并先修复写入后再恢复采集。大响应必须分块写入并验证完整 JSON。

首次建立工作目录时，保存当前公开版基线 `baseline-ml.json` 和 `baseline-amazon.json`，以及已有本机 ASIN 的 `cache-known-asin-keys.json`。基线不可在增量过程中覆盖。已有图片缓存只按国家与商品 ID 完全一致复用，保留原证据日期；已有月度资料不得重新标成新增采集。

```sh
python3 scripts/normalize-private-research.py --workspace /absolute/private/workspace --as-of 2026-11-06
node scripts/build-private-research.cjs --workspace /absolute/private/workspace --legacy /absolute/private/capture.json --prior-ml /absolute/private/prior-increment.json
python3 scripts/serve-private-research.py --root /absolute/public/repository --payload /absolute/private/workspace/private-payload.js --port 8814
```

`--legacy` 和 `--prior-ml` 可省略。规范化程序输出 `research.json` 与 `next-jobs.json`；后者供已授权的 MCP 执行环境读取。程序不保存 API 密钥，也不自行充值。采集按服务商支持的市场、来源、分页参数及速率限制进行。连续两页有效新增低于返回量的 5% 时停止该查询路径，并保留未完成分页标记；这不表示市场已经完整。应改用品牌、型号、当地语言、实际类目或不同价格带寻找遗漏。

每批使用新的外部工作目录，并把示例中的日期替换为真实采集日；也可在该目录保留 `collection-context.json`，以 `retrievedAtDate` 记录原采集日期。重建旧批次时必须沿用该批原日期，不能把重建当天当作重新采集日。价格形成日期未知时继续保留未知。

图片人工复核文件为 `image-reviews.json`，按商品 ID 保存图片 URL、尺寸、复核日期及核验范围。只有 URL 与当前来源图完全相同才应用复核结果；形态复核不认证具体型号。`public-identity-evidence.json` 可补充国家和商品 ID 精确对应的公开型号字段证据。`retail-evidence.json` 用于独立的当地渠道档案，不能继承 Amazon 或 Mercado Libre 的销售指标。

`image-asset-reviews.json` 记录来源图的整机形态或配件/耗材判定。整机标题与类目冲突时，只有来源图与已复核 URL 完全相同、且复核品类相符，才恢复形态准入；负面图证据优先排除。不得替换成相似型号的图片。`manufacturer-references.json` 只提供相同国家、品牌和明确型号的厂家资料参考，不能认证某个 Listing 的电压、套装、库存或报价。

质量规则先排除配件、耗材、收纳袋、机器人、桶式和商用设备，再判断家用形态。有线或无线身份不明的吸尘器保留为相邻或待核资料。同一来源目录统计单位只保留一个代表；指标冲突以及同图同标题同店铺的跨目录疑似重复量保持隔离。

单日响应不计多月历史。缺月、缺价与未知指标保留未知；未结月明确标记。历史只接受国家与 ID 精确对应的来源自然月字段，不从当前价格推算销售额。代表变体快照、当前父体信息及商品身份补全均不改变原有历史资格或解除隔离。

来源价格为零或缺失时，不作为有效报价或价位份额依据。CSV 同时保留来源值、价位资格和隔离原因，避免把来源异常值当作免费商品。不同日期已经保存的档案价只作为采集观察保留，不认证为自然月末价。历史补齐优先覆盖型号明确且有销量的商品，再按国家、品类轮转补充其余有销量的去重 Listing；连续出现无多月记录的路径应记下暂停原因和剩余队列。

研究预览仅绑定回环地址，私有脚本需同站 Cookie，禁止跨域读取与隐藏路径。市场份额仅使用同一来源采集批次，商品目录仍保留各自观察日期。研究目录、原始响应、排除清单、调用回执和 SHA256 清单不进入公开仓库。发布前检查暂存区及页面依赖；公开版本只发布通用代码和已获准公开的资料。
