var MapVm = function() {
    var self = this;

    this.map = new google.maps.Map(document.getElementById('map'));

    this.markers = [];

    this.streetViewService = new google.maps.StreetViewService();

    this.initMap = function() {
        this.map.setOptions({
            center: {lat: 39.95, lng: -75.166667}, // philly {lat: 39.95, lng: -75.166667} ****** st louis {lat: 38.637791, lng: -90.278778}
            zoom: 16,
            styles: mapData.mapStyles,
            fullscreenControl: false,
            gestureHandling: 'greedy',
            mapTypeControl: false,
            minZoom: 13
        });

        google.maps.event.addListenerOnce(this.map, 'tilesloaded', function(){ 
            self.loadData();
        });

        // Make sure the marker property is cleared if the infowindow is closed.
        this.map.addListener('click', function() {
            var infowindow = document.getElementById('lightbox');
            
            if (infowindow.marker) {
                infowindow.marker = null;
                viewModel.info.hide();
            }
        });
    };

    this.loadData = function() {
        var self = this;

        var baseUrl = 'https://mapservices.nps.gov/arcgis/rest/services/cultural_resources/nrhp_locations/MapServer/0/';
        var queryStr = 'query?outFields=RESNAME%2C+NRIS_Refnum&returnGeometry=true&f=json&geometry=';
        var bounds = this.map.getBounds();
        var extent = bounds.getSouthWest().lng() + ',' + bounds.getSouthWest().lat() + ',' +
            bounds.getNorthEast().lng() + ',' + bounds.getNorthEast().lat();
        var request = baseUrl + queryStr + extent;

        $.getJSON(request, function(data) {
            // TODO: handle errors
            mapData.data = data.features;
            console.log(mapData.data.length + ' features loaded');
            mapData.data.forEach(function(place) {
                var i = viewModel.list.placeList.push( new Place(place) ) - 1;
                self.addMarker(viewModel.list.placeList()[i]);
            });
        });
    };

    this.makeIcon = function(color) {
        return {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 7,
                fillOpacity: 0.7,
                fillColor: color,
                strokeWeight: 0
        };
    };
    
    this.addMarker = function(place) {

        var title = place.title();
        var id = place.id();
        var position = {};
        position.lat = place.location.lat;
        position.lng = place.location.lng;
        
        var marker = new google.maps.Marker({
            position: position,
            title: title,
            id: id,
            icon: this.makeIcon(place.color())
        });

        // When the user clicks, open an infowindow TODO
        marker.addListener('click', function() {
            viewModel.info.populate(this);
        });

        this.markers.push(marker);
        marker.setMap(this.map);
    };


};