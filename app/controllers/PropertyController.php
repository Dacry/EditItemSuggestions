<?php

class PropertyController extends BaseController {

	public function getItemSuggestions() {
		$id = 0;
		if ( Input::has( 'id' ) ) $id = Input::get( 'id' );

		if ( starts_with( $id, 'P' ) ) {
			$id = substr( $id, 1 );
		}

		$ids = DB::table( 'wbs_item_suggestions' )
			->select( DB::raw( "CONCAT('Q', item_id) as item_id" ) )
			->where( 'property_id', $id )
			->orderBy( 'probability', 'desc' )
			->get();
		return $ids;
	}

	public function getAddWatchTask() {
		$item = 0;
		$property = 0;
		if ( Input::has( 'item' ) ) $item = Input::get( 'item' );
		if ( Input::has( 'property' ) ) $property = Input::get( 'property' );

		if ( $item && $property ) {
			$task = NULL;
			if ( $existingTask = WbsTask::where( 'item_id', $item )->where( 'property_id', $property )->first() ) {
				$task = $existingTask;
			} else {
				$task = new WbsTask();
				$task->item_id = $item;
				$task->property_id = $property;
			}
			$task->touch();
			$task->save();
		}
	}
}
