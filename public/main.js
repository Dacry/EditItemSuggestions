$(document).ready(function() {
	var query = {};
	location.search.substr(1).split("&").forEach(function(item) {query[item.split("=")[0]] = item.split("=")[1]});

	var api = 'http://www.wikidata.org/w/api.php';
	var language = query.language ? query.language : 'en';

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
				data: {'action': 'wbsearchentities', 'format':'json',
					   'language': language, 'search': query, 'type': 'property'}
			})
		}
	}).bind("typeahead:selected", function(evt, prop) {
		getResults(prop['id'], true);
	});

	var getResults = function(propertyId, addToHistory) {

		$('.resultcontainer').html('<img src="img/ajax-loader.gif" /> Please wait while the data is being loaded...');
		$.ajax('./api/itemSuggestions?id=' + propertyId).done(function(data) {
			ids = [];
			$.each(data, function(k, v) {
				ids.push( v.item_id);
			});
			ids = ids.slice(0,50);
			$.ajax({
				url: api,
				dataType: 'jsonp',
				data: {'action': 'wbgetentities', 'format':'json',
					'ids': ids.join('|'), 'props': 'labels|descriptions|aliases', 'languages': language},
				success: function(data) {
					$resultcontainer = $('.resultcontainer');
					$resultcontainer.text('');
					var ret = '';
					entities = data.entities;
					$.each(ids, function(k, id) {
						label = entities[id].labels ? entities[id].labels[language].value : id;
						ret += '<p class="result"><a href="http://wikidata.org/wiki/' + id + '" target="_blank" data-item="' + id + '" data-property="' + propertyId + '"><strong>' + label + '</strong></a>';
						if (entities[id].descriptions) {
							ret += '<br />' + entities[id].descriptions[language].value;
						}
						ret += '</p>';
					});
					$resultcontainer.html(ret);
					$('.resultcontainer a').click(function() {
						$.ajax('./api/addWatchTask?item=' + $(this).data('item') + '&property=' + $(this).data('property')).done(function(data) {
						});
					});
				}
			});
		});
	};
	$('#refresh').click(function() {
		console.log('query', query);
		loadPage();
	});

	var loadPage = function() {
		if (query.hasOwnProperty('id')) {
			id = 'P' + query['id'];

			$.ajax({
				url: api,
				dataType: 'jsonp',
				data: {'action': 'wbgetentities', 'format':'json',
					'ids': id, 'props': 'labels', 'languages': language},
				success: function(data) {
					label = data.entities[id].labels[language].value;
					$('#searchbox').val(label);
				}
			});
			getResults(query.id, false);
		}
	};
	loadPage();
});
