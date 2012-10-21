#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
import urllib2
import webapp2

from google.appengine.api import memcache

API_KEY = "AIzaSyCUnjFIAGgQjwCCMIjIy1EPoNuIhmKz0e0"
BASE_URL = "https://maps.googleapis.com/maps/api/place/search/json?key=%s&sensor=false" % API_KEY

class GoolePlacesProxy(webapp2.RequestHandler):
    def get(self):
        param = "&location=%s&radius=%s&name=%s" % 
                (self.request.get('location'), self.request.get('radius'), self.request.get('name'))
        try:
            json_string = memcache.get(param)
            if json_string is None
                json_string = urllib2.urlopen(BASE_URL + param)
                memcache.add(param, json_string, 10)
            self.response.out(json_string)
        except urllib2.URLError, e:
            self.error(500)
            self.response.out(e.getMessage())

class MainHandler(webapp2.RequestHandler):
    def get(self):
        self.redirect('/index.html')

app = webapp2.WSGIApplication([
    ('/gplaces.*', GoolePlacesProxy),
    ('/', MainHandler)
], debug=True)
