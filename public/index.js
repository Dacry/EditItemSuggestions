function parseQueryParams() {
	var query = {};
	location.search.substr(1).split("&").forEach(function(item) {query[item.split("=")[0]] = item.split("=")[1]});
	return query;
}

$(document).ready(function() {

	history.replaceState(parseQueryParams(), location.title, location.search);
	var api = 'http://www.wikidata.org/w/api.php';
	var language = 'en';

	var $ulstrigger = $( '.uls-trigger' );
	try {
		language = localStorage.getItem('language') || language;
		$ulstrigger.text( $.uls.data.getAutonym( language ) );
	} catch (e) {}

	$ulstrigger.uls( {
		onSelect : function( languageCode ) {
			language = languageCode;
			$ulstrigger.text( $.uls.data.getAutonym( languageCode ) );
			try {
				localStorage.setItem('language', language);
			} catch (e) {}
			loadPage();
		},
		quickList: ['en', 'de', 'fr', 'it']
	} );

	var ids = [];
	$.ajax({ 
		url: './api/allPropertyIds', 
		success: function(data) {
			var idMap = {};
			$.each(data, function(k, v) {
				idMap[v.property_id] = true;
			});
			ids = idMap;
		}
	});

	$(window).on('popstate', function(e) {
		console.log('popstate:', history.state);
		loadPage();
	});

	$('#searchbox').typeahead(null, {
		name: 'properties',
		displayKey: function(property) {
			return property['label'];
		},
		templates: {
			suggestion: function(property) {
				var ret = '<b>' + property.label + '</b>';
				if (property.description) {
					ret += '<br />' + property.description;
				}
				if (property.aliases) {
					ret += '<br /><i>Also known as: ' + property.aliases + '</i>';
				}
				return ret;
			}
		},
		source: function(query, process) {
			//Todo test if in idMap...
			$.ajax({
				url: api,
				dataType: 'jsonp',
				success: function(data) { 
					res = [];
					$.each(data.search, function(k, property) {
						if (property.id in ids || ids.length == 0){
							res.push(property);
						}
					});
					process(res);
				},
				data: {action: 'wbsearchentities', format:'json', limit: 20,
					   language: language, search: query, type: 'property'}
			})
		}
	}).bind("typeahead:selected", function(evt, data) {
		var propertyId = data['id'];
		history.pushState({id:propertyId}, 'Edit Item Suggestions - ' + propertyId, '?id=' + propertyId);
		getResults(propertyId);
	});

	var getResults = function(propertyId) {
		$('#loadingindicator').show();
		$('#resultcontainer').empty();
		$.ajax({ url: './api/itemSuggestions', data: { id: propertyId } }).done(function(data) {
			var ids = [];
			$.each(data, function(k, v) {
				ids.push(v.item_id);
			});
			insertSuggestions(propertyId, ids);
			bindToggleEvent();
		});
	};

	var bindToggleEvent = function() {
		$('.result i').off('click').click(function() {
			var $that = $(this);
			var $abstract = $(this).parent().children('.abstract');
			if ($abstract.length) { //loading abstract started
				console.log($abstract.length)
				$abstract.slideToggle();
				if ($abstract.length > 1){  //loading abstract finished
					$that.toggleClass('glyphicon-minus-sign').toggleClass('glyphicon-plus-sign');
				}
			} else {
				var qId = $that.parent().attr('id');
				var $abstractObj = $('<div class="abstract"> </div>');
				$('#' + qId).append($abstractObj);
				$.ajax({
					url: api,
					dataType: 'jsonp',
					data: {action: 'wbgetentities', format:'json',
						ids: qId, props: 'sitelinks/urls'},
					success: function(data1) {
						var sitelinks = data1.entities[qId].sitelinks;
						var title = null;
						if (sitelinks) {

							var preferredLanguages = [language, 'en', 'de', 'fr', 'es', 'it'];
							for (l in preferredLanguages) {
								title = queryLanguageCheck(sitelinks, preferredLanguages[l]);
								queryLanguage = preferredLanguages[l];
								if (title !== undefined || title !== null) break;
							}
							if (title === undefined || title === null) {
								title = queryLanguageCheck(sitelinks, sitelinks[Object.keys(sitelinks)[0]].title);
								queryLanguage = sitelinks[Object.keys(sitelinks)[0]].site.substr(0, 2);
							
								if (sitelinks[Object.keys(sitelinks)[0]].hasOwnProperty('title')) {
									title = sitelinks[Object.keys(sitelinks)[0]].title;
									queryLanguage = sitelinks[Object.keys(sitelinks)[0]].site.substr(0, 2);
								}
							}

							if (title) {
								$.ajax({
									url: '//' + queryLanguage + '.wikipedia.org/w/api.php',
									dataType: 'jsonp',
									data: {
										action: 'query',
										prop: 'extracts',
										exintro: "",
										titles: title,
										format: 'json'
									},
									success: function(data2) {
										var abstractContent = (data2.query.pages[Object.keys(data2.query.pages)[0]].extract || "");
										var url;
										if (sitelinks[queryLanguage + 'wiki'] && sitelinks[queryLanguage + 'wiki'].url) url = sitelinks[queryLanguage + 'wiki'].url;
										if (url === undefined) url = sitelinks[Object.keys(sitelinks)[0]].url;
										var $abstractObj = $('<div class="abstract"><div class="row"><div class="col-sm-8">' + abstractContent + '</div></div><div class="row"><div class="col-sm-12 meta"><a target="_blank" href="' + url + '"><img src="//wikipedia.org/favicon.ico" height="14px" style="margin-top: -3px;"> Wiki-Page</a></div></div></div>');
										$('#' + qId).append($abstractObj);
										$that.toggleClass('glyphicon-minus-sign').toggleClass('glyphicon-plus-sign');
										$abstractObj.slideDown();
									}
								});
							}
						}
					}
				});
			}
		});
	}

	var queryLanguageCheck = function(pSitelinks, pLanguage) {
		if (pSitelinks[pLanguage.substr(0, 2) + 'wiki'] && pSitelinks[pLanguage.substr(0, 2) + 'wiki'].hasOwnProperty('title')) {
			return pSitelinks[pLanguage.substr(0, 2) + 'wiki'].title;
		}
	}

	var insertSuggestions = function(propertyId, ids) {
		var queryIds = ids.slice(0,50);
		var queryLanguage = language;
		$.ajax({
			url: api,
			dataType: 'jsonp',
			data: {action: 'wbgetentities', format:'json', languagefallback: true,
				ids: queryIds.join('|'), props: 'labels|descriptions|aliases', languages: queryLanguage},
			success: function(data) {
				if (history.state.id != propertyId) {
					return; // another item was selected
				}
				var ret = '';
				var entities = data.entities;
				$.each(queryIds, function(k, id) {
					if (id in entities) {
						var label = entities[id].labels ? entities[id].labels[queryLanguage].value : id;
						ret += '<p class="result" id="' + id + '"><i class="glyphicon glyphicon-plus-sign" style="color: #888; font-size: 11px;"></i> <a href="http://wikidata.org/wiki/' + id + '" target="_blank" data-item="' + id + '" data-property="' + propertyId + '"><strong>' + label + '</strong></a>';
						if (entities[id].descriptions) {
							ret += '<br />' + entities[id].descriptions[queryLanguage].value;
						}
						ret += '</p>';
					}
				});
				$resultcontainer = $('#resultcontainer');
				$resultcontainer.append(ret);
				$resultcontainer.find('a').off('click').on('click', function() {
					$.ajax({url: './api/addWatchTask', data: { item:  $(this).data('item'), property: $(this).data('property')}});
				});
				if (ids.length > 50) {
					var remaining = ids.slice(50);
					insertSuggestions(propertyId, remaining);
				} else {
					$('#loadingindicator').hide();
				}
				bindToggleEvent();
			}
		});
	}

	$('#refresh').click(function() {
		loadPage();
	});

	var loadPage = function() {
		if ('id' in history.state) {
			var id = history.state['id'];
			$.ajax({
				url: api,
				dataType: 'jsonp',
				data: {action: 'wbgetentities', format:'json', languagefallback: true,
					   ids: id, props: 'labels', languages: language},
				success: function(data) {
					var label = data.entities[id].labels[language].value;
					$('#searchbox').val(label);
				}
			});
			getResults(id);
		} else {
			$('#resultcontainer' ).empty();
			$('#searchbox' ).val('');
		}
	};
	loadPage();
});
