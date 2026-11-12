"""Conservative incremental intake. Source titles never certify a model/version."""
import re, html, sys
from pathlib import Path
from intake_scope import review,norm

def classify(title, category, taxonomy=(), brand=''):
 taxonomy=taxonomy if isinstance(taxonomy,(list,tuple)) else ()
 t=norm(html.unescape(title or '')); path=norm(' '.join(taxonomy or []))
 def reject(reason):return {'status':'excluded','reason':reason,'category':category,'form':None}
 # Run exclusions BEFORE recognisable model names: accessories often name their host.
 if re.search(r'^(?:[a-z]\s+)?(?:para|for)\s+(?:tineco|dyson|dreame|bissell|shark|roborock)\b',t):return reject('accessory_host_model_title')
 blower=bool(re.search(r'\bsoprador\b|\bsoplador\b',t))
 dedicated_bed_or_extractor=bool(re.search(r'anti.?acar|colchon|mattress|inyeccion|little green|spotclean',t) or re.search(r'extrator',t) and not re.search(r'\bmini\b',t))
 car_terms=bool(re.search(r'\b(?:automotivo|automotriz)\b|\bpara (?:carro|coche|auto)\b',t))
 car_only=blower or not dedicated_bed_or_extractor and car_terms and (bool(re.search(r'\bmini aspirador',t)) or not re.search(r'dyson.*v(?:[6-9]|1[125])|dreame.*[zr][123]0|\bhogar\b|pisos? duros?|alfombras?',t))
 if car_only:return reject('car_or_mini_blower_not_household_stick')
 if re.search(r'robot|roomba|robovac|lydsto r1',t):return reject('robot')
 if re.search(r'industrial|commercial|comercial|servicos|servicios|commercial',t+' '+norm(brand or '')):return reject('commercial')
 if re.search(r'storage bags?|vacuum bags?|compression bags?|space saver|mattress cover|vacuum seal|sacos? a vacuo',t):return reject('bags_or_storage')
 if re.search(r'replacement|repuesto|recambio|reemplazo|reposicao|spare parts|cleaner solution|cleaning solution|cleaner formula|cleaning formula|spot.*formula|detergent|shampoo|concentrad|solucion|solucao|oxy.*solution',t):return reject('accessory_or_consumable')
 if re.search(r'^(?:para |kit |filtro|filter|charger|battery|bateria|cargador|carregador|escova|cepillo|cabezal|cabecal|tubo|tobera|mangueira|manguera|rodillo|rolo |boquilla|boquilha|bocal|motor |correa|correia|adaptador|suporte|support|10 |20 |50 )',t):return reject('accessory_or_consumable')
 if re.search(r'^(?:(?:dreame|bissell|tineco|wap|dyson|roborock)\s+)?(?:\d+\s+)?(?:kit\b|brocha\b|cepillos?\b|escovas?\b|rodillos?\b|rolos?\b|filtros?\b|tampa\b|bicos?\b|press?ostato\b|reservatorio\b|carcaca\b|carenagem\b|placa\b|bomba\b|trava\b|tanque\b|acess[oó]rio\b|accesorio\b|varilla\b|contenedor\b|deposito\b|formula\b)',t):return reject('accessory_or_consumable')
 if re.search(r'(?:cleaning head|cleaner head|brush head|floor head|roller brush|brush roller|mop pads?|refill)',t):return reject('accessory_or_consumable')
 taxonomy_conflict=bool(re.search(r'repuestos|pecas e acessorios|produtos de limpeza|productos de limpieza',path))
 if re.search(r'vacuum stand|vacuum cleaner stand|storage holder|storage stand|wall mount holder|vacuum storage|soporte.*aspiradora|suporte.*aspirador',t):return reject('accessory_or_consumable')
 if re.search(r'ordinary mop|spray mop|spin mop|flat mop|mop and bucket|mop bucket|microfiber mop|microfibre mop|steam mop',t) and not re.search(r'vacuum|crosswave|hydrovac|floor\s*one|ifloor',t):return reject('mop_without_extraction')
 if re.search(r'canister|shop.?vac|tacho|bidon|balde|tambor|barril|trineo|de arrastre|puzzi|\bgtw\b|\bse\s*400[12]\b|\bse\s*4\b',t):return reject('bucket_or_canister')
 if re.search(r'proheat\s*2x|revolution|powerforce.*powerbrush|big\s*green|power\s*scrub|smartwash|carpetxpert|upright carpet|powerdash(?! go)',t):return reject('upright_carpet_machine')
 if re.search(r'pet grooming|pet washer|grooming|nasal|secreciones|secrecoes',t):return reject('other_purpose')
 # The legacy Spanish classifier uses vacuum.mop as a robot hint. In English
 # appliance titles "vacuum mop" also names real floor washers.
 review_title=re.sub(r'vacuum.mop','vacuum and mop',html.unescape(title or ''),flags=re.I)
 checked=review({'product_name':review_title,'taxonomy_trail':taxonomy},category)
 if checked['status']=='excluded':return checked
 selected=checked if checked['status']=='included' else None
 if not selected:
  if re.search(r'floor\s*one|ifloor|crosswave|hydrovac|hydro duo|dreame.*h1[245]|roborock.*f25|wap.*floor cleaner mob|wet.?dry.*(?:floor cleaner|vacuum.*mop)',t):selected={'category':'wash','form':'floor_washer'}
  elif re.search(r'little green|spotclean|spot clean|stainstriker|cleanslate|spotless|(?:portable|handheld).*(?:carpet|upholstery).*cleaner|(?:carpet|upholstery).*portable.*cleaner',t):selected={'category':'fabric','form':'portable_extractor'}
  elif re.search(r'mattress|bed vacuum|dust.?mite',t) and re.search(r'vacuum|cleaner',t):selected={'category':'mattress','form':'mattress'}
  elif re.search(r'dyson.*v15',t) and re.search(r'aspirador|vacuum',t):selected={'category':'vacuum','form':'stick'}
  elif re.search(r'cordless',t) and re.search(r'vacuum',t) and re.search(r'\bstick\b|\bupright\b|roborock.*h(?:60|7)|dreame.*(?:z[123]0|r[12]0)|dyson.*v(?:[6-9]|1[125])|pure one',t) and not re.search(r'car vacuum|handheld vacuum cleaner for car|mini|mattress',t):selected={'category':'vacuum','form':'stick'}
 # Local names for active floor washers; a dry vacuum with a passive mop
 # attachment is not sufficient evidence for this class.
 if re.search(r'(?:arno|rowenta|t.fal).*x.clean\s*[47]\b|wap.*multi floor|fika.*volt\s*aqua|redroad.*\bw15\b',t) and re.search(r'aspirador|limpadora|extratora',t):selected={'category':'wash','form':'floor_washer'}
 if not selected:return {'status':'pending','reason':'insufficient_positive_form_evidence','category':category,'form':None}
 if selected['category']=='vacuum':
  if car_only:return reject('car_or_mini_blower_not_household_stick')
  cordless=bool(re.search(r'cordless|wireless|sem fio|inalambric|recargable|recarregavel|dyson.*v(?:[6-9]|1[125])|dreame.*(?:z[123]0|r[12]0)|roborock.*h(?:60|7)',t))
  if not cordless:return {'status':'adjacent','reason':'wired_or_wireless_identity_unknown','category':'vacuum','form':'stick'}
 return {**selected,'status':'pending'if taxonomy_conflict else'included','reason':'taxonomy_conflict_requires_image'if taxonomy_conflict else'positive_household_form_source_title_only'}
