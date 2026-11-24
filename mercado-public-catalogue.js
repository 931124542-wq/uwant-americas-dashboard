/* Independently sourced Mercado Libre Mexico product pages. No private provider observations. */
(function (root) {
  const checkedOn = '2026-11-19';
  // Each row identifies one real catalog or offer page. Models are source labels.
  const pages = [
    ['Shark','IZ142','www','aspiradora-inalambrica-shark-pet-pro-powerfins-sin-enredos-40-min-cabezal-desmontable-luz-led-vaso-xl-cleantouch-pisos-y-alfombras-iz142/p/MLM53275025'],
    ['Shark','BU3120LAA','www','shark-aspiradora-inalambrica-clean-empty-con-vaciado-automatico-hepa-9997-40-min-500x-menos-polvo-powerfins-autolimpiante-aspiradora-de-mano-desmontable-bu3120laa/p/MLM49842392',true],
    ['Shark','UZ865H','www','aspiradora-inalambrica-uz865h-stratos-negrogris-shark/p/MLM50038761'],
    ['Shark','UZ865H','www','shark-uz865h-stratos-aspiradora-inalambrica-con-clean-sense/p/MLM2001419126'],
    ['Shark','UZ865H','www','shark-uz865h-stratos-aspiradora-inalambrica-con-clean-se-color-azul/p/MLM45616488'],
    ['Shark','IZ662H','www','aspiradora-vertical-shark-pro-inalambrica-iz662h-color-negro/p/MLM42682026'],
    ['Shark','IZ462H','www','aspiradora-de-mano-shark-iz462h-vertex-ultra-ligera-azul/p/MLM2060004315'],
    ['Shark','IZ662H','www','aspiradora-inalambrica-shark-vertex-pro-duoclean-iz662h-rojo/p/MLM2057586931'],
    ['Shark','IZ662H','www','cordless-stick-vacuum-shark-iz662h-vertex-pro-lightweight/p/MLM2006182636'],
    ['Xiaomi','G20 Lite','www','aspiradora-vacuum-cleaner-g20-lite-18000pa/p/MLM50762454'],
    ['Tineco','Pure One A50S','www','tineco-pure-one-a50s-aspiradora-inalambrica-de-palo-succion/p/MLM59375625'],
    ['Tineco','Pure One X','articulo','MLM-2238007320-aspiradora-de-varilla-inalambrica-tineco-pure-one-x-intelig-_JM'],
    ['Tineco','Pure One S11','www','aspirador-inalambrico-tineco-pure-one-s11-gris/p/MLM2028034816'],
    ['Tineco','Pure One S11','www','aspiradora-inalambrica-tineco-pure-one-s11-sensor/p/MLM2029523265'],
    ['Tineco','Pure One S11','www','aspiradora-vertical-tineco-pure-one-s11-inalambrica-con-sensor-iloop/p/MLM49936546'],
    ['Tineco','Pure One S15 Essentials','www','aspiradora-tineco-pure-one-s15-essentials/p/MLM28791365'],
    ['Tineco','Pure One S15 Essentials','www','tineco-pure-one-s15-essentials-aspiradora-inalambrica-de-con/p/MLM2003091854'],
    ['Tineco','Pure One S15 Essentials','www','tineco-pure-one-s15-essentials-aspiradora-inalambrica-inteli-/p/MLM2024908842'],
    ['Tineco','Pure One S15 Essentials','www','vacuum-cleaner-tineco-pure-one-s15-essentials-cordless/p/MLM2074778158'],
    ['Tineco','A11','articulo','MLM-3592042442-aspiradora-inalambrica-ligera-tineco-a11-para-mascotas-_JM'],
    ['Dreame','R20','www','dreametech-r20-aspiradora-inalambrica-con-cabezal-de-cepillo-c-negro/p/MLM2043668965'],
    ['Dreame','R10 Pure','www','aspiradora-inalambrica-dreame-r10-pure-120aw-led/p/MLM2077595141'],
    ['Dyson','V9 Motorbar','www','aspiradora-sin-cable-dyson-v9-motorbar/p/MLM63274612'],
    ['Samsung','Jet 60 Flex VS15A6031R','articulo','MLM-3665809272-aspirador-inalambrico-samsung-jet-60-flex-vs15a6031r-_JM'],
    ['Samsung','Jet 60 Flex VS15A6031R','www','aspiradora-inalambrica-samsung-vs15a6031r7ax-teal-gold/p/MLM44735375'],
    ['Koblenz','SVM 260 Delta','www','aspiradora-inalambrica-koblenz-svm-260-delta-azul/p/MLM46937750'],
    ['Atvio','Stick 150W','www','aspiradora-atvio-stick-inalambrica-blanca-150w-2vel-hogar-blanco/p/MLM76857587'],
    ['Rowenta','X-Force Flex 14.60 Animal','www','aspiradora-rowenta-x-force-flex-1460-animal-rh99a2u1-negro/p/MLM38185901'],
    ['Rowenta','X-Force Flex 12.60','www','cordless-vacuum-cleaner-rowenta-x-force-flex-1260-red/p/MLM2095250246'],
    ['Hoover','ONEPWR Evolve','www','hoover-onepwr-evolve-aspiradora-vertical-inalambrica/p/MLM30483268'],
    ['Electrolux','Ergorapido ERG28','www','aspirador-vertical-inalambrico-portatil-electrolux-erg28-420-ml-azul-110-v220-v/p/MLM18609748'],
    ['Electrolux','Ergorapido Pet','www','aspiradora-inalambrica-electrolux-ergorapido-pet-2-en-1/p/MLM2088848771'],
    ['Black+Decker','Powerseries+ BHFEA420J','www','blackdecker-powerseries-16v-max-aspirador-sin-cable-c/p/MLM2057407493']
  ];
  // Direct product pages indexed by Mercado Libre on review. A cached price has no observation date.
  const reviewedPages = [
    ['Dreame','Z30 Essential','www','aspiradora-inalambrica-dreame-z30-essential-negro/p/MLM62352435'],
    ['Dyson','V12 Detect Slim Fluffy','www','aspiradora-sin-cable-dyson-v12-detect-slim-fluffy/p/MLM39476093'],
    ['Xiaomi','G20','www','aspiradora-de-mano-xiaomi-vacuum-cleaner-g20/up/MLMU3516087583','MLM2529501663'],
    ['LG','CordZero Charge Plus','www','aspirador-inalambrico-lg-cordzero-charge-plus-recargable-plateado-cordzero/p/MLM28495604'],
    ['Koblenz','Venus SVM-350','www','aspiradora-inalambrica-koblenz-venus-svm-350-6-accesorios-gris/p/MLM20507640'],
    ['Electrolux','Ergorapido EHVS2510AW','www','electrolux-ergorapido-aspiradora-inalambrica-ligera-con-color-blanco-satinado/p/MLM27518508'],
    ['Electrolux','Ergorapido ERG15','www','aspiradora-electrolux-ergorapido-2-en-1-erg15-bateria-litio/p/MLM22200352'],
    ['Tineco','A30S','www','aspiradora-tineco-a30s-inalambrica-160w-cap-1l-82dba/p/MLM2067755088']
  ];
  function add(data) {
    const known = new Set(data.records.map(record => record.product_code));
    const records = [];
    const dated = [
      ...pages.map(([brand,model,host,path,autoEmpty])=>({brand,model,host,path,autoEmpty,date:checkedOn})),
      ...reviewedPages.map(([brand,model,host,path,listingId])=>({brand,model,host,path,listingId,date:'2026-11-24'}))
    ];
    for (const {brand,model,host,path,autoEmpty,date,listingId} of dated) {
      const id = listingId || 'MLM' + path.match(/MLM-?(\d+)/)[1];
      if (known.has(id)) continue;
      const title = brand + ' ' + model + ' · Aspiradora inalámbrica de varilla';
      const record = {
        country:'MX', category:'vacuum', platform:'ml', currency:'MXN', product_code:id, productId:id,
        product_name:title, title, detail_link:'https://'+host+'.mercadolibre.com.mx/'+path,
        brand_label:brand, brandGroup:brand, model, modelGroup:'MX|vacuum|'+brand+'|'+model,
        counted:false, catalogueOnly:true, sourceDate:date, form:'stick',
        modelEvidence:{status:'source_label', verified:false}, metricPeriod:null, priceKind:null,
        selling_price:null, orders_last_30_days:null, revenue_last_30_days:null, picture_link:null,
        feedback_count:null, feedback_score:null,
        claims:autoEmpty?{autoEmpty:true}:{},
        classificationBasis:'美客多墨西哥公开商品页，家用无线杆式整机。型号沿用页面标注',
        sourceFiles:['public_mercadolibre_product_page']
      };
      records.push(record);
      known.add(id);
    }
    return {...data, records:[...data.records, ...records]};
  }
  root.MercadoPublicCatalogue = {add};
  if (root.MERCADO_DATA?.records) root.MERCADO_DATA = add(root.MERCADO_DATA);
})(window);
