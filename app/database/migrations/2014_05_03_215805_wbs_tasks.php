<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class WbsTasks extends Migration {

	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('wbs_tasks', function($t) {
			$t->increments('id')->unsigned();
			$t->integer('item_id')->unsigned();
			$t->integer('property_id')->unsigned();
			$t->timestamps();
			$t->softDeletes();
			$t->unique(array('item_id', 'property_id'));
		});
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('wbs_tasks');
	}

}
