/* Internal documents are version references, not confirmed country-specific listings. */
const rdBaseline={
 D600:{ean:[['6978934861384','黑色 / B2B US']],facts:[['自清洁','推入底座、热水自清洁、热风干燥'],['续航','Smart约40分钟；高档约30分钟；干吸约50分钟'],['水箱','净水 / 污水约700 / 700mL']],issues:['NLI描述23kPa，规格列高档电机口>17kPa、地刷>15kPa；测量位置与版本未对齐，不用于吸力判优。','NLI净重4.3kg与物流表5.82kg口径不一致；需确认是否包含底座。'],files:['UWANT_NLI_Vendor_Import_2026_V2_Updated_EAN.xlsx','UWANT_Product_Info_US Final(1).xlsx'],fileDates:'2026-09-14 / 2026-09-04'},
 D800:{ean:[['6978934861391','黑色 / B2B US']],facts:[['资料范围','当前内部表支持EAN和物流资料；完整功能仍参照美国商品页']],issues:['内部物流表不能证明墨西哥或加拿大在售配置。','美国官网干燥温度文字与规格表存在不一致，需产品资料确认。'],files:['UWANT_Product_Info_US Final(1).xlsx'],fileDates:'2026-09-04'},
 V500:{ean:[['6978934861438','白色 / B2B US']],facts:[['基站','自动集尘；手持尘杯0.4L、基站2.0L'],['续航','标准55±5分钟；强档30±3；最大11±2；测试附件待核'],['电池','7节2500mAh；可拆卸']],issues:['NLI列产品毛重3.4kg，物流表列净重4.64kg；部件范围和称重口径需对齐。','两国底座、附件与当地耗材购买链接尚未确认。'],files:['UWANT_NLI_Vendor_Import_2026_V2_Updated_EAN.xlsx','UWANT_Product_Info_US Final(1).xlsx'],fileDates:'2026-09-14 / 2026-09-04'},
 Y100:{ean:[['6978934860172','黑色 / Y100 Steam US'],['6978934861995','蓝色 / Y100 Steam US']],facts:[['报表映射','内部表为Y100 Steam，经营报表为Y100；尚无EAN对应证明']],issues:['先核报表Y100对应常温版还是蒸汽版；不能仅凭美版Steam资料确认当地销售功能。','两种颜色EAN不同，价格、附件与套装需按具体商品绑定。'],files:['UWANT_Product_Info_US Final(1).xlsx'],fileDates:'2026-09-04'},
 M600:{ean:[['6978934861445','白色 / B2B US-B']],facts:[['电源','120V / 60Hz，额定500W，有线'],['清洁结构','滚刷3300rpm±10%；资料标示UV及加热'],['吸力口径','电机≥14kPa，整机≥8kPa；不同测点']],issues:['NLI净重1.77kg、物流表净重1.9kg，需确认版本及附件范围。','资料中的99%除螨/杀菌声明尚未取得对应试验报告，不作健康效果结论。'],files:['UWANT_NLI_Vendor_Import_2026_V2_Updated_EAN.xlsx','UWANT_Product_Info_US Final(1).xlsx'],fileDates:'2026-09-14 / 2026-09-04'}
};
const rdTests={
 D600:{claim:'推入底座与家具下清洁是否减少操作负担',scene:'固定硬地板、家具高度和污渍量；同一路径与次数',measure:'边角残留、残水、回站操作数、清洗与晾干步骤',change:'对比当前素材与完整清洁—回站素材；保持其他购买条件一致'},
 D800:{claim:'机械臂贴边是否足以支撑升级购买',scene:'固定墙边与转角、污渍量、清扫速度和次数',measure:'边角残留宽度、补扫次数、维护时间、D600替代情况',change:'测试贴边实测素材；同时记录D600与D800组合贡献'},
 V500:{claim:'自动集尘与绿光能否提高购买意愿',scene:'硬地板碎屑和地毯毛发分开；同区域、碎屑量和档位',measure:'残留、缠绕、回站步骤、倒尘接触、耗材用量',change:'测试清扫—回站完整素材，并明确当地尘袋补购与费用'},
 Y100:{claim:'局部污渍清洁与残水控制是否匹配用户预期',scene:'先确认常温/蒸汽版本；同布料、污渍、静置时间及清洁次数',measure:'污渍残留、残余湿度、干燥时间、软管清洗步骤',change:'沙发与车座素材分开测试；记录版本预期不符的退货'},
 M600:{claim:'床垫专用清洁流程能否带来有效购买',scene:'相同布料、灰尘量、面积与次数；不以集尘量证明健康改善',measure:'可见残留、重量与操作负担、尘杯和过滤维护',change:'测试床垫场景素材与维护说明；核对消费者用途理解'}
};
const rdCategory={D600:'wash',D800:'wash',V500:'vacuum',Y100:'fabric',M600:'mattress'};
