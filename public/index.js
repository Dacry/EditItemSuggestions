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
		});
	};

	var insertSuggestions = function(propertyId, ids) {
		var queryIds = ids.slice(0,50);
		$.ajax({
			url: api,
			dataType: 'jsonp',
			data: {action: 'wbgetentities', format:'json', languagefallback: true,
				ids: queryIds.join('|'), props: 'labels|descriptions|aliases', languages: language},
			success: function(data) {
				if (history.state.id != propertyId) {
					return; // another item was selected
				}
				var ret = '';
				var entities = data.entities;
				$.each(queryIds, function(k, id) {
					if (id in entities) {
						var label = entities[id].labels ? entities[id].labels[language].value : id;
						ret += '<p class="result" id="' + id + '"><i class="glyphicon glyphicon-plus-sign" style="color: #888; font-size: 11px;"></i> <a href="http://wikidata.org/wiki/' + id + '" target="_blank" data-item="' + id + '" data-property="' + propertyId + '"><strong>' + label + '</strong></a>';
						if (entities[id].descriptions) {
							ret += '<br />' + entities[id].descriptions[language].value;
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
			}
		});
	
		// TODO: update click binding
		$('.result i').off('click').click(function() {
			var $that = $(this);
			var $extract = $(this).parent().children('.extract');
			if ($extract.length) {
				$extract.slideToggle();
				$(this).toggleClass('glyphicon-plus-sign').toggleClass('glyphicon-minus-sign');
			} else {
				var qId = $(this).parent().attr('id');
				$.ajax({
					url: api,
					dataType: 'jsonp',
					data: {action: 'wbgetentities', format:'json',
						ids: qId, props: 'sitelinks/urls'},
					success: function(data1) {
						console.log(data1);
						var sitelinks = data1.entities[qId].sitelinks;
						var title = null;
						if (sitelinks[language + 'wiki'] && sitelinks[language + 'wiki'].hasOwnProperty('title')) {
							title = sitelinks[language + 'wiki'].title || "";
						} else {
							if (sitelinks[Object.keys(sitelinks)[0]].hasOwnProperty('title')) {
								title = sitelinks[Object.keys(sitelinks)[0]].title;
							}
						}
						
						if (title) {
							$.ajax({
								url: '//' + sitelinks[Object.keys(sitelinks)[0]].site.substr(0, 2) + '.wikipedia.org/w/api.php',
								dataType: 'jsonp',
								data: {
									action: 'query',
									prop:'extracts',
									exintro: "",
									titles: title,
									format: 'json'
								},
								success: function(data2) {
									console.log(data2.query.pages);
									var extractContent = (data2.query.pages[Object.keys(data2.query.pages)[0]].extract || "");

									var url;
									if (sitelinks[language + 'wiki'] && sitelinks[language + 'wiki'].url) url = sitelinks[language + 'wiki'].url;
									if (url === undefined) url = sitelinks[Object.keys(sitelinks)[0]].url;
									var $extractObj = $('<div class="extract">' + extractContent + '<a target="_blank" href="' + url + '"><img src="//wikipedia.org/favicon.ico" height="14px" style="margin-top: -3px;"> Wiki-Page</a></div>');
									$('#' + qId).append($extractObj);
									$extractObj.slideDown();
									$that.toggleClass('glyphicon-plus-sign').toggleClass('glyphicon-minus-sign');
								}
							});
							//console.log(data.entities[qId].sitelinks['enwiki'].title);
						}
					}
				});
			}
		});
	}

	$('#refresh').click(function() {
		console.log('query', history.state);
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
