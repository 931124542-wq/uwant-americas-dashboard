"""Strict product-form review; positive evidence is required to enter the main catalogue."""
import re,unicodedata

def norm(value):
 return ''.join(c for c in unicodedata.normalize('NFD',value.lower())if unicodedata.category(c)!='Mn')

def review(r,category):
 t=norm(r.get('product_name',''));path=norm(' '.join(r.get('taxonomy_trail',[])))
 def result(status,reason,cat=category,form=None):return {'status':status,'reason':reason,'category':cat,'form':form}
 portable=bool(re.search(r'spotclean|spot clean|little green|cleanslate|spotless|spot cleaner|stainstriker|uwant.*(?:b100|y100|y200)|(?:b100|y100|y200).*uwant|hoover.*fh113|vacmaster.*scb301|kenmore.*kw2001',t))
 stick=bool(re.search(r'vertical|\bstick\b|\bescoba\b|\bvassoura\b|featherweight|airram|\bstk\s*(?:12|13|14|15)\b|deerma.*dx\s*[1679]|uwant.*(?:v500|v600|vc2401)',t))
 washer=bool(re.search(r'floor\s*one|ifloor|crosswave|x[ \s-]*clean|dreame.*h(?:1[2345]|20)|roborock.*f25|uwant.*d[568]00|eureka.*new\s*400|reecoo.*k22|hizero|osotek.*h[12]00|karcher.*\bfc\s*[357]\b',t))
 if re.search(r'robot|robo\b|roomba|robovac|vacuum.mop|lydsto r1|mova (?:p50|e40)|roborock s8',t+' '+path):return result('excluded','扫地机器人，不属于四类同形态产品')
 if re.search(r'\bindustrial\b|\bcomercial\b|commercial|servicios|servicos',t+' '+path):return result('excluded','明确商用/工业/服务记录')
 if re.search(r'puzzi|\bse\s*4\b|\bse\s*400[12]\b|carpet cleaner pro|\bgtw\b|soteco|\belsea\b|\bturbion\b',t):return result('excluded','商用抽洗或桶式系列，不属于便携家用同类')
 if re.search(r'proheat\s*2x|revolution|powerforce.*powerbrush|big\s*green|power\s*scrub|smartwash|carpetxpert|\bkw4070\b',t):return result('excluded','推行式地毯清洗机，不属于便携布艺机')
 # Known compact spot cleaners can carry an auto-generated “de tacho” taxonomy;
 # do not admit them from this conflict without reviewing their actual image.
 if re.search(r'tacho|bidon|balde|tambor|barril|canister|trineo|de arrastre|barril|\bzing\b',t):
  return result('pending' if portable else 'excluded','桶式/卧式线索与便携型号冲突，待核' if portable else '桶式/卧式吸尘设备，不同形态')
 if re.search(r'(?<![0-9.,])(?:[6-9]|[1-9][0-9])\s*(?:litros?|lts?\b|l\b)|\b[1-9]\s*(?:galones?|gallons?|gal\b)',t):return result('excluded','大容量/加仑桶体线索，不属于目标家用形态')
 if re.search(r'profissional|profesional|professional',t) and not (portable or washer or stick):return result('pending','专业用途标称且无明确家用同形态证据')
 if re.search(r'aspirador.*(?:nasal|secreciones)|grooming|aseo.*(?:mascotas|perros|gatos)|uwant.*(?:mascotas|perros|gatos)',t):return result('excluded','宠物美容/鼻腔等其他用途设备')
 if re.search(r'^(?:kit |para |piezas |conectores |cinturon |correas |tobera |motor |chave |seringa |botao |ferramenta |pulverizador |(?:zx )?boquilla |[0-9]+\s*(?:pcs|pecas) )',t):return result('excluded','配件、机械工具或耗材')
 if washer:return result('included','家用洗地机系列线索；不等于型号和地区版本核验','wash','floor_washer')
 if portable:return result('included','便携家用布艺抽洗系列线索','fabric','portable_extractor')
 # Generic portable extractors need a portable/carrying form plus extraction/dual-tank evidence.
 spray=bool(re.search(r'inyeccion|injet|pulveriza|rociador|pulverizacao|tanque (?:dual|duplo)|doble (?:tanque|deposito)|duplo.*tanque|tanques? de agua.*[0-9]',t))
 compact=bool(re.search(r'portatil|portable|de mano|doble (?:tanque|deposito)|tanque (?:dual|duplo)|[0-5](?:[.,][0-9]+)?\s*l\s*[/+]',t))
 soft=bool(re.search(r'alfombra|carpet|tapiz|tapic|estofad|telas|tecidos',t))
 if soft and spray and compact:return result('included','便携/双水箱及织物抽洗用途线索','fabric','portable_extractor')
 if stick and category=='wash' and not re.search(r'philips.*xc3133',t):return result('pending','立式吸拖标题不足以区分拖布吸尘器与主动洗地机，待核')
 if stick:return result('included','家用立式/杆式清洁形态线索；有线无线分别保留','vacuum','stick')
 mite=bool(re.search(r'acaros|dust mite|uwant.*m600|deerma.*cm[0-9]|jimmy.*bx[0-9]',t))
 bed=bool(re.search(r'colchon|colchao|cama|roupa de cama|mattress|uv|ultravioleta',t))
 if (mite and bed) or re.search(r'dust mite|uwant.*m600|uwant.*colchon',t):return result('included','床褥专用除螨用途及UV/床褥形态线索','mattress','mattress')
 if category=='vacuum' and re.search(r'mini|\busb\b|de mano|de mao|auto|coche|carro|soprador',t):return result('excluded','纯手持/车用/迷你吹吸设备，不属于家用杆式吸尘器')
 return result('pending','缺少同形态正面证据：不进入主产品库和统计')
