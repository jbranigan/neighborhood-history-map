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
        if (this.title.includes("House")) {
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

    this.highlightPlace = function(place) {
        this.currentPlace(place);
    };
};

var InfoVm = function() {
    this.div = document.getElementById('lightbox');
};

var viewModel = {};

var init = function() {
    viewModel.map = new MapVm();
    viewModel.info = new InfoVm();
    viewModel.list = new ListVm();

    ko.applyBindings(viewModel);
    
    viewModel.map.initMap();
};
