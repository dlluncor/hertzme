from google.appengine.api import urlfetch
import urllib
import json
import logging

def GetBestGas(lat, lon, maxresults=30, sortkey="distance", getRaw=False):
  keys = {
    "status": "active",
    "description": "For a Auto Cloud Hackthon",
    "extended_data": {
      "category": "connected-car"
    },
    "app_id": "DemoAppIdAutoCloudAPI",
    "created_time": "1365049321",
    "app_name": "AutoCloud Demo",
    "app_code": "W78cJXrtYqzb0Red84VPyg",
    "requester_id": "",
    "prox": "%s,%s,15000" % (lat, lon),
    "maxresults": maxresults,
    "sortkey":"%s" % sortkey
  }
  url = 'https://fuel.si.public.devbln.europe.nokia.com/fuel/1.0/price.json?' + urllib.urlencode(keys)
  data = json.loads(urlfetch.fetch(url, validate_certificate=False).content)
  if getRaw: return data
  tuples = []
  for i in data['FuelStations']:
    name, cost = '', ''
    lat = i['Latitude']
    lon = i['Longitude']
    if 'Brand' in i: name = i['Brand']
    if 'FuelPrice' in i: cost = i['FuelPrice'][0]['CapacityPrice']['Value']
    address = i['Address']['Street']
    tuples += [(lat, lon, name, address, cost)]
  return tuples

def GetClosestParking(lat, lon, getRaw=False):
  '''json['AVL'][0] -- 'LOC' (need to split ,), 'name' and 'address'''
  keys = {
    'client': 'sxsw',
    'client_password': 'sxsw2013',
    'latitude': lat,
    'longitude': lon,
    'format': 'json',
    'radius': 15,
    'grab': 30
  }
  url = 'http://voicepark.net/parking?' + urllib.urlencode(keys)
  data = json.loads(urlfetch.fetch(url, validate_certificate=False).content)
  if getRaw: return data
  tuples = []
  for i in data['AVL']:
    loc = i['LOC'].split(',')
    tuples += [(loc[0], loc[1], i['name'], i['address'], i['price'])]
  return tuples

def GetClosestHertz(lat, lon, getRaw=False):
  '''json['data']['locations'][0] -- locationName, latitude, longitude, streetAddressLine1'''
  closest_gas = GetBestGas(lat, lon, 1, "distance", True)
  addr = closest_gas['FuelStations'][0]['Address']
  url = 'http://api.hertz.com/rest/location/country/%s/state/%s/city/%s' % (addr['Country'], addr['Region'], urllib.quote(addr['City']))
  data = json.loads(urlfetch.fetch(url, validate_certificate=False).content)
  if getRaw: return data
  tuples = []
  for i in data['data']['locations']:
     tuples += [(i['latitude'], i['longitude'], i['locationName'], i['streetAddressLine1'], i['phoneNumber'])]
  return tuples

def pretty_print(j):
  logging.info(json.dumps(j, sort_keys=True, indent=2, separators=(',', ': ')))
