
var Place = function(data) {
    this.title = data.attributes.RESNAME;
    this.id = data.attributes.NRIS_Refnum;
    this.position = {};
    this.position.lat = data.geometry.y;
    this.position.lng = data.geometry.x;
    this.type = function() {
        var name = this.title;
        if (name.includes("House")) {
            return mapData.types.house;
        } else if (name.includes('Church') || name.includes('Temple')) {
            return mapData.types.religious;
        } else if (name.includes('School')) {
            return mapData.types.school;
        } else {
            return mapData.types.default;
        }
    };
    
    this.marker = new google.maps.Marker({
        position: this.position,
        title: this.title,
        id: this.id,
        icon: viewModel.map.makeIcon(this.type().color),
        type: this.type()
    });
};

var ListVm = function() {
    var self = this;

    this.placeList = ko.observableArray([]);

    this.filters = ko.computed(function() {
        var arr = [];
        Object.keys(mapData.types).forEach(function(key) {
            arr.push(mapData.types[key]);
        });
        return arr;
    });

    this.visibleTypes = ko.computed(function() {
        var arr = [];
        Object.keys(mapData.types).forEach(function(key) {
            arr.push(mapData.types[key].label);
        });
        return arr;
    });

    self.placeInfo = function(place) {
        viewModel.info.populate(place.marker);
    };

    self.highlightMarker = function(place) {
        viewModel.map.highlightMarker(place.marker);
    };

    self.clearHighlight = function(place) {
        viewModel.map.clearHighlight(place.marker);
    };

};

var InfoVm = function() {
    var self = this;
    
    this.placeName = ko.observable();
    this.pano = ko.observable();
    this.wiki = ko.observable();

    this.streetViewService = new google.maps.StreetViewService();

    this.show = ko.observable(false);
    
    this.clearInfo = function() {
        self.placeName('');
        self.pano('');
        self.wiki('');
    };

    this.close = function() {
        self.clearInfo();
        self.show(false);
    };

    this.populate = function(marker) {
        if (self.placeName() != marker.title) {
            // Clear the infowindow content to give the streetview time to load.
            self.clearInfo();

            self.placeName(marker.title);

            self.getPano(marker);

            self.getWikiData(marker.title);

            // Open the infowindow on the correct marker.
            this.show(true);
        }
    };

    this.getPano = function(marker) {

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
                    pitch: 15
                    }
                };
                var panorama = new google.maps.StreetViewPanorama(
                document.getElementById('pano'), panoramaOptions);
                // TODO: self.pano(new google.maps.StreetViewPanorama(panoramaOptions));
            } else {
                self.pano('<div>No Street View Found</div>');
            }
        }
        // Use streetview service to get the closest streetview image within
        // 50 meters of the markers position
        var radius = 50;
        this.streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
    };

    this.getWikiData = function(title) {
        // Check for Wikipedia entries
        // get the Wikipedia data
        $.ajax({
            url: "https://en.wikipedia.org/w/api.php?action=opensearch&format=json&search=" + title,
            method: "GET",
            dataType: "jsonp"
        }).done(function (data) {
            if (data[1].length > 0) {
                var link = '<h4>Info from Wikipedia (ymmv)</h4>';
                link += '<p><a href="' + data[3][0] + '" target="_blank">' + data[1][0] + '</a></p>';
                self.wiki(link);
            }
            // otherwise silently fail, as this is an enhancement to the pano, and its 
            // absense does not degrade the experience
        });
    };
};

var SearchVm = function() {
    this.input = new ko.observable();
};

var viewModel = {
    showIntro: ko.observable(true)
};

var init = function() {
    
    viewModel.map = new MapVm();
    viewModel.info = new InfoVm();
    viewModel.list = new ListVm();
    viewModel.search = new SearchVm();

    ko.applyBindings(viewModel);
    
    viewModel.map.initMap();
};
