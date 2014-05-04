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
	}

	/**
	 * Execute the console command.
	 *
	 * @return mixed
	 */
	public function fire()
	{
		// find tasks of the last 10 minutes
		$tasks = WbsTask::where('updated_at', '<', Carbon::now()->subMinutes(10)->toDateTimeString())->get();

		// pinpoint-query wikidata api
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE); 
		foreach ($tasks as $t) {
			curl_setopt($ch, CURLOPT_URL, "https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&entity=Q".$t->item_id."&property=P".$t->property_id); 
            $data = curl_exec($ch);
            $data = json_decode($data, true);
            $this->info(count($data['claims']));

            // check if the property was entered
			if (count($data['claims']) > 0) {
				ItemSuggestion::where('property_id', $t->property_id)->where('item_id', $t->item_id)->delete();
			}

			// delete the item-property-combination in any case
			$t->forceDelete();
		}
        curl_close($ch);

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
