var $fetchBestDeals, $parseResponseMarkup, LOCAL_CHACHE_BY_DESTINATION, log, queryParam, trouble;

window.ASAP = (function() {
  var callall, fns;
  fns = [];
  callall = function() {
    var f, results;
    results = [];
    while (f = fns.shift()) {
      results.push(f());
    }
    return results;
  };
  if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', callall, false);
    window.addEventListener('load', callall, false);
  } else if (document.attachEvent) {
    document.attachEvent('onreadystatechange', callall);
    window.attachEvent('onload', callall);
  }
  return function(fn) {
    fns.push(fn);
    if (document.readyState === 'complete') {
      return callall();
    }
  };
})();

log = function() {
  if (window.console && window.DEBUG) {
    if (typeof console.group === "function") {
      console.group(window.DEBUG);
    }
    if (arguments.length === 1 && Array.isArray(arguments[0]) && console.table) {
      console.table.apply(window, arguments);
    } else {
      console.log.apply(window, arguments);
    }
    return typeof console.groupEnd === "function" ? console.groupEnd() : void 0;
  }
};

trouble = function() {
  var ref;
  if (window.console) {
    if (window.DEBUG) {
      if (typeof console.group === "function") {
        console.group(window.DEBUG);
      }
    }
    if ((ref = console.warn) != null) {
      ref.apply(window, arguments);
    }
    if (window.DEBUG) {
      return typeof console.groupEnd === "function" ? console.groupEnd() : void 0;
    }
  }
};

window.preload = function(what, fn) {
  var lib;
  if (!Array.isArray(what)) {
    what = [what];
  }
  return $.when.apply($, (function() {
    var i, len1, results;
    results = [];
    for (i = 0, len1 = what.length; i < len1; i++) {
      lib = what[i];
      results.push($.ajax(lib, {
        dataType: 'script',
        cache: true
      }));
    }
    return results;
  })()).done(function() {
    return typeof fn === "function" ? fn() : void 0;
  });
};

window.queryParam = queryParam = function(p, nocase) {
  var k, params, params_kv;
  params_kv = location.search.substr(1).split('&');
  params = {};
  params_kv.forEach(function(kv) {
    var k_v;
    k_v = kv.split('=');
    return params[k_v[0]] = k_v[1] || '';
  });
  if (p) {
    if (nocase) {
      for (k in params) {
        if (k.toUpperCase() === p.toUpperCase()) {
          return decodeURIComponent(params[k]);
        }
      }
      return void 0;
    } else {
      return decodeURIComponent(params[p]);
    }
  }
  return params;
};

String.prototype.zeroPad = function(len, c) {
  var s;
  s = '';
  c || (c = '0');
  len || (len = 2);
  len -= this.length;
  while (s.length < len) {
    s += c;
  }
  return s + this;
};

Number.prototype.zeroPad = function(len, c) {
  return String(this).zeroPad(len, c);
};

Number.prototype.formatPrice = function() {
  var s;
  s = String(Math.round(this));
  return s.split('').reverse().join('').replace(/\d{3}/g, "$& ").split('').reverse().join('').replace(/^\s+/, '');
};

LOCAL_CHACHE_BY_DESTINATION = {};

$fetchBestDeals = function(params) {
  var $promise, request;
  $promise = $.Deferred();
  if (LOCAL_CHACHE_BY_DESTINATION[params.destinationName]) {
    $promise.resolve(LOCAL_CHACHE_BY_DESTINATION[params.destinationName]);
  } else {
    request = {
      isHomePageRequest: true,
      viewType: 'Box'
    };
    request = Object.assign(request, params);
    $.ajax('https://www.coral.ru/v1/destination/renderbestdealsbydestination', {
      method: 'post',
      data: request
    }).then(function(response) {
      LOCAL_CHACHE_BY_DESTINATION[params.destinationName] = response;
      return $promise.resolve(response);
    });
  }
  return $promise;
};

$parseResponseMarkup = function(markup) {
  var $markup, best_deals_list;
  $markup = $(markup).eq(0);
  return best_deals_list = $markup.find('a[href^="/hotels/"]').map(function(idx, a) {
    var $a, $stars, date, from, hotel_info, n_stars, nights, old_price, price, ref, ref1, stars, tourists, tourists_qty;
    $a = $(a);
    $stars = $a.find('.stars');
    price = parseFloat($a.find('.price').text().replace(/[^0-9.,]/g, '').replace(',', '.'));
    old_price = price * 1.1;
    ref = $a.find('h3 ~ em').text().split(/\s*-\s*/), from = ref[0], nights = ref[1], date = ref[2], tourists = ref[3];
    tourists_qty = parseInt(tourists);
    tourists = ['', 'на одного', 'на двоих', 'на троих'][tourists_qty];
    n_stars = $stars.children().length;
    if (n_stars) {
      stars = new Array(n_stars);
    }
    return hotel_info = {
      name: (ref1 = $a.find('h3').html()) != null ? ref1.replace(/\s*\(.+/, '') : void 0,
      location: $a.find('h3 + p').text().split(/,\s*/).pop().replace(/\s*\(.*/, ''),
      category: $stars.children().length || $stars.text(),
      stars: stars,
      nights: nights,
      tourists: tourists,
      transfer_info: $a.find('.flight').html(),
      visual: $a.find('img[data-src]').attr('data-src'),
      price_formatted: price.formatPrice(),
      old_price_formatted: old_price.formatPrice(),
      xlink: $a.attr('href')
    };
  }).toArray();
};

ASAP(function() {
  var $flickityReady, $tabs_container, $tabs_selector, first_tab_el, io, last_tab_el, selectDestinationTab;
  $('body .subpage-search-bg > .background').append($('#_intro_markup').html());
  $flickityReady = $.Deferred();
  preload('https://cdnjs.cloudflare.com/ajax/libs/flickity/2.3.0/flickity.pkgd.min.js', function() {
    return $flickityReady.resolve();
  });
  preload('https://cdnjs.cloudflare.com/ajax/libs/jquery-scrollTo/2.1.3/jquery.scrollTo.min.js', function() {
    $(document).on('click', '[data-scrollto]', function() {
      return $(window).scrollTo($(this).attr('data-scrollto'), 500, {
        offset: -150
      });
    });
    $('.tabs-container .scroll-left').on('click', function() {
      var $scroll_this;
      $scroll_this = $('.burning-tours-widget .tabs-selector');
      return $scroll_this.scrollTo($scroll_this.children(':first'), 500);
    });
    return $('.tabs-container .scroll-right').on('click', function() {
      var $scroll_this;
      $scroll_this = $('.burning-tours-widget .tabs-selector');
      return $scroll_this.scrollTo($scroll_this.children(':last'), 500);
    });
  });
  $.when($flickityReady).done(function() {
    $('.adv-list-slider').flickity({
      watchCSS: true,
      cellSelector: '.adv',
      contain: true,
      cellAlign: 'center',
      prevNextButtons: false,
      pageDots: true
    });
    $('.why-slider').flickity({
      cellSelector: '.item',
      contain: true,
      cellAlign: 'center',
      adaptiveHeight: true,
      prevNextButtons: false,
      pageDots: true
    });
    return setTimeout(function() {
      return $('.flickity-enabled').flickity('resize');
    }, 100);
  });
  selectDestinationTab = function(tab_el) {
    var $tab2hide, $tab_el, existing_slider;
    $tab_el = $(tab_el);
    existing_slider = $tab_el.addClass('selected').prop('best-deals-slider');
    $tab2hide = $tab_el.siblings('.selected');
    if ($tab2hide.length) {
      $($tab2hide.prop('best-deals-slider')).addClass('disabled');
      $tab2hide.removeClass('selected');
    }
    if (existing_slider) {
      return $(existing_slider).removeClass('disabled').show().siblings('.disabled').hide();
    } else {
      return $fetchBestDeals({
        destinationId: $tab_el.attr('data-destination-id'),
        destinationName: $tab_el.attr('data-destination-name'),
        destinationUrl: $tab_el.attr('data-destination-url'),
        optionId: $tab_el.attr('data-option-id')
      }).done(function(best_deals_markup) {
        var $slider_markup, best_deals_list;
        best_deals_list = $parseResponseMarkup(best_deals_markup);
        $slider_markup = $(Mustache.render($('#_best_deals_slider_markup').html(), {
          best_deals_list: best_deals_list
        }));
        $('.burning-tours-widget .destinations-container').append($slider_markup);
        $tab_el.prop('best-deals-slider', $slider_markup.get(0));
        $slider_markup.siblings('.disabled').hide();
        return $.when($flickityReady).done(function() {
          $slider_markup.flickity({
            cellSelector: '.best-deal-card',
            wrapAround: false,
            groupCells: true,
            contain: true,
            prevNextButtons: false,
            pageDots: true
          });
          return $('.flickity-enabled').flickity('resize');
        });
      });
    }
  };
  selectDestinationTab('.burning-tours-widget [data-destination-name][data-default]');
  $(document).on('click', '.burning-tours-widget [data-destination-name]', function() {
    selectDestinationTab(this);
    return $('.flickity-enabled').flickity('resize');
  });
  $tabs_selector = $('.burning-tours-widget .tabs-selector');
  $tabs_container = $tabs_selector.parent();
  first_tab_el = $tabs_selector.children(':first').get(0);
  last_tab_el = $tabs_selector.children(':last').get(0);
  io = new IntersectionObserver(function(entries, observer) {
    var entry, i, len1, results;
    results = [];
    for (i = 0, len1 = entries.length; i < len1; i++) {
      entry = entries[i];
      if (entry.target === first_tab_el) {
        results.push($tabs_container.toggleClass('scrollable-left', !entry.isIntersecting));
      } else if (entry.target === last_tab_el) {
        results.push($tabs_container.toggleClass('scrollable-right', !entry.isIntersecting));
      } else {
        results.push(void 0);
      }
    }
    return results;
  }, {
    threshold: 0.5,
    root: $tabs_container.get(0)
  });
  io.observe(first_tab_el);
  return io.observe(last_tab_el);
});
