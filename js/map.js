// ViewModel for the map
// Separated into its own file because there's a lot here
var MapVm = function() {
    var self = this;

    // Set up a few google.maps objects
    this.map = new google.maps.Map(document.getElementById('map'));
    this.infowindow = new google.maps.InfoWindow();
    this.streetViewService = new google.maps.StreetViewService();

    // Initialize the map - happens in the background of the splash page
    this.initMap = function() {
        this.map.setOptions({
            center: {lat: 39.95, lng: -75.166667}, 
            zoom: 16,
            styles: mapData.mapStyles, // in data.js file
            fullscreenControl: false, // it's pretty much full screen already
            gestureHandling: 'greedy', // disables requirement for 'two fingers to pan'
            mapTypeControl: false, // only show the styled map
            minZoom: 13
        });

        // This is for when the info window is open
        // If the user clicks outside the info window (i.e. on the map),
        // close the info window
        this.map.addListener('click', function() {            
            // Checks to see if the window is open already
            if (viewModel.info.placeName()) {
                viewModel.info.close();
            }
        });
    };

    // Loads data from the National Park Service
    this.loadData = function() {
        var self = this;

        // The base URL and query string are static
        var baseUrl = 'https://mapservices.nps.gov/arcgis/rest/services/cultural_resources/nrhp_locations/MapServer/0/';
        var queryStr = 'query?outFields=RESNAME%2C+NRIS_Refnum&returnGeometry=true&f=json&geometry=';
        // Limit the query by filtering only data that's within the map viewport
        var bounds = this.map.getBounds();
        var extent = bounds.getSouthWest().lng() + ',' + bounds.getSouthWest().lat() + ',' +
            bounds.getNorthEast().lng() + ',' + bounds.getNorthEast().lat();
        // Assemble the request URL
        var request = baseUrl + queryStr + extent;

        // Make an AJAX call to the NPS server
        $.getJSON(request, function(data) {
            console.log(data.features.length + ' features loaded');

            // Empty the current place list
            viewModel.list.placeList([]);
            
            // Push each feature into the list
            data.features.forEach(function(place) {
                viewModel.list.placeList.push( new Place(place) );
            });

            // Once the list is full, run through it and place the markers on the map
            viewModel.list.placeList().forEach(function(place) {
                self.setUpMarker(place.marker);
            });

            // Also check to see if no type filters are on, turn them all on
            // Otherwise leave them
            if (viewModel.list.visibleTypes().length === 0) {
                viewModel.list.initiateTypes();
            } 

            // Make sure we switch to the map view
            viewModel.showIntro(false);

        })
        .fail( function() {
            // Let the user know the NPS data request failed
            alert("There was a problem accessing location data. Please check your internet connection and try again.");
        });
    };

    // Return icon style definition using its type color
    this.makeIcon = function(color) {
        return {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 7,
                fillOpacity: 0.7,
                fillColor: color,
                strokeWeight: 0
        };
    };
    
    // Add a marker to the map
    this.setUpMarker = function(marker) {
        
        // Loads the marker info into the info window
        marker.addListener('click', function() {
            viewModel.info.populate(this);
        });

        // Controls highlight functionality
        marker.addListener('mouseover', function() {
            self.highlightMarker(this);
        });

        marker.addListener('mouseout', function() {
            self.clearHighlight(this);
        });

        // Aaaand add it to the map
        marker.setMap(this.map);
    };

    // Changes the color of the marker, and pops up the small infowindow
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

    // Resets the marker to its original style, closes the small infowindow
    this.clearHighlight = function(marker) {
        marker.setIcon( this.makeIcon(marker.type.color) );
        self.infowindow.close();
    };

    // Geocode the user input, then zoom to the results
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
                        // And load the data for the new place
                        self.loadData();
                    } else {
                    // Basic error handling
                    window.alert('We could not find that location - try entering a more' +
                        ' specific place.');
                    }
            });
        }
    };

};