var MapVm = function() {
    var self = this;

    this.map = new google.maps.Map(document.getElementById('map'));

    this.infowindow = new google.maps.InfoWindow();

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

        // Make sure the marker property is cleared if the infowindow is closed.
        this.map.addListener('click', function() {            
            if (viewModel.info.placeName()) {
                viewModel.info.close();
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
            console.log(data.features.length + ' features loaded');
            data.features.forEach(function(place) {
                viewModel.list.placeList.push( new Place(place) );
            });
            viewModel.list.placeList().forEach(function(place) {
                self.setUpMarker(place.marker);
            });
            if (viewModel.list.visibleTypes().length === 0) {
                viewModel.list.initiateTypes();
            } 
            viewModel.showIntro(false);

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
    
    this.setUpMarker = function(marker) {
        
        marker.addListener('click', function() {
            viewModel.info.populate(this);
        });

        marker.addListener('mouseover', function() {
            self.highlightMarker(this);
        });

        marker.addListener('mouseout', function() {
            self.clearHighlight(this);
        });

        //this.markers.push(marker);
        marker.setMap(this.map);
    };

    this.highlightMarker = function(marker) {
        marker.setIcon( {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillOpacity: 0.7,
                fillColor: 'yellow',
                strokeWeight: 1
        } );
        self.infowindow.setContent(marker.title);
        self.infowindow.open(map, marker);
    };

    this.clearHighlight = function(marker) {
        marker.setIcon( this.makeIcon(marker.type.color) );
        self.infowindow.close();
    };

    // This function takes the input value in the find nearby area text input
    // locates it, and then zooms into that area. This is so that the user can
    // show all listings, then decide to focus on one area of the map.
    this.zoomToArea = function() {
        // Initialize the geocoder.
        var geocoder = new google.maps.Geocoder();
        // Get the address or place that the user entered.
        var address = viewModel.search.input();
        // Make sure the address isn't blank.
        if (address === '') {
            return;
        } else {
            // Geocode the address/area entered to get the center. Then, center the map
            // on it and zoom in
            geocoder.geocode(
                { address: address,
                    componentRestrictions: {country: 'United States'}
                }, function(results, status) {
                    if (status == google.maps.GeocoderStatus.OK) {
                        viewModel.list.placeList([]);
                        self.map.setCenter(results[0].geometry.location);
                        self.map.setZoom(15);
                        self.loadData();
                    } else {
                    window.alert('We could not find that location - try entering a more' +
                        ' specific place.');
                    }
            });
        }
    };

};