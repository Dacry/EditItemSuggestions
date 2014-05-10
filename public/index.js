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
			$.ajax({
				url: api,
				dataType: 'jsonp',
				success: function(data) { process(data.search); },
				data: {action: 'wbsearchentities', format:'json',
					   language: language, search: query, type: 'property'}
			})
		}
	}).bind("typeahead:selected", function(evt, data) {
		var propertyId = data['id'];
		history.pushState({id:propertyId}, 'Edit Item Suggestions - ' + propertyId, '?id=' + propertyId);
		getResults(propertyId);
	});

	var getResults = function(propertyId) {
		$('.resultcontainer').html('<img src="img/ajax-loader.gif" /> Please wait while the data is being loaded...');
		$.ajax({ url: './api/itemSuggestions', data: { id: propertyId } }).done(function(data) {
			var ids = [];
			$.each(data, function(k, v) {
				ids.push( v.item_id);
			});
			ids = ids.slice(0,50);
			$.ajax({
				url: api,
				dataType: 'jsonp',
				data: {action: 'wbgetentities', format:'json', languagefallback: true,
					   ids: ids.join('|'), props: 'labels|descriptions|aliases', languages: language},
				success: function(data) {
					var $resultcontainer = $('.resultcontainer');
					$resultcontainer.text('');
					var ret = '';
					var entities = data.entities;
					$.each(ids, function(k, id) {
						var label = entities[id].labels ? entities[id].labels[language].value : id;
						ret += '<p class="result"><a href="http://wikidata.org/wiki/' + id + '" target="_blank" data-item="' + id + '" data-property="' + propertyId + '"><strong>' + label + '</strong></a>';
						if (entities[id].descriptions) {
							ret += '<br />' + entities[id].descriptions[language].value;
						}
						ret += '</p>';
					});
					$resultcontainer.html(ret);
					$('.resultcontainer a').click(function() {
						$.ajax({url: './api/addWatchTask', data: { item:  $(this).data('item'), property: $(this).data('property')}});
					});
				}
			});
		});
	};

	$('#refresh').click(function() {
		console.log('query', history.state);
		loadPage();
	});

	var loadPage = function() {
		if (history.state.hasOwnProperty('id')) {
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
			$('.resultcontainer' ).empty();
			$('#searchbox' ).val('');
		}
	};
	loadPage();
});
