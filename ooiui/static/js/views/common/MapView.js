var MapView = Backbone.View.extend({
    gliderCollection:null,
    initialize: function() {
        var self = this;

        this.map = L.map(this.el,{
            maxZoom: 10,
            minZoom: 2,
            layers: TERRAIN.getBaseLayers('ESRI Oceans')
        });
        this.inititalMapBounds = [[63, -143],[-59, -29]];

        L.control.mousePosition().addTo(this.map);

        L.easyButton('fa-globe', function(btn, map){
            map.fitBounds(self.inititalMapBounds);
        },"Reset Zoom Level").addTo( this.map );

        var wmsLayers = {};
        $.each(TERRAIN.getLayerParams(), function( index, value ) {
            var params = _.clone(value);
            var new_layer = L.WMS.overlay(value.url, params);
            wmsLayers[value.name] = new_layer;
        });
        //wmsLayers['Glider Track'] = this.generate_glider_layer();
        this.wmsLayers = wmsLayers;

        //glider layer
        this.gliderLayers = L.layerGroup();
        this.arrayLayers = L.layerGroup();

        wmsLayers['Array Titles'] = this.arrayLayers;
        wmsLayers['Glider Tracks'] = this.gliderLayers;
        this.mapLayerControl = L.control.layers(TERRAIN.getBaseLayers(),wmsLayers).addTo(this.map);

        //this.listenTo(ooi.models.mapModel, 'change', this.setMapView);

        var data = { min : 'True', deployments : 'True' };
        this.collection.fetch({ data: data, success: function(collection, response, options) {
            self.render();
            return this;
        }});

        this.addlegend();
        return this;
    },
    addlegend:function(){
        var WMSlegend = L.control({position: 'bottomright'});

        WMSlegend.onAdd = function (map) {

            var div = L.DomUtil.create('div', 'info legend');
            var content = '';
            content+="<div class='legendContainer'>";
            content+="<img class='wind' style='display:none;margin-right:10px' src='http://coastmap.com/ecop/wms.aspx?LAYER=GFS_WINDS&FORMAT=image/png&TRANSPAREaNT=TRUE&STYLES=WINDS_VERY_SPARSE_GRADIENT-False-2-0-45-high&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&TIME=&SRS=EPSG:3857&LAYERS=GFS_WINDS'>";
            content+="<img class='waves' style='display:none;margin-right:10px' src='http://coastmap.com/ecop/wms.aspx?LAYER=WW3_WAVE_HEIGHT&FORMAT=image/png&TRANSPARENT=TRUE&STYLES=WAVE_HEIGHT_STYLE-0-3&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&TIME=&SRS=EPSG:3857&LAYERS=WW3_WAVE_HEIGHT'>";
            content+="<img class='currents' style='display:none;margin-right:10px' src='http://coastmap.com/ecop/wms.aspx?LAYER=HYCOM_GLOBAL_NAVY_CURRENTS&FORMAT=image/png&TRANSPARENT=TRUE&STYLES=CURRENTS_RAMP-Jet-False-4-True-0-2-high&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&TIME=&SRS=EPSG:3857&LAYERS=HYCOM_GLOBAL_NAVY_CURRENTS'>";
            content+="</div>";
            div.innerHTML+=content;
            return div;
        };
        WMSlegend.addTo(this.map);
    },
    add_glider_tracks: function(){
        var self = this;
        //this.gliderCollection
        var gliderTrackStyle = {
            "color": "#ff7800",
            "weight": 5,
            "opacity": 0.65
        };

        self.gliderCollection.each(function(model,i) {
            gliderTrackStyle.color = (self.getRandomColor());
            var gliderTrackLayer = L.geoJson(model.toJSON(), {style: gliderTrackStyle});
            //popup

            var glName     = model.get('name').split('-')[1].substring(2);
            var glLocation = model.get('name').split('-')[0].substring(0,2);
            var gliderText = "Glider " + glName  ;

            var glPosition = model.get('coordinates').slice(-1).pop();

            var processedDepths = _.map(model.get('depths'), function(num){
                if (num == -999){
                    return 0;
                }
                return num;
            });

            var minDepth = _.min(processedDepths);
            var maxDepth = _.max(processedDepths);

            var popupContent = '<h4 id="popTitle"><strong>' + gliderText +" : "+ ASSET_ARRAY.getArrayCodes[glLocation] + '</strong></h4>';
            if (!_.isUndefined(glPosition)){
                popupContent += '<h5 id="latLon">';
                popupContent += '<div class="latFloat">'+ '<strong>Latitude:</strong> ' + glPosition[0].toFixed(3) + '</div>';
                popupContent += '<div class="lonFloat">'+ '<strong>Longitude:</strong> ' + glPosition[1].toFixed(3) + '</div>';

                popupContent += '<br><br><div><a href="/plotting/#'+ model.get('name') +'"><i class="fa fa-bar-chart">&nbsp;</i>Plotting</a>&nbsp;&nbsp;&#124;&nbsp;&nbsp;';
                // Data Catalog
                popupContent+='<a href="/streams/#'+  model.get('name') +'"><i class="fa fa-database">&nbsp;</i>Data Catalog</a>&nbsp;&nbsp;&#124;&nbsp;&nbsp;';
                // Asset Managment
                popupContent+='<a href="/assets/list#' +  model.get('name') + '"><i class="fa fa-sitemap">&nbsp;</i>Asset Management</a></div></h5>';
            }
            popupContent += '<h5 id="deployEvents"><strong>Overview'+'</strong></h5>';
            popupContent += '<div class="map-pop-container">';
            popupContent +=   '<div class="floatLeft">';
            popupContent +=   '<h6><strong>Min Depth: </strong>'+ minDepth.toFixed(2)+ " ("+ model.get('units') +')</h6>';
            popupContent +=   '<h6><strong>Max Depth: </strong>'+ maxDepth.toFixed(2)+ " ("+ model.get('units') +')</h6>';
            popupContent +=   '</div>';
            popupContent += '</div>';
            //bind
            gliderTrackLayer.bindPopup(popupContent);
            //add
            self.gliderLayers.addLayer(gliderTrackLayer);
        });
    },
    //deprecated i think
    update_track_glider: function(reference_designator,show_track){
        var self = this;
        var map = this.map;
        map.removeLayer(self.gliderLayer);
        if (show_track){
            var gliderModel = new GliderTrackModel(reference_designator+'-00-ENG000000');
            var ref = gliderModel.get('reference_designator');
            gliderModel.fetch({
                data: $.param({id:ref}),
                success: function(collection, response, options) {
                    var gl = self.generate_glider_layer(response);
                    gl.addTo(map);
                    self.gliderLayer = gl;
                },
                reset: true
            });
        }
    },
    showLayers:function(){
        /*
           test function to list the layers
           */
        this.map.eachLayer(function (layer) {
            //console.log(layer.options.color);
        });
    },
    //deprecated i think
    generate_glider_layer:function(geojson){
        var gliderTrackLine;
        if (geojson === undefined){
            gliderTrackLine = {
                "type": "LineString",
                "coordinates": []
            };
        }else{
            gliderTrackLine = geojson;
        }

        var gliderTrackStyle = {
            "color": "#ff7800",
            "weight": 5,
            "opacity": 0.65
        };
        //returnt he new glider layer
        var gliderTrackLayer = L.geoJson(gliderTrackLine, {style: gliderTrackStyle});
        return gliderTrackLayer;
    },
    getRandomColor:function(){
        var hue2rgb = function (p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        var golden_ratio_conjugate = 0.618033988749895;
        var h = Math.random();

        var hslToRgb = function (h, s, l){
            var r, g, b;

            if(s === 0){
                r = g = b = l; // achromatic
            }else{
                var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                var p = 2 * l - q;
                r = hue2rgb(p, q, h + 1/3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1/3);
            }

            return '#'+Math.round(r * 255).toString(16)+Math.round(g * 255).toString(16)+Math.round(b * 255).toString(16);
        };

        h += golden_ratio_conjugate;
        h %= 1;
        return hslToRgb(h, 0.5, 0.60);
    },
    //toc selected item
    selectMarker: function(select_model,type,show_popoup){
        var self = this;
        var ref_des, split, new_split, found;
        if (type == "stream"){
            ref_des = select_model.model.get('reference_designator');
        }else{
            ref_des = select_model.get('ref_des');
        }

        split = ref_des.split('-');
        new_split  = [];
        new_split.push(split[0]);
        new_split.push(split[1]);
        ref_des = new_split.join('-');

        found = false;

        //close all open markers
        _.each(this.markerCluster.getLayers(), function(marker) {
            marker.closePopup();
        });
        //we only want to show popups on the expand
        if (show_popoup){
            //initial pass and open spider for popup
            _.each(this.markerCluster.getLayers(), function(marker) {
                if (marker.options.alt == ref_des){
                    self.map.panTo(marker.getLatLng());
                    if (!marker._icon) marker.__parent.spiderfy();
                    marker.openPopup();
                    found = true;
                }
            });

            //if its not found remove a section of the ref_des to identify it
            if (found === false){
                ref_des = ref_des.split('-')[0];
                _.each(this.markerCluster.getLayers(), function(marker) {
                    if (marker.options.alt == ref_des){
                        self.map.panTo(marker.getLatLng());
                        if (!marker._icon) marker.__parent.spiderfy();
                        marker.openPopup();
                        found = true;
                    }
                });
            }
        }
        $('#popupInstrumentTable').tablesorter({ sortList: [[0,0]]});
        
    },
    //renders a simple map view
    render: function() {
        var self = this;
        //needs to be set
        L.Icon.Default.imagePath = '/img';

        var map = this.map;

        map.fitBounds(self.inititalMapBounds);


        //add labels
        _.each(ASSET_ARRAY.getArrayMapping(), function(arrayMap,index) {
            var labelMarker = L.marker([arrayMap._northEast.lat, arrayMap._southWest.lng-2],{ opacity: 0.001 })
            .bindLabel(ASSET_ARRAY.getArrayTitle(index), { className: "array-title-label", noHide: true });
            self.arrayLayers.addLayer(labelMarker);


        });

        self.arrayLayers.addTo(map);



        var popup = null;
        self.markerCluster = new L.MarkerClusterGroup({iconCreateFunction: function(cluster) {
            return new L.DivIcon({ html: '<b class="textClusteredMarker">' + '</b>', //cluster.getChildCount() + '</b>' ,
                                 className: 'clusterdMarker',
                                 iconSize: L.point(40, 40)
            });
        },
        spiderfyDistanceMultiplier:2,
        showCoverageOnHover: false
        });

        self.markerCluster.on('clustermouseover', function (a) {
            var url, size, title = null;
            if (map.getZoom() === 3 || map.getZoom() === 4 ) {
                _.each(ASSET_ARRAY.getArrayMapping(), function(arrayMap,index) {
                    if (arrayMap.contains(a.latlng)){
                        url = ASSET_ARRAY.getArrayLinks(index);
                        size = ASSET_ARRAY.getSizeMapping(index);
                        title = ASSET_ARRAY.getArrayTitle(index);
                    }
                });

                //generate array popup
                popup = L.popup({offset: new L.Point(0, -20)})
                .setLatLng(a.latlng)
                .setContent('<h4 id="arrayPopup">'+title+'</h4><br><img id="arrayImg" height="'+size[0]+'" width="'+size[1]+'" src="'+url+'">')

                .openOn(map);
            }else{
                _.each(ASSET_ARRAY.getArrayMapping(), function(arrayMap,index) {
                    if (arrayMap.contains(a.latlng)){
                        url = ASSET_ARRAY.getArrayLinks(index);
                        size = ASSET_ARRAY.getSizeMapping(index);
                        title = ASSET_ARRAY.getArrayTitle(index);
                    }
                });

                //generate normal popup
                popup = L.popup({offset: new L.Point(0, -20)})
                .setLatLng(a.latlng)
                .setContent('<div class="cluster-popup"><h4>'+title+'<img id="clusterImg" src="/img/sciMap/OOI_Logo.png"></h4><p>'+a.layer.getAllChildMarkers().length+' assets'+"</p></div>")
                .openOn(map);
            }


            //a.layer.getAllChildMarkers().length

        });
        map.on('zoomend', function(e) {
            if (map.getZoom() === 3 || map.getZoom()==4 ) {
                $('.array-title-label').css('display','');
            }else{
                $('.array-title-label').css('display','none');
            }
        });

        map.on('zoomstart', function(e) {
            if (popup && map) {
                map.closePopup(popup);
                popup = null;
            }
        });


        map.on('overlayadd', function(e) {
            self.updateLegendImage(e.name,true);
        });

        map.on('overlayremove', function(e) {
            self.updateLegendImage(e.name,false);
        });


        self.markerCluster.on('clustermouseout', function (e) {
            if (popup && map) {
                map.closePopup(popup);
                popup = null;
            }
        });

        var res_des_list = this.collection.map(function(model){
            return model.get('ref_des');
        });

        var mooringIcon = L.icon({
            iconUrl: '/img/mooring.png',
            iconSize:     [50, 50], // size of the icon
            iconAnchor:   [25, 25], // point of the icon which will correspond to marker's location
            popupAnchor:  [0, -10] // point from which the popup should open relative to the iconAnchor
        });

        var platformIcon = L.icon({
            iconUrl: '/img/platform.png',
            iconSize:     [50, 50], // size of the icon
            iconAnchor:   [25, 25], // point of the icon which will correspond to marker's location
            popupAnchor:  [0, -10] // point from which the popup should open relative to the iconAnchor
        });

        var gliderIcon = L.icon({
            iconUrl: '/img/glider.png',
            iconSize:     [50, 50], // size of the icon
            iconAnchor:   [25, 25], // point of the icon which will correspond to marker's location
            popupAnchor:  [0, -10] // point from which the popup should open relative to the iconAnchor
        });


        var unique_res_des = _.uniq(res_des_list);
        _.each(unique_res_des, function(platform_id) {

            //get the stations
            var platforms = self.collection.where({ ref_des:platform_id , asset_class: '.AssetRecord' });
            var instruments = self.collection.where({ asset_class: '.InstrumentAssetRecord' });

            var lat_lons = [];

            if (platforms.length > 0 && platforms[0].get('coordinates').length == 2){



                //reset the event popup
                var eventPopup = "";
                var name = platforms[0].get('assetInfo').name;

                if (name === null){
                    name = platforms[0].get('ref_des');
                }


                // Plotting
                var platformFeature = null;
                if (typeof(platform_id) != "undefined"){
                    var ref_des_split = platform_id.split("-");
                    //get the current location
                    if (!location.origin)
                        location.origin = location.protocol + "//" + location.host;

                    //get the parts
                    var array = platform_id.substring(0, 2);
                    var mooring = ref_des_split[0];
                    var platform_val = ref_des_split[1];

                    if (_.isUndefined(platform_val)){
                        //itemType = "mooring"
                        platformFeature = new OOICustomMarker(platforms[platforms.length -1].get('coordinates'),{icon: mooringIcon});
                    }else if (name.toLowerCase().indexOf("glider") > -1){
                        platformFeature = new OOICustomMarker(platforms[platforms.length -1].get('coordinates'),{icon: gliderIcon});
                    }else{
                        //itemType = "platform"
                        platformFeature = new OOICustomMarker(platforms[platforms.length -1].get('coordinates'),{icon: platformIcon});
                    }

                    platformFeature.options.alt = platforms[0].get('ref_des');

                    var instrument, instrument_url;
                    if (ref_des_split.length > 2){
                        instrument = platform_id;
                        instrument_url = [array, mooring, platform_val , instrument].join("/");
                    }else{
                        instrument_url = [array, mooring, platform_val].join("/");
                    }
                    //          var instrument_plot = '</div><br><br><div><a href="/plotting/' + instrument_url + '"><i class="fa fa-bar-chart">&nbsp;</i>Plotting</a>&nbsp;&nbsp;&#124;&nbsp;&nbsp;'
                }else{
                    var instrument_plot = "";
                }

                var eventContent = '<h5 id="deployEvents"><strong>Deployment Event(s)</strong></h5><div class="map-pop-container">',
                    popupContent = "",
                    hasDeploymentEvent = false,
                    popupInstItem;

                //loop through each to create the popup
                _.each(platforms, function(platform_entry) {
                    lat_lons.push(platform_entry.get('coordinates'));
                    popupInstItem = "";

                    var events = platform_entry.get('events');
                    _.each(events, function(item) {
                        if (item['class'] == ".DeploymentEvent"){
                            if (!hasDeploymentEvent){
                                // Name
                                popupContent = '<h4 id="popTitle"><strong>' + name + '</strong></h4>';
                                // Lat & Lon
                                popupContent+= '<h5 id="latLon"><div class="latFloat"><strong>Latitude:</strong> '+platforms[platforms.length -1].get('coordinates')[0] + '</div><div class="lonFloat"><strong>Longitude:</strong> ' + platforms[platforms.length -1].get('coordinates')[1] + '</div>';
                                // Plotting
                                popupContent += '<br><br><div><a href="/plotting/#'+platforms[0].get('ref_des')+'"><i class="fa fa-bar-chart">&nbsp;</i>Plotting</a>&nbsp;&nbsp;&#124;&nbsp;&nbsp;';
                                // Data Catalog
                                popupContent+='<a href="/streams/#'+platforms[0].get('ref_des')+'"><i class="fa fa-database">&nbsp;</i>Data Catalog</a>&nbsp;&nbsp;&#124;&nbsp;&nbsp;';
                                // Asset Managment
                                popupContent+='<a href="/assets/list#' + platforms[0].get('ref_des') + '"><i class="fa fa-sitemap">&nbsp;</i>Asset Management</a></div></h5>';
                                popupContent+='<div class="scrollable-block"><div class="scrollable-area">';

                                popupContent+='<table id="popupInstrumentTable" class="tableWithFloatingHeader nasdaq" style="border: solid #aaaaaa 2px; background-color:white; width:460px; margin: 0px; padding: 0px;">';
                                popupContent+='<thead><tr><th>Assembly</th><th>Name</th><th>Controls</th></tr></thead><tbody>';
                            }
                            var instLength = instruments.length,
                                instrumentName, instrumentRefDes, instrumentAssemblyName,
                            instrumentList = [];
                            for ( var i=0, y = "";  i < instLength; i++ ) {
                                if(instruments[i] !== undefined &&
                                   (platforms[0].get('ref_des') === instruments[i].attributes.ref_des.substring(0,8) || platforms[0].get('ref_des') === instruments[i].attributes.ref_des.substring(0,14))) {
                                    instrumentName = instruments[i].attributes.assetInfo.name;
                                instrumentRefDes = instruments[i].attributes.ref_des;
                                instrumentAssemblyName = instruments[i].attributes.ref_des.split('-')[1];
                                y = '<tr><td class="popup-instrument-item" style="padding-left:10px;">'+instrumentAssemblyName+'</td>' +
                                    '<td>'+instrumentName+'</td>'+
                                    '<td>' +
                                    '<a href="/plotting/#'+instrumentRefDes+'" target="_blank" title="Plotting"><i class="fa fa-bar-chart">&nbsp;</i></a>' +
                                    '<a href="/streams/#'+instrumentRefDes+'" target="_blank" title="Data Catalog"><i class="fa fa-database">&nbsp;</i></a>'+
                                    '<a href="/assets/list#'+instrumentRefDes+'" target="_blank" title="Asset Management"><i class="fa fa-sitemap">&nbsp;</i></a>'+
                                    '</td>' +
                                    '</tr>';
                                if( instrumentList.indexOf(y) < 0 ) {
                                    instrumentList.push(y);
                                }
                                delete instruments[i];
                                }
                            }
                            popupContent+=instrumentList.join('');

                            popupContent+='</tbody></table></div></div>';

                            hasDeploymentEvent = true;

                            if (_.isNull(item.endDate)){
                                eventContent += '<div class="floatLeft">';
                                eventContent += '<h6><strong>Current</strong></h6><table><tr><td><strong>ID:&nbsp;</strong>'+ item.deploymentNumber +'</tr>';
                                eventContent += '<tr><td><strong>Start:&nbsp;</strong>'+ moment(item.startDate).utc().format("YYYY-MM-DD")+'</td></tr>';
                                eventContent +='<tr><td><strong>End:&nbsp;</strong>'+ "Still Deployed"+'</td></tr></table></div>';

                            }else{
                                eventContent += '<div class="floatRight">';
                                eventContent += '<h6><strong>Previous</strong></h6><table><tr><td><strong>ID:&nbsp;</strong>'+ item.deploymentNumber +'</tr>';
                                eventContent += '<tr><td><strong>Start:&nbsp;</strong>'+ moment(item.startDate).utc().format("YYYY-MM-DD")+'</td></tr>';
                                eventContent +='<tr><td><strong>End:&nbsp;</strong>'+ moment(item.endDate).utc().format("YYYY-MM-DD")+'</td></tr></table></div>';
                            }
                        }
                    });
                });
                eventContent += '</div></div>';
                popupContent+=eventContent;


                //only add the item if there are deployment events
                if (hasDeploymentEvent){

                    platformFeature.bindPopup(popupContent,{offset: new L.Point(0, 0),showOnMouseOver: true});

                    self.markerCluster.addLayer(platformFeature);
                }
            }

        });

        map.addLayer(self.markerCluster);
        L.Util.requestAnimFrame(map.invalidateSize,map,!1,map._container);

        applyPopupInst();
    },
    setMapView: function(lat_lon,zoom){
        if ( lat_lon !== undefined ){
            this.map.setView(new L.LatLng(lat_lon[0], lat_lon[1]),zoom);
        }
    },
    updateLegendImage:function(name,visible){
        var displayStr = '';
        if (!visible){
            displayStr = "none";
        }

        if (name == "GFS WIND Model"){
            $('.legendContainer .wind').css('display',displayStr);
        } else if (name == "Wave Watch III Model Waves"){
            $('.legendContainer .waves').css('display',displayStr);
        } else if (name == "HYCOM Currents"){
            $('.legendContainer .currents').css('display',displayStr);
        }
    }
    //end
    //
});

var OOICustomMarker = L.Marker.extend({
    bindPopup: function(htmlContent, options) {
        if (options && options.showOnMouseOver) {
            // call the super method
            L.Marker.prototype.bindPopup.apply(this, [htmlContent, options]);
            // unbind the click event
            this.off("click", this.openPopup, this);
            // bind to mouse over
            this.on("mouseover", function(e) {
                // get the element that the mouse hovered onto
                var target = e.originalEvent.fromElement || e.originalEvent.relatedTarget;
                var parent = this._getParent(target, "leaflet-popup");
                // check to see if the element is a popup, and if it is this marker's popup
                if (parent == this._popup._container)
                    return true;
                // show the popup
                this.openPopup();
                $('#popupInstrumentTable').tablesorter({ sortList: [[0,0]]});
                $('#popupInstrumentTable').stickyTableHeaders();
                
                
            }, this);
            // and mouse out
            this.on("mouseout", function(e) {
                // get the element that the mouse hovered onto
                var target = e.originalEvent.toElement || e.originalEvent.relatedTarget;
                // check to see if the element is a popup
                if (this._getParent(target, "leaflet-popup")) {
                    L.DomEvent.on(this._popup._container, "mouseout", this._popupMouseOut, this);
                    return true;
                }
                // hide the popup
                this.closePopup();
            }, this);
        }
    },
    _popupMouseOut: function(e) {
        // detach the event
        L.DomEvent.off(this._popup, "mouseout", this._popupMouseOut, this);
        // get the element that the mouse hovered onto
        var target = e.toElement || e.relatedTarget;
        // check to see if the element is a popup
        if (this._getParent(target, "leaflet-popup"))
            return true;
        // check to see if the marker was hovered back onto
        if (target == this._icon)
            return true;
        // hide the popup
        this.closePopup();
    },
    _getParent: function(element, className) {
        var parent = element.parentNode;
        while (parent !== null) {
            if (parent.className && L.DomUtil.hasClass(parent, className))
                return parent;
            parent = parent.parentNode;
        }
        return false;
    }
});

var TERRAIN = (function() {

    var mbAttr = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
            '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
            'Imagery © <a href="http://mapbox.com">Mapbox</a>',
        mbUrl = 'https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png',
            grayscale   = L.tileLayer(mbUrl, {id: 'examples.map-20v6611k', attribution: mbAttr}),
        Esri_WorldImagery = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'}),
        Esri_OceanBasemap = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/Ocean_Basemap/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Sources: GEBCO, NOAA, CHS, OSU, UNH, CSUMB, National Geographic, DeLorme, NAVTEQ, and Esri', maxZoom: 13}),
        Esri_WorldTerrain = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: USGS, Esri, TANA, DeLorme, and NPS', maxZoom: 13}),
        NGDC_WorldTerrain = L.tileLayer('http://maps.ngdc.noaa.gov/arcgis/rest/services/web_mercator/etopo1_hillshade/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Hillshade visualization by J. Varner and E. Lim, CIRES, University of Colorado at Boulder and NOAA/NGDC.', maxZoom: 13}),

        nearNow = new Date(),

            layerParams = [
            {
                url:"http://coastmap.com/ecop/wms.aspx",
                name:"GFS WIND Model",
                layers:"GFS_WINDS",
                format: "image/png",
                styles : "WINDS_VERY_SPARSE_GRADIENT-False-2-0-45-high",
                transparent: true,
                time: nearNow
            },
            {
                url:"http://coastmap.com/ecop/wms.aspx",
                name:"Wave Watch III Model Waves",
                styles: "",
                layers:"WW3_WAVE_HEIGHT",
                format: "image/png",
                transparent: true,
                time: nearNow
            },
            {
                url:"http://coastmap.com/ecop/wms.aspx",
                name:"HYCOM Currents",
                styles: "CURRENTS_RAMP-Jet-False-4-True-0-2-high",
                layers:"HYCOM_GLOBAL_NAVY_CURRENTS",
                format: "image/png",
                transparent: true,
                time: nearNow
            }
        ],


        baseLayers = {
            "ESRI Oceans": Esri_OceanBasemap,
            "NGDC Bathymetry" : NGDC_WorldTerrain,
            "ESRI Terrain": Esri_WorldTerrain,
            "World Imagery" : Esri_WorldImagery,
        };

    return {
        getBaseLayers : function(key) { return (key) ? baseLayers[key] : baseLayers; },
        getLayerParams : function(key) { return (key) ? layerParams[key] : layerParams; }
    };
})();

var ASSET_ARRAY = (function() {
    var arrayTitle =   {
            "pioneer":"Coastal Pioneer",
            "endurance":"Endurance & Cabled Array",
            "papa":"Station Papa",
            "irminger":"Irminger Sea",
            "argentine":"Argentine Basin",
            "southern":"Southern Ocean"
    },
        arrayLinks =   {
            "pioneer":"http://oceanobservatories.org/wp-content/uploads/2011/04/PioneerArray_2013-03-20_ver_1-03.png",
            "endurance":"http://oceanobservatories.org/wp-content/uploads/Cabled_Array_Map_2014-12-02.jpg",
            "papa":"http://oceanobservatories.org/wp-content/uploads/StationPapa_labeled_2015-02-05.jpg",
            "irminger":"http://oceanobservatories.org/wp-content/uploads/southern-ocean-instruments-503x350.jpg",
            "argentine":"http://oceanobservatories.org/wp-content/uploads/southern-ocean-instruments-503x350.jpg",
            "southern":"http://oceanobservatories.org/wp-content/uploads/southern-ocean-instruments-503x350.jpg"
        },
        arrayMapping = {
            "pioneer":new L.LatLngBounds([[42,-74],[36,-65]]),
            "endurance":new L.LatLngBounds([[48,-133],[-42,-123]]),
            "papa": new L.LatLngBounds([[52,-150],[46,-139]]),
            "irminger": new L.LatLngBounds([[61,-43],[57,-35]]),
            "argentine":new L.LatLngBounds([[-40,-46],[-46,-37]]),
            "southern":new L.LatLngBounds([[-52,-95],[-56,-85]])
        },
        sizeMapping = {
            "pioneer":[200,300],
            "endurance":[200,400],
            "papa":[250,250],
            "irminger":[200,250],
            "argentine":[200,250],
            "southern":[200,250]
        },
        arrayCodes =   {
            "CP":"Coastal Pioneer",
            "CE":"Endurance & Cabled Array",
            "GP":"Station Papa",
            "GI":"Irminger Sea",
            "GA":"Argentine Basin",
            "GS":"Southern Ocean"
        };
    return {
        getArrayTitle :     function(key) { return (key) ? arrayTitle[key] : arrayTitle; },
        getArrayLinks :     function(key) { return (key) ? arrayLinks[key] : arrayLinks; },
        getArrayMapping :   function(key) { return (key) ? arrayMapping[key] : arrayMapping; },
        getSizeMapping :    function(key) { return (key) ? sizeMapping[key] : sizeMapping; },
        getArrayCodes :     function(key) { return (key) ? arrayCodes[key] : arrayCodes; }
    };
})();
