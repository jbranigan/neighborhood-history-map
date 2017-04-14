var map;

var markers = [];

var markerInfo = document.getElementById('lightbox');

var streetViewService = new google.maps.StreetViewService();

var iconColors = { 
    default: '#d18779',
    house: '#527379',
    church: '#4c6b54',
    school: '#d3aa50'
};

function initMap() {
    var styles = [
    {
        "featureType": "all",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "weight": "2.00"
            }
        ]
    },
    {
        "featureType": "all",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "color": "#9c9c9c"
            }
        ]
    },
    {
        "featureType": "all",
        "elementType": "labels.text",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "landscape",
        "elementType": "all",
        "stylers": [
            {
                "color": "#fcf8f1"
            }
        ]
    },
    {
        "featureType": "landscape",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#fcf8f1"
            }
        ]
    },
    {
        "featureType": "landscape.man_made",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#fcf8f1"
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "all",
        "stylers": [
            {
                "saturation": -100
            },
            {
                "lightness": 45
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#b8b19f"
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#575041"
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "color": "#fcf8f1"
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "simplified"
            }
        ]
    },
    {
        "featureType": "road.arterial",
        "elementType": "labels.icon",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "transit",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "all",
        "stylers": [
            {
                "color": "#46bcec"
            },
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#c8d7d4"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#070707"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "color": "#ffffff"
            }
        ]
    }
];
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 39.95, lng: -75.166667}, // philly {lat: 39.95, lng: -75.166667} ****** st louis {lat: 38.637791, lng: -90.278778}
        zoom: 14,
        styles: styles,
        fullscreenControl: false,
        gestureHandling: 'greedy',
        mapTypeControl: false,
        minZoom: 13
    });

    google.maps.event.addListenerOnce(map, 'tilesloaded', function(){ 
        loadData();
    });

    document.getElementById('search-button').addEventListener('click', function() {
        zoomToArea();
    });

    var searchAutocomplete = new google.maps.places.Autocomplete(
            document.getElementById('search-text'));

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
        infowindow.innerHTML = '';
        infowindow.marker = marker;
        // Make sure the marker property is cleared if the infowindow is closed.
        var closeInfo = map.addListener('click', function() {
            infowindow.marker = null;
            infowindow.classList.toggle('hidden');
            google.maps.event.removeListener(closeInfo);
        });

        var radius = 50;

        infowindow.innerHTML = '<h3>' + marker.title + '</h3><div id="pano"></div><div id="wiki"></div>';
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
                link += '<p><a href="' + data[3][0] + '" target="_blank">' + data[1][0] + '</a></p>';
                document.getElementById('wiki').innerHTML = link;
            }

        });
        // Use streetview service to get the closest streetview image within
        // 50 meters of the markers position
        streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
        // Open the infowindow on the correct marker.
        // infowindow.open(map, marker);
        infowindow.classList.toggle('hidden');
    }
}



function makeIcon(name) {
    var color = '#d18779';
    if (name.includes('House')) {
        color = '#527379';
    } else if (name.includes('Church') || name.includes('Temple')) {
        color = '#4c6b54';
    } else if (name.includes('School')) {
        color = '#d3aa50';
    }
    // TODO - DRY out this color stuff
    return {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillOpacity: 0.7,
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