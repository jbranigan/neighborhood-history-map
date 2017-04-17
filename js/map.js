var MapVm = function() {
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
            loadData(this);
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

        var title = place.attributes.RESNAME;
        var id = place.attributes.NRIS_Refnum;
        var position = {};
        position.lat = place.geometry.y;
        position.lng = place.geometry.x;
        
        var marker = new google.maps.Marker({
            position: position,
            title: title,
            id: id,
            icon: this.makeIcon('blue')
        });

        // When the user clicks, open an infowindow TODO
        marker.addListener('click', function() {
            // TODO: add this function
            //populateInfoWindow(this, markerInfo);
            console.log(this);
        });

        this.markers.push(marker);
        marker.setMap(this.map);
    };


};