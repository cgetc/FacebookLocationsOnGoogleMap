var Friends, IndicatorView, Location, Locations, MapView, Places, User,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

User = (function(_super) {

  __extends(User, _super);

  function User() {
    return User.__super__.constructor.apply(this, arguments);
  }

  User.prototype.initialize = function() {
    return this.locations = new Locations([], this.get('id'));
  };

  return User;

})(Backbone.Model);

Friends = (function(_super) {

  __extends(Friends, _super);

  function Friends() {
    return Friends.__super__.constructor.apply(this, arguments);
  }

  Friends.prototype.model = User;

  Friends.prototype.url = '/me/friends';

  Friends.prototype.fetch = function() {
    var _this = this;
    this.trigger('fetch:start', this);
    return FB.api(this.url, function(response) {
      if ('error' in response) {
        return alert(response.message);
      } else {
        _this.add(response.data);
        return _this.trigger('fetch:complete', _this);
      }
    });
  };

  return Friends;

})(Backbone.Collection);

Location = (function(_super) {

  __extends(Location, _super);

  function Location() {
    return Location.__super__.constructor.apply(this, arguments);
  }

  return Location;

})(Backbone.Model);

Locations = (function(_super) {

  __extends(Locations, _super);

  function Locations() {
    return Locations.__super__.constructor.apply(this, arguments);
  }

  Locations.prototype.model = Location;

  Locations.prototype.url = function() {
    return "/" + this.user_id + "/locations";
  };

  Locations.prototype.initialize = function(models, user_id) {
    return this.user_id = user_id;
  };

  Locations.prototype.fetch = function() {
    var _this = this;
    this.trigger('fetch:start', this);
    return FB.api(this.url(), function(response) {
      var data;
      if ('error' in response) {
        return alert(response.message);
      } else {
        data = response.data.filter(function(obj) {
          return obj.place && obj.place.location;
        });
        _this.add(data);
        return _this.trigger('fetch:complete', _this);
      }
    });
  };

  return Locations;

})(Backbone.Collection);

Locations.searchByQuery = function(param, cb, ctx) {
  var query;
  query = encodeURIComponent(param.query);
  return FB.api("/search?type=location&query=" + query + "&center=" + param.center + "&distance=" + param.distance, function(response) {
    if ('error' in response) {
      return alert(response.message);
    } else {
      return cb.call(ctx, response.data);
    }
  });
};

Locations.get = function(id, cb, ctx) {
  return FB.api("/" + id, function(response) {
    if ('error' in response) {
      return alert(response.message);
    } else {
      return cb.call(ctx, response);
    }
  });
};

Places = {
  baseUrl: 'https://maps.googleapis.com/maps/api/place/search/json?key=AIzaSyCUnjFIAGgQjwCCMIjIy1EPoNuIhmKz0e0&sensor=false',
  search: function(param, cb, ctx) {
    var name;
    name = encodeURIComponent(param.query);
    return $.getJSON("" + this.baseUrl + "&location=" + param.lat + "," + param.lng + "&radius=" + param.radius + "&name=" + name, function(json) {
      if (json.status === 'OK') {
        return cb.call(ctx(json.results));
      } else {
        return console.log(json);
      }
    });
  },
  zoomToRadius: function(zoom) {
    return 1000;
  }
};

MapView = (function(_super) {

  __extends(MapView, _super);

  function MapView() {
    return MapView.__super__.constructor.apply(this, arguments);
  }

  MapView.prototype.el = $('#main-page');

  MapView.prototype.events = {
    'change #query': 'searchPlaces'
  };

  MapView.prototype.initialPosition = new google.maps.LatLng(35.681382, 139.766084);

  MapView.prototype.initialize = function() {
    var initLocations;
    this.render();
    initLocations = function(user) {
      var locations;
      locations = user.locations;
      locations.on('add', this.putMarker, this);
      locations.on('fetch:start', this.indicator.start, this.indicator);
      locations.on('fetch:complete', this.indicator.stop, this.indicator);
      return locations.fetch();
    };
    this.me = new User({
      id: 'me',
      name: 'Me'
    });
    initLocations.call(this, this.me);
    this.friends = new Friends;
    this.friends.on('add', initLocations, this);
    this.friends.on('fetch:start', this.start, this.indicator);
    this.friends.on('fetch:complete', this.stop, this.indicator);
    this.friends.fetch();
    return this.infoWindowTmpl = _.template(this.$('#infoWindow').html());
  };

  MapView.prototype.render = function() {
    var query;
    this.indicator = new IndicatorView;
    this.map = new google.maps.Map(this.$('#gmap').get(0), {
      zoom: 13,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      center: this.initialPosition,
      panControl: true,
      overviewControl: true
    });
    this.map.controls[google.maps.ControlPosition.TOP_CENTER].push(this.$('#query').get(0));
    this.map.controls[google.maps.ControlPosition.BOTTOM_RIGHT].push(this.$('#indicator').get(0));
    query = this.$('#query');
    return google.maps.event.addListener(this.map, 'click', function() {
      return query.blur();
    });
  };

  MapView.prototype.putMarker = function(location) {
    var infoWindowTmpl, latlng, marker, place, user;
    place = location.get('place');
    user = location.get('from');
    latlng = new google.maps.LatLng(place.location.latitude, place.location.longitude);
    marker = new google.maps.Marker({
      position: latlng,
      title: place.name,
      icon: "http://graph.facebook.com/" + user.id + "/picture",
      map: this.map
    });
    infoWindowTmpl = this.infoWindowTmpl;
    google.maps.event.addListener(marker, 'click', (function() {
      var infowindow;
      infowindow = null;
      return function() {
        if (infowindow) {
          return infowindow.open(marker.map, marker);
        } else {
          return Locations.get(location.get('id'), function(post) {
            if (!('message' in post)) {
              post.message = '';
            }
            console.log(location.get('type'), post);
            infowindow = new google.maps.InfoWindow({
              content: infoWindowTmpl(post)
            });
            return infowindow.open(marker.map, marker);
          });
        }
      };
    })());
    return location.marker = marker;
  };

  MapView.prototype.showMatchMarker = function(places) {
    var _this = this;
    return places.forEach(function(place) {
      var coords, location, visibleMarker;
      location = place.geometry.location;
      coords = [location.latitude - 0.005, location.latitude + 0.005, location.longitude - 0.005, location.longitude + 0.005];
      visibleMarker = function(post) {
        var pos, visible, _ref, _ref1;
        pos = post.get('place').location;
        visible = ((coords[0] <= (_ref = place.lat) && _ref <= coords[1])) && ((coords[2] <= (_ref1 = place.lng) && _ref1 <= coords[3]));
        return post.marker.setVisible(visible);
      };
      _this.me.locations.forEach(visibleMarker);
      return _this.friends.forEach(function(friend) {
        return friend.locations.forEach(visibleMarker);
      });
    });
  };

  MapView.prototype.searchPlaces = function(event) {
    var location;
    location = this.map.getCenter();
    return Places.search({
      query: event.target.value,
      lat: location.lat(),
      lng: location.lng(),
      radius: Places.zoomToRadius(this.map.getZoom())
    }, this.showMatchMarker, this);
  };

  return MapView;

})(Backbone.View);

IndicatorView = (function(_super) {

  __extends(IndicatorView, _super);

  function IndicatorView() {
    return IndicatorView.__super__.constructor.apply(this, arguments);
  }

  IndicatorView.prototype.el = $('#indicator');

  IndicatorView.prototype.initialize = function() {
    return this.activeCount = 0;
  };

  IndicatorView.prototype.start = function() {
    if (this.activeCount <= 0) {
      this.$el.show();
      this.trigger('start');
    }
    return ++this.activeCount;
  };

  IndicatorView.prototype.stop = function() {
    --this.activeCount;
    if (this.activeCount <= 0) {
      this.$el.hide();
      return this.trigger('complete');
    }
  };

  return IndicatorView;

})(Backbone.View);

window.fbAsyncInit = function() {
  FB.init({
    appId: '249490668507380',
    status: true,
    cookie: true,
    xfbml: true
  });
  return FB.Event.subscribe('auth.statusChange', function(response) {
    if (response.status === 'connected') {
      new MapView;
      return document.body.className = 'logined';
    } else {
      return document.body.className = 'not-login';
    }
  });
};

(function(d) {
  var id, js, ref;
  id = 'facebook-jssdk';
  ref = d.getElementsByTagName('script')[0];
  if (d.getElementById(id)) {
    return;
  }
  js = d.createElement('script');
  js.id = id;
  js.async = true;
  js.src = "//connect.facebook.net/en_US/all.js";
  return ref.parentNode.insertBefore(js, ref);
})(document);
