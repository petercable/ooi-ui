"use strict";

var EnduranceLocationSamplingView = Backbone.View.extend({

  initialize: function() {
    _.bindAll(this, "render");
    var self = this;
    self.render();
  },
  template: JST['ooiui/static/js/partials/landing/endurance_array/EnduranceLocationSampling.html'],
  render: function() {
    this.$el.html(this.template());
  } 
});
