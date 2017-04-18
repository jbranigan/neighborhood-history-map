$(function() {
    init();
});

var Place = function(data) {
    this.title = ko.observable(data.attributes.RESNAME);
    this.id = ko.observable(data.attributes.NRIS_Refnum);
    this.location = {};
    this.location.lat = data.geometry.y;
    this.location.lng = data.geometry.x;
    this.color = function() {
        var name = this.title();
        if (name.includes("House")) {
            return mapData.colors.house;
        } else if (name.includes('Church') || name.includes('Temple')) {
            return mapData.colors.religious;
        } else if (name.includes('School')) {
            return mapData.colors.school;
        } else {
            return mapData.colors.default;
        }
    };
};

var ListVm = function() {
    var self = this;

    this.placeList = ko.observableArray([]);

    this.currentPlace = ko.observable();

    self.highlightPlace = function(place) {
        var i = self.placeList.indexOf(place);
        viewModel.info.populate(viewModel.map.markers[i]);
    };
};

var InfoVm = function() {
    var self = this;
    
    this.div = document.getElementById('lightbox');

    this.streetViewService = new google.maps.StreetViewService();

    this.show = function() {
        if (self.div.classList.contains('hidden')) {
            self.div.classList.remove('hidden');
        }
    };

    this.hide = function() {
        if (!self.div.classList.contains('hidden')) {
            self.div.classList.add('hidden');
        }
    };

    this.populate = function(marker) {
        var infowindow = this.div;

        if (infowindow.marker != marker) {
            // Clear the infowindow content to give the streetview time to load.
            infowindow.innerHTML = '';
            infowindow.marker = marker;

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
            this.streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
            // Open the infowindow on the correct marker.
            this.show();
        }
    };
};

var viewModel = {};

var init = function() {
    viewModel.map = new MapVm();
    viewModel.info = new InfoVm();
    viewModel.list = new ListVm();

    ko.applyBindings(viewModel);
    
    viewModel.map.initMap();
};
