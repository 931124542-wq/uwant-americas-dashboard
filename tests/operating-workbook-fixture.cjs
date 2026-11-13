/* Synthetic only. No user workbook values or personal records are committed. */
const row=(number,values)=>Object.fromEntries(Object.entries(values).map(([k,v])=>[k,{v,r:k+number,f:null}]));
const serial=iso=>(Date.parse(iso+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000;
module.exports=()=>({
 'PO核对':[row(1,{A:'Synthetic PO'}),{},row(3,{A:'PO-test · 2025-12-01'}),row(5,{A:'D600',B:'6970000000001',C:20,D:10,E:200}),row(6,{A:'M600',B:'6970000000002',C:10,D:12,E:120})],
 'SellOut原始':[
  row(3,{A:'Amazon MP',B:'Amazon MX',C:serial('2026-07-03'),D:'2026-07',F:'6970000000001',G:'UWANT synthetic D600',H:2,I:'D600',J:'纳入'}),
  row(4,{A:'Amazon MP',B:'Amazon MX',C:serial('2026-07-03'),D:'2026-07',F:'6970000000001',G:'UWANT synthetic D600',H:3,I:'D600',J:'纳入'}),
  row(5,{A:'Mercado Libre MP',B:'Mercado Libre',C:serial('2026-08-02'),D:'2026-08',F:'6970000000002',G:'UWANT synthetic M600',H:2,I:'M600',J:'纳入'}),
  row(6,{A:'Liverpool MP',B:'Liverpool',C:serial('2026-08-02'),D:'2026-08',F:'6970000000002',G:'UWANT synthetic M600',H:0,I:'M600',J:'纳入'}),
  row(7,{A:'Amazon MP',B:'Amazon MX',C:serial('2026-08-02'),D:'2026-08',F:'0000000000000',G:'Other-brand accessory',H:9,I:'',J:'排除'}),
  row(9,{A:'Footer excluded units',H:9})],
 '库存原始':[row(1,{A:'MEXICO warehouse · 2026-09-02'}),row(5,{D:'MEXICO',J:'6970000000001',L:4,M:1,N:5,O:'D600'}),row(6,{D:'MEXICO',J:'6970000000002',L:4,M:0,N:4,O:'M600'}),row(8,{A:'orphan',L:99})],
 '样机流水':[row(1,{A:'Synthetic samples'}),{},row(3,{A:'来自 synthetic 2026.xlsx'}),row(5,{A:1,B:'JUL',C:'Synthetic Recipient Name',D:'D600',F:'6970000000001',H:'发样',I:1,L:'是',M:1}),row(6,{A:2,B:'AUG',D:'M600',F:'6970000000002',H:'样机退回（待核）',I:-1,L:'是',M:-1}),row(7,{A:3,B:'AUG',D:'M600',F:'6970000000002',H:'样机二次转寄',I:0,L:'是',M:0}),row(8,{A:4,B:'NOV',D:'M600',F:'6970000000002',H:'发样',I:1,L:'是',M:1})],
 '产品库存核算':[row(8,{A:'合计',C:30,G:1,J:7,N:9,O:8,P:1})]
});
