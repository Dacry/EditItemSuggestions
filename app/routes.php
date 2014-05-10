<?php

/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
|
| Here is where you can register all of the routes for an application.
| It's a breeze. Simply tell Laravel the URIs it should respond to
| and give it the Closure to execute when that URI is requested.
|
*/

Route::get('/api/itemSuggestions', array("uses" => "PropertyController@getItemSuggestions"));
Route::get('/api/addWatchTask', array("uses" => "PropertyController@getAddWatchTask"));
Route::get('/api/allPropertyIds', array("uses" => "PropertyController@getAllPropertyIds"));