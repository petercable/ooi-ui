// Parent class for asset views.
var ParentView = Backbone.View.extend({
    /* Parent class for views.
     *  - initialize()
     *  - render()
     *  - derender()
     */
    initialize: function() {
        _.bindAll(this, 'render', 'derender');
    },
    render: function() {
        if (this.model) { this.$el.html(this.template(this.model.toJSON())); } else { this.$el.html(this.template()); }

        return this;
    },
    derender: function() {
        this.remove();
        this.unbind();
        this.model.off();
    }
});

var ArrayContentSummary = ParentView.extend({
    render: function() {
        var arrayContentContext = this;

        var arrayContentSummaryItem = this.collection.arrayCollection.map(function(model) {
            return (new ArrayContentSummaryItem({model: model})).render().el;
        });
        this.$el.prepend(arrayContentSummaryItem);

        this.listenTo(vent, 'home-page:showArrayDetails', function(el) {
            var arrayCode = $(el).attr('id');
            var platformTable = new PlatformContentTable({collection: arrayContentContext.collection.platformCollection.byArray(arrayCode)});
            platformTable.render();
            // TODO: keep working to get this loaded as a platform table list.
            //this.$el.find('table').append(platformTable.el);
        });
    }
});

var ArrayContentSummaryItem = ParentView.extend({
    events: {
        'click .js-array': '_flyFly',
    },
    // _flyBye and flyFly are controls that interact directly with the global map variable.
    // because of this, the ArrayContentSummary Item is tightly coupled to the VectorMap
    _toggleActive: function(event) {
        var el = $('#'+this.model.attributes.array_code);

        if ($('.js-array').hasClass('active')) {
            $('.js-array').removeClass('active');
        }
        el.toggleClass('active');

    },
    _toggleOthers: function(event) {
        var el = $('#'+this.model.attributes.array_code),
            arrayEl = $('.js-array');

        _.each(arrayEl, function(item) {
            if ($(item).attr('id') !== el.attr('id')) {
                $(item).animate({
                    opacity: 'toggle',
                    height: 'toggle'
                }, 500);
            }
        });
    },
    _renderArrayDetails: function(event) {
        var el = $('#'+this.model.attributes.array_code);
        vent.trigger('home-page:showArrayDetails', el);
    },
    _flyBye: function(event) {
        map.flyTo({center: [-90, 5], zoom: 1.3, pitch: 0, bearing: 0});
        map._setArrayView();

        $('.js-array').removeClass('active');
        popup.remove();
    },
    _flyFly: _.debounce(function(event) {
        var flyFlyContext = this;
        event.stopImmediatePropagation();

        $.when(this._toggleActive(event)).done(function() {
            flyFlyContext._toggleOthers(event);
            flyFlyContext._renderArrayDetails(event);
        });

        // helper monkies
        var _compareGeoLoc = (function (pt1, pt2) {
            var RANGE = 10;

            if (((Math.round(pt1.lng) > Math.round(pt2[0]) - RANGE) && (Math.round(pt1.lng) < Math.round(pt2[0]) + RANGE))
                  && ((Math.round(pt1.lat) > Math.round(pt2[1]) - RANGE) && (Math.round(pt1.lat) < Math.round(pt2[1]) + RANGE))) {
                return true;
            } else {
                return false;
            }
        });

        var _addPopup = (function(loc, name) {
            popup.setLngLat(loc)
            .setHTML('<span>' +name+'</span>')
            .addTo(map);
        });
        // end helper monkies

        map._setPlatformView();


        var loc = [this.model.attributes.geo_location.coordinates[0][0][1], this.model.attributes.geo_location.coordinates[0][0][0]],
            code = this.model.attributes.array_code,
            name = this.model.attributes.array_name;

        if (code === 'CE') {
            if ( !_compareGeoLoc(map.getCenter(), loc) ) {
                map.flyTo({center: loc, zoom: 6, pitch: 50, bearing: -40});
                _addPopup(loc, name);
            } else {
                this._flyBye();
            }
        } else if (code === 'RS') {
            if ( !_compareGeoLoc(map.getCenter(), loc) ) {
                map.flyTo({center: loc, zoom: 6, pitch: 50, bearing: 10});
                _addPopup(loc, name);
            } else {
                this._flyBye();
            }
        } else if (code === 'CP') {
            if ( !_compareGeoLoc(map.getCenter(), loc) ) {
                map.flyTo({center: loc, zoom: 7, pitch: 60, bearing: -20});
                _addPopup(loc, name);
            } else {
                this._flyBye();
            }
        } else if (code === 'GS') {
            if ( !_compareGeoLoc(map.getCenter(), loc) ) {
                map.flyTo({center: [loc[0] + .5, loc[1] -.1], zoom: 5, pitch: 60, bearing: 50});
                _addPopup(loc, name);
            } else {
                this._flyBye();
            }
        } else if (code === 'GI') {
            if ( !_compareGeoLoc(map.getCenter(), loc) ) {
                map.flyTo({center: loc, zoom: 6, pitch: 60, bearing: -20});
                _addPopup(loc, name);
            } else {
                this._flyBye();
            }
        } else if (code === 'GA') {
            if ( !_compareGeoLoc(map.getCenter(), loc) ) {
                map.flyTo({center: loc, zoom: 5, pitch: 40, bearing: -20});
                _addPopup(loc, name);
            } else {
                this._flyBye();
            }
        } else {
            if ( !_compareGeoLoc(map.getCenter(), loc) ) {
                map.flyTo({center: loc, zoom: 5, pitch: 30, bearing: -10});
                _addPopup(loc, name);
            } else {
                this._flyBye();
            }
        }
    }, 500, true),
    template: JST['ooiui/static/js/partials/home/array_content/ArrayContentSummaryItem.html']
});

var PlatformContentTable = ParentView.extend({
    tagName: 'table',
    render: function() {
        var platformContentItem = this.collection.byMoorings().map(function(model) {
            return (new PlatformContentItem({model: model})).render().el;
        });

        this.$el.append(platformContentItem);
    },
    template: JST['ooiui/static/js/partials/home/array_content/PlatformTable.html']
});

var PlatformContentItem = ParentView.extend({
    tagName: 'tr',
    template: JST['ooiui/static/js/partials/home/array_content/PlatformTableItem.html']
});

