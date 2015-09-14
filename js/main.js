var util = {
  _replaceDiacritics: function(c) {
    'àáãâ'.indexOf(c)>-1 && (c = 'a');
     'èéê'.indexOf(c)>-1 && (c = 'e');
     'ìíî'.indexOf(c)>-1 && (c = 'i');
     'òóô'.indexOf(c)>-1 && (c = 'o');
     'ùúû'.indexOf(c)>-1 && (c = 'u');
       'ç'.indexOf(c)>-1 && (c = 'c');
       'ñ'.indexOf(c)>-1 && (c = 'n');
    return c;
  },

  _matchChars: function(charQuery, charWord) {
    return this._replaceDiacritics(charQuery) === this._replaceDiacritics(charWord);
  },

  matchSearch: function(query, word) {
    query = query.toLowerCase();
    word = word.toLowerCase();
    for (var i in query) {
      var charQuery = query[i];
      var didFindChar = false;
      for (var j in word) {
        var charWord = word[j];
        if (this._matchChars(charQuery, charWord)) {
          didFindChar = true;
          break;
        }
      }
      if (!didFindChar) {
        return false;
      }
      word = word.substring(parseInt(j) + 1); // on next iteration, will look in the word hereinafter
    }
    return true;
  },

  compareArrays: function(a1, a2) {
    if (a1.length !== a2.length) {
      return false;
    }
    for (var i in a1) {
      if (a1[i] !== a2[i]) {
        return false;
      }
    }
    return true;
  },

  split: function(str, c) {
    c = c || ',';
    return str.replace(/ /g, '').split(c);
  },

  dateFromStr: function(str) {
    var parts = this.split(str, '/');
    return new Date(parts[2], parseInt(parts[1]) + 1, parts[0]);
  },

  formatCurrency: function(value) {
    if (typeof value === 'string') {
      value = this.parseCurrency(value);
    }
    var decimalPlaces = 0,
      decimalSep = ',',
      groupSize = 3,
      groupSep = '.',
      re = '\\d(?=(\\d{' + (groupSize || 3) + '})+' + (decimalPlaces > 0 ? '\\D' : '$') + ')',
      num = value.toFixed(Math.max(0, ~~decimalPlaces));
    return 'R$' + num
      .replace('.', decimalSep)
      .replace(new RegExp(re, 'g'), '$&' + groupSep);
  },

  parseCurrency: function(value) {
    value = value
      .replace(/[^0-9,]/g, '')
      .replace(',', '.');
    return parseFloat(value);
  },

  formatDate: function(date) {
    var d = date.getDate() + '';
    var m = (date.getMonth() - 1) + '';
    d = d.length > 1 ? d : '0' + d;
    m = m.length > 1 ? m : '0' + m;

    return d + '/' + m;
  }

};

var Evt = function(data) {
  _.extend(this, data);

  this._parseDates = function(str) {
    this.dates = _.map(util.split(str), function(each) {
      return util.dateFromStr(each);
    });
    this.formattedDates = _.map(this.dates, function(item) {
      return util.formatDate(item);
    }).join(' - ');
  };

  this._parsePrices = function(str) {
    this.formattedPrices = _.map(util.split(str), function(item) {
      return util.formatCurrency(item);
    }).join(' - ');
  };

  this._parseTags = function(str) {
    this.tagArray = util.split(str);
  };

  this._parseDates(data.date);
  this._parsePrices(data.price);
  this._parseTags(data.tags);
};

var app = function(_, $) {
  var model = {
    evts: [],
    filteredEvts: [],

    init: function() {
      return $.getJSON('./events.json')
        .done(_.bind(function(data) {
          var evts = _.map(data, function(evt) {
            return new Evt(evt);
          });
          this.evts = this.filteredEvts = _.sortBy(evts, function(item) {
            return -item.dates[0].valueOf();
          });
        }, this))
      ;
    },

    getEvts: function() {
      return this.evts;
    },

    getFilteredEvts: function() {
      return this.filteredEvts;
    },

    filterEvts: function(query) {
      if (!query) {
        this.filteredEvts = this.evts;
        return;
      }
      this.filteredEvts = _.filter(this.evts, function(evt) {
        return util.matchSearch(query, evt.name) || _.any(evt.tagArray, function(tag) {
          return util.matchSearch(query, tag);
        });
      });
    }
  };

  var controller = {
    init: function() {
      model.init()
        .done(function() {
          view.init();
        })
      ;
    },

    getEvts: function() {
      return model.getEvts();
    },

    getFilteredEvts: function() {
      return model.getFilteredEvts();
    },

    filterEvts: function(query) {
      var before = model.getFilteredEvts();
      model.filterEvts(query);
      var after = model.getFilteredEvts();
      var didChange = !util.compareArrays(before, after);
      if (didChange) {
        view.render();
      }
    }
  };

  var view = {
    templates: {
      evt: _.template($('[data-js="evt-template"]').html()),
      empty: _.template($('[data-js="no-results-template"]').html())
    },

    $els: {
      list: $('[data-js="evt-list"]'),
      search: $('[data-js="evt-search"]')
    },

    init: function(evts) {
      this.render();
      this.bindEvents();
    },

    bindEvents: function() {
      this.$els.search.on('keyup paste', _.debounce(_.bind(this.filterEvts, this), 100));
    },

    filterEvts: function() {
      var query = this.$els.search.val();
      controller.filterEvts(query);
    },

    render: function() {
      var evts = controller.getFilteredEvts();
      if (evts.length) {
        this.$els.list.html(_.reduce(evts, _.bind(function(acc, evt) {
          return acc += this.templates.evt(evt);
        }, this), ''));
      } else {
        this.$els.list.html(this.templates.empty());
      }
    }
  };

  controller.init();
};

$(function() { app(_, Zepto); });
