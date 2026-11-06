import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from intake_quality import classify
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
if __name__=='__main__':unittest.main()
