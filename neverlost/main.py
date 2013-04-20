import jinja2
import json
import re, os
import api

from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

jinja_environment = jinja2.Environment(
        loader=jinja2.FileSystemLoader(os.path.dirname(__file__)))

class MainHandler(webapp.RequestHandler):
  def render(self, page, tv):
    if self.request.get('iframe'):
      page = 'page.html'
    template = jinja_environment.get_template(page)
    self.response.out.write(template.render(tv))

  def get(self):
    tv = {}
    path = tv['p'] = self.request.path
    lat = tv['lat'] = self.request.get('lat')
    lon = tv['lon'] = self.request.get('lon')
    if re.search('findgas', path):
      tv['gas'] = json.dumps(api.GetBestGas(lat, lon, 30, 'price'))
      self.render('iframe.html', tv)
    elif re.search('findparking', path):
      tv['parking'] = json.dumps(api.GetClosestParking(lat, lon))
      self.render('iframe.html', tv)
    elif re.search('return', path):
      tv['gas'] = json.dumps(api.GetBestGas(lat, lon))
      tv['hertz'] = json.dumps(api.GetClosestHertz(lat, lon))
      self.render('iframe.html', tv)
    else:
      self.render('main.html', {})

def main():
  application = webapp.WSGIApplication(
      [('/.*', MainHandler)],
      debug=True)
  run_wsgi_app(application)


if __name__ == '__main__':
  main()
