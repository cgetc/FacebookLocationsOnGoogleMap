class User extends Backbone.Model
	initialize: ->
		@locations = new Locations([], @get('id'))

class Friends extends Backbone.Collection
	model: User
	url: '/me/friends'
	fetch: ->
		@trigger 'fetch:start', @
		FB.api @url, (response)=>
			if 'error' of response
				alert response.message
			else
				@add response.data
				@trigger 'fetch:complete', @

class Location extends Backbone.Model
	
class Locations extends Backbone.Collection
	model: Location
	url: -> "/#{@user_id}/locations"
	initialize: (models, user_id)->
		@user_id = user_id
	
	fetch: ->
		@trigger 'fetch:start', @
		FB.api @url(), (response)=>
			if 'error' of response
				alert response.message
			else
				data = response.data.filter (obj)->
					obj.place and obj.place.location
				@add data
				@trigger 'fetch:complete', @

Locations.searchByQuery = (param, cb, ctx)->
	query = encodeURIComponent(param.query)
	FB.api "/search?type=location&query=#{query}&center=#{param.center}&distance=#{param.distance}", (response)->
		if 'error' of response
			alert response.message
		else
			cb.call ctx, response.data

Locations.get = (id, cb, ctx)->
	FB.api "/#{id}", (response)->
		if 'error' of response
			alert response.message
		else
			cb.call ctx, response
Places = 
	search : (param, cb, ctx)->
		name = encodeURIComponent(param.query)
		$.getJSON "/gplaces?location=#{param.lat},#{param.lng}&radius=#{param.radius}&name=#{name}", (json)->
			if json.status == 'OK'
				cb.call ctx json.results
			else
				console.log json
	zoomToRadius: (zoom)->
		1000

class MapView extends Backbone.View
	el: $ '#main-page'
	events:
		'change #query': 'searchPlaces'
	initialPosition: new google.maps.LatLng 35.681382, 139.766084

	initialize: ()->
		@render()
		
		initLocations = (user)->
			locations = user.locations
			locations.on 'add', @putMarker, @
			locations.on 'fetch:start', @indicator.start, @indicator
			locations.on 'fetch:complete', @indicator.stop, @indicator
			locations.fetch()

		@me = new User
			id: 'me'
			name: 'Me'
		initLocations.call @, @me
		
		@friends = new Friends
		@friends.on 'add', initLocations, @
		@friends.on 'fetch:start', @start, @indicator
		@friends.on 'fetch:complete', @stop, @indicator
		@friends.fetch()
		
		@infoWindowTmpl = _.template @$('#infoWindow').html()

	render: ()->
		@indicator = new IndicatorView
		@map = new google.maps.Map @$('#gmap').get(0),
			zoom: 13
			mapTypeId: google.maps.MapTypeId.ROADMAP
			center: @initialPosition
			panControl: true
			overviewControl: true
		@map.controls[google.maps.ControlPosition.TOP_CENTER].push @$('#query').get(0)
		@map.controls[google.maps.ControlPosition.BOTTOM_RIGHT].push @$('#indicator').get(0)
		query = @$ '#query'
		google.maps.event.addListener @map, 'click', ()->
			query.blur()

	putMarker: (location)->
		place= location.get('place')
		user = location.get 'from'
		latlng = new google.maps.LatLng place.location.latitude, place.location.longitude
		marker = new google.maps.Marker
			position: latlng
			title: place.name
			icon: "http://graph.facebook.com/#{user.id}/picture"
			map: @map
		
		infoWindowTmpl = @infoWindowTmpl
		google.maps.event.addListener marker, 'click', (()->
			infowindow = null
			()->
				if infowindow
					infowindow.open marker.map, marker
				else
					Locations.get location.get('id'), (post)->
						if 'message' not of post
							post.message = ''
						console.log location.get('type'), post
						infowindow = new google.maps.InfoWindow
							content: infoWindowTmpl post
						infowindow.open marker.map, marker
		)()
		location.marker = marker;

	showMatchMarker: (places)->
		places.forEach (place)=>
			location = place.geometry.location
			coords = [location.latitude - 0.005,location.latitude + 0.005
					  location.longitude - 0.005,location.longitude + 0.005]
			visibleMarker = (post)->
				pos = post.get('place').location
				visible = (coords[0] <= place.lat <= coords[1]) and
						  (coords[2] <= place.lng <= coords[3])
				post.marker.setVisible visible
			@me.locations.forEach visibleMarker
			@friends.forEach (friend)->
				friend.locations.forEach visibleMarker

	searchPlaces: (event)->
		location = @map.getCenter()
		Places.search
			query: event.target.value
			lat: location.lat()
			lng: location.lng()
			radius: Places.zoomToRadius @map.getZoom(),
			@showMatchMarker, @
	
class IndicatorView extends Backbone.View
	el: $ '#indicator'
	initialize: ->
		@activeCount = 0

	start: ->
		if @activeCount <= 0
			@$el.show()
			@trigger 'start'
		++@activeCount

	stop: ->
		--@activeCount
		if @activeCount <= 0
			@$el.hide()
			@trigger 'complete'

window.fbAsyncInit = ->
	FB.init
		appId: '249490668507380'
		status: true
		cookie: true
		xfbml: true

	FB.Event.subscribe 'auth.statusChange', (response)->
		if response.status is 'connected'
			new MapView
			document.body.className = 'logined'
		else
			document.body.className = 'not-login'

((d)->
	id = 'facebook-jssdk'
	ref = d.getElementsByTagName('script')[0]
	if d.getElementById id
		return
	js = d.createElement 'script'
	js.id = id
	js.async = true
	js.src = "//connect.facebook.net/en_US/all.js"
	ref.parentNode.insertBefore js, ref
) document