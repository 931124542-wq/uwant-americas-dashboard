/* Public BCRA reference rates, pesos per USD. Market records keep their source currency. */
(function(root){
 const source='https://www.bcra.gob.ar/tipo-cambio-referencia-comunicacion-a-3500-tcnpm/';
 const daily={
  '2026-10-01':1523.2254,'2026-10-02':1523.0868,'2026-10-05':1519.2481,'2026-10-06':1520.3002,
  '2026-10-07':1520.7136,'2026-10-08':1518.4363,'2026-10-09':1515.8766,'2026-10-13':1515.8543,
  '2026-10-14':1514.5655,'2026-10-15':1513.9308,'2026-10-16':1514.5655,'2026-10-19':1523.3466,
  '2026-10-20':1524.8401,'2026-10-21':1526.6664,'2026-10-22':1527.8511,'2026-10-23':1528.2630,
  '2026-10-26':1540.4751,'2026-10-27':1538.7410,'2026-10-28':1538.4739,'2026-10-29':1539.5930,
  '2026-10-30':1537.3487,'2026-11-02':1544.6507,'2026-11-03':1549.7194,'2026-11-04':1548.4941,
  '2026-11-05':1545.3974,'2026-11-11':1547.9128,'2026-11-12':1544.4320,'2026-11-13':1547.0336,
  '2026-11-16':1549.6732,'2026-11-17':1552.2627,'2026-11-18':1558.2427,'2026-11-19':1562.9893,
  '2026-11-20':1575.9572,'2026-11-24':1592.0227
 };
 const monthly={
  '2024-01':818.3455,'2024-02':834.9140,'2024-03':850.3377,'2024-04':868.9583,
  '2024-05':886.8636,'2024-06':903.7794,'2024-07':923.7652,'2024-08':942.9204,
  '2024-09':961.8254,'2024-10':981.5682,'2024-11':1001.8377,'2024-12':1020.7061,
  '2025-01':1043.5644,'2025-02':1058.4625,'2025-03':1069.0347,'2025-04':1121.5680,
  '2025-05':1147.5292,'2025-06':1181.3553,'2025-07':1267.0227,'2025-08':1329.5375,
  '2025-09':1399.8977,'2025-10':1432.0227,'2025-11':1427.6176,'2025-12':1447.8377,
  '2026-01':1449.3347,'2026-02':1409.6571,'2026-03':1396.3387,'2026-04':1381.4523,
  '2026-05':1397.2372,'2026-06':1450.2728,'2026-07':1487.0038,'2026-08':1499.9629,
  '2026-09':1513.8870,'2026-10':1525.0191
 };
 const lastDay=Object.keys(daily).at(-1);
 function rate(period){
  if(/^\d{4}-\d{2}$/.test(period||''))return monthly[period]??null;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(period||'')||period>lastDay)return null;
  const day=new Date(period+'T00:00:00Z');
  if(!Number.isFinite(day.valueOf())||day.toISOString().slice(0,10)!==period)return null;
  for(let offset=0;offset<=5;offset++){
   const value=daily[day.toISOString().slice(0,10)];
   if(value)return value;
   day.setUTCDate(day.getUTCDate()-1);
  }
  return null;
 }
 const code=(country,currency)=>country==='AR'?'USD':currency;
 function amount(value,country,currency,period){
  if(!Number.isFinite(value))return null;
  if(country!=='AR'||currency==='USD')return value;
  const divisor=currency==='ARS'?rate(period):null;
  return divisor?value/divisor:null;
 }
 function price(value,country,currency,period){
  const result=amount(value,country,currency,period);
  return result===null||country!=='AR'||currency!=='ARS'?result:Math.round((result+Number.EPSILON)*100)/100;
 }
 root.MarketCurrency={source,code,amount,price,rate};
})(typeof window==='undefined'?globalThis:window);
