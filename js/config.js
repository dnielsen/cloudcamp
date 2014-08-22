"use strict";

//Create configuration module to give common location and namespace to config information
var CONFIG = (function(){
    var my = {};

    // private attributes or functions are just local to this scope
    // public attributes or functions are assigned to the return value 'my'

    my.baseHost = "http://localhost:3000"; //"http://api.campsite.org";
    my.community = 21;

    return my;
}());