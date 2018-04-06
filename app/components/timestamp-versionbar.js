import Ember from 'ember';

const {Component, $, on, inject} = Ember;

export default Component.extend({

  timestampRepo: inject.service("repos/timestamp-repository"),
  versionbarLoad: inject.service("versionbar-load"),
  reloadHandler: inject.service("reload-handler"),

  plot: null,

  dataPointPixelRatio: 17,

  isUp: false,

  actions: {
    toggleVersionbar() {
      if ($(".versionbar").attr('vis') === 'show') {
        // hide versionbar
        this.set('isUp', false);
        $(".versionbar").slideUp(400);
        $("#vizContainer").animate({height:'+=120'});
        $(".versionbar").attr('vis', 'hide');
        $("#toggleVersionbarButton").removeClass('glyphicon-collapse-down')
          .addClass('glyphicon-collapse-up');
      }
      else {
        // show versionbar
        this.set('isUp', true);
        $(".versionbar").slideDown('fast');
        $("#vizContainer").animate({height:'-=120'});

        $(".versionbar").attr('vis', 'show');
        $("#toggleVersionbarButton").removeClass('glyphicon-collapse-up')
          .addClass('glyphicon-collapse-down');
      }
    },
  },

  // @Override
  init() {
    this._super(...arguments);

    const self = this;
    //workaround stop reload of timestamps in time-shift
    this.get('reloadHandler').stopExchange();
    this.get('versionbarLoad').receiveUploadedObjects();
    // Listener for updating plot
    this.get('timestampRepo').on('uploaded', function() {
      self.updatePlot();
    });
  },

  // @Override
  // Cleanup
  willDestroyElement() {
    this.get('timestampRepo').off('updated');
  },

  renderPlot: on('didRender', function() {

    const self = this;

    const chartData = this.buildChartData();

    if(!chartData) {
      return;
    }

    const values = chartData.values;
    values.unshift('Calls');

    const dates = chartData.labels;
    dates.unshift('Labels');
this.debug('dates: ', dates);

    const chart = c3.generate({
      data: {
        x: 'Labels',
        xFormat: '%H:%M:%S',
        columns: [dates, values],
        types: {
          Calls: 'area-spline'
          // 'line', 'spline', 'step', 'area', 'area-step' ...
        },
        selection: {
          enabled: true,
          multiple: false
        },
        onclick: ((d) => {
          console.log('onClick', dates[d.x + 1]);
          self.loadTimestamp(dates[d.x + 1]);
        })
      },
      transition: {duration: 0},
      axis: {
        x: {
          type: 'category',
           tick: {
              format: '%H:%M:%S',
              centered: true
          },
          label: {
            text: 'Version',
            position: 'outer-center'
          }
        },
        y: {
          label: {
            text: 'Calls',
            position: 'outer-middle'
          }
        }
      },
      legend: {
        show: false
      },
      zoom: {
        enabled: true
      },
      grid: {
        x: {
          show: true
        },
        y: {
          show: false
        }
      },
      padding: {
        right: 30,
      },
      onresized: function() {
        self.applyOptimalZoom();
      }
     });

    this.set('plot', chart);
    this.debug('set plot = chart: ', chart);
   this.applyOptimalZoom();
  }),


  // build chart-ready data
  buildChartData() {

    const timestamps = this.get('timestampRepo.uploadedTimestamps');

    if(!timestamps) {
      return;
    }

    const sortedTimestamps = timestamps.sortBy('timestamp');

    // define outside loop in case of error
    const timestampList = [];
    const timestampListFormatted = [];
    const callList = [];

    // Parse and format timestamps for versionbar
    if (sortedTimestamps) {
      sortedTimestamps.forEach(function(timestamp) {
        const timestampValue = timestamp.get('timestamp');
        timestampList.push(timestampValue);

        const callValue = timestamp.get('calls');
        callList.push(callValue);
        timestampListFormatted.push(timestampValue);
      });
    }

    const chartData = {
      labels: timestampListFormatted,
      values: callList
    };

    return chartData;
  },


  updatePlot() {

    const self = this;

    let updatedPlot = this.get('plot');
this.debug('updatedPlot', updatedPlot);
    if(!updatedPlot){
      this.renderPlot();
      updatedPlot = this.get('plot');
      //return;
    }

     const chartReadyTimestamps = this.buildChartData();
  const labels = chartReadyTimestamps.labels;
  const values = chartReadyTimestamps.values;

    labels.unshift('Labels');
    values.unshift('Calls');

//flow() with category-labels on the X-axis doesn't work: https://github.com/c3js/c3/issues/865
    updatedPlot.load({
      columns: [labels, values],
      unload:true,
      done: function () {
        updatedPlot.zoom.enable(true);
        self.applyOptimalZoom();
      }
    });
  },


  applyOptimalZoom() {

    if(!this.get('isUp')) {
      return;
    }

    const allData = this.get('plot').data()[0].values;

    // calculate and set snippet of timeline
    const dataSetLength = allData.length;

    const divWidth = this.get('plot').element.clientWidth;
    const numberOfPointsToShow = parseInt(divWidth /
      this.get('dataPointPixelRatio'));

    const lowerBound = dataSetLength - numberOfPointsToShow <= 0 ?
        0 : (dataSetLength - numberOfPointsToShow) ;

    const lowerBoundLabel = allData[lowerBound].x;
    const upperBoundLabel = allData[dataSetLength - 1].x;

    this.get('plot').zoom([lowerBoundLabel, upperBoundLabel]);
  },


  loadTimestamp(timestamp) {
    const milliseconds = new Date(timestamp).getTime();
        this.debug('milliseconds: ', milliseconds);
    this.get('reloadHandler').loadOldLandscapeById(milliseconds);
  }
});
