"""A query's filters and ordering define its pagination universe."""
import json

def query_key(request):
 return json.dumps({k:v for k,v in request.items() if k not in {'page','limit','country','category','querySignature'}},sort_keys=True,ensure_ascii=False,separators=(',',':'))
