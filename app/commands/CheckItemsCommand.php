<?php

use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Input\InputArgument;

use Symfony\Component\HttpFoundation\Request as HTTPRequest;

class CheckItemsCommand extends Command {

	/**
	 * The console command name.
	 *
	 * @var string
	 */
	protected $name = 'checkitems';

	/**
	 * The console command description.
	 *
	 * @var string
	 */
	protected $description = 'Checks items.';

	/**
	 * Create a new command instance.
	 *
	 * @return void
	 */
	public function __construct()
	{
		parent::__construct();
		Log::useFiles(storage_path().'/logs/itemsuggestion.log');
	}

	/**
	 * Execute the console command.
	 *
	 * @return mixed
	 */
	public function fire()
	{

		Log::info('running cron job checkitems');

		// find tasks of the last 10 minutes
		//$tasks = WbsTask::where('updated_at', '<', Carbon::now()->subMinutes(10)->toDateTimeString())->get();
		$tasks = WbsTask::all();
		$taskcount = count($tasks);

		// pinpoint-query wikidata api
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
		foreach ($tasks as $t) {
			$item = 'Q' . $t->item_id;
			$property = 'P' . $t->property_id;
			$url = "http://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&entity=$item&property=$property";
			//Log::info($url);
			curl_setopt($ch, CURLOPT_URL, $url);
			$response = curl_exec($ch);
			//Log::info($response);
			$data = json_decode($response, true);
			// check if the property was entered
			if ( isset($data['claims']) && count($data['claims']) > 0) {
				// User edited an item successfully
				Log::info('property was entered', array('item_id' => $item, 'property_id' => $property));
				$deleted = ItemSuggestion::where('property_id', $t->property_id)->where('item_id', $t->item_id)->delete();
				Log::info('suggestion was deleted', array( 'status' => $deleted ));
				$t->forceDelete();
				Log::info('task was deleted');
			}
		}
		curl_close($ch);

		$deletedRows = WbsTask::where('updated_at', '<', Carbon::now()->subMinutes(10)->toDateTimeString())->forceDelete();
		Log::info("deleted $deletedRows of $taskcount tasks");
		Log::info('finished cron job checkitems');

	}

	/**
	 * Get the console command arguments.
	 *
	 * @return array
	 */
	protected function getArguments()
	{
		return array();
	}

	/**
	 * Get the console command options.
	 *
	 * @return array
	 */
	protected function getOptions()
	{
		return array();
	}

}
