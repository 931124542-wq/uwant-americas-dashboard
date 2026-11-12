import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from intake_quality import classify
from research_query import query_key
class IntakeTest(unittest.TestCase):
 def test_household_forms(self):
  for title,cat in [('Tineco Floor ONE Stretch S6 Smart Vacuum Mop Wet Dry Vacuum Cleaner','wash'),('Tineco Floor One S5 Steam Mop 127V','wash'),('BISSELL Little Green HydroSteam Portable Carpet Cleaner','fabric'),('Jimmy BX7 Pro Mattress Vacuum UV Dust Mite Cleaner','mattress'),('Aspiradora Inalambrica Dyson V15 Detect','vacuum')]:
   with self.subTest(title=title):self.assertEqual(classify(title,cat)['status'],'included')
 def test_irrelevant_and_accessories(self):
  for title in ['10 Large Vacuum Storage Bags with Electric Pump for Mattress','Hoover Oxy Portable Spot Cleaner Solution','Cabezal De Limpieza De Aspiradora Para Dyson V15','Replacement roller brush for Tineco Floor One S5','Bissell Big Green Commercial Carpet Cleaner','Aspiradora de tacho 20 litros','Robot aspirador con trapeador','JOYMOOP Mop and Bucket Set','Haturi Vacuum Stand for Dyson V15 Cordless Vacuum','Dreame Cepillo Rodillo Para Aspiradora H12 Pro','Bissell Formula Little Green','Handheld Vacuum Cleaner Portable Cordless Rechargeable']:
   with self.subTest(title=title):self.assertNotEqual(classify(title,'wash')['status'],'included')
 def test_taxonomy_conflict_requires_image(self):
  self.assertEqual(classify('Bissell Little Green Portable Carpet Cleaner','fabric',['Repuestos'])['reason'],'taxonomy_conflict_requires_image')
 def test_wireless_boundary(self):
  self.assertEqual(classify('Aspirador Vertical Com Fio Electrolux STK14','vacuum')['status'],'adjacent')
  self.assertEqual(classify('Aspirador Vertical Sem Fio Electrolux ERG23','vacuum')['status'],'included')
 def test_host_model_is_not_the_appliance(self):
  self.assertEqual(classify('F Para Tineco Floor One S5 Pro Inalambrico','wash')['status'],'excluded')
  self.assertEqual(classify('Mini Aspirador Soprador Sem Fio Automotivo Vertical','vacuum')['status'],'excluded')
  for cat in ['vacuum','fabric','wash','mattress']:
   self.assertEqual(classify('Mini Aspirador de Po Automotivo Portatil 120W Soprador Refil Filtros Recarregavel 3 em 1 USB Potente Extratora Vertical Profissional Silencioso Premium Vacuo Limpeza Carro Multifuncional Casa',cat)['status'],'excluded')
 def test_small_mattress_and_car_upholstery_are_valid_forms(self):
  self.assertEqual(classify('Mini Aspirador De Po Anti Acaros Cama UV','mattress',None)['status'],'included')
  self.assertEqual(classify('Bissell Little Green Portable Carpet Cleaner Para Auto','fabric')['status'],'included')
 def test_active_floor_washers_not_dry_vacuums(self):
  for title in ['Aspiradora Inalambrica Vertical Fika Volt Aqua Seco Humedo Trapea Autolimpieza','Aspirador De Po Redroad W15 Sem Fio Seco Umido']:
   self.assertEqual(classify(title,'vacuum')['category'],'wash')
 def test_query_pagination_cannot_cross_filters(self):
  q={'market_code':'MLA','keyword':'aspiradora vertical','page':1,'limit':100,'sales_30d_min':1}
  self.assertEqual(query_key(q),query_key({**q,'page':2,'country':'AR','category':'vacuum'}))
  self.assertNotEqual(query_key(q),query_key({'market_code':'MLA','keyword':'aspiradora vertical','historical_total_sales_min':1}))
if __name__=='__main__':unittest.main()
