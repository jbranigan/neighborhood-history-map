var map;

var markers = [];

var markerInfo = new google.maps.InfoWindow();

function initMap() {
    var styles = [
        {
            "featureType": "administrative",
            "stylers": [{
                    "visibility": "off"
                }]
        },
        {
            "featureType": "poi",
            "stylers": [
                {
                    "visibility": "off"
                }
            ]
        },
        {
            "featureType": "road",
            "stylers": [
                {
                    "visibility": "simplified"
                }
            ]
        },
        {
            "featureType": "water",
            "stylers": [
                {
                    "visibility": "simplified"
                }
            ]
        },
        {
            "featureType": "transit",
            "stylers": [
                {
                    "visibility": "simplified"
                }
            ]
        },
        {
            "featureType": "landscape",
            "stylers": [
                {
                    "visibility": "simplified"
                }
            ]
        },
        {
            "featureType": "road.highway",
            "stylers": [
                {
                    "visibility": "off"
                }
            ]
        },
        {
            "featureType": "road.local",
            "stylers": [
                {
                    "visibility": "on"
                }
            ]
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry",
            "stylers": [
                {
                    "visibility": "on"
                }
            ]
        },
        {
            "featureType": "water",
            "stylers": [
                {
                    "color": "#84afa3"
                },
                {
                    "lightness": 52
                }
            ]
        },
        {
            "stylers": [
                {
                    "saturation": -77
                }
            ]
        },
        {
            "featureType": "road"
        }
    ];
    
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 39.95, lng: -75.166667}, // philly {lat: 39.95, lng: -75.166667} ****** st louis {lat: 38.637791, lng: -90.278778}
        zoom: 14,
        styles: styles
    });

    google.maps.event.addListenerOnce(map, 'tilesloaded', function(){ 
        loadData();
    });

}

function loadData() {
    var baseUrl = 'https://mapservices.nps.gov/arcgis/rest/services/cultural_resources/nrhp_locations/MapServer/0/';
    var queryStr = 'query?outFields=RESNAME%2C+NRIS_Refnum&returnGeometry=true&f=json&geometry=';
    var bounds = map.getBounds();
    var extent = bounds.getSouthWest().lng() + ',' + bounds.getSouthWest().lat() + ',' +
        bounds.getNorthEast().lng() + ',' + bounds.getNorthEast().lat();
    var request = baseUrl + queryStr + extent;

    $.getJSON(request, function(data) {
        var features = data.features;
        console.log(features.length + ' features loaded');
        for (var i = 0; i < features.length; i++) {
            var feature = features[i];
            var title = feature.attributes.RESNAME;
            var id = feature.attributes.NRIS_Refnum;
            var position = {};
            position.lat = feature.geometry.y;
            position.lng = feature.geometry.x;
            
            var marker = new google.maps.Marker({
                position: position,
                title: title,
                id: id,
                icon: makeIcon(title)
            });

            // When the user clicks, open an infowindow TODO
            marker.addListener('click', function() {
                populateInfoWindow(this, markerInfo);
            });
 
            markers.push(marker);
            marker.setMap(map);
        }
    });
}

function populateInfoWindow(marker, infowindow) {
    // Check to make sure the infowindow is not already opened on this marker.
    if (infowindow.marker != marker) {
        // Clear the infowindow content to give the streetview time to load.
        infowindow.setContent('');
        infowindow.marker = marker;
        // Make sure the marker property is cleared if the infowindow is closed.
        infowindow.addListener('closeclick', function() {
            infowindow.marker = null;
        });
        var streetViewService = new google.maps.StreetViewService();
        var radius = 50;

        infowindow.setContent('<h3>' + marker.title + '</h3><div id="pano"></div><div id="wiki"></div>');
        // In case the status is OK, which means the pano was found, compute the
        // position of the streetview image, then calculate the heading, then get a
        // panorama from that and set the options
        function getStreetView(data, status) {
            if (status == google.maps.StreetViewStatus.OK) {
                var nearStreetViewLocation = data.location.latLng;
                var heading = google.maps.geometry.spherical.computeHeading(
                nearStreetViewLocation, marker.position);
                var panoramaOptions = {
                    position: nearStreetViewLocation,
                    pov: {
                    heading: heading,
                    pitch: 30
                    }
                };
                var panorama = new google.maps.StreetViewPanorama(
                document.getElementById('pano'), panoramaOptions);
            } else {
                document.getElementById('pano').innerHTML = '<div>No Street View Found</div>';
            }
        }
        // Check for Wikipedia entries
        // get the Wikipedia data
        $.ajax({
            url: "https://en.wikipedia.org/w/api.php?action=opensearch&format=json&search=" + marker.title,
            method: "GET",
            dataType: "jsonp"
        }).done(function (data) {
            if (data[1].length > 0) {
                var link = '<h4>Info from Wikipedia (ymmv)</h4>';
                link += '<a href="' + data[3][0] + '" target="_blank">' + data[1][0] + '</a>';
                document.getElementById('wiki').innerHTML = link;
            }

        });
        // Use streetview service to get the closest streetview image within
        // 50 meters of the markers position
        streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
        // Open the infowindow on the correct marker.
        infowindow.open(map, marker);
    }
}

function makeIcon(name) {
    var color = 'red';
    if (name.includes('House')) {
        color = 'blue';
    } else if (name.includes('Church') || name.includes('Temple')) {
        color = 'purple';
    } else if (name.includes('Hotel')) {
        color = 'yellow';
    }
    return {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 4,
            fillOpacity: 0.5,
            fillColor: color,
            strokeWeight: 0
    };
}

// This function takes the input value in the find nearby area text input
// locates it, and then zooms into that area. This is so that the user can
// show all listings, then decide to focus on one area of the map.
function zoomToArea() {
    // Initialize the geocoder.
    var geocoder = new google.maps.Geocoder();
    // Get the address or place that the user entered.
    var address = document.getElementById('search-text').value;
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
                    markers = [];
                    map.setCenter(results[0].geometry.location);
                    map.setZoom(15);
                    loadData();
                } else {
                window.alert('We could not find that location - try entering a more' +
                    ' specific place.');
                }
        });
    }
}