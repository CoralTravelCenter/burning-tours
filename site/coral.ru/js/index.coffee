window.ASAP = (->
    fns = []
    callall = () ->
        f() while f = fns.shift()
    if document.addEventListener
        document.addEventListener 'DOMContentLoaded', callall, false
        window.addEventListener 'load', callall, false
    else if document.attachEvent
        document.attachEvent 'onreadystatechange', callall
        window.attachEvent 'onload', callall
    (fn) ->
        fns.push fn
        callall() if document.readyState is 'complete'
)()

log = () ->
    if window.console and window.DEBUG
        console.group? window.DEBUG
        if arguments.length == 1 and Array.isArray(arguments[0]) and console.table
            console.table.apply window, arguments
        else
            console.log.apply window, arguments
        console.groupEnd?()
trouble = () ->
    if window.console
        console.group? window.DEBUG if window.DEBUG
        console.warn?.apply window, arguments
        console.groupEnd?() if window.DEBUG

window.preload = (what, fn) ->
    what = [what] unless  Array.isArray(what)
    $.when.apply($, ($.ajax(lib, dataType: 'script', cache: true) for lib in what)).done -> fn?()

window.queryParam = queryParam = (p, nocase) ->
    params_kv = location.search.substr(1).split('&')
    params = {}
    params_kv.forEach (kv) -> k_v = kv.split('='); params[k_v[0]] = k_v[1] or ''
    if p
        if nocase
            return decodeURIComponent(params[k]) for k of params when k.toUpperCase() == p.toUpperCase()
            return undefined
        else
            return decodeURIComponent params[p]
    params

String::zeroPad = (len, c) ->
    s = ''
    c ||= '0'
    len ||= 2
    len -= @length
    s += c while s.length < len
    s + @
Number::zeroPad = (len, c) -> String(@).zeroPad len, c

Number::formatPrice = () ->
    s = String(Math.round(this))
    s.split('').reverse().join('').replace(/\d{3}/g, "$& ").split('').reverse().join('').replace(/^\s+/, '')

#window.DEBUG = 'APP NAME'

LOCAL_CHACHE_BY_DESTINATION = {}

destination_preferred_order = [
    'Турция'
    'Таиланд'
    'Египет'
    'ОАЭ'
    'Бахрейн'
    'Мальдивы'
    'Шри-Ланка'
]

$fetchBestDeals = (params) ->
    $promise = $.Deferred()
    if LOCAL_CHACHE_BY_DESTINATION[params.destinationName]
        $promise.resolve(LOCAL_CHACHE_BY_DESTINATION[params.destinationName])
    else
        request =
            isHomePageRequest: yes
            viewType: 'Box'
        request = Object.assign request, params
        $.ajax 'https://www.coral.ru/v1/destination/renderbestdealsbydestination',
            method: 'post'
            data: request
        .then (response) ->
            LOCAL_CHACHE_BY_DESTINATION[params.destinationName] = response
            $promise.resolve(response)
    $promise

$parseResponseMarkup = (markup) ->
    $markup = $(markup).eq(0)
    best_deals_list = $markup.find('a[href^="/hotels/"]').map (idx, a) ->
        $a = $(a)
        $stars = $a.find('.stars')
        price = parseFloat $a.find('.price').text().replace(/[^0-9.,]/g, '').replace(',','.')
        old_price = price * 1.1
        [from, nights, date, tourists] = $a.find('h3 ~ em').text().split(/\s+-\s+/)
        tourists_qty = parseInt tourists
        tourists = ['','на одного', 'на двоих', 'на троих'][tourists_qty]
        n_stars = $stars.children().length
        stars = new Array(n_stars) if n_stars
        hotel_info =
            name: $a.find('h3').html()?.replace(/\s*\(.+/,'')
            location: $a.find('h3 + p').text().split(/,\s*/).pop().replace(/\s*\(.*/,'')
            category: $stars.children().length or $stars.text()
            stars: stars
            nights: nights
            tourists: tourists
            transfer_info: $a.find('.flight').html()
            visual: $a.find('img[data-src]').attr('data-src')
            price_formatted: price.formatPrice()
            old_price_formatted: old_price.formatPrice()
            xlink: $a.attr('href')
    .toArray()

$fetchAndBuildAvailableDestinations = () ->
    $promise = $.Deferred()
    $.get('/').done (home_html) ->
        domparser = new DOMParser()
        doc = domparser.parseFromString home_html, 'text/html'
        bestdealsbox = doc.querySelector '[data-module="bestdealsbox"]'
        links = Array.from bestdealsbox.querySelectorAll '.nav-link[data-optionid]'
        uniq_links = links.filter (nav_link) -> !!nav_link.getAttribute 'data-optionid'
        uniq_links = _.uniqBy uniq_links, (nav_link) -> nav_link.getAttribute 'data-optionid'
        available_destinations = uniq_links.map (nav_link) ->
            data =
                destination_name: nav_link.getAttribute 'data-name'
                destination_id: nav_link.getAttribute 'data-id'
                destination_url: nav_link.getAttribute 'data-url'
                option_id: nav_link.getAttribute 'data-optionid'
        .sort (a,b) ->
            aidx = destination_preferred_order.indexOf a.destination_name
            aidx = Infinity if aidx < 0
            bidx = destination_preferred_order.indexOf b.destination_name
            bidx = Infinity if bidx < 0
            if aidx < bidx then -1 else if aidx > bidx then 1 else 0
        $promise.resolve available_destinations
    $promise

ASAP ->
    $('body .subpage-search-bg > .background').append $('#_intro_markup').html()

    $flickityReady = $.Deferred()
    preload 'https://cdnjs.cloudflare.com/ajax/libs/flickity/2.3.0/flickity.pkgd.min.js', -> $flickityReady.resolve()

    preload 'https://cdnjs.cloudflare.com/ajax/libs/jquery-scrollTo/2.1.3/jquery.scrollTo.min.js', ->
        $(document).on 'click', '[data-scrollto]', -> $(window).scrollTo $(this).attr('data-scrollto'), 500, offset: -150
        $('.tabs-container .scroll-left').on 'click', ->
            $scroll_this = $('.burning-tours-widget .tabs-selector')
            $scroll_this.scrollTo $scroll_this.children(':first'), 500
        $('.tabs-container .scroll-right').on 'click', ->
            $scroll_this = $('.burning-tours-widget .tabs-selector')
            $scroll_this.scrollTo $scroll_this.children(':last'), 500

    $.when($flickityReady).done ->
        $('.adv-list-slider').flickity
            watchCSS: yes
            cellSelector: '.adv'
            contain: yes
            cellAlign: 'center'
            prevNextButtons: no
            pageDots: yes
        $('.why-slider').flickity
            cellSelector: '.item'
            contain: yes
            cellAlign: 'center'
            adaptiveHeight: yes
            prevNextButtons: no
            pageDots: yes
        setTimeout ->
            $('.flickity-enabled').flickity 'resize'
        ,100

    selectDestinationTab = (tab_el) ->
        $tab_el = $(tab_el)
        existing_slider = $tab_el.addClass('selected').prop 'best-deals-slider'
        $tab2hide = $tab_el.siblings('.selected')
        if $tab2hide.length
            $($tab2hide.prop('best-deals-slider')).addClass('disabled')
            $tab2hide.removeClass('selected')
        if existing_slider
            $(existing_slider).removeClass('disabled').show().siblings('.disabled').hide()
        else
            $fetchBestDeals
                destinationId: $tab_el.attr('data-destination-id')
                destinationName: $tab_el.attr('data-destination-name')
                destinationUrl: $tab_el.attr('data-destination-url')
                optionId: $tab_el.attr('data-option-id')
            .done (best_deals_markup) ->
                best_deals_list = $parseResponseMarkup(best_deals_markup)
                $slider_markup = $ Mustache.render $('#_best_deals_slider_markup').html(), best_deals_list: best_deals_list
                $('.burning-tours-widget .destinations-container').append $slider_markup
                $tab_el.prop 'best-deals-slider', $slider_markup.get(0)
                $slider_markup.siblings('.disabled').hide()
                $.when($flickityReady).done ->
                    $slider_markup.flickity
                        cellSelector: '.best-deal-card'
                        wrapAround: no
                        groupCells: yes
                        contain: yes
                        prevNextButtons: no
                        pageDots: yes
                    $('.flickity-enabled').flickity 'resize'

    $tabs_selector = $('.burning-tours-widget .tabs-selector')
    $tabs_container = $tabs_selector.parent()

    $.when $fetchAndBuildAvailableDestinations()
    .done (available_destinations) ->
        lis_html = available_destinations.map (d) ->
            "<li data-destination-name='#{ d.destination_name }' data-destination-id='#{ d.destination_id }' data-destination-url='#{ d.destination_url }' data-option-id='#{ d.option_id }'>#{ d.destination_name }</li>"
        .join ''
        $tabs_selector.empty().append lis_html

        first_tab_el = $tabs_selector.children(':first').get(0)
        last_tab_el = $tabs_selector.children(':last').get(0)
        io = new IntersectionObserver (entries, observer) ->
            for entry in entries
                if entry.target == first_tab_el
                    $tabs_container.toggleClass 'scrollable-left', not entry.isIntersecting
                else if entry.target == last_tab_el
                    $tabs_container.toggleClass 'scrollable-right', not entry.isIntersecting
        , threshold: 0.5, root: $tabs_container.get(0)
        io.observe first_tab_el
        io.observe last_tab_el

        selectDestinationTab '.burning-tours-widget [data-destination-name]:first'

    $(document).on 'click', '.burning-tours-widget [data-destination-name]', ->
        selectDestinationTab this
        $('.flickity-enabled').flickity 'resize'

