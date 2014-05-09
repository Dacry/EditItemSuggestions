<?php

use Illuminate\Console\Command;
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

		// pinpoint-query wikidata api
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE); 
		foreach ($tasks as $t) {
			curl_setopt($ch, CURLOPT_URL, "https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&entity=Q".$t->item_id."&property=P".$t->property_id); 
			$data = curl_exec($ch);
			$data = json_decode($data, true);

			// check if the property was entered
			if (count($data['claims']) > 0) {
				// User edited an item successfully
				Log::info('property was entered', array('item_id' => $t->item_id, 'property_id' => $t->property_id));
				ItemSuggestion::where('property_id', $t->property_id)->where('item_id', $t->item_id)->delete();
				Log::info('suggestion was deleted');
				$t->forceDelete();
				Log::info('task was deleted');
			}
		}
		curl_close($ch);

		$deletedRows = WbsTask::where('updated_at', '<', Carbon::now()->subMinutes(10)->toDateTimeString())->delete();
		Log::info('deleted ' . $deletedRows . ' tasks that were older than 10 minutes');

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
