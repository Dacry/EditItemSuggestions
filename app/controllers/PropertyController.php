<?php
class PropertyController extends BaseController {

  public function getItemSuggestions() {
    $id = 0;
    if (Input::has('id')) $id = Input::get('id');

    $ids = DB::table('wbs_item_suggestionst')
      ->select(DB::raw("'Q'+item_id as qid"))
      ->where('property_id', $id)
      ->get();
    return $ids;
  }

  public function getAddWatchTask() {
    $item = 0;
    $property = 0;
    if (Input::has('item')) $item = Input::get('item');
    if (Input::has('property')) $property = Input::get('property');

    if ($item && $property) {
      $task = NULL;
      if ($existingTask = WbsTask::where('item_id', $item)->where('property_id', $property)->first()) {
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