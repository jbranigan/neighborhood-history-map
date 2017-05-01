// Defines the structure of each location data element
var Place = function(data) {
    this.title = data.attributes.RESNAME;
    this.id = data.attributes.NRIS_Refnum;
    this.position = {};
    this.position.lat = data.geometry.y;
    this.position.lng = data.geometry.x;
    // The source data doesn't have these types, but they're handy for
    // cartographic purposes. This function just guesses the type based
    // on whether a word is in the RESNAME field. It mostly works.
    // The mapData object is defined in data.js
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
    
    // Add the Google Maps marker info onto this object
    this.marker = new google.maps.Marker({
        position: this.position,
        title: this.title,
        id: this.id,
        icon: viewModel.map.makeIcon(this.type().color),
        type: this.type()
    });
};

// ViewModel for the list of places
var ListVm = function() {
    var self = this;

    // Holds all of the returned data from the NPS endpoint
    this.placeList = ko.observableArray([]);

    // Computes an array based on the types defined in mapData
    this.filters = ko.computed(function() {
        var arr = [];
        Object.keys(mapData.types).forEach(function(key) {
            arr.push(mapData.types[key]);
        });
        return arr;
    });

    // Controls whether or not certain types of locations should be
    // displayed in the list and map views
    this.visibleTypes = ko.observableArray([]);
    
    // When the app first loads, make sure all of the types are turned on
    this.initiateTypes = function() {
        Object.keys(mapData.types).forEach(function(key) {
            self.visibleTypes.push(mapData.types[key].label);
        });
    };
    
    // The array of places to be shown in the list
    this.filteredPlaces = ko.computed(function() {
        var places = [];
        self.placeList().forEach(function(place) {
            // If this type of place is checked on in visibleTypes, show it
            if (self.visibleTypes().includes(place.type().label)) {
                places.push(place);
                place.marker.setVisible(true);
            } else { // Otherwise, hide it on the map
                place.marker.setVisible(false);
            }
        });
        return places;
    });

    // Click binding to each list item
    self.placeInfo = function(place) {
        viewModel.info.populate(place.marker);
    };

    // Mouseover binding to each list item
    self.highlightMarker = function(place) {
        viewModel.map.highlightMarker(place.marker);
    };

    // Mouseout binding to each list item
    self.clearHighlight = function(place) {
        viewModel.map.clearHighlight(place.marker);
    };

    // Stores whether or not the whole list view should be displayed
    this.show = ko.observable();
    
    // On the page load, checks to see if the screen is small
    // and hides the list view by default
    this.checkWidth = ko.computed(function(){
        self.show(window.innerWidth > 767);
    });

    // Text binding for the toggle button label
    this.toggleMessage = ko.observable('List View');

    // Click binding on the toggle button that shows and hides 
    // the list, as well as managing the label text
    this.toggleList = function() {
        if (self.show()) {
            self.toggleMessage('List View');
            self.show(false);
        } else {
            self.toggleMessage('Map View');
            self.show(true);
        }
    };
    

};

// ViewModel for the custom information window
var InfoVm = function() {
    var self = this;
    
    // Text and HTML bindings for the info window
    this.placeName = ko.observable();
    this.pano = ko.observable();
    this.wiki = ko.observable();

    this.streetViewService = new google.maps.StreetViewService();

    // Controls whether or not to display the window
    this.show = ko.observable(false);
    
    // Clears out data before repopulating with new data
    // TODO: this could work better - in fact, it doesn't seem to work
    this.clearInfo = function() {
        self.placeName('');
        self.pano('');
        self.wiki('');
    };

    // Closes the window
    this.close = function() {
        self.clearInfo();
        self.show(false);
    };

    // Populates the info window based on data in the marker
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
                // Couldn't figure out how to do this without getElementById
                // TODO: self.pano(new google.maps.StreetViewPanorama(panoramaOptions)); ?
            } else {
                self.pano('<div>No Street View Found</div>');
            }
        }
        // Use streetview service to get the closest streetview image within
        // 50 meters of the markers position
        var radius = 50;
        // TODO: figure out how to force outdoor views
        var source = 'outdoor';
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
            // absence does not degrade the experience
        })
        .fail( function() {
            // Let the user know the NPS data request failed
            var msg = "There was a problem accessing Wikipedia data. Please check your internet connection and try again.";
            self.wiki(msg);
        });
    };
};

// ViewModel for the search input on the splash page and in the header
var SearchVm = function() {
    this.input = new ko.observable();
};

// Basic definition of the overarching ViewModel
var viewModel = {
    showIntro: ko.observable(false)
};

// Callback function for the Google Maps API async request
var init = function() {
    
    // Add the other ViewModels to the master viewModel
    viewModel.map = new MapVm();
    viewModel.info = new InfoVm();
    viewModel.list = new ListVm();
    viewModel.search = new SearchVm();

    // Apply the KO bindings
    ko.applyBindings(viewModel);
    
    // And finally initialize the map
    viewModel.map.initMap();
};

var initError = function() {
    // Handle the possibility that the Google JS file request might fail
    alert("There was a problem loading the Google API. Please check your internet connection and try again later.");
};