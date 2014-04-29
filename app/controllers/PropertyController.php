<?php

class PropertyController extends BaseController {

	public function getProperties() {
		$q = '';
		if (Input::has('q')) $q = Input::get('q');

              if ($q != '') {

       		$items = DB::table('wb_terms as t1')
       					 ->select(DB::raw("t1.term_entity_id as entity_id, 
       					 				   t1.term_type as t1_type,
       					 				   t1.term_text as matched_text,
       					 				   t2.term_type as t2_type,
       					 				   t2.term_text as t2_text"))
       					 ->join('wb_terms as t2', function($join) {
                   			$join->on('t1.term_entity_id', '=', 't2.term_entity_id');
              				 })
              				 ->where('t1.term_entity_type', '=', 'property')
              				 ->where('t2.term_entity_type', '=', 'property')
              				 ->where('t1.term_language', '=', 'en')
              				 ->where('t2.term_language', '=', 'en')
              				 ->where(function($query) {
              				 	$query->where('t1.term_type', '=', 'label')
              				 		  ->orWhere('t1.term_type', '=', 'alias');
              				 })
              				 ->where('t1.term_search_key', 'LIKE', "$q%")
              				 ->where('t2.term_type', '!=', 'alias')
              				 ->get();
       		
              	$ret = array();
              	foreach ($items as $item) {
              		
              		$curItem = array("id" => $item->entity_id);
              		if (isset($ret[$item->entity_id])) {
              			$curItem = $ret[$item->entity_id];
              		}

              		switch ($item->t2_type) {
              			case "description":
              				$curItem['description'] = $item->t2_text;
              				break;
              			case "label":
              				$curItem['label'] = $item->t2_text;
              				break;
              			default:
              				break;
              		}

              		switch ($item->t1_type) {
              			case "alias":
              				$curItem['alias'] = $item->matched_text;
              				break;
              			default:
              				break;
              		}

              		$ret[$item->entity_id] = $curItem;
              	}

       		return array_values($ret);
              }

              return array();
	}

       public function getItemSuggestions() {
              $id = 0;
              if (Input::has('id')) $id = Input::get('id');

              $sugs = ItemSuggestion::where('property_id', $id)->orderBy('probability', 'desc')->get();

              $items = array();
              foreach ($sugs as $sug) {
                     $item = DB::table('wb_terms')
                               ->select(DB::raw('term_entity_id, term_type, term_text'))
                               ->where('term_entity_type', 'item')
                               ->where('term_language', 'en')
                               ->where(function($query) {
                                      $query->where('term_type', '=', 'label')
                                            ->orWhere('term_type', '=', 'description');
                               })
                               ->where('term_entity_id', intval($sug->item_id))
                               ->get();
                     $items[] = $item;
              }

              $ret = array();
              foreach ($items as $item) {
                     foreach($item as $i) {
                            
                            $curItem = array("id" => $i->term_entity_id);
                            if (isset($ret[$i->term_entity_id])) {
                                   $curItem = $ret[$i->term_entity_id];
                            }

                            switch ($i->term_type) {
                                   case "description":
                                          $curItem['description'] = $i->term_text;
                                          break;
                                   case "label":
                                          $curItem['label'] = $i->term_text;
                                          break;
                                   default:
                                          break;
                            }

                            $ret[$i->term_entity_id] = $curItem;
                     }
              }
              return array_values($ret);
       }
}
