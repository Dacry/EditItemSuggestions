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
						ret += '<p class="result"><a href="http://wikidata.org/wiki/' + id + '" target="_blank" data-item="' + id + '" data-property="' + propertyId + '"><strong>' + label + '</strong></a>';
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
	};

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
