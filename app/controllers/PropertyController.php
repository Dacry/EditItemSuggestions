<?php


use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Input;

class PropertyController extends BaseController {

	public function getItemSuggestions() {
		$id = 0;
		if ( Input::has( 'id' ) ) $id = Input::get( 'id' );

		if ( starts_with( $id, 'P' ) ) {
			$id = substr( $id, 1 );
		}

		$ids = DB::table( 'wbs_item_suggestions' )
			->select( DB::raw( "CONCAT('Q', item_id) as item_id, probability" ) )
			->where( 'property_id', $id )
			->orderBy( 'probability', 'desc' )
			->orderBy( 'item_id', 'asc' )
			->limit( 500 )
			->get();
		return $ids;
	}

  public function getAllPropertyIds() {
    $ids = DB::table( 'wbs_item_suggestions' )
      ->select( DB::raw( "CONCAT('P', property_id) as property_id" ) )
      ->distinct()
      ->get();
    return $ids;
  }

	public function getAddWatchTask() {
		$item = 0;
		$property = 0;
		if ( Input::has( 'item' ) ) $item = Input::get( 'item' );
		if ( Input::has( 'property' ) ) $property = Input::get( 'property' );

		$itemid = substr( $item, 1);
		$propertyid = substr( $property, 1);

		if (! ($item && $property) ) {
			return 'invalid ids';
		}

		$task = NULL;
		if ( $existingTask = WbsTask::where( 'item_id', $itemid )->where( 'property_id', $propertyid )->first() ) {
			$task = $existingTask;
		} else {
			$task = new WbsTask();
			$task->item_id = $itemid;
			$task->property_id = $propertyid;
		}
		$task->touch();
		$task->save();

		return 0;
	}

}
